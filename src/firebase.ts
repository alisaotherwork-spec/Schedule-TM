import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Staff, ShiftType, MonthSchedule, BackupSnapshot } from './types';

const app = initializeApp(firebaseConfig);
const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
export const auth = getAuth(app);

// Google Workspace Scopes requested
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
];

const googleProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => googleProvider.addScope(scope));
googleProvider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initGoogleWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      onAuthSuccess?.(user, cachedAccessToken);
    } else {
      onAuthFailure?.();
    }
  });
};

export const signInGoogleWorkspace = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่ได้รับ Access Token จากการลงชื่อเข้าใช้ Google');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Workspace Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logoutGoogleWorkspace = async () => {
  cachedAccessToken = null;
  await signOut(auth);
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: true,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot as mandated by the Firebase skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection verified');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or running local fallback mode.');
    } else {
      console.warn('Firebase connection check:', error);
    }
  }
}
testConnection();

/**
 * Recursively removes any keys with `undefined` values so Firestore setDoc / updateDoc
 * never throws "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(val: T): T {
  if (val === undefined || val === null) {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof val === 'object' && !(val instanceof Date)) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        res[k] = sanitizeForFirestore(v);
      }
    }
    return res as T;
  }
  return val;
}

// Persistence helpers
export const subscribeStaff = (
  callback: (staffList: Staff[]) => void,
  onError?: (err: Error) => void
) => {
  const path = 'staff';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const staffList: Staff[] = [];
      snapshot.forEach((d) => {
        staffList.push(d.data() as Staff);
      });
      callback(staffList);
    },
    (err) => {
      console.warn('Staff subscription error, using local fallback:', err);
      onError?.(err);
    }
  );
};

export const saveStaff = async (staff: Staff) => {
  const path = `staff/${staff.id}`;
  try {
    const cleanData = sanitizeForFirestore(staff);
    await setDoc(doc(db, 'staff', staff.id), cleanData);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const removeStaff = async (staffId: string) => {
  const path = `staff/${staffId}`;
  try {
    await deleteDoc(doc(db, 'staff', staffId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

export const replaceAllStaffInFirestore = async (newStaffList: Staff[]) => {
  const path = 'staff';
  try {
    const existingSnap = await getDocs(collection(db, path));
    const deletePromises = existingSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    const savePromises = newStaffList.map((s) => {
      const cleanData = sanitizeForFirestore(s);
      return setDoc(doc(db, 'staff', s.id), cleanData);
    });
    await Promise.all(savePromises);
  } catch (err) {
    console.warn('Failed to replaceAllStaffInFirestore:', err);
  }
};

export const subscribeShiftTypes = (
  callback: (shiftTypes: ShiftType[]) => void,
  onError?: (err: Error) => void
) => {
  const path = 'shiftTypes';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: ShiftType[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ShiftType);
      });
      callback(list);
    },
    (err) => {
      console.warn('Shift types subscription error, using local fallback:', err);
      onError?.(err);
    }
  );
};

export const saveShiftType = async (shiftType: ShiftType) => {
  const path = `shiftTypes/${shiftType.id}`;
  try {
    const cleanData = sanitizeForFirestore(shiftType);
    await setDoc(doc(db, 'shiftTypes', shiftType.id), cleanData);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const removeShiftType = async (shiftTypeId: string) => {
  const path = `shiftTypes/${shiftTypeId}`;
  try {
    await deleteDoc(doc(db, 'shiftTypes', shiftTypeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

export const replaceAllShiftTypesInFirestore = async (newShiftTypes: ShiftType[]) => {
  const path = 'shiftTypes';
  try {
    const existingSnap = await getDocs(collection(db, path));
    const deletePromises = existingSnap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    const savePromises = newShiftTypes.map((st) => {
      const cleanData = sanitizeForFirestore(st);
      return setDoc(doc(db, 'shiftTypes', st.id), cleanData);
    });
    await Promise.all(savePromises);
  } catch (err) {
    console.warn('Failed to replaceAllShiftTypesInFirestore:', err);
  }
};

export const subscribeSchedule = (
  roomId: string,
  yearMonth: string,
  callback: (schedule: MonthSchedule | null) => void,
  onError?: (err: Error) => void
) => {
  const scheduleId = `${roomId}_${yearMonth}`;
  const path = `schedules/${scheduleId}`;
  return onSnapshot(
    doc(db, 'schedules', scheduleId),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as MonthSchedule);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Schedule subscription error, using local fallback:', err);
      onError?.(err);
    }
  );
};

export const saveSchedule = async (schedule: MonthSchedule) => {
  const path = `schedules/${schedule.id}`;
  try {
    const cleanData = sanitizeForFirestore(schedule);
    await setDoc(doc(db, 'schedules', schedule.id), cleanData);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

// ==========================================
// Real-time Automated Backup System
// ==========================================

export const saveRealtimeBackupSnapshot = async (snapshot: BackupSnapshot) => {
  const path = `backups/${snapshot.id}`;

  // 1. Mirror locally in localStorage for instant offline access
  try {
    const localRaw = localStorage.getItem('bloodbank_realtime_backups');
    const localList: BackupSnapshot[] = localRaw ? JSON.parse(localRaw) : [];
    const updatedLocal = [snapshot, ...localList.filter((b) => b.id !== snapshot.id)].slice(0, 30);
    localStorage.setItem('bloodbank_realtime_backups', JSON.stringify(updatedLocal));
  } catch (e) {
    console.warn('Local backup mirroring warning:', e);
  }

  // 2. Persist to Firestore in real-time
  try {
    const cleanData = sanitizeForFirestore(snapshot);
    await setDoc(doc(db, 'backups', snapshot.id), cleanData);
  } catch (err) {
    console.warn('Firestore backup write warning:', err);
  }
};

export const subscribeRealtimeBackups = (
  callback: (backups: BackupSnapshot[]) => void,
  onError?: (err: Error) => void
) => {
  const path = 'backups';
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(40));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: BackupSnapshot[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as BackupSnapshot);
        });
        if (list.length > 0) {
          // Update local cache
          localStorage.setItem('bloodbank_realtime_backups', JSON.stringify(list.slice(0, 30)));
          callback(list);
        } else {
          // Fallback to local cache if Firestore backups is empty
          try {
            const saved = localStorage.getItem('bloodbank_realtime_backups');
            if (saved) callback(JSON.parse(saved));
            else callback([]);
          } catch {
            callback([]);
          }
        }
      },
      (err) => {
        console.warn('Realtime backups subscription error, using local fallback:', err);
        try {
          const saved = localStorage.getItem('bloodbank_realtime_backups');
          if (saved) callback(JSON.parse(saved));
        } catch {}
        onError?.(err);
      }
    );
  } catch (err: any) {
    console.warn('Failed to subscribe realtime backups, fallback to local:', err);
    try {
      const saved = localStorage.getItem('bloodbank_realtime_backups');
      if (saved) callback(JSON.parse(saved));
    } catch {}
    return () => {};
  }
};

export const deleteBackupSnapshot = async (backupId: string) => {
  // 1. Remove from local mirror
  try {
    const localRaw = localStorage.getItem('bloodbank_realtime_backups');
    if (localRaw) {
      const localList: BackupSnapshot[] = JSON.parse(localRaw);
      const filtered = localList.filter((b) => b.id !== backupId);
      localStorage.setItem('bloodbank_realtime_backups', JSON.stringify(filtered));
    }
  } catch {}

  // 2. Remove from Firestore
  try {
    await deleteDoc(doc(db, 'backups', backupId));
  } catch (err) {
    console.warn('Firestore delete backup error:', err);
  }
};
