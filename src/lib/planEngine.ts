import movesData from '../data/moves.json';
import sessionsData from '../data/sessions.json';
import workoutsData from '../data/workouts.json';
import quotesData from '../data/quotes.json';
import careCardsData from '../data/careCards.json';
import {
  ActivityLevel,
  CareCard,
  ConditionId,
  DailyPlanDoc,
  LogEntry,
  MetaDoc,
  Move,
  PainEntry,
  PlanItem,
  ProfileDoc,
  Quote,
  ScheduleDoc,
  Session,
  WorkoutTemplate,
} from '../types';

export const MOVES: Move[] = movesData as Move[];
export const SESSIONS: Session[] = sessionsData as Session[];
export const WORKOUTS: WorkoutTemplate[] = workoutsData as WorkoutTemplate[];
export const QUOTES: Quote[] = quotesData as Quote[];
export const CARE_CARDS: CareCard[] = careCardsData as CareCard[];

export const TINY_WIN_TEMPLATES = [
  'Drink a glass of water after your {time} reset.',
  'Stand up during your next phone call.',
  'Take the long way to the water cooler.',
  'Roll your shoulders three times each time you open your inbox.',
  'Look out of a window for 20 seconds after lunch.',
  'Put your phone down and take 5 slow breaths before bed.',
];

export const CONDITION_LABELS: Record<ConditionId, string> = {
  'lower-back': 'Lower back',
  'upper-back': 'Upper back',
  'neck-shoulders': 'Neck and shoulders',
  eyes: 'Eyes',
  'wrists-hands': 'Wrists and hands',
  hips: 'Hips',
  knees: 'Knees',
  'ankle-foot': 'Ankle or foot',
  headaches: 'Headaches',
  'high-bp': 'High blood pressure',
  heart: 'Heart condition',
  pregnancy: 'Pregnancy',
  'recent-surgery': 'Recent surgery',
};

export function deriveActivityLevel(
  habitType: string,
  exerciseDaysPerWeek: number
): ActivityLevel {
  if (habitType === 'Mostly sitting' || exerciseDaysPerWeek < 2) {
    return 'Starter';
  }
  if (exerciseDaysPerWeek <= 3) {
    return 'Steady';
  }
  return 'Active';
}

export function getActiveAvoidFlags(
  profile: ProfileDoc,
  painLogs: PainEntry[] = []
): Set<string> {
  const flags = new Set<string>();

  for (const cond of profile.conditions) {
    // Always add the base condition ID so any move/workout explicitly avoiding it is excluded
    flags.add(cond);

    // Check latest pain score from painLogs or baseline
    const latestPain = getLatestPainScore(cond, profile, painLogs);
    const isAcute =
      latestPain >= 7 ||
      Boolean(profile.gettingWorse?.[cond]) ||
      profile.safetyFlags.length > 0;

    if (isAcute) {
      flags.add(`${cond}-acute`);
      if (cond === 'neck-shoulders') {
        flags.add('neck-acute');
        flags.add('shoulder-acute');
      }
      if (cond === 'upper-back') {
        flags.add('shoulder-acute');
      }
    }

    if (cond === 'pregnancy') {
      flags.add('pregnancy');
      flags.add('pregnancy-late');
    }
    if (cond === 'recent-surgery') {
      flags.add('recent-surgery');
    }
  }

  // If a user has lower-back condition, also exclude moves with lower-back-acute if they flagged pain >= 5 or acute,
  // and always respect explicit avoidFor tokens.
  if (profile.safetyFlags.includes('dizziness') || profile.safetyFlags.includes('chest-pain')) {
    flags.add('dizziness');
    flags.add('heart-acute');
  }
  if (profile.safetyFlags.includes('pregnant')) {
    flags.add('pregnancy');
    flags.add('pregnancy-late');
  }

  return flags;
}

export function getLatestPainScore(
  condition: ConditionId,
  profile: ProfileDoc,
  painLogs: PainEntry[]
): number {
  const matching = painLogs
    .filter((p) => p.condition === condition)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (matching.length > 0) {
    return matching[0].score;
  }
  return profile.painBaseline?.[condition] ?? 0;
}

export function isMoveSafeForUser(
  move: Move,
  profile: ProfileDoc,
  disabledMoveIds: string[] = [],
  painLogs: PainEntry[] = []
): boolean {
  if (disabledMoveIds.includes(move.id)) return false;

  const activeFlags = getActiveAvoidFlags(profile, painLogs);
  for (const avoid of move.avoidFor) {
    if (activeFlags.has(avoid)) return false;
    // Also check if user has the condition and the avoid token matches the condition prefix when acute or direct
    for (const cond of profile.conditions) {
      if (avoid === cond) return false;
      // If user has lower-back and pain >= 6 or gettingWorse, or if avoid matches acute flag
      if (avoid === `${cond}-acute` && activeFlags.has(`${cond}-acute`)) {
        return false;
      }
    }
  }
  return true;
}

export function getSafeMovesForSession(
  session: Session,
  profile: ProfileDoc,
  disabledMoveIds: string[] = [],
  painLogs: PainEntry[] = []
): Move[] {
  const sessionMoves = session.moves
    .map((id) => MOVES.find((m) => m.id === id))
    .filter((m): m is Move => Boolean(m));

  const safe = sessionMoves.filter((m) =>
    isMoveSafeForUser(m, profile, disabledMoveIds, painLogs)
  );

  // Fallback to universally safe breathing/eye/glute moves if all moves in a session were filtered out
  if (safe.length === 0) {
    return MOVES.filter(
      (m) =>
        m.avoidFor.length === 0 && !disabledMoveIds.includes(m.id)
    ).slice(0, 3);
  }
  return safe;
}

export function hasPainSpikeOrHighPain(
  profile: ProfileDoc,
  painLogs: PainEntry[]
): { triggered: boolean; condition?: ConditionId; score?: number } {
  for (const cond of profile.conditions) {
    const score = getLatestPainScore(cond, profile, painLogs);
    if (score >= 7) {
      return { triggered: true, condition: cond, score };
    }
    const history = painLogs
      .filter((p) => p.condition === cond)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (history.length >= 3) {
      const n = history.length;
      const d1 = history[n - 2].score - history[n - 3].score;
      const d2 = history[n - 1].score - history[n - 2].score;
      if (d1 >= 2 && d2 >= 2) {
        return { triggered: true, condition: cond, score: history[n - 1].score };
      }
    }
  }
  return { triggered: false };
}

export function isConditionTrendingDown(
  condition: ConditionId,
  painLogs: PainEntry[]
): { trendingDown: boolean; weeks: number } {
  const history = painLogs
    .filter((p) => p.condition === condition)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (history.length < 3) return { trendingDown: false, weeks: 0 };

  let streak = 0;
  for (let i = history.length - 1; i > 0; i--) {
    if (history[i].score < history[i - 1].score) {
      streak++;
    } else if (history[i].score > history[i - 1].score) {
      break;
    }
  }
  return { trendingDown: streak >= 2, weeks: streak + 1 };
}

export function getMissedDaysCount(lastActiveDate: string, todayDate: string): number {
  if (!lastActiveDate) return 0;
  const last = new Date(`${lastActiveDate}T00:00:00`);
  const now = new Date(`${todayDate}T00:00:00`);
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays - 1);
}

export function computeStreakAndFreezes(
  logs: LogEntry[],
  todayDate: string
): { streak: number; bestStreak: number; freezesUsedThisWeek: number } {
  const activeDates = Array.from(new Set(logs.map((l) => l.date))).sort();
  if (activeDates.length === 0) {
    return { streak: 0, bestStreak: 0, freezesUsedThisWeek: 0 };
  }

  const activeSet = new Set(activeDates);
  let streak = 0;
  let freezesUsedThisWeek = 0;

  const cursor = new Date(`${todayDate}T00:00:00`);
  // If today isn't completed yet, start checking from yesterday so streak doesn't drop to 0 mid-day
  if (!activeSet.has(todayDate)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let consecutiveMisses = 0;
  let daysChecked = 0;

  while (daysChecked < 365) {
    const dStr = formatDateYYYYMMDD(cursor);
    if (activeSet.has(dStr)) {
      streak++;
      consecutiveMisses = 0;
    } else {
      // Check if there are any logs before this date
      const hasEarlier = activeDates.some((ad) => ad < dStr);
      if (!hasEarlier) break;

      const weekBucket = Math.floor(daysChecked / 7);
      if (consecutiveMisses === 0 && freezesUsedThisWeek === 0 && weekBucket === 0) {
        // Forgive 1 missed day per week (freeze)
        freezesUsedThisWeek = 1;
        consecutiveMisses++;
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
    daysChecked++;
  }

  const bestStreak = Math.max(streak, activeDates.length > 0 ? 1 : 0);
  return { streak, bestStreak, freezesUsedThisWeek };
}

export function formatDateYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeResetsPerDay(profile: ProfileDoc): number {
  const condCount = profile.conditions.length;
  const sitsLong = (profile.activity?.hoursSittingPerDay ?? 6) > 8;
  if (condCount >= 3 && sitsLong) return 5;
  if (condCount >= 2 || sitsLong) return 4;
  return 3;
}

export function computeWeeklyResetTarget(
  resetsPerDay: number,
  schedule: ScheduleDoc
): number {
  const activeDays = Math.max(1, 7 - (schedule.daysOff?.length ?? 2));
  return resetsPerDay * activeDays;
}

const WEEKDAY_THEMES: Record<number, WorkoutTemplate['theme']> = {
  1: 'strength', // Mon
  2: 'walk', // Tue
  3: 'mobility', // Wed
  4: 'intervals', // Thu
  5: 'fun', // Fri
  6: 'outdoors', // Sat
  0: 'restore', // Sun
};

export function pickMainWorkoutForDay(
  dateStr: string,
  profile: ProfileDoc,
  schedule: ScheduleDoc,
  recentLogs: LogEntry[],
  painLogs: PainEntry[]
): { workout: WorkoutTemplate; durationMin: number } {
  const dateObj = new Date(`${dateStr}T12:00:00`);
  const dayOfWeek = dateObj.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const baseMinutes = isWeekend ? schedule.weekendMinutes : schedule.weekdayMinutes;

  const painStatus = hasPainSpikeOrHighPain(profile, painLogs);
  const missedDays = getMissedDaysCount(
    recentLogs.length > 0
      ? recentLogs.map((l) => l.date).sort().slice(-1)[0]
      : dateStr,
    dateStr
  );
  const isGentleOnly =
    profile.safetyFlags.length > 0 || painStatus.triggered || missedDays >= 2;

  const activeAvoid = getActiveAvoidFlags(profile, painLogs);

  // Recent 3 days workout IDs to avoid repeating
  const recentWorkoutIds = new Set(
    recentLogs
      .filter((l) => l.kind === 'workout')
      .slice(-3)
      .map((l) => l.refId)
  );

  // Check if Starter user had last two feedbacks as "Too hard" or "This hurt"
  const lastTwoWorkoutFeedbacks = recentLogs
    .filter((l) => l.feedback)
    .slice(-2)
    .map((l) => l.feedback);
  const needsEasierStarterDay =
    profile.level === 'Starter' &&
    lastTwoWorkoutFeedbacks.length === 2 &&
    lastTwoWorkoutFeedbacks.every((f) => f === 'Too hard' || f === 'This hurt');

  let desiredTheme = WEEKDAY_THEMES[dayOfWeek] || 'walk';
  if (isGentleOnly) {
    desiredTheme = dayOfWeek % 2 === 0 ? 'walk' : 'mobility';
  } else if (
    needsEasierStarterDay &&
    (desiredTheme === 'intervals' || desiredTheme === 'strength')
  ) {
    desiredTheme = 'walk';
  }

  const userEquip = new Set(profile.equipment || []);
  const isWorkoutEligible = (w: WorkoutTemplate) => {
    for (const avoid of w.avoidFor) {
      if (activeAvoid.has(avoid)) return false;
      for (const c of profile.conditions) {
        if (avoid === c) return false;
      }
    }
    if (isGentleOnly && (w.theme === 'strength' || w.theme === 'intervals')) {
      return false;
    }
    if (w.equipment.length > 0) {
      const hasReq = w.equipment.every(
        (eq) =>
          userEquip.has(eq) ||
          (eq === 'dumbbells' && userEquip.has('Dumbbells or bands')) ||
          (eq === 'band' && userEquip.has('Dumbbells or bands')) ||
          (eq === 'machine' && (userEquip.has('Treadmill or elliptical') || userEquip.has('Gym'))) ||
          (eq === 'mat' || eq === 'shoes' || eq === 'stairs')
      );
      if (!hasReq) return false;
    }
    return true;
  };

  let candidates = WORKOUTS.filter(
    (w) => w.theme === desiredTheme && isWorkoutEligible(w) && !recentWorkoutIds.has(w.id)
  );
  if (candidates.length === 0) {
    candidates = WORKOUTS.filter((w) => isWorkoutEligible(w) && !recentWorkoutIds.has(w.id));
  }
  if (candidates.length === 0) {
    candidates = WORKOUTS.filter((w) => w.id === 'brisk-walk' || w.id === 'mobility-flow');
  }

  const chosen = candidates[0] || WORKOUTS[1]; // brisk-walk fallback
  let durationMin: number = baseMinutes || 20;
  if (isGentleOnly) {
    durationMin = Math.max(10, Math.round(durationMin / 2 / 5) * 5);
  }

  return { workout: chosen, durationMin };
}

export function scoreResetSessions(
  profile: ProfileDoc,
  recentLogs: LogEntry[],
  painLogs: PainEntry[],
  alreadyPickedToday: string[],
  nowMs: number = Date.now()
): { session: Session; score: number }[] {
  const activeAvoid = getActiveAvoidFlags(profile, painLogs);

  // Sessions used in last 90 minutes
  const usedLast90Min = new Set(
    recentLogs
      .filter((l) => nowMs - new Date(l.createdAt).getTime() <= 90 * 60 * 1000)
      .map((l) => l.refId)
  );

  // Sessions used 2 days in a row
  const recentDates = Array.from(new Set(recentLogs.map((l) => l.date))).sort().slice(-2);
  const usedTwoDaysInARow = new Set<string>();
  if (recentDates.length === 2) {
    const d1Refs = new Set(
      recentLogs.filter((l) => l.date === recentDates[0]).map((l) => l.refId)
    );
    const d2Refs = new Set(
      recentLogs.filter((l) => l.date === recentDates[1]).map((l) => l.refId)
    );
    for (const ref of d1Refs) {
      if (d2Refs.has(ref)) usedTwoDaysInARow.add(ref);
    }
  }

  return SESSIONS.filter((s) => s.id !== 'posture-session' && s.id !== 'eyes').map(
    (session) => {
      let score = 0;

      // +3 for each matching condition (7+ pain counts double -> +6)
      for (const cond of session.conditions) {
        if (profile.conditions.includes(cond)) {
          const painScore = getLatestPainScore(cond, profile, painLogs);
          score += painScore >= 7 ? 6 : 3;
        }
      }

      // +1 for whole-body "desk-reset" at least once a day
      if (session.id === 'desk-reset' && !alreadyPickedToday.includes('desk-reset')) {
        score += 1;
      }

      // -5 if used in the last 90 minutes
      if (usedLast90Min.has(session.id)) {
        score -= 5;
      }

      // -2 if used 2 days in a row
      if (usedTwoDaysInARow.has(session.id)) {
        score -= 2;
      }

      // Slight penalty if already picked earlier today so daily resets have variety
      if (alreadyPickedToday.includes(session.id)) {
        score -= 4;
      }

      // Check if all moves in session are avoided
      const safeMoves = session.moves.filter((mId) => {
        const m = MOVES.find((mv) => mv.id === mId);
        return m ? !m.avoidFor.some((af) => activeAvoid.has(af)) : true;
      });
      if (safeMoves.length === 0) {
        score -= 20;
      }

      return { session, score };
    }
  ).sort((a, b) => b.score - a.score);
}

export function buildWhyTodayLine(
  profile: ProfileDoc,
  painLogs: PainEntry[],
  missedDays: number
): string {
  if (profile.safetyFlags.length > 0) {
    return 'Today is easy and gentle, a good way to start.';
  }
  const painCheck = hasPainSpikeOrHighPain(profile, painLogs);
  if (painCheck.triggered && painCheck.condition) {
    const area = CONDITION_LABELS[painCheck.condition].toLowerCase();
    const score = painCheck.score ?? 7;
    return `Your ${area} felt a ${score} last time, so we've kept today gentle.`;
  }
  for (const cond of profile.conditions) {
    const trend = isConditionTrendingDown(cond, painLogs);
    if (trend.trendingDown) {
      const area = CONDITION_LABELS[cond].toLowerCase();
      return `Your ${area} has felt better for ${trend.weeks} weeks. Nice work. Today builds on that.`;
    }
  }
  if (missedDays >= 2) {
    return "Welcome back. We've halved today so it feels easy.";
  }
  if ((profile.activity?.hoursSittingPerDay ?? 0) > 8) {
    return 'You sit a lot, so today has extra short resets.';
  }
  return 'A mix of movement and quick resets to keep your day balanced.';
}

export function generateDailyPlan(
  dateStr: string,
  profile: ProfileDoc,
  schedule: ScheduleDoc,
  meta: MetaDoc,
  recentLogs: LogEntry[],
  painLogs: PainEntry[]
): DailyPlanDoc {
  const missedDays = getMissedDaysCount(meta.lastActiveDate, dateStr);
  const painStatus = hasPainSpikeOrHighPain(profile, painLogs);
  const isGentleDay =
    profile.safetyFlags.length > 0 || painStatus.triggered || missedDays >= 2;

  const { workout, durationMin } = pickMainWorkoutForDay(
    dateStr,
    profile,
    schedule,
    recentLogs,
    painLogs
  );

  const items: PlanItem[] = [];

  // 1. Main workout at start of day (e.g., 08:00)
  items.push({
    id: `item-workout-${dateStr}`,
    type: 'workout',
    refId: workout.id,
    title: 'Main workout',
    subtitle: `${durationMin} min ${workout.title.toLowerCase()}`,
    tag: workout.tag,
    category: 'coral',
    icon: 'person-standing',
    time: '08:00',
    durationMin,
    status: 'pending',
  });

  // 2. Resets placed in user's break windows
  const resetsPerDay = computeResetsPerDay(profile);
  const defaultWindows =
    schedule.breakWindows && schedule.breakWindows.length > 0
      ? schedule.breakWindows.map((w) => w.time)
      : ['10:30', '13:30', '15:30', '17:30'];

  const resetTimes: string[] = [...defaultWindows];
  while (resetTimes.length < resetsPerDay) {
    const fallbacks = ['10:30', '12:00', '13:30', '15:15', '17:00'];
    const nextTime = fallbacks.find((t) => !resetTimes.includes(t)) || '16:30';
    resetTimes.push(nextTime);
  }
  resetTimes.sort();

  const pickedSessionIds: string[] = [];
  // Ensure "desk-reset" is included at least once a day
  for (let i = 0; i < resetsPerDay; i++) {
    let chosenSession: Session;
    if (i === 0) {
      chosenSession = SESSIONS.find((s) => s.id === 'desk-reset') || SESSIONS[0];
    } else {
      const scored = scoreResetSessions(
        profile,
        recentLogs,
        painLogs,
        pickedSessionIds
      );
      chosenSession = scored[0]?.session || SESSIONS[i % SESSIONS.length];
    }
    pickedSessionIds.push(chosenSession.id);

    items.push({
      id: `item-reset-${i + 1}-${dateStr}`,
      type: 'reset',
      refId: chosenSession.id,
      title: chosenSession.title,
      subtitle: `3 min · ${chosenSession.subtitle}`,
      category: chosenSession.category,
      icon: chosenSession.icon,
      time: resetTimes[i] || '14:00',
      durationMin: 3,
      status: 'pending',
    });
  }

  // 3. Posture check at the first break after 11 AM
  const breakAfter11 =
    resetTimes.find((t) => t >= '11:00') || '11:30';
  items.push({
    id: `item-posture-${dateStr}`,
    type: 'posture',
    refId: 'posture-session',
    title: 'Posture check',
    subtitle: '2 min · Quick 5-point workspace check',
    category: 'primary',
    icon: 'person-standing',
    time: breakAfter11,
    durationMin: 2,
    status: 'pending',
  });

  // 4. Eyes session for desk workers around 4 PM
  if (schedule.workType === 'Desk' || profile.conditions.includes('eyes')) {
    const eyesSession = SESSIONS.find((s) => s.id === 'eyes')!;
    items.push({
      id: `item-eyes-${dateStr}`,
      type: 'reset',
      refId: 'eyes',
      title: eyesSession.title,
      subtitle: `2 min · ${eyesSession.subtitle}`,
      category: 'mint',
      icon: 'eye',
      time: '16:00',
      durationMin: 2,
      status: 'pending',
    });
  }

  // Sort items chronologically and mark the first pending item as 'next'
  items.sort((a, b) => a.time.localeCompare(b.time));
  if (items.length > 0) {
    items[0].status = 'next';
  }

  // 5. Daily boost quote matching cheer style
  const seenSet = new Set(meta.seenQuoteIds || []);
  const matchingQuotes = QUOTES.filter(
    (q) => q.style === profile.cheerStyle && !seenSet.has(q.id)
  );
  const chosenQuote =
    matchingQuotes[0] ||
    QUOTES.find((q) => q.style === profile.cheerStyle) ||
    QUOTES[0];

  // 6. Tiny win
  const firstResetTime = formatTime12h(resetTimes[0] || '10:30');
  const dayIndex = new Date(`${dateStr}T12:00:00`).getDate() % TINY_WIN_TEMPLATES.length;
  const tinyWin = TINY_WIN_TEMPLATES[dayIndex].replace('{time}', firstResetTime);

  // 7. Why today line
  const whyToday = buildWhyTodayLine(profile, painLogs, missedDays);

  return {
    date: dateStr,
    items,
    quoteId: chosenQuote.id,
    tinyWin,
    whyToday,
    postureDone: false,
    resetsPerDay,
    isGentleDay,
    isWelcomeBack: missedDays >= 2,
    painAlertCondition: painStatus.condition,
    createdAt: new Date().toISOString(),
  };
}

export function recalculatePlanStatuses(items: PlanItem[]): PlanItem[] {
  let foundNext = false;
  return items.map((item) => {
    if (item.status === 'done') return item;
    if (!foundNext) {
      foundNext = true;
      return { ...item, status: 'next' };
    }
    return { ...item, status: 'pending' };
  });
}

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = (time24 || '09:00').split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${m} ${period}`;
}

export function pickBestResetNow(
  profile: ProfileDoc,
  recentLogs: LogEntry[],
  painLogs: PainEntry[]
): Session {
  const scored = scoreResetSessions(profile, recentLogs, painLogs, []);
  return scored[0]?.session || SESSIONS[0];
}
