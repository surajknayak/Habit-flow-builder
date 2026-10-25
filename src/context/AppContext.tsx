import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously,
  linkWithPopup,
  signOut,
  deleteUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  loadSessionBundle,
  saveUserDoc,
  saveProfileDoc,
  saveScheduleDoc,
  saveMetaDoc,
  saveDailyPlan,
  saveLogEntry,
  savePainEntry,
  flushSyncQueue,
  migrateGuestDataToUid,
  clearAllUserData,
  setSyncErrorListener,
} from '../lib/db';
import {
  computeResetsPerDay,
  computeStreakAndFreezes,
  computeWeeklyResetTarget,
  formatDateYYYYMMDD,
  generateDailyPlan,
  recalculatePlanStatuses,
  WORKOUTS,
} from '../lib/planEngine';
import {
  ConditionId,
  DailyPlanDoc,
  FeedbackType,
  LogEntry,
  MetaDoc,
  PainEntry,
  PlanItem,
  ProfileDoc,
  ScheduleDoc,
  UserDoc,
} from '../types';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface DueReminder {
  id: string;
  area: string;
  sessionId: string;
  durationMin: number;
  time: string;
}

interface AppContextValue {
  loading: boolean;
  uid: string | null;
  user: UserDoc | null;
  profile: ProfileDoc | null;
  schedule: ScheduleDoc | null;
  meta: MetaDoc;
  plans: Record<string, DailyPlanDoc>;
  todayDate: string;
  todayPlan: DailyPlanDoc | null;
  logs: LogEntry[];
  pain: PainEntry[];
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  isOnline: boolean;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  dueReminder: DueReminder | null;
  dismissReminder: (action: 'snooze' | 'skip' | 'start', sittingReply?: 'got-up' | 'still-sitting') => void;
  triggerDemoReminder: () => void;
  workoutPrefs: {
    durationMin: 10 | 20 | 30 | 45;
    jogSec: number;
    walkSec: number;
    warmupMin: number;
    rounds: number;
    restSec: number;
    audioCue: 'Soft chime' | 'Voice' | 'Vibration' | 'Off';
  };
  setWorkoutPrefs: React.Dispatch<
    React.SetStateAction<{
      durationMin: 10 | 20 | 30 | 45;
      jogSec: number;
      walkSec: number;
      warmupMin: number;
      rounds: number;
      restSec: number;
      audioCue: 'Soft chime' | 'Voice' | 'Vibration' | 'Off';
    }>
  >;
  // Auth
  signInWithGoogle: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  linkGuestToGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  deleteAccountAndData: () => Promise<void>;
  // Actions
  completeOnboarding: (
    userDoc: UserDoc,
    profileDoc: ProfileDoc,
    scheduleDoc: ScheduleDoc
  ) => Promise<void>;
  updateProfileAndSchedule: (
    partialProfile?: Partial<ProfileDoc>,
    partialSchedule?: Partial<ScheduleDoc>
  ) => Promise<void>;
  completeSession: (params: {
    planItemId?: string;
    kind: 'workout' | 'reset' | 'posture' | 'manual';
    refId: string;
    title: string;
    durationSec: number;
    movesCount?: number;
    steps?: number;
  }) => Promise<LogEntry>;
  submitSessionFeedback: (
    logId: string,
    feedback: FeedbackType,
    hurtMoveId?: string
  ) => Promise<void>;
  toggleMoveDisabled: (moveId: string) => Promise<void>;
  updatePlanItemsForDate: (dateStr: string, items: PlanItem[]) => Promise<void>;
  swapWorkoutForDate: (dateStr: string, newWorkoutId: string) => Promise<void>;
  getOrCreatePlanForDate: (dateStr: string) => DailyPlanDoc | null;
  startGentleWelcomeBackPlan: () => Promise<void>;
  savePainCheckin: (
    entries: { condition: ConditionId; score: number; note?: string }[]
  ) => Promise<void>;
  savePostureCheck: (score: number) => Promise<void>;
  addStepsForToday: (steps: number, goal?: number) => Promise<void>;
  importAppleHealthData: (
    dailySteps: Record<string, number>,
    workouts: LogEntry[]
  ) => Promise<void>;
  exportAllDataAsJson: () => void;
  // Computed unified metrics
  streak: number;
  freezeActive: boolean;
  resetsDoneToday: number;
  resetsPerDay: number;
  weeklyResetsDone: number;
  weeklyResetTarget: number;
  todaySteps: number;
}

const DEFAULT_META: MetaDoc = {
  streak: 0,
  bestStreak: 0,
  freezes: 1,
  lastActiveDate: '',
  badges: [],
  disabledMoveIds: [],
  favouriteQuoteIds: [],
  seenQuoteIds: [],
  monthlyTheme: 'Strong back',
  postureChecksHigh: 0,
  dailyStepsMap: {},
  sittingReplies: {},
};

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(() => {
    return localStorage.getItem('hf_guest_uid') || null;
  });
  const [user, setUser] = useState<UserDoc | null>(null);
  const [profile, setProfile] = useState<ProfileDoc | null>(null);
  const [schedule, setSchedule] = useState<ScheduleDoc | null>(null);
  const [meta, setMeta] = useState<MetaDoc>(DEFAULT_META);
  const [plans, setPlans] = useState<Record<string, DailyPlanDoc>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pain, setPain] = useState<PainEntry[]>([]);

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('hf_theme') as ThemeMode) || 'light';
  });
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dueReminder, setDueReminder] = useState<DueReminder | null>(null);
  const [snoozedUntil, setSnoozedUntil] = useState<number>(0);
  const [skippedRemindersToday, setSkippedRemindersToday] = useState<string[]>(
    []
  );

  const [workoutPrefs, setWorkoutPrefs] = useState<{
    durationMin: 10 | 20 | 30 | 45;
    jogSec: number;
    walkSec: number;
    warmupMin: number;
    rounds: number;
    restSec: number;
    audioCue: 'Soft chime' | 'Voice' | 'Vibration' | 'Off';
  }>({
    durationMin: 20,
    jogSec: 60,
    walkSec: 120,
    warmupMin: 5,
    rounds: 3,
    restSec: 30,
    audioCue: 'Soft chime',
  });

  const todayDate = formatDateYYYYMMDD(new Date());

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  useEffect(() => {
    setSyncErrorListener((errMsg: string) => {
      showToast(`Sync error: ${errMsg}`);
    });
    return () => setSyncErrorListener(null);
  }, [showToast]);

  // Theme application
  useEffect(() => {
    localStorage.setItem('hf_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      root.classList.toggle('dark', prefersDark);
    }
  }, [theme]);

  // Online / Offline listener
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      if (uid) flushSyncQueue(uid);
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [uid]);

  // Hydrate data when uid changes
  const hydrateUserSession = useCallback(
    async (activeUid: string) => {
      setLoading(true);
      try {
        const bundle = await loadSessionBundle(activeUid);
        setUser(bundle.user);
        setProfile(bundle.profile);
        setSchedule(bundle.schedule);
        const loadedMeta = bundle.meta || DEFAULT_META;
        setMeta(loadedMeta);
        setLogs(bundle.logs);
        setPain(bundle.pain);

        if (bundle.schedule) {
          const isWknd = [0, 6].includes(new Date().getDay());
          setWorkoutPrefs((prev) => ({
            ...prev,
            durationMin: isWknd
              ? bundle.schedule!.weekendMinutes
              : bundle.schedule!.weekdayMinutes,
          }));
        }

        const nextPlans = { ...bundle.plans };
        if (bundle.profile && bundle.schedule && !nextPlans[todayDate]) {
          const generated = generateDailyPlan(
            todayDate,
            bundle.profile,
            bundle.schedule,
            loadedMeta,
            bundle.logs,
            bundle.pain
          );
          nextPlans[todayDate] = generated;
          await saveDailyPlan(activeUid, generated);
        }
        setPlans(nextPlans);
      } finally {
        setLoading(false);
      }
    },
    [todayDate]
  );

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        localStorage.removeItem('hf_guest_uid');
        setUid(fbUser.uid);
        await hydrateUserSession(fbUser.uid);
      } else {
        const localGuest = localStorage.getItem('hf_guest_uid');
        if (localGuest) {
          setUid(localGuest);
          await hydrateUserSession(localGuest);
        } else {
          setUid(null);
          setUser(null);
          setProfile(null);
          setSchedule(null);
          setLoading(false);
        }
      }
    });
    return () => unsub();
  }, [hydrateUserSession]);

  // In-app reminder check every 30s
  useEffect(() => {
    if (!profile || !schedule || dueReminder) return;
    const checkReminders = () => {
      if (Date.now() < snoozedUntil) return;
      const now = new Date();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      if ((schedule.daysOff || []).includes(dayNames[now.getDay()])) return;

      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentHHMM = `${hh}:${mm}`;

      // Respect quiet hours (22:00 to 07:00)
      if (
        currentHHMM >= (schedule.quietStart || '22:00') ||
        currentHHMM <= (schedule.quietEnd || '07:00')
      ) {
        return;
      }

      const tPlan = plans[todayDate];
      if (!tPlan) return;

      const dueItem = tPlan.items.find(
        (it) =>
          it.type === 'reset' &&
          it.status !== 'done' &&
          it.time === currentHHMM &&
          !skippedRemindersToday.includes(it.id)
      );

      if (dueItem) {
        setDueReminder({
          id: dueItem.id,
          area: dueItem.title.toLowerCase(),
          sessionId: dueItem.refId,
          durationMin: dueItem.durationMin,
          time: dueItem.time,
        });
      }
    };

    const timer = setInterval(checkReminders, 30000);
    return () => clearInterval(timer);
  }, [profile, schedule, plans, todayDate, dueReminder, snoozedUntil, skippedRemindersToday]);

  const signInWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;
      const existingBundle = await loadSessionBundle(fbUser.uid);
      if (!existingBundle.user) {
        const newUserDoc: UserDoc = {
          name: fbUser.displayName || 'Friend',
          email: fbUser.email || undefined,
          photoURL: fbUser.photoURL || undefined,
          isGuest: false,
          ageBand: '25 to 34',
          sex: 'Prefer not to say',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          language: 'English',
          createdAt: new Date().toISOString(),
        };
        await saveUserDoc(fbUser.uid, newUserDoc);
        setUser(newUserDoc);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('popup-blocked')) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        showToast(`Google sign-in failed: ${msg || 'Try Guest mode.'}`);
      }
    }
  };

  const continueAsGuest = async () => {
    try {
      const cred = await signInAnonymously(auth);
      const guestUser: UserDoc = {
        name: 'Friend',
        isGuest: true,
        ageBand: '25 to 34',
        sex: 'Prefer not to say',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        language: 'English',
        createdAt: new Date().toISOString(),
      };
      await saveUserDoc(cred.user.uid, guestUser);
      setUser(guestUser);
    } catch {
      // Fallback when Anonymous provider is not yet enabled in Firebase Console
      const fallbackUid = 'guest-local';
      localStorage.setItem('hf_guest_uid', fallbackUid);
      const guestUser: UserDoc = {
        name: 'Friend',
        isGuest: true,
        ageBand: '25 to 34',
        sex: 'Prefer not to say',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        language: 'English',
        createdAt: new Date().toISOString(),
      };
      setUid(fallbackUid);
      await saveUserDoc(fallbackUid, guestUser);
      setUser(guestUser);
    }
  };

  const linkGuestToGoogle = async () => {
    if (!uid) return;
    try {
      if (auth.currentUser && auth.currentUser.isAnonymous) {
        const res = await linkWithPopup(auth.currentUser, googleProvider);
        const updatedUser: UserDoc = {
          ...(user || {
            ageBand: '25 to 34',
            sex: 'Prefer not to say',
            timeZone: 'UTC',
            language: 'English',
            createdAt: new Date().toISOString(),
          }),
          name: res.user.displayName || user?.name || 'Friend',
          email: res.user.email || undefined,
          photoURL: res.user.photoURL || undefined,
          isGuest: false,
        };
        await saveUserDoc(res.user.uid, updatedUser);
        setUser(updatedUser);
        showToast('Progress saved to your Google account!');
      } else {
        const oldUid = uid;
        const res = await signInWithPopup(auth, googleProvider);
        await migrateGuestDataToUid(oldUid, res.user.uid);
        localStorage.removeItem('hf_guest_uid');
        await hydrateUserSession(res.user.uid);
        showToast('Progress saved to your Google account!');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      const msg = err instanceof Error ? err.message : String(err);
      if (code === 'auth/credential-already-in-use') {
        showToast('That Google account already exists. Signing in and syncing...');
        const oldUid = uid;
        const res = await signInWithPopup(auth, googleProvider);
        await migrateGuestDataToUid(oldUid, res.user.uid);
        await hydrateUserSession(res.user.uid);
      } else {
        showToast(`Could not link Google account: ${msg}`);
      }
    }
  };

  const signOutUser = async () => {
    localStorage.removeItem('hf_guest_uid');
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
    setUid(null);
    setUser(null);
    setProfile(null);
    setSchedule(null);
  };

  const deleteAccountAndData = async () => {
    if (!uid) return;
    await clearAllUserData(uid);
    localStorage.removeItem('hf_guest_uid');
    try {
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
    } catch {
      await signOut(auth);
    }
    setUid(null);
    setUser(null);
    setProfile(null);
    setSchedule(null);
    setPlans({});
    setLogs([]);
    setPain([]);
    showToast('Account and data deleted.');
  };

  const completeOnboarding = async (
    userDoc: UserDoc,
    profileDoc: ProfileDoc,
    scheduleDoc: ScheduleDoc
  ) => {
    const activeUid = uid || 'guest-local';
    if (!uid) {
      localStorage.setItem('hf_guest_uid', activeUid);
      setUid(activeUid);
    }

    // Seed baseline pain logs so the Pain Trend chart has initial points
    const initialPainLogs: PainEntry[] = profileDoc.conditions.map((cond) => ({
      id: `pain-init-${cond}-${todayDate}`,
      date: todayDate,
      condition: cond,
      score: profileDoc.painBaseline[cond] ?? 4,
      note: 'Onboarding baseline',
      createdAt: new Date().toISOString(),
    }));

    const initialMeta: MetaDoc = {
      ...DEFAULT_META,
      monthlyTheme:
        profileDoc.conditions.includes('lower-back')
          ? 'Strong back'
          : profileDoc.conditions.includes('neck-shoulders')
          ? 'Calm neck & shoulders'
          : 'Steady daily motion',
    };

    const plan = generateDailyPlan(
      todayDate,
      profileDoc,
      scheduleDoc,
      initialMeta,
      [],
      initialPainLogs
    );

    // Update UI state immediately so navigation is instant
    setUser(userDoc);
    setProfile(profileDoc);
    setSchedule(scheduleDoc);
    setMeta(initialMeta);
    setPain(initialPainLogs);
    setPlans({ [todayDate]: plan });

    // Save to IndexedDB first and queue background Firestore sync with retry
    await Promise.all([
      saveUserDoc(activeUid, userDoc),
      saveProfileDoc(activeUid, profileDoc),
      saveScheduleDoc(activeUid, scheduleDoc),
      saveMetaDoc(activeUid, initialMeta),
      saveDailyPlan(activeUid, plan),
      ...initialPainLogs.map((pe) => savePainEntry(activeUid, pe)),
    ]);
  };

  const updateProfileAndSchedule = async (
    partialProfile?: Partial<ProfileDoc>,
    partialSchedule?: Partial<ScheduleDoc>
  ) => {
    if (!uid || !profile || !schedule) return;
    const nextProfile = partialProfile ? { ...profile, ...partialProfile } : profile;
    const nextSchedule = partialSchedule
      ? { ...schedule, ...partialSchedule }
      : schedule;

    setProfile(nextProfile);
    setSchedule(nextSchedule);
    await saveProfileDoc(uid, nextProfile);
    await saveScheduleDoc(uid, nextSchedule);

    // Regenerate today's plan while keeping already completed tasks
    const existingToday = plans[todayDate];
    const freshPlan = generateDailyPlan(
      todayDate,
      nextProfile,
      nextSchedule,
      meta,
      logs,
      pain
    );
    if (existingToday) {
      const doneIds = new Set(
        existingToday.items.filter((i) => i.status === 'done').map((i) => i.refId)
      );
      freshPlan.items = recalculatePlanStatuses(
        freshPlan.items.map((it) =>
          doneIds.has(it.refId) ? { ...it, status: 'done' } : it
        )
      );
    }
    setPlans((prev) => ({ ...prev, [todayDate]: freshPlan }));
    await saveDailyPlan(uid, freshPlan);
    showToast('Saved.');
  };

  const completeSession = async (params: {
    planItemId?: string;
    kind: 'workout' | 'reset' | 'posture' | 'manual';
    refId: string;
    title: string;
    durationSec: number;
    movesCount?: number;
    steps?: number;
  }): Promise<LogEntry> => {
    const activeUid = uid || 'guest-local';
    const newLog: LogEntry = {
      id: `log-${Date.now()}`,
      date: todayDate,
      kind: params.kind,
      refId: params.refId,
      title: params.title,
      durationSec: params.durationSec,
      movesCount: params.movesCount || 5,
      steps: params.steps,
      createdAt: new Date().toISOString(),
    };

    const nextLogs = [...logs, newLog];
    setLogs(nextLogs);
    await saveLogEntry(activeUid, newLog);

    // Update today's plan item status to 'done'
    const currentPlan = plans[todayDate];
    if (currentPlan) {
      let matched = false;
      const updatedItems = currentPlan.items.map((item) => {
        if (
          !matched &&
          item.status !== 'done' &&
          (item.id === params.planItemId || item.refId === params.refId)
        ) {
          matched = true;
          return { ...item, status: 'done' as const };
        }
        return item;
      });
      const recalced = recalculatePlanStatuses(updatedItems);
      const nextPlan: DailyPlanDoc = {
        ...currentPlan,
        items: recalced,
        postureDone:
          params.kind === 'posture' ? true : currentPlan.postureDone,
      };
      setPlans((prev) => ({ ...prev, [todayDate]: nextPlan }));
      await saveDailyPlan(activeUid, nextPlan);
    }

    // Update streak and badges in meta
    const streakInfo = computeStreakAndFreezes(nextLogs, todayDate);
    const nextBadges = new Set(meta.badges || []);
    if (streakInfo.streak >= 3) nextBadges.add('3-Day Reset');
    if (streakInfo.streak >= 7) nextBadges.add('7-Day Consistency');
    if (streakInfo.streak >= 30) nextBadges.add('30-Day Master');
    if (params.kind === 'workout') nextBadges.add('First Workout');

    const backResetsCount = nextLogs.filter(
      (l) => l.refId === 'lower-back' || l.refId === 'hips-glutes'
    ).length;
    if (backResetsCount >= 5) nextBadges.add('Back Care Streak');

    const nextStepsMap = { ...(meta.dailyStepsMap || {}) };
    if (params.steps && params.steps > 0) {
      nextStepsMap[todayDate] = (nextStepsMap[todayDate] || 0) + params.steps;
    }

    const nextMeta: MetaDoc = {
      ...meta,
      streak: streakInfo.streak,
      bestStreak: Math.max(meta.bestStreak || 0, streakInfo.bestStreak),
      lastActiveDate: todayDate,
      badges: Array.from(nextBadges),
      dailyStepsMap: nextStepsMap,
    };
    setMeta(nextMeta);
    await saveMetaDoc(activeUid, nextMeta);

    return newLog;
  };

  const submitSessionFeedback = async (
    logId: string,
    feedback: FeedbackType,
    hurtMoveId?: string
  ) => {
    const activeUid = uid || 'guest-local';
    const targetLog = logs.find((l) => l.id === logId);
    if (targetLog) {
      const updated: LogEntry = { ...targetLog, feedback, hurtMoveId };
      setLogs((prev) => prev.map((l) => (l.id === logId ? updated : l)));
      await saveLogEntry(activeUid, updated);
    }

    if (feedback === 'This hurt' && hurtMoveId) {
      const disabled = Array.from(
        new Set([...(meta.disabledMoveIds || []), hurtMoveId])
      );
      const nextMeta = { ...meta, disabledMoveIds: disabled };
      setMeta(nextMeta);
      await saveMetaDoc(activeUid, nextMeta);
    }
  };

  const toggleMoveDisabled = async (moveId: string) => {
    if (!uid) return;
    const exists = (meta.disabledMoveIds || []).includes(moveId);
    const nextDisabled = exists
      ? meta.disabledMoveIds.filter((id) => id !== moveId)
      : [...(meta.disabledMoveIds || []), moveId];
    const nextMeta = { ...meta, disabledMoveIds: nextDisabled };
    setMeta(nextMeta);
    await saveMetaDoc(uid, nextMeta);
    showToast(exists ? 'Move re-enabled in your plans.' : 'Move disabled.');
  };

  const updatePlanItemsForDate = async (dateStr: string, items: PlanItem[]) => {
    if (!uid) return;
    const targetPlan = plans[dateStr];
    if (!targetPlan) return;
    const recalced = recalculatePlanStatuses(items);
    const resetsCount = recalced.filter((i) => i.type === 'reset' && i.refId !== 'eyes').length;
    const nextPlan: DailyPlanDoc = {
      ...targetPlan,
      items: recalced,
      resetsPerDay: Math.max(1, resetsCount),
    };
    setPlans((prev) => ({ ...prev, [dateStr]: nextPlan }));
    await saveDailyPlan(uid, nextPlan);
    showToast('Plan updated.');
  };

  const swapWorkoutForDate = async (dateStr: string, newWorkoutId: string) => {
    if (!uid) return;
    const targetPlan = getOrCreatePlanForDate(dateStr);
    const newWorkout = WORKOUTS.find((w) => w.id === newWorkoutId);
    if (!targetPlan || !newWorkout) return;

    const updatedItems = targetPlan.items.map((it) => {
      if (it.type === 'workout') {
        return {
          ...it,
          refId: newWorkout.id,
          subtitle: `${it.durationMin} min ${newWorkout.title.toLowerCase()}`,
          tag: newWorkout.tag,
        };
      }
      return it;
    });
    const nextPlan: DailyPlanDoc = {
      ...targetPlan,
      items: updatedItems,
    };
    setPlans((prev) => ({ ...prev, [dateStr]: nextPlan }));
    await saveDailyPlan(uid, nextPlan);
    showToast(`Swapped to ${newWorkout.title}.`);
  };

  const getOrCreatePlanForDate = useCallback(
    (dateStr: string): DailyPlanDoc | null => {
      if (plans[dateStr]) return plans[dateStr];
      if (!profile || !schedule) return null;
      return generateDailyPlan(dateStr, profile, schedule, meta, logs, pain);
    },
    [plans, profile, schedule, meta, logs, pain]
  );

  const startGentleWelcomeBackPlan = async () => {
    if (!uid || !profile || !schedule) return;
    const currentPlan = plans[todayDate];
    if (!currentPlan) return;
    const halvedItems = currentPlan.items.map((it) =>
      it.type === 'workout'
        ? { ...it, durationMin: 10, subtitle: `10 min easy brisk walk`, refId: 'brisk-walk', tag: 'Easy' }
        : it
    );
    const nextPlan: DailyPlanDoc = {
      ...currentPlan,
      items: halvedItems,
      isWelcomeBack: false,
      isGentleDay: true,
      whyToday: "Welcome back. We've halved today so it feels easy.",
    };
    setPlans((prev) => ({ ...prev, [todayDate]: nextPlan }));
    await saveDailyPlan(uid, nextPlan);
    showToast('Gentle plan ready.');
  };

  const savePainCheckin = async (
    entries: { condition: ConditionId; score: number; note?: string }[]
  ) => {
    const activeUid = uid || 'guest-local';
    const newEntries: PainEntry[] = entries.map((e, i) => ({
      id: `pain-${todayDate}-${e.condition}-${Date.now() + i}`,
      date: todayDate,
      condition: e.condition,
      score: e.score,
      note: e.note,
      createdAt: new Date().toISOString(),
    }));
    const nextPain = [...pain, ...newEntries];
    setPain(nextPain);
    for (const pe of newEntries) {
      await savePainEntry(activeUid, pe);
    }

    // If any score >= 7, ease today's plan automatically per section 7.9
    if (entries.some((e) => e.score >= 7) && profile && schedule) {
      const highCond = entries.find((e) => e.score >= 7)!.condition;
      const easedPlan = generateDailyPlan(
        todayDate,
        profile,
        schedule,
        meta,
        logs,
        nextPain
      );
      easedPlan.painAlertCondition = highCond;
      setPlans((prev) => ({ ...prev, [todayDate]: easedPlan }));
      await saveDailyPlan(activeUid, easedPlan);
    }

    showToast('Saved. Nice job checking in.');
  };

  const savePostureCheck = async (score: number) => {
    const activeUid = uid || 'guest-local';
    const currentPlan = plans[todayDate];
    if (currentPlan) {
      const updatedItems = recalculatePlanStatuses(
        currentPlan.items.map((it) =>
          it.type === 'posture' ? { ...it, status: 'done' as const } : it
        )
      );
      const nextPlan: DailyPlanDoc = {
        ...currentPlan,
        items: updatedItems,
        postureDone: true,
        postureScore: score,
      };
      setPlans((prev) => ({ ...prev, [todayDate]: nextPlan }));
      await saveDailyPlan(activeUid, nextPlan);
    }

    const highChecks = (meta.postureChecksHigh || 0) + (score >= 4 ? 1 : 0);
    const nextBadges = new Set(meta.badges || []);
    if (highChecks >= 7) nextBadges.add('Posture Pro');
    const nextMeta: MetaDoc = {
      ...meta,
      postureChecksHigh: highChecks,
      badges: Array.from(nextBadges),
    };
    setMeta(nextMeta);
    await saveMetaDoc(activeUid, nextMeta);
    showToast(`Posture check saved (${score} of 5).`);
  };

  const addStepsForToday = async (steps: number, goal?: number) => {
    const activeUid = uid || 'guest-local';
    const nextStepsMap = {
      ...(meta.dailyStepsMap || {}),
      [todayDate]: steps,
    };
    const nextMeta: MetaDoc = {
      ...meta,
      dailyStepsMap: nextStepsMap,
    };
    setMeta(nextMeta);
    await saveMetaDoc(activeUid, nextMeta);

    if (typeof goal === 'number' && profile) {
      const nextProfile = { ...profile, stepGoal: goal };
      setProfile(nextProfile);
      await saveProfileDoc(activeUid, nextProfile);
    }
    showToast('Steps saved.');
  };

  const importAppleHealthData = async (
    dailySteps: Record<string, number>,
    importedWorkouts: LogEntry[]
  ) => {
    const activeUid = uid || 'guest-local';
    const mergedSteps = {
      ...(meta.dailyStepsMap || {}),
      ...dailySteps,
    };
    const nextMeta: MetaDoc = {
      ...meta,
      dailyStepsMap: mergedSteps,
    };
    setMeta(nextMeta);
    await saveMetaDoc(activeUid, nextMeta);

    const existingIds = new Set(logs.map((l) => l.id));
    const newWorkouts = importedWorkouts.filter((w) => !existingIds.has(w.id));
    if (newWorkouts.length > 0) {
      setLogs((prev) => [...prev, ...newWorkouts]);
      for (const w of newWorkouts) {
        await saveLogEntry(activeUid, w);
      }
    }
    showToast(
      `Imported ${Object.keys(dailySteps).length} days of steps and ${newWorkouts.length} workouts.`
    );
  };

  const exportAllDataAsJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      profile,
      schedule,
      meta,
      plans,
      logs,
      pain,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-flow-export-${todayDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data exported.');
  };

  const dismissReminder = (
    action: 'snooze' | 'skip' | 'start',
    sittingReply?: 'got-up' | 'still-sitting'
  ) => {
    if (!dueReminder) return;
    if (sittingReply && uid) {
      const existing = meta.sittingReplies?.[todayDate] || [];
      const nextMeta: MetaDoc = {
        ...meta,
        sittingReplies: {
          ...(meta.sittingReplies || {}),
          [todayDate]: [
            ...existing,
            { time: dueReminder.time, reply: sittingReply },
          ],
        },
      };
      setMeta(nextMeta);
      saveMetaDoc(uid, nextMeta);
    }

    if (action === 'snooze') {
      setSnoozedUntil(Date.now() + 10 * 60 * 1000);
      showToast('Snoozed for 10 minutes.');
    } else if (action === 'skip') {
      setSkippedRemindersToday((prev) => [...prev, dueReminder.id]);
      showToast('Skipped for today.');
    }
    setDueReminder(null);
  };

  const triggerDemoReminder = () => {
    const tPlan = plans[todayDate];
    const nextReset =
      tPlan?.items.find((i) => i.type === 'reset' && i.status !== 'done') ||
      tPlan?.items[0];
    setDueReminder({
      id: nextReset?.id || 'demo-reset',
      area: (nextReset?.title || 'neck and shoulders').toLowerCase(),
      sessionId: nextReset?.refId || 'neck-shoulders',
      durationMin: 3,
      time: nextReset?.time || '13:30',
    });
  };

  // Unified metrics across Today & Progress
  const todayPlan = plans[todayDate] || null;
  const resetsPerDay = todayPlan
    ? todayPlan.resetsPerDay
    : profile
    ? computeResetsPerDay(profile)
    : 3;

  const resetsDoneTodayFromPlan = todayPlan
    ? todayPlan.items.filter((i) => i.type === 'reset' && i.status === 'done')
        .length
    : 0;
  const resetsDoneTodayFromLogs = logs.filter(
    (l) => l.date === todayDate && l.kind === 'reset'
  ).length;
  const resetsDoneToday = Math.max(resetsDoneTodayFromPlan, resetsDoneTodayFromLogs);

  const weeklyResetTarget = schedule
    ? computeWeeklyResetTarget(resetsPerDay, schedule)
    : resetsPerDay * 5;

  // Compute resets done in the last 7 days (including today)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = formatDateYYYYMMDD(sevenDaysAgo);
  const pastWeekResetLogs = logs.filter(
    (l) => l.date >= sevenDaysAgoStr && l.date < todayDate && l.kind === 'reset'
  ).length;
  const weeklyResetsDone = pastWeekResetLogs + resetsDoneToday;

  const streakInfo = computeStreakAndFreezes(logs, todayDate);
  const streak = Math.max(meta.streak || 0, streakInfo.streak);
  const freezeActive = streakInfo.freezesUsedThisWeek > 0;
  const todaySteps =
    meta.dailyStepsMap?.[todayDate] ?? profile?.activity?.dailySteps ?? 0;

  return (
    <AppContext.Provider
      value={{
        loading,
        uid,
        user,
        profile,
        schedule,
        meta,
        plans,
        todayDate,
        todayPlan,
        logs,
        pain,
        theme,
        setTheme: setThemeState,
        isOnline,
        toastMessage,
        showToast,
        dueReminder,
        dismissReminder,
        triggerDemoReminder,
        workoutPrefs,
        setWorkoutPrefs,
        signInWithGoogle,
        continueAsGuest,
        linkGuestToGoogle,
        signOutUser,
        deleteAccountAndData,
        completeOnboarding,
        updateProfileAndSchedule,
        completeSession,
        submitSessionFeedback,
        toggleMoveDisabled,
        updatePlanItemsForDate,
        swapWorkoutForDate,
        getOrCreatePlanForDate,
        startGentleWelcomeBackPlan,
        savePainCheckin,
        savePostureCheck,
        addStepsForToday,
        importAppleHealthData,
        exportAllDataAsJson,
        streak,
        freezeActive,
        resetsDoneToday,
        resetsPerDay,
        weeklyResetsDone,
        weeklyResetTarget,
        todaySteps,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
