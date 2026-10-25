import { describe, it, expect } from 'vitest';
import {
  MOVES,
  SESSIONS,
  deriveActivityLevel,
  isMoveSafeForUser,
  getSafeMovesForSession,
  scoreResetSessions,
  computeStreakAndFreezes,
  computeResetsPerDay,
  computeWeeklyResetTarget,
  generateDailyPlan,
} from './planEngine';
import { ProfileDoc, ScheduleDoc, MetaDoc, LogEntry, PainEntry } from '../types';

const baseProfile: ProfileDoc = {
  conditions: ['lower-back'],
  painBaseline: { 'lower-back': 4 },
  painDuration: { 'lower-back': '2 to 12 weeks' },
  gettingWorse: { 'lower-back': false },
  safetyFlags: [],
  equipment: ['No equipment'],
  location: 'Office',
  goal: 'Less pain',
  cheerStyle: 'gentle',
  level: 'Starter',
  activity: {
    habitType: 'Mostly sitting',
    exerciseDaysPerWeek: 1,
    hoursSittingPerDay: 8,
    hikesPerMonth: 0,
  },
  consent: {
    at: '2026-10-25T00:00:00.000Z',
    version: '1.0',
  },
};

const baseSchedule: ScheduleDoc = {
  workStart: '09:00',
  workEnd: '17:30',
  workType: 'Desk',
  breakWindows: [
    { label: 'Morning', time: '10:30' },
    { label: 'Lunch', time: '13:00' },
    { label: 'Afternoon', time: '15:30' },
  ],
  daysOff: ['Sat', 'Sun'],
  weekdayMinutes: 20,
  weekendMinutes: 30,
  remindersPerDay: 3,
  quietStart: '22:00',
  quietEnd: '07:00',
};

const baseMeta: MetaDoc = {
  streak: 0,
  bestStreak: 0,
  freezes: 1,
  lastActiveDate: '2026-10-24',
  badges: [],
  disabledMoveIds: [],
  favouriteQuoteIds: [],
  seenQuoteIds: [],
  monthlyTheme: 'Strong back',
};

describe('Habit Flow Plan Engine', () => {
  it('derives activity level accurately', () => {
    expect(deriveActivityLevel('Mostly sitting', 3)).toBe('Starter');
    expect(deriveActivityLevel('Light walking', 1)).toBe('Starter');
    expect(deriveActivityLevel('Some exercise', 3)).toBe('Steady');
    expect(deriveActivityLevel('Regular exercise', 5)).toBe('Active');
  });

  it('excludes moves with avoidFor matching acute lower-back pain or disabledMoveIds', () => {
    const acuteProfile: ProfileDoc = {
      ...baseProfile,
      painBaseline: { 'lower-back': 8 },
      gettingWorse: { 'lower-back': true },
    };
    const catCow = MOVES.find((m) => m.id === 'seated-cat-cow')!;
    expect(isMoveSafeForUser(catCow, acuteProfile, [])).toBe(false);

    // Disabled move is excluded even for mild profile
    expect(isMoveSafeForUser(catCow, baseProfile, ['seated-cat-cow'])).toBe(false);
  });

  it('excludes pregnancy moves when user has pregnancy condition', () => {
    const pregProfile: ProfileDoc = {
      ...baseProfile,
      conditions: ['pregnancy'],
    };
    const twist = MOVES.find((m) => m.id === 'seated-twist')!;
    expect(isMoveSafeForUser(twist, pregProfile, [])).toBe(false);
  });

  it('weights pain >= 7 double when scoring reset sessions', () => {
    const highPainLogs: PainEntry[] = [
      { id: 'p1', date: '2026-10-25', condition: 'wrists-hands', score: 8 },
    ];
    const wristProfile: ProfileDoc = {
      ...baseProfile,
      conditions: ['lower-back', 'wrists-hands'],
      painBaseline: { 'lower-back': 3, 'wrists-hands': 8 },
    };
    const scored = scoreResetSessions(wristProfile, [], highPainLogs, ['desk-reset']);
    expect(scored[0].session.id).toBe('hands-wrists');
  });

  it('computes identical weekly reset targets and streak with 1-day freeze forgiveness', () => {
    const resetsPerDay = computeResetsPerDay(baseProfile);
    expect(resetsPerDay).toBe(3);
    const weeklyTarget = computeWeeklyResetTarget(resetsPerDay, baseSchedule);
    expect(weeklyTarget).toBe(15); // 3 resets * 5 active days

    const logs: LogEntry[] = [
      { id: '1', date: '2026-10-22', kind: 'reset', refId: 'desk-reset', durationSec: 180, createdAt: '2026-10-22T10:00:00Z' },
      // 2026-10-23 missed (forgiven via 1 weekly freeze)
      { id: '2', date: '2026-10-24', kind: 'reset', refId: 'desk-reset', durationSec: 180, createdAt: '2026-10-24T10:00:00Z' },
      { id: '3', date: '2026-10-25', kind: 'reset', refId: 'desk-reset', durationSec: 180, createdAt: '2026-10-25T10:00:00Z' },
    ];
    const streakInfo = computeStreakAndFreezes(logs, '2026-10-25');
    expect(streakInfo.streak).toBe(3);
    expect(streakInfo.freezesUsedThisWeek).toBe(1);
  });

  it('produces a gentle-only halved plan when safetyFlags are present', () => {
    const safeFlagProfile: ProfileDoc = {
      ...baseProfile,
      safetyFlags: ['chest-pain'],
    };
    const plan = generateDailyPlan('2026-10-25', safeFlagProfile, baseSchedule, baseMeta, [], []);
    expect(plan.isGentleDay).toBe(true);
    expect(plan.whyToday).toBe('Today is easy and gentle, a good way to start.');
    const workoutItem = plan.items.find((i) => i.type === 'workout')!;
    expect(workoutItem.durationMin).toBe(15); // 30 weekend minutes halved -> 15
  });
});
