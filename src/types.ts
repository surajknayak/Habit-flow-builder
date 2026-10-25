export type ConditionId =
  | 'lower-back'
  | 'upper-back'
  | 'neck-shoulders'
  | 'eyes'
  | 'wrists-hands'
  | 'hips'
  | 'knees'
  | 'ankle-foot'
  | 'headaches'
  | 'high-bp'
  | 'heart'
  | 'pregnancy'
  | 'recent-surgery';

export type CheerStyle = 'gentle' | 'cheerleader' | 'data';
export type ActivityLevel = 'Starter' | 'Steady' | 'Active';
export type FeedbackType = 'Too easy' | 'Just right' | 'Too hard' | 'This hurt';

export interface Move {
  id: string;
  title: string;
  focus: string;
  twoSided: boolean;
  durationSec: number;
  instruction: string;
  dontCue: string;
  avoidFor: string[];
  media?: {
    illustration?: string;
  };
}

export interface Session {
  id: string;
  title: string;
  subtitle: string;
  category: 'primary' | 'lavender' | 'coral' | 'sun' | 'mint';
  icon: string;
  moves: string[];
  conditions: ConditionId[];
  wholeBody?: boolean;
  durationNote?: string;
}

export interface WorkoutPatternItem {
  label: string;
  sec: number;
}

export interface WorkoutTemplate {
  id: string;
  title: string;
  tag: string;
  theme: 'strength' | 'walk' | 'mobility' | 'intervals' | 'fun' | 'outdoors' | 'restore';
  equipment: string[];
  avoidFor: string[];
  main: {
    pattern?: WorkoutPatternItem[];
    rounds?: number;
    restSec?: number;
    moves?: string[];
    note?: string;
  };
  cues?: string[];
}

export interface CareCard {
  id: ConditionId;
  title: string;
  do: string[];
  dont: string[];
  recover: string[];
  seeDoctor: string[];
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  style: CheerStyle;
  prompt?: string;
}

export interface UserDoc {
  name: string;
  email?: string;
  photoURL?: string;
  isGuest: boolean;
  ageBand: string;
  sex: string;
  heightCm?: number;
  weightKg?: number;
  heightUnit?: 'cm' | 'ft';
  weightUnit?: 'kg' | 'lb';
  timeZone: string;
  language: string;
  createdAt: string;
}

export interface ProfileDoc {
  conditions: ConditionId[];
  painBaseline: Record<string, number>;
  painDuration: Record<string, string>;
  gettingWorse: Record<string, boolean>;
  safetyFlags: string[];
  equipment: string[];
  location: 'Home' | 'Office' | 'Both';
  goal: 'Less pain' | 'More energy' | 'Lose weight' | 'Build a habit';
  cheerStyle: CheerStyle;
  level: ActivityLevel;
  activity: {
    habitType: 'Mostly sitting' | 'Light walking' | 'Some exercise' | 'Regular exercise';
    exerciseDaysPerWeek: number;
    hoursSittingPerDay: number;
    hikesPerMonth: number;
    dailySteps?: number;
  };
  stepGoal?: number;
  laptopOnly?: boolean;
  consent: {
    at: string;
    version: string;
  };
}

export interface BreakWindow {
  label: 'Morning' | 'Lunch' | 'Afternoon' | 'Evening';
  time: string;
}

export interface ScheduleDoc {
  workStart: string;
  workEnd: string;
  workType: 'Desk' | 'Standing' | 'On the move' | 'Shifts';
  breakWindows: BreakWindow[];
  daysOff: string[]; // ['Sat', 'Sun']
  weekdayMinutes: 10 | 20 | 30 | 45;
  weekendMinutes: 10 | 20 | 30 | 45;
  remindersPerDay: number;
  quietStart: string;
  quietEnd: string;
}

export interface PlanItem {
  id: string;
  type: 'workout' | 'reset' | 'posture';
  refId: string;
  title: string;
  subtitle: string;
  tag?: string;
  category: 'primary' | 'lavender' | 'coral' | 'sun' | 'mint';
  icon: string;
  time: string; // "08:00"
  durationMin: number;
  status: 'pending' | 'next' | 'done';
}

export interface DailyPlanDoc {
  date: string; // YYYY-MM-DD
  items: PlanItem[];
  quoteId: string;
  tinyWin: string;
  whyToday: string;
  postureDone: boolean;
  postureScore?: number;
  resetsPerDay: number;
  isGentleDay?: boolean;
  isWelcomeBack?: boolean;
  painAlertCondition?: ConditionId;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  kind: 'workout' | 'reset' | 'posture' | 'manual';
  refId: string;
  title?: string;
  durationSec: number;
  movesCount?: number;
  feedback?: FeedbackType;
  hurtMoveId?: string;
  steps?: number;
  createdAt: string;
}

export interface PainEntry {
  id: string;
  date: string; // YYYY-MM-DD
  condition: ConditionId;
  score: number;
  note?: string;
  createdAt?: string;
}

export interface MetaDoc {
  streak: number;
  bestStreak: number;
  freezes: number;
  lastActiveDate: string;
  badges: string[];
  disabledMoveIds: string[];
  favouriteQuoteIds: string[];
  seenQuoteIds: string[];
  monthlyTheme: string;
  postureChecksHigh?: number;
  dailyStepsMap?: Record<string, number>;
  sittingReplies?: Record<string, { time: string; reply: 'got-up' | 'still-sitting' }[]>;
}
