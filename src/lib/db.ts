import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import {
  UserDoc,
  ProfileDoc,
  ScheduleDoc,
  DailyPlanDoc,
  LogEntry,
  PainEntry,
  MetaDoc,
} from '../types';

interface SyncQueueItem {
  id: string;
  path: string;
  docId: string;
  data: any;
  action: 'set' | 'delete';
  createdAt: number;
}

interface HabitFlowDB extends DBSchema {
  kv: {
    key: string;
    value: any;
  };
  plans: {
    key: string; // date YYYY-MM-DD
    value: DailyPlanDoc;
  };
  logs: {
    key: string; // logId
    value: LogEntry;
  };
  pain: {
    key: string; // painId
    value: PainEntry;
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
  };
}

let dbPromise: Promise<IDBPDatabase<HabitFlowDB>> | null = null;
let syncErrorListener: ((msg: string) => void) | null = null;

export function setSyncErrorListener(listener: ((msg: string) => void) | null) {
  syncErrorListener = listener;
}

function reportErrorToast(err: unknown) {
  const rawMessage = err instanceof Error ? err.message : String(err);
  console.error('Firestore sync error:', rawMessage);
  if (syncErrorListener) {
    syncErrorListener(rawMessage);
  }
}

export function getLocalDB() {
  if (!dbPromise) {
    dbPromise = openDB<HabitFlowDB>('habit-flow-db', 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('kv')) {
          database.createObjectStore('kv');
        }
        if (!database.objectStoreNames.contains('plans')) {
          database.createObjectStore('plans', { keyPath: 'date' });
        }
        if (!database.objectStoreNames.contains('logs')) {
          database.createObjectStore('logs', { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains('pain')) {
          database.createObjectStore('pain', { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains('syncQueue')) {
          database.createObjectStore('syncQueue', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function canSyncToFirestore(uid: string): boolean {
  return (
    Boolean(uid) &&
    uid !== 'guest-local' &&
    Boolean(auth.currentUser) &&
    auth.currentUser?.uid === uid &&
    typeof navigator !== 'undefined' &&
    navigator.onLine
  );
}

export async function enqueueSync(
  path: string,
  docId: string,
  data: any,
  action: 'set' | 'delete' = 'set'
): Promise<SyncQueueItem> {
  const local = await getLocalDB();
  const item: SyncQueueItem = {
    id: `${path}/${docId}`,
    path,
    docId,
    data: data ? stripUndefined(data) : null,
    action,
    createdAt: Date.now(),
  };
  await local.put('syncQueue', item);
  return item;
}

async function syncSingleItemWithRetry(
  uid: string,
  item: SyncQueueItem,
  maxAttempts = 3
): Promise<void> {
  if (!canSyncToFirestore(uid)) return;

  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const ref = doc(db, item.path, item.docId);
      if (item.action === 'set') {
        await setDoc(ref, item.data, { merge: true });
      } else {
        await deleteDoc(ref);
      }
      const local = await getLocalDB();
      await local.delete('syncQueue', item.id);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, attempt * 1200));
      }
    }
  }

  if (lastErr) {
    reportErrorToast(lastErr);
    if (
      lastErr instanceof Error &&
      lastErr.message.includes('Missing or insufficient permissions')
    ) {
      try {
        handleFirestoreError(
          lastErr,
          OperationType.WRITE,
          `${item.path}/${item.docId}`
        );
      } catch {
        // Already logged structured error info
      }
    }
  }
}

function queueAndSyncInBackground(
  uid: string,
  path: string,
  docId: string,
  data: any,
  action: 'set' | 'delete' = 'set'
) {
  if (!uid || uid === 'guest-local') return;
  void enqueueSync(path, docId, data, action).then((item) => {
    void syncSingleItemWithRetry(uid, item);
  });
}

export async function flushSyncQueue(uid: string) {
  if (!canSyncToFirestore(uid)) return;
  const local = await getLocalDB();
  const items = await local.getAll('syncQueue');
  if (items.length === 0) return;

  for (const item of items) {
    if (!item.path.startsWith(`users/${uid}`)) continue;
    await syncSingleItemWithRetry(uid, item, 2);
  }
}

export async function saveUserDoc(uid: string, userDoc: UserDoc) {
  const clean = stripUndefined(userDoc);
  const local = await getLocalDB();
  await local.put('kv', clean, `user:${uid}`);
  queueAndSyncInBackground(uid, 'users', uid, clean, 'set');
}

export async function saveProfileDoc(uid: string, profile: ProfileDoc) {
  const clean = stripUndefined(profile);
  const local = await getLocalDB();
  await local.put('kv', clean, `profile:${uid}`);
  queueAndSyncInBackground(uid, `users/${uid}/profile`, 'main', clean, 'set');
}

export async function saveScheduleDoc(uid: string, schedule: ScheduleDoc) {
  const clean = stripUndefined(schedule);
  const local = await getLocalDB();
  await local.put('kv', clean, `schedule:${uid}`);
  queueAndSyncInBackground(uid, `users/${uid}/schedule`, 'main', clean, 'set');
}

export async function saveMetaDoc(uid: string, meta: MetaDoc) {
  const clean = stripUndefined(meta);
  const local = await getLocalDB();
  await local.put('kv', clean, `meta:${uid}`);
  queueAndSyncInBackground(uid, `users/${uid}/meta`, 'main', clean, 'set');
}

export async function saveDailyPlan(uid: string, plan: DailyPlanDoc) {
  const clean = stripUndefined(plan);
  const local = await getLocalDB();
  await local.put('plans', clean);
  queueAndSyncInBackground(
    uid,
    `users/${uid}/plans`,
    plan.date,
    clean,
    'set'
  );
}

export async function saveLogEntry(uid: string, log: LogEntry) {
  const clean = stripUndefined(log);
  const local = await getLocalDB();
  await local.put('logs', clean);
  queueAndSyncInBackground(uid, `users/${uid}/logs`, log.id, clean, 'set');
}

export async function savePainEntry(uid: string, pain: PainEntry) {
  const clean = stripUndefined(pain);
  const local = await getLocalDB();
  await local.put('pain', clean);
  queueAndSyncInBackground(uid, `users/${uid}/pain`, pain.id, clean, 'set');
}

export async function submitProblemReport(
  uid: string,
  conditionId: string,
  message: string
) {
  const reportId = `rep-${Date.now()}`;
  const payload = {
    conditionId,
    message: message.slice(0, 1000),
    createdAt: new Date().toISOString(),
  };
  queueAndSyncInBackground(
    uid,
    `users/${uid}/reports`,
    reportId,
    payload,
    'set'
  );
}

export async function loadSessionBundle(uid: string): Promise<{
  user: UserDoc | null;
  profile: ProfileDoc | null;
  schedule: ScheduleDoc | null;
  meta: MetaDoc | null;
  plans: Record<string, DailyPlanDoc>;
  logs: LogEntry[];
  pain: PainEntry[];
}> {
  const local = await getLocalDB();

  let user: UserDoc | null = (await local.get('kv', `user:${uid}`)) || null;
  let profile: ProfileDoc | null =
    (await local.get('kv', `profile:${uid}`)) || null;
  let schedule: ScheduleDoc | null =
    (await local.get('kv', `schedule:${uid}`)) || null;
  let meta: MetaDoc | null = (await local.get('kv', `meta:${uid}`)) || null;

  const allPlans = await local.getAll('plans');
  const plans: Record<string, DailyPlanDoc> = {};
  for (const p of allPlans) {
    plans[p.date] = p;
  }
  let logs = await local.getAll('logs');
  let pain = await local.getAll('pain');

  // If we already have local profile & schedule in IndexedDB, return immediately
  // and refresh from Firestore in the background so startup is instant!
  const fetchFromFirestore = async () => {
    if (!canSyncToFirestore(uid)) return;
    try {
      const [userSnap, profSnap, schedSnap, metaSnap] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDoc(doc(db, `users/${uid}/profile`, 'main')),
        getDoc(doc(db, `users/${uid}/schedule`, 'main')),
        getDoc(doc(db, `users/${uid}/meta`, 'main')),
      ]);

      if (userSnap.exists()) {
        user = userSnap.data() as UserDoc;
        await local.put('kv', user, `user:${uid}`);
      }
      if (profSnap.exists()) {
        profile = profSnap.data() as ProfileDoc;
        await local.put('kv', profile, `profile:${uid}`);
      }
      if (schedSnap.exists()) {
        schedule = schedSnap.data() as ScheduleDoc;
        await local.put('kv', schedule, `schedule:${uid}`);
      }
      if (metaSnap.exists()) {
        meta = metaSnap.data() as MetaDoc;
        await local.put('kv', meta, `meta:${uid}`);
      }

      if (logs.length === 0) {
        const logsSnap = await getDocs(collection(db, `users/${uid}/logs`));
        const remoteLogs: LogEntry[] = [];
        for (const d of logsSnap.docs) {
          const item = d.data() as LogEntry;
          remoteLogs.push(item);
          await local.put('logs', item);
        }
        if (remoteLogs.length > 0) logs = remoteLogs;
      }

      if (pain.length === 0) {
        const painSnap = await getDocs(collection(db, `users/${uid}/pain`));
        const remotePain: PainEntry[] = [];
        for (const d of painSnap.docs) {
          const item = d.data() as PainEntry;
          remotePain.push(item);
          await local.put('pain', item);
        }
        if (remotePain.length > 0) pain = remotePain;
      }
    } catch (err) {
      console.warn('Firestore session fetch fallback to IndexedDB:', err);
    }
  };

  if (profile && schedule) {
    void fetchFromFirestore();
  } else {
    // Wait up to 2.5 seconds on cold start if local IndexedDB is empty
    await Promise.race([
      fetchFromFirestore(),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  }

  return { user, profile, schedule, meta, plans, logs, pain };
}

export async function migrateGuestDataToUid(fromUid: string, toUid: string) {
  const local = await getLocalDB();
  const user = (await local.get('kv', `user:${fromUid}`)) as
    | UserDoc
    | undefined;
  const profile = (await local.get('kv', `profile:${fromUid}`)) as
    | ProfileDoc
    | undefined;
  const schedule = (await local.get('kv', `schedule:${fromUid}`)) as
    | ScheduleDoc
    | undefined;
  const meta = (await local.get('kv', `meta:${fromUid}`)) as
    | MetaDoc
    | undefined;

  if (user) await saveUserDoc(toUid, { ...user, isGuest: false });
  if (profile) await saveProfileDoc(toUid, profile);
  if (schedule) await saveScheduleDoc(toUid, schedule);
  if (meta) await saveMetaDoc(toUid, meta);

  const plans = await local.getAll('plans');
  for (const p of plans) {
    await saveDailyPlan(toUid, p);
  }
  const logs = await local.getAll('logs');
  for (const l of logs) {
    await saveLogEntry(toUid, l);
  }
  const pain = await local.getAll('pain');
  for (const pe of pain) {
    await savePainEntry(toUid, pe);
  }
}

export async function clearAllUserData(uid: string) {
  const local = await getLocalDB();
  await local.clear('kv');
  await local.clear('plans');
  await local.clear('logs');
  await local.clear('pain');
  await local.clear('syncQueue');

  if (canSyncToFirestore(uid)) {
    try {
      const subcollections = [
        'profile',
        'schedule',
        'plans',
        'logs',
        'pain',
        'meta',
        'reports',
      ];
      for (const sub of subcollections) {
        const snap = await getDocs(collection(db, `users/${uid}/${sub}`));
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      reportErrorToast(err);
    }
  }
}
