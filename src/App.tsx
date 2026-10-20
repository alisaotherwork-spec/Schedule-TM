import React, { useState, useEffect } from 'react';
import { Staff, ShiftType, MonthSchedule, UserSession, RoomId, BackupSnapshot, BackupTriggerType } from './types';
import {
  INITIAL_STAFF,
  INITIAL_SHIFT_TYPES,
  generateInitialSchedule,
} from './mockData';
import {
  subscribeStaff,
  saveStaff,
  removeStaff,
  replaceAllStaffInFirestore,
  subscribeShiftTypes,
  saveShiftType,
  removeShiftType,
  replaceAllShiftTypesInFirestore,
  subscribeSchedule,
  saveSchedule,
  saveRealtimeBackupSnapshot,
  subscribeRealtimeBackups,
  deleteBackupSnapshot,
  signInGoogleWorkspace,
  logoutGoogleWorkspace,
  getGoogleAccessToken,
  initGoogleWorkspaceAuth,
} from './firebase';
import { User } from 'firebase/auth';
import {
  syncScheduleToGoogleSheet,
  SyncResult,
} from './services/googleDriveService';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { formatYearMonthThai } from './utils/dateUtils';
import { Navbar, ActiveTab } from './components/Navbar';
import { ScheduleGrid } from './components/ScheduleGrid';
import { DailySummaryView } from './components/DailySummaryView';
import { OtClaimView } from './components/OtClaimView';
import { LoginPage } from './components/LoginPage';
import { LoginModal } from './components/LoginModal';
import { StaffManagementModal } from './components/StaffManagementModal';
import { ShiftManagementModal } from './components/ShiftManagementModal';
import { AutoScheduleModal } from './components/AutoScheduleModal';
import { ClearScheduleModal } from './components/ClearScheduleModal';
import { RealtimeBackupModal } from './components/RealtimeBackupModal';
import { CheckCircle2 } from 'lucide-react';
import {
  CuteAlien,
  CuteAstronaut,
  PaperPlanet,
  PaperStar,
  PaperRocket,
  SolarSystemBackground,
} from './components/CuteSpaceDecorations';

export default function App() {
  // Current month default
  const [yearMonth, setYearMonth] = useState('2026-10');
  const [activeTab, setActiveTab] = useState<ActiveTab>('lab');

  // Google Workspace / Drive Backup State
  const [googleWorkspaceUser, setGoogleWorkspaceUser] = useState<User | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isSyncingToDrive, setIsSyncingToDrive] = useState(false);
  const [lastDriveSyncResult, setLastDriveSyncResult] = useState<SyncResult | null>(() => {
    try {
      const saved = localStorage.getItem('bloodbank_last_drive_sync');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bloodbank_auto_sync');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const syncDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('bloodbank_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isGuest, setIsGuest] = useState(() => {
    try {
      return localStorage.getItem('bloodbank_is_guest') === 'true';
    } catch {
      return false;
    }
  });

  // Guard: non-admin users (general staff & guests) can ONLY view the schedule tabs ('lab' or 'donor')
  useEffect(() => {
    const hasAdminAccess = currentUser?.isAdmin || currentUser?.isSubAdmin;
    if (!hasAdminAccess && activeTab !== 'lab' && activeTab !== 'donor') {
      setActiveTab('lab');
    }
  }, [currentUser, activeTab]);

  // Data States with robust local fallbacks
  const [staffList, setStaffList] = useState<Staff[]>(() => {
    try {
      const saved = localStorage.getItem('bloodbank_staff');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_STAFF;
    } catch {
      return INITIAL_STAFF;
    }
  });

  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>(() => {
    try {
      const saved = localStorage.getItem('bloodbank_shifts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_SHIFT_TYPES;
    } catch {
      return INITIAL_SHIFT_TYPES;
    }
  });

  const [labSchedule, setLabSchedule] = useState<MonthSchedule>(() => {
    try {
      const saved = localStorage.getItem(`bloodbank_sched_lab_${yearMonth}`);
      return saved ? JSON.parse(saved) : generateInitialSchedule('lab', yearMonth);
    } catch {
      return generateInitialSchedule('lab', yearMonth);
    }
  });

  const [donorSchedule, setDonorSchedule] = useState<MonthSchedule>(() => {
    try {
      const saved = localStorage.getItem(`bloodbank_sched_donor_${yearMonth}`);
      return saved ? JSON.parse(saved) : generateInitialSchedule('donor', yearMonth);
    } catch {
      return generateInitialSchedule('donor', yearMonth);
    }
  });

  // Modals
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isAutoScheduleModalOpen, setIsAutoScheduleModalOpen] = useState(false);
  const [clearModalRoom, setClearModalRoom] = useState<RoomId | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Real-time Automated Backup States
  const [realtimeBackups, setRealtimeBackups] = useState<BackupSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('bloodbank_realtime_backups');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isRealtimeBackupModalOpen, setIsRealtimeBackupModalOpen] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem('bloodbank_last_backup_time');
    } catch {
      return null;
    }
  });
  const [isSavingBackup, setIsSavingBackup] = useState(false);

  // Monotonic Timestamp & Local Schedule Refs (Guards against stale remote snapshots & prevents rollback)
  const localEditTimestampsRef = React.useRef<{ [key: string]: number }>({});
  const localSchedulesRef = React.useRef<{ lab: MonthSchedule; donor: MonthSchedule }>({
    lab: labSchedule,
    donor: donorSchedule,
  });

  useEffect(() => {
    localSchedulesRef.current.lab = labSchedule;
  }, [labSchedule]);

  useEffect(() => {
    localSchedulesRef.current.donor = donorSchedule;
  }, [donorSchedule]);

  // Helper to count non-off shift assignments in a schedule
  const countScheduleAssignments = (sched: MonthSchedule | null | undefined): number => {
    if (!sched || !sched.assignments) return 0;
    let count = 0;
    Object.values(sched.assignments).forEach((dayMap) => {
      if (!dayMap) return;
      Object.values(dayMap).forEach((code) => {
        if (code && code !== 'OFFF') count++;
      });
    });
    return count;
  };

  // Subscribe to real-time cloud backups
  useEffect(() => {
    const unsubscribe = subscribeRealtimeBackups((list) => {
      if (list && list.length > 0) {
        setRealtimeBackups(list);
        setLastBackupTime(list[0].formattedDateThai);
        localStorage.setItem('bloodbank_last_backup_time', list[0].formattedDateThai);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync with Firestore for Staff
  useEffect(() => {
    let hasMigrated = false;
    const unsubscribe = subscribeStaff(
      (list) => {
        const hasLegacyStaff =
          list &&
          list.some(
            (s) =>
              s.id === 'staff-tanawat' ||
              s.id === 'staff-somchai' ||
              s.id === 'staff-1'
          );

        if (list && list.length > 0 && !hasLegacyStaff) {
          const sorted = [...list].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
          setStaffList(sorted);
          localStorage.setItem('bloodbank_staff', JSON.stringify(sorted));
        } else if (!hasMigrated) {
          hasMigrated = true;
          const saved = localStorage.getItem('bloodbank_staff');
          let staffToUse = INITIAL_STAFF;
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0 && !parsed.some((s: Staff) => s.id === 'staff-somchai')) {
                staffToUse = parsed;
              }
            } catch {}
          }
          setStaffList(staffToUse);
          localStorage.setItem('bloodbank_staff', JSON.stringify(staffToUse));
          replaceAllStaffInFirestore(staffToUse).catch(console.warn);
        }
      },
      () => {
        // Fallback to local data
        const saved = localStorage.getItem('bloodbank_staff');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setStaffList(parsed);
              return;
            }
          } catch {}
        }
        setStaffList(INITIAL_STAFF);
        localStorage.setItem('bloodbank_staff', JSON.stringify(INITIAL_STAFF));
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync with Firestore for Shift Types
  useEffect(() => {
    let hasMigratedShifts = false;
    const unsubscribe = subscribeShiftTypes(
      (types) => {
        if (types && types.length > 0) {
          setShiftTypes(types);
          localStorage.setItem('bloodbank_shifts', JSON.stringify(types));
        } else if (!hasMigratedShifts) {
          hasMigratedShifts = true;
          const saved = localStorage.getItem('bloodbank_shifts');
          let shiftsToUse = INITIAL_SHIFT_TYPES;
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                shiftsToUse = parsed;
              }
            } catch {}
          }
          setShiftTypes(shiftsToUse);
          localStorage.setItem('bloodbank_shifts', JSON.stringify(shiftsToUse));
          replaceAllShiftTypesInFirestore(shiftsToUse).catch(console.warn);
        }
      },
      () => {
        // Fallback
        const saved = localStorage.getItem('bloodbank_shifts');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setShiftTypes(parsed);
              return;
            }
          } catch {}
        }
        setShiftTypes(INITIAL_SHIFT_TYPES);
        localStorage.setItem('bloodbank_shifts', JSON.stringify(INITIAL_SHIFT_TYPES));
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync with Firestore for Lab Schedule (safely preserves latest edits and never reverts)
  useEffect(() => {
    // 1. Immediately load existing local copy if available
    try {
      const saved = localStorage.getItem(`bloodbank_sched_lab_${yearMonth}`);
      if (saved) {
        const parsed: MonthSchedule = JSON.parse(saved);
        if (parsed && parsed.assignments) {
          setLabSchedule(parsed);
          localSchedulesRef.current.lab = parsed;
        }
      }
    } catch {}

    // 2. Subscribe to Firestore
    const scheduleKey = `lab_${yearMonth}`;
    const unsubscribe = subscribeSchedule(
      'lab',
      yearMonth,
      (incomingSched) => {
        const currentLocal = localSchedulesRef.current.lab;
        const lastEditTime = localEditTimestampsRef.current[scheduleKey] || 0;
        const timeSinceLastLocalEdit = Date.now() - lastEditTime;

        // If local was edited within the last 10 seconds, local edits are protected against stale snapshots
        if (timeSinceLastLocalEdit < 10000) {
          if (!incomingSched || countScheduleAssignments(incomingSched) < countScheduleAssignments(currentLocal)) {
            saveSchedule(currentLocal).catch(console.warn);
          }
          return;
        }

        if (incomingSched && incomingSched.assignments) {
          const incomingCount = countScheduleAssignments(incomingSched);
          const localCount = countScheduleAssignments(currentLocal);

          // Never overwrite populated local schedule with an empty remote schedule!
          if (incomingCount === 0 && localCount > 0) {
            saveSchedule(currentLocal).catch(console.warn);
            return;
          }

          const incomingTime = incomingSched.updatedAt ? new Date(incomingSched.updatedAt).getTime() : 0;
          const localTime = currentLocal?.updatedAt ? new Date(currentLocal.updatedAt).getTime() : 0;

          // Only accept incoming if it is newer or has at least as many assignments
          if (incomingTime >= localTime || incomingCount >= localCount) {
            setLabSchedule(incomingSched);
            localSchedulesRef.current.lab = incomingSched;
            localStorage.setItem(`bloodbank_sched_lab_${yearMonth}`, JSON.stringify(incomingSched));
          } else {
            // Local is newer: preserve local and sync to Firestore
            saveSchedule(currentLocal).catch(console.warn);
          }
        } else {
          // Firestore document missing or null: DO NOT wipe local data!
          const cached = localStorage.getItem(`bloodbank_sched_lab_${yearMonth}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (countScheduleAssignments(parsed) > 0) {
                setLabSchedule(parsed);
                localSchedulesRef.current.lab = parsed;
                saveSchedule(parsed).catch(console.warn);
                return;
              }
            } catch {}
          }

          if (countScheduleAssignments(currentLocal) > 0) {
            saveSchedule(currentLocal).catch(console.warn);
            return;
          }

          // Only if genuinely blank new month
          const initial = generateInitialSchedule('lab', yearMonth);
          setLabSchedule(initial);
          localSchedulesRef.current.lab = initial;
          localStorage.setItem(`bloodbank_sched_lab_${yearMonth}`, JSON.stringify(initial));
          saveSchedule(initial).catch(console.warn);
        }
      },
      () => {}
    );
    return () => unsubscribe();
  }, [yearMonth]);

  // Sync with Firestore for Donor Schedule (safely preserves latest edits and never reverts)
  useEffect(() => {
    // 1. Immediately load existing local copy if available
    try {
      const saved = localStorage.getItem(`bloodbank_sched_donor_${yearMonth}`);
      if (saved) {
        const parsed: MonthSchedule = JSON.parse(saved);
        if (parsed && parsed.assignments) {
          setDonorSchedule(parsed);
          localSchedulesRef.current.donor = parsed;
        }
      }
    } catch {}

    // 2. Subscribe to Firestore
    const scheduleKey = `donor_${yearMonth}`;
    const unsubscribe = subscribeSchedule(
      'donor',
      yearMonth,
      (incomingSched) => {
        const currentLocal = localSchedulesRef.current.donor;
        const lastEditTime = localEditTimestampsRef.current[scheduleKey] || 0;
        const timeSinceLastLocalEdit = Date.now() - lastEditTime;

        // If local was edited within the last 10 seconds, local edits are protected against stale snapshots
        if (timeSinceLastLocalEdit < 10000) {
          if (!incomingSched || countScheduleAssignments(incomingSched) < countScheduleAssignments(currentLocal)) {
            saveSchedule(currentLocal).catch(console.warn);
          }
          return;
        }

        if (incomingSched && incomingSched.assignments) {
          const incomingCount = countScheduleAssignments(incomingSched);
          const localCount = countScheduleAssignments(currentLocal);

          // Never overwrite populated local schedule with an empty remote schedule!
          if (incomingCount === 0 && localCount > 0) {
            saveSchedule(currentLocal).catch(console.warn);
            return;
          }

          const incomingTime = incomingSched.updatedAt ? new Date(incomingSched.updatedAt).getTime() : 0;
          const localTime = currentLocal?.updatedAt ? new Date(currentLocal.updatedAt).getTime() : 0;

          if (incomingTime >= localTime || incomingCount >= localCount) {
            setDonorSchedule(incomingSched);
            localSchedulesRef.current.donor = incomingSched;
            localStorage.setItem(`bloodbank_sched_donor_${yearMonth}`, JSON.stringify(incomingSched));
          } else {
            // Local is newer: preserve local and sync to Firestore
            saveSchedule(currentLocal).catch(console.warn);
          }
        } else {
          // Firestore document missing or null: DO NOT wipe local data!
          const cached = localStorage.getItem(`bloodbank_sched_donor_${yearMonth}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (countScheduleAssignments(parsed) > 0) {
                setDonorSchedule(parsed);
                localSchedulesRef.current.donor = parsed;
                saveSchedule(parsed).catch(console.warn);
                return;
              }
            } catch {}
          }

          if (countScheduleAssignments(currentLocal) > 0) {
            saveSchedule(currentLocal).catch(console.warn);
            return;
          }

          const initial = generateInitialSchedule('donor', yearMonth);
          setDonorSchedule(initial);
          localSchedulesRef.current.donor = initial;
          localStorage.setItem(`bloodbank_sched_donor_${yearMonth}`, JSON.stringify(initial));
          saveSchedule(initial).catch(console.warn);
        }
      },
      () => {}
    );
    return () => unsubscribe();
  }, [yearMonth]);

  // Google Workspace Auth state listener
  useEffect(() => {
    const unsubscribe = initGoogleWorkspaceAuth(
      (user) => {
        setGoogleWorkspaceUser(user);
      },
      () => {
        setGoogleWorkspaceUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem('bloodbank_auto_sync', JSON.stringify(enabled));
  };

  const handleSignInGoogleWorkspace = async () => {
    try {
      const result = await signInGoogleWorkspace();
      if (result) {
        setGoogleWorkspaceUser(result.user);
      }
    } catch (err: any) {
      console.warn('Google Workspace login failed:', err);
      throw err;
    }
  };

  const handleSignOutGoogleWorkspace = async () => {
    await logoutGoogleWorkspace();
    setGoogleWorkspaceUser(null);
  };

  const handleSyncToDriveNow = async () => {
    let token = getGoogleAccessToken();
    if (!token) {
      const signInRes = await signInGoogleWorkspace();
      if (!signInRes?.accessToken) {
        throw new Error('กรุณาลงชื่อเข้าใช้ Google เพื่อดำเนินการสำรองข้อมูล');
      }
      token = signInRes.accessToken;
      setGoogleWorkspaceUser(signInRes.user);
    }

    setIsSyncingToDrive(true);
    try {
      const res = await syncScheduleToGoogleSheet(
        token,
        yearMonth,
        labSchedule,
        donorSchedule,
        staffList,
        shiftTypes
      );
      setLastDriveSyncResult(res);
    } finally {
      setIsSyncingToDrive(false);
    }
  };

  // Handle Login & Logout
  const handleLogin = (user: UserSession) => {
    setCurrentUser(user);
    setIsGuest(false);
    localStorage.setItem('bloodbank_user', JSON.stringify(user));
    localStorage.removeItem('bloodbank_is_guest');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsGuest(false);
    localStorage.removeItem('bloodbank_user');
    localStorage.removeItem('bloodbank_is_guest');
  };

  const handleContinueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('bloodbank_is_guest', 'true');
  };

  // ==========================================
  // Real-time Automated Backup Engine
  // ==========================================

  const countAssignedDuties = (labSched: MonthSchedule, donorSched: MonthSchedule): number => {
    let count = 0;
    [labSched, donorSched].forEach((sched) => {
      if (!sched?.assignments) return;
      Object.values(sched.assignments).forEach((dayMap) => {
        if (!dayMap) return;
        Object.values(dayMap).forEach((code) => {
          if (code && code !== 'OFFF') count++;
        });
      });
    });
    return count;
  };

  const formatDateTimeThai = (date: Date = new Date()): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const m = monthNames[date.getMonth()];
    const y = date.getFullYear() + 543;
    const time = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${day} ${m} ${y} เวลา ${time} น.`;
  };

  const createRealtimeBackupSnapshot = async (
    triggerType: BackupTriggerType,
    customDescription?: string,
    overrideLab?: MonthSchedule,
    overrideDonor?: MonthSchedule
  ) => {
    setIsSavingBackup(true);
    const targetLab = overrideLab || localSchedulesRef.current.lab || labSchedule;
    const targetDonor = overrideDonor || localSchedulesRef.current.donor || donorSchedule;
    const now = new Date();
    const formattedThai = formatDateTimeThai(now);
    const snapshotId = `backup_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`;

    const defaultDescMap: Record<BackupTriggerType, string> = {
      realtime_edit: `แก้ไขเวร Real-time (${formatYearMonthThai(yearMonth)})`,
      auto_schedule: `จัดเวรอัตโนมัติ (${formatYearMonthThai(yearMonth)})`,
      pre_clear: `จุดสำรองความปลอดภัยก่อนล้างตาราง (${formatYearMonthThai(yearMonth)})`,
      manual: `สำรองข้อมูลโดยผู้ใช้ (${formatYearMonthThai(yearMonth)})`,
      periodic: `สำรองข้อมูลอัตโนมัติตามรอบ (${formatYearMonthThai(yearMonth)})`,
      staff_change: `ปรับปรุงรายชื่อเจ้าหน้าที่`,
      shift_change: `ปรับปรุงรหัสเวรและอัตราค่าตอบแทน`,
      imported: `นำเข้าข้อมูลสำรอง`,
    };

    const snapshot: BackupSnapshot = {
      id: snapshotId,
      timestamp: now.toISOString(),
      formattedDateThai: formattedThai,
      yearMonth,
      triggerType,
      description: customDescription || defaultDescMap[triggerType] || 'สำรองข้อมูล Real-time',
      updatedBy: currentUser?.englishName || 'system',
      dutyCount: countAssignedDuties(targetLab, targetDonor),
      labSchedule: targetLab,
      donorSchedule: targetDonor,
      staffList,
      shiftTypes,
    };

    // 1. Synchronously update local backup list & last backup time so it's instantly preserved
    setRealtimeBackups((prev) => [snapshot, ...prev.filter((b) => b.id !== snapshot.id)].slice(0, 80));
    setLastBackupTime(formattedThai);
    try {
      localStorage.setItem('bloodbank_last_backup_time', formattedThai);
      const localRaw = localStorage.getItem('bloodbank_realtime_backups');
      const localList: BackupSnapshot[] = localRaw ? JSON.parse(localRaw) : [];
      const updatedLocal = [snapshot, ...localList.filter((b) => b.id !== snapshot.id)].slice(0, 80);
      localStorage.setItem('bloodbank_realtime_backups', JSON.stringify(updatedLocal));
    } catch (e) {
      console.warn('Local backup cache warning:', e);
    }

    try {
      await saveRealtimeBackupSnapshot(snapshot);
    } catch (err) {
      console.warn('Realtime backup snapshot cloud save error:', err);
    } finally {
      setIsSavingBackup(false);
    }
  };

  const handleRestoreBackup = async (snapshot: BackupSnapshot) => {
    // 1. Safety snapshot of current state before restoring
    await createRealtimeBackupSnapshot('realtime_edit', 'จุดสำรองความปลอดภัยก่อนกู้คืนข้อมูล');

    // 2. Restore schedules
    const nowMs = Date.now();
    if (snapshot.labSchedule) {
      localEditTimestampsRef.current[`lab_${snapshot.yearMonth}`] = nowMs;
      setLabSchedule(snapshot.labSchedule);
      localSchedulesRef.current.lab = snapshot.labSchedule;
      localStorage.setItem(`bloodbank_sched_lab_${snapshot.yearMonth}`, JSON.stringify(snapshot.labSchedule));
      await saveSchedule(snapshot.labSchedule).catch(console.warn);
    }
    if (snapshot.donorSchedule) {
      localEditTimestampsRef.current[`donor_${snapshot.yearMonth}`] = nowMs;
      setDonorSchedule(snapshot.donorSchedule);
      localSchedulesRef.current.donor = snapshot.donorSchedule;
      localStorage.setItem(`bloodbank_sched_donor_${snapshot.yearMonth}`, JSON.stringify(snapshot.donorSchedule));
      await saveSchedule(snapshot.donorSchedule).catch(console.warn);
    }
    if (snapshot.yearMonth && snapshot.yearMonth !== yearMonth) {
      setYearMonth(snapshot.yearMonth);
    }
    if (snapshot.staffList && snapshot.staffList.length > 0) {
      setStaffList(snapshot.staffList);
      localStorage.setItem('bloodbank_staff', JSON.stringify(snapshot.staffList));
      await replaceAllStaffInFirestore(snapshot.staffList).catch(console.warn);
    }
    if (snapshot.shiftTypes && snapshot.shiftTypes.length > 0) {
      setShiftTypes(snapshot.shiftTypes);
      localStorage.setItem('bloodbank_shifts', JSON.stringify(snapshot.shiftTypes));
      for (const st of snapshot.shiftTypes) {
        await saveShiftType(st).catch(console.warn);
      }
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    setRealtimeBackups((prev) => prev.filter((b) => b.id !== backupId));
    await deleteBackupSnapshot(backupId);
  };

  const handleImportBackupJson = async (payload: any) => {
    await createRealtimeBackupSnapshot('manual', 'จุดสำรองความปลอดภัยก่อนนำเข้าไฟล์ JSON');

    const nowMs = Date.now();
    if (payload.labSchedule) {
      const targetYM = payload.labSchedule.yearMonth || yearMonth;
      localEditTimestampsRef.current[`lab_${targetYM}`] = nowMs;
      setLabSchedule(payload.labSchedule);
      localSchedulesRef.current.lab = payload.labSchedule;
      localStorage.setItem(`bloodbank_sched_lab_${targetYM}`, JSON.stringify(payload.labSchedule));
      await saveSchedule(payload.labSchedule).catch(console.warn);
    }
    if (payload.donorSchedule) {
      const targetYM = payload.donorSchedule.yearMonth || yearMonth;
      localEditTimestampsRef.current[`donor_${targetYM}`] = nowMs;
      setDonorSchedule(payload.donorSchedule);
      localSchedulesRef.current.donor = payload.donorSchedule;
      localStorage.setItem(`bloodbank_sched_donor_${targetYM}`, JSON.stringify(payload.donorSchedule));
      await saveSchedule(payload.donorSchedule).catch(console.warn);
    }
    if (payload.staffList && Array.isArray(payload.staffList)) {
      setStaffList(payload.staffList);
      localStorage.setItem('bloodbank_staff', JSON.stringify(payload.staffList));
      await replaceAllStaffInFirestore(payload.staffList).catch(console.warn);
    }
    if (payload.shiftTypes && Array.isArray(payload.shiftTypes)) {
      setShiftTypes(payload.shiftTypes);
      localStorage.setItem('bloodbank_shifts', JSON.stringify(payload.shiftTypes));
      for (const st of payload.shiftTypes) {
        await saveShiftType(st).catch(console.warn);
      }
    }
    await createRealtimeBackupSnapshot('imported', 'นำเข้าไฟล์ข้อมูลสำรอง JSON สำเร็จ');
  };

  // Update a single shift cell (Immediate Real-time Backup & Rollback-proof)
  const handleUpdateShift = async (
    roomId: RoomId,
    staffId: string,
    day: number,
    shiftCode: string
  ) => {
    const isLab = roomId === 'lab';
    const currentSchedule = isLab ? labSchedule : donorSchedule;

    const newAssignments = {
      ...currentSchedule.assignments,
      [staffId]: {
        ...(currentSchedule.assignments[staffId] || {}),
        [day]: shiftCode,
      },
    };

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const updatedSchedule: MonthSchedule = {
      ...currentSchedule,
      assignments: newAssignments,
      updatedAt: nowIso,
      updatedBy: currentUser?.englishName || 'guest',
    };

    // 1. Guard against remote listener rollback with local timestamp
    const scheduleKey = `${roomId}_${yearMonth}`;
    localEditTimestampsRef.current[scheduleKey] = nowMs;

    // 2. Immediate optimistic state update
    if (isLab) {
      setLabSchedule(updatedSchedule);
      localSchedulesRef.current.lab = updatedSchedule;
    } else {
      setDonorSchedule(updatedSchedule);
      localSchedulesRef.current.donor = updatedSchedule;
    }

    // 3. Immediately persist to localStorage
    localStorage.setItem(`bloodbank_sched_${roomId}_${yearMonth}`, JSON.stringify(updatedSchedule));

    // 4. Back up data EVERY TIME on every edit immediately (เมื่อมีการแก้ไขให้สำรองข้อมูลทุกครั้ง)
    const targetLabForBackup = isLab ? updatedSchedule : labSchedule;
    const targetDonorForBackup = isLab ? donorSchedule : updatedSchedule;
    const staffName = staffList.find((s) => s.id === staffId)?.thaiName || staffId;
    createRealtimeBackupSnapshot(
      'realtime_edit',
      `แก้ไขเวร ${roomId === 'lab' ? 'ห้องปฏิบัติการ' : 'ห้องรับบริจาค'} (${staffName} วันที่ ${day}: "${shiftCode || 'ว่าง'}")`,
      targetLabForBackup,
      targetDonorForBackup
    ).catch(console.warn);

    // 5. Asynchronously persist to Firestore
    try {
      await saveSchedule(updatedSchedule);
    } catch (err) {
      console.warn('Failed to save to Firestore, safely preserved locally:', err);
    }

    // 6. Trigger Debounced Auto-Sync to Google Drive if connected and enabled
    if (autoSyncEnabled) {
      const token = getGoogleAccessToken();
      if (token) {
        if (syncDebounceTimerRef.current) {
          clearTimeout(syncDebounceTimerRef.current);
        }
        syncDebounceTimerRef.current = setTimeout(async () => {
          try {
            const currentLab = isLab ? updatedSchedule : labSchedule;
            const currentDonor = isLab ? donorSchedule : updatedSchedule;
            const res = await syncScheduleToGoogleSheet(
              token,
              yearMonth,
              currentLab,
              currentDonor,
              staffList,
              shiftTypes
            );
            setLastDriveSyncResult(res);
          } catch (syncErr) {
            console.warn('Auto-sync to Google Drive warning:', syncErr);
          }
        }, 2500);
      }
    }
  };

  // Staff CRUD
  const handleSaveStaff = async (staff: Staff) => {
    const isNew = !staffList.some((s) => s.id === staff.id);
    const exists = staffList.find((s) => s.id === staff.id);
    const updated = exists
      ? staffList.map((s) => (s.id === staff.id ? staff : s))
      : [...staffList, staff];

    setStaffList(updated);
    localStorage.setItem('bloodbank_staff', JSON.stringify(updated));

    // Non-blocking Firestore write
    saveStaff(staff).catch((err) => console.warn('Firestore write error:', err));

    // Trigger Real-time Automated Backup Snapshot
    createRealtimeBackupSnapshot(
      'staff_change',
      isNew
        ? `เพิ่มรายชื่อเจ้าหน้าที่ใหม่ "${staff.thaiName}" (${staff.englishName})`
        : `ปรับปรุงข้อมูลเจ้าหน้าที่ "${staff.thaiName}"`
    ).catch(console.warn);
  };

  const handleDeleteStaff = async (staffId: string) => {
    const target = staffList.find((s) => s.id === staffId);
    const updated = staffList.filter((s) => s.id !== staffId);
    setStaffList(updated);
    localStorage.setItem('bloodbank_staff', JSON.stringify(updated));

    removeStaff(staffId).catch((err) => console.warn('Firestore delete error:', err));

    // Trigger Real-time Snapshot
    createRealtimeBackupSnapshot(
      'staff_change',
      `ลบเจ้าหน้าที่ "${target?.thaiName || staffId}" ออกจากระบบ`
    ).catch(console.warn);
  };

  const handleReorderStaff = async (newOrderedList: Staff[]) => {
    const normalized = newOrderedList.map((s, idx) => ({ ...s, order: idx + 1 }));
    setStaffList(normalized);
    localStorage.setItem('bloodbank_staff', JSON.stringify(normalized));

    replaceAllStaffInFirestore(normalized).catch((err) => console.warn('Firestore reorder staff error:', err));

    // Trigger Real-time Snapshot
    createRealtimeBackupSnapshot(
      'staff_change',
      `จัดเรียงลำดับรายชื่อเจ้าหน้าที่ใหม่ (${normalized.length} คน)`
    ).catch(console.warn);
  };

  // Shift Types CRUD
  const handleSaveShiftType = async (shift: ShiftType) => {
    const isNew = !shiftTypes.some((s) => s.id === shift.id);
    const exists = shiftTypes.find((s) => s.id === shift.id);
    const updated = exists
      ? shiftTypes.map((s) => (s.id === shift.id ? shift : s))
      : [...shiftTypes, shift];

    setShiftTypes(updated);
    localStorage.setItem('bloodbank_shifts', JSON.stringify(updated));

    saveShiftType(shift).catch((err) => console.warn('Firestore write error:', err));

    // Trigger Real-time Snapshot
    createRealtimeBackupSnapshot(
      'shift_change',
      isNew
        ? `เพิ่มรหัสเวรใหม่ "${shift.code}" (${shift.name} - ${shift.rate} บาท)`
        : `ปรับปรุงรหัสเวร "${shift.code}" (${shift.name} - ${shift.rate} บาท)`
    ).catch(console.warn);
  };

  const handleDeleteShiftType = async (id: string) => {
    const target = shiftTypes.find((s) => s.id === id);
    const updated = shiftTypes.filter((s) => s.id !== id);
    setShiftTypes(updated);
    localStorage.setItem('bloodbank_shifts', JSON.stringify(updated));

    removeShiftType(id).catch((err) => console.warn('Firestore delete error:', err));

    // Trigger Real-time Snapshot
    createRealtimeBackupSnapshot(
      'shift_change',
      `ลบรหัสเวร "${target?.code || id}" ออกจากระบบ`
    ).catch(console.warn);
  };

  // Apply Auto-Schedule
  const handleApplyAutoSchedule = async (schedule: MonthSchedule) => {
    const nowMs = Date.now();
    const scheduleKey = `${schedule.roomId}_${schedule.yearMonth}`;
    localEditTimestampsRef.current[scheduleKey] = nowMs;

    if (schedule.roomId === 'lab') {
      setLabSchedule(schedule);
      localSchedulesRef.current.lab = schedule;
    } else {
      setDonorSchedule(schedule);
      localSchedulesRef.current.donor = schedule;
    }
    localStorage.setItem(`bloodbank_sched_${schedule.roomId}_${schedule.yearMonth}`, JSON.stringify(schedule));
    try {
      await saveSchedule(schedule);
    } catch (err) {
      console.warn('Firestore auto-schedule save notice (safely stored locally):', err);
    }

    // Realtime Backup Snapshot immediately
    createRealtimeBackupSnapshot(
      'auto_schedule',
      `จัดเวรอัตโนมัติห้อง${schedule.roomId === 'lab' ? 'ปฏิบัติการ' : 'รับบริจาค'} (${formatYearMonthThai(yearMonth)})`,
      schedule.roomId === 'lab' ? schedule : labSchedule,
      schedule.roomId === 'donor' ? schedule : donorSchedule
    ).catch(console.warn);

    setSuccessToast(
      `จัดเวรอัตโนมัติห้อง${schedule.roomId === 'lab' ? 'ปฏิบัติการ' : 'รับบริจาค'} เรียบร้อยและสำรองข้อมูลแล้ว ✨`
    );
  };

  // Staff Password Management
  const handleSaveNewPassword = async (staffId: string, newPassword: string) => {
    const staff = staffList.find((s) => s.id === staffId);
    if (!staff) return;
    const updatedStaff: Staff = {
      ...staff,
      password: newPassword,
      mustChangePassword: false,
    };
    await handleSaveStaff(updatedStaff);
  };

  const handleResetSubAdminPassword = async (staffId: string) => {
    const staff = staffList.find((s) => s.id === staffId);
    if (!staff) return;
    const updatedStaff: Staff = {
      ...staff,
      password: '1234',
      mustChangePassword: true,
    };
    await handleSaveStaff(updatedStaff);
  };

  // Restore Initial Staff List (All 31 official hospital staff)
  const handleRestoreInitialStaff = async () => {
    setStaffList(INITIAL_STAFF);
    localStorage.setItem('bloodbank_staff', JSON.stringify(INITIAL_STAFF));
    try {
      await replaceAllStaffInFirestore(INITIAL_STAFF);
    } catch (err) {
      console.warn('Restore staff Firestore warning:', err);
    }
    createRealtimeBackupSnapshot(
      'staff_change',
      'ดึงรายชื่อเจ้าหน้าที่เริ่มต้นทั้งหมด 31 ท่านกลับมา'
    ).catch(console.warn);
    setSuccessToast('ดึงรายชื่อเจ้าหน้าที่เริ่มต้นทั้งหมด 31 ท่านกลับมาเรียบร้อยแล้ว');
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Restore Initial Shift Types (Standard shift codes & compensation rates)
  const handleRestoreInitialShiftTypes = async () => {
    setShiftTypes(INITIAL_SHIFT_TYPES);
    localStorage.setItem('bloodbank_shifts', JSON.stringify(INITIAL_SHIFT_TYPES));
    try {
      await replaceAllShiftTypesInFirestore(INITIAL_SHIFT_TYPES);
    } catch (err) {
      console.warn('Restore shift types Firestore warning:', err);
    }
    createRealtimeBackupSnapshot(
      'shift_change',
      'ดึงรหัสเวรและอัตราค่าตอบแทนเริ่มต้นทั้งหมดกลับมา'
    ).catch(console.warn);
    setSuccessToast('ดึงรหัสเวรและอัตราค่าตอบแทนเริ่มต้นทั้งหมดกลับมาเรียบร้อยแล้ว');
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Restore All Initial Data (Both Staff and Shift Types)
  const handleRestoreAllInitialData = async () => {
    await handleRestoreInitialStaff();
    await handleRestoreInitialShiftTypes();
    setSuccessToast('ดึงรายชื่อเจ้าหน้าที่ 31 ท่าน และรหัสเวรทั้งหมดกลับมาเรียบร้อยแล้ว');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Open Clear Schedule Modal
  const handleOpenClearModal = (roomId: RoomId) => {
    setClearModalRoom(roomId);
  };

  // Execute clearing schedule without freezing or hanging
  const handleExecuteClearSchedule = async (scope: 'current' | 'both') => {
    const targetRoom = clearModalRoom || (activeTab === 'donor' ? 'donor' : 'lab');
    const shouldClearLab = scope === 'both' || targetRoom === 'lab';
    const shouldClearDonor = scope === 'both' || targetRoom === 'donor';
    const updatedBy = currentUser?.englishName || 'admin';

    // Capture current snapshot state before clearing
    const prevLab = labSchedule;
    const prevDonor = donorSchedule;

    const emptyLab: MonthSchedule = {
      id: `lab_${yearMonth}`,
      roomId: 'lab',
      yearMonth,
      assignments: {},
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    const emptyDonor: MonthSchedule = {
      id: `donor_${yearMonth}`,
      roomId: 'donor',
      yearMonth,
      assignments: {},
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    const nowMs = Date.now();
    // 1. Optimistic Immediate Update - State & localStorage update instantly
    if (shouldClearLab) {
      localEditTimestampsRef.current[`lab_${yearMonth}`] = nowMs;
      setLabSchedule(emptyLab);
      localSchedulesRef.current.lab = emptyLab;
      localStorage.setItem(`bloodbank_sched_lab_${yearMonth}`, JSON.stringify(emptyLab));
    }

    if (shouldClearDonor) {
      localEditTimestampsRef.current[`donor_${yearMonth}`] = nowMs;
      setDonorSchedule(emptyDonor);
      localSchedulesRef.current.donor = emptyDonor;
      localStorage.setItem(`bloodbank_sched_donor_${yearMonth}`, JSON.stringify(emptyDonor));
    }

    // 2. Close modal & show success toast immediately
    setClearModalRoom(null);
    setSuccessToast(
      scope === 'both'
        ? `ล้างตารางเวรทั้งห้องปฏิบัติการและห้องรับบริจาค ประจำเดือน ${formatYearMonthThai(yearMonth)} เป็นตารางเปล่าเรียบร้อยแล้ว`
        : `ล้างตารางเวร${targetRoom === 'lab' ? 'ห้องปฏิบัติการ' : 'ห้องรับบริจาค'} ประจำเดือน ${formatYearMonthThai(yearMonth)} เป็นตารางเปล่าเรียบร้อยแล้ว`
    );
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);

    // 3. Background Persistence & Real-time Snapshot (wrapped in Promise.race with timeout so it NEVER hangs)
    const backgroundTasks = async () => {
      // Safety Realtime Snapshot of state before clearing
      try {
        await createRealtimeBackupSnapshot(
          'pre_clear',
          `จุดปลอดภัยก่อนล้างตารางห้อง${scope === 'both' ? 'ทั้งหมด (Lab + รับบริจาค)' : targetRoom === 'lab' ? 'ปฏิบัติการ' : 'รับบริจาค'} (${formatYearMonthThai(yearMonth)})`,
          prevLab,
          prevDonor
        );
      } catch (err) {
        console.warn('Pre-clear backup snapshot warning:', err);
      }

      // Save to Firestore with timeout
      if (shouldClearLab) {
        try {
          await saveSchedule(emptyLab);
        } catch (err) {
          console.warn('Error clearing lab schedule in Firestore:', err);
        }
      }

      if (shouldClearDonor) {
        try {
          await saveSchedule(emptyDonor);
        } catch (err) {
          console.warn('Error clearing donor schedule in Firestore:', err);
        }
      }

      // Snapshot after clearing
      try {
        await createRealtimeBackupSnapshot(
          'manual',
          `ล้างตารางเวร${scope === 'both' ? 'ทั้งหมด' : targetRoom === 'lab' ? 'ห้องปฏิบัติการ' : 'ห้องรับบริจาค'} เป็นตารางเปล่า (${formatYearMonthThai(yearMonth)})`,
          shouldClearLab ? emptyLab : prevLab,
          shouldClearDonor ? emptyDonor : prevDonor
        );
      } catch (err) {
        console.warn('Post-clear backup snapshot warning:', err);
      }
    };

    // Run background tasks with a 2.5s maximum timeout so UI never blocks
    await Promise.race([
      backgroundTasks(),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]).catch(console.warn);
  };

  // Login Gate: Show LoginPage before entering the schedule page
  if (!currentUser && !isGuest) {
    return (
      <LoginPage
        staffList={staffList}
        onLogin={handleLogin}
        onContinueAsGuest={handleContinueAsGuest}
        onSaveNewPassword={handleSaveNewPassword}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-800 font-sans selection:bg-amber-200 selection:text-stone-900 flex flex-col relative">
      {/* Solar System Papercraft Celestial Background */}
      <SolarSystemBackground />

      {/* Navbar with Date Navigator and User Status */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        yearMonth={yearMonth}
        onChangeYearMonth={setYearMonth}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenStaffModal={() => setIsStaffModalOpen(true)}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onOpenGoogleDriveModal={() => setIsDriveModalOpen(true)}
        onOpenRealtimeBackupModal={() => setIsRealtimeBackupModalOpen(true)}
        lastBackupTime={lastBackupTime}
        isSavingBackup={isSavingBackup}
        isGoogleDriveConnected={Boolean(googleWorkspaceUser)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto px-3 sm:px-6 py-5 relative">
        {/* 1. Laboratory Schedule Tab */}
        {activeTab === 'lab' && (
          <ScheduleGrid
            roomId="lab"
            yearMonth={yearMonth}
            staffList={staffList}
            shiftTypes={shiftTypes}
            schedule={labSchedule}
            currentUser={currentUser}
            onUpdateShift={(staffId, day, shiftCode) =>
              handleUpdateShift('lab', staffId, day, shiftCode)
            }
            onOpenAutoSchedule={() => setIsAutoScheduleModalOpen(true)}
            onOpenStaffModal={() => setIsStaffModalOpen(true)}
            onOpenShiftModal={() => setIsShiftModalOpen(true)}
            onOpenGoogleDriveModal={() => setIsDriveModalOpen(true)}
            onOpenRealtimeBackupModal={() => setIsRealtimeBackupModalOpen(true)}
            onClearSchedule={() => handleOpenClearModal('lab')}
            onRestoreInitialData={handleRestoreAllInitialData}
          />
        )}

        {/* 2. Blood Donation Room Schedule Tab */}
        {activeTab === 'donor' && (
          <ScheduleGrid
            roomId="donor"
            yearMonth={yearMonth}
            staffList={staffList}
            shiftTypes={shiftTypes}
            schedule={donorSchedule}
            currentUser={currentUser}
            onUpdateShift={(staffId, day, shiftCode) =>
              handleUpdateShift('donor', staffId, day, shiftCode)
            }
            onOpenAutoSchedule={() => setIsAutoScheduleModalOpen(true)}
            onOpenStaffModal={() => setIsStaffModalOpen(true)}
            onOpenShiftModal={() => setIsShiftModalOpen(true)}
            onOpenGoogleDriveModal={() => setIsDriveModalOpen(true)}
            onOpenRealtimeBackupModal={() => setIsRealtimeBackupModalOpen(true)}
            onClearSchedule={() => handleOpenClearModal('donor')}
            onRestoreInitialData={handleRestoreAllInitialData}
          />
        )}

        {/* 3. Daily Duty Summary Tab (6 columns - Admin / Sub-Admin Only) */}
        {activeTab === 'daily_summary' && (currentUser?.isAdmin || currentUser?.isSubAdmin) && (
          <DailySummaryView
            yearMonth={yearMonth}
            staffList={staffList}
            shiftTypes={shiftTypes}
            labSchedule={labSchedule}
            donorSchedule={donorSchedule}
          />
        )}

        {/* 4. Overtime (OT) Compensation Claim Sheet Tab (4 columns - Admin / Sub-Admin Only) */}
        {activeTab === 'ot_claim' && (currentUser?.isAdmin || currentUser?.isSubAdmin) && (
          <OtClaimView
            yearMonth={yearMonth}
            staffList={staffList}
            shiftTypes={shiftTypes}
            labSchedule={labSchedule}
            donorSchedule={donorSchedule}
            currentUser={currentUser}
            onOpenShiftModal={() => setIsShiftModalOpen(true)}
            onSaveShiftType={handleSaveShiftType}
          />
        )}

        {/* 5. Staff Management Tab (Admin / Sub-Admin Only) */}
        {activeTab === 'staff' && (currentUser?.isAdmin || currentUser?.isSubAdmin) && (
          <StaffManagementModal
            isOpen={true}
            isPageMode={true}
            onClose={() => setActiveTab('lab')}
            staffList={staffList}
            currentUser={currentUser}
            onSaveStaff={handleSaveStaff}
            onDeleteStaff={handleDeleteStaff}
            onReorderStaff={handleReorderStaff}
            onResetSubAdminPassword={handleResetSubAdminPassword}
            onRestoreInitialStaff={handleRestoreInitialStaff}
          />
        )}

        {/* 6. Shift Configuration Tab (Admin / Sub-Admin Only) */}
        {activeTab === 'shifts' && (currentUser?.isAdmin || currentUser?.isSubAdmin) && (
          <ShiftManagementModal
            isOpen={true}
            isPageMode={true}
            onClose={() => setActiveTab('lab')}
            shiftTypes={shiftTypes}
            onSaveShiftType={handleSaveShiftType}
            onDeleteShiftType={handleDeleteShiftType}
            onRestoreInitialShiftTypes={handleRestoreInitialShiftTypes}
          />
        )}
      </main>

      {/* Cute Paper-Cut Space Footer */}
      <footer className="mt-auto border-t-2 border-[#E7DFD5] bg-[#FAF5EB] py-4 px-4 sm:px-8 text-center text-xs text-stone-600">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-xl border border-[#E3D7C5] shadow-xs shrink-0">
            <CuteAlien size={22} />
            <span className="font-semibold text-stone-700">ธีมตัดกระดาษอวกาศ</span>
            <CuteAstronaut size={22} />
          </div>
          <span className="hidden sm:inline text-stone-300">•</span>
          <span className="font-medium text-stone-700">
            ระบบจัดตารางเวร งานเวชศาสตร์บริการโลหิต โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
          </span>
          <span className="hidden sm:inline text-stone-300">•</span>
          <span>ผู้ดูแลระบบ: <strong>alisa</strong></span>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        staffList={staffList}
        currentUser={currentUser}
        onLogin={handleLogin}
        onSaveNewPassword={handleSaveNewPassword}
      />

      <StaffManagementModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffList={staffList}
        currentUser={currentUser}
        onSaveStaff={handleSaveStaff}
        onDeleteStaff={handleDeleteStaff}
        onReorderStaff={handleReorderStaff}
        onResetSubAdminPassword={handleResetSubAdminPassword}
        onRestoreInitialStaff={handleRestoreInitialStaff}
      />

      <ShiftManagementModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        shiftTypes={shiftTypes}
        onSaveShiftType={handleSaveShiftType}
        onDeleteShiftType={handleDeleteShiftType}
        onRestoreInitialShiftTypes={handleRestoreInitialShiftTypes}
      />

      <AutoScheduleModal
        isOpen={isAutoScheduleModalOpen}
        onClose={() => setIsAutoScheduleModalOpen(false)}
        roomId={activeTab === 'donor' ? 'donor' : 'lab'}
        yearMonth={yearMonth}
        staffList={staffList}
        shiftTypes={shiftTypes}
        currentSchedule={activeTab === 'donor' ? donorSchedule : labSchedule}
        onApplySchedule={handleApplyAutoSchedule}
      />

      <GoogleDriveSyncModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        currentUser={googleWorkspaceUser}
        onSignIn={handleSignInGoogleWorkspace}
        onSignOut={handleSignOutGoogleWorkspace}
        onSyncNow={handleSyncToDriveNow}
        isSyncing={isSyncingToDrive}
        lastSyncResult={lastDriveSyncResult}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={handleToggleAutoSync}
        currentMonthThai={formatYearMonthThai(yearMonth)}
      />

      {/* Clear Schedule Confirmation Modal */}
      <ClearScheduleModal
        isOpen={clearModalRoom !== null}
        onClose={() => setClearModalRoom(null)}
        currentRoomId={clearModalRoom || (activeTab === 'donor' ? 'donor' : 'lab')}
        monthThai={formatYearMonthThai(yearMonth)}
        onConfirmClear={handleExecuteClearSchedule}
      />

      {/* Real-time Automated Backup & History Modal */}
      <RealtimeBackupModal
        isOpen={isRealtimeBackupModalOpen}
        onClose={() => setIsRealtimeBackupModalOpen(false)}
        backups={realtimeBackups}
        currentLabSchedule={labSchedule}
        currentDonorSchedule={donorSchedule}
        staffList={staffList}
        shiftTypes={shiftTypes}
        currentUser={currentUser}
        lastBackupTime={lastBackupTime}
        isSavingBackup={isSavingBackup}
        onTriggerManualBackup={async (desc) => {
          await createRealtimeBackupSnapshot('manual', desc);
        }}
        onRestoreBackup={handleRestoreBackup}
        onDeleteBackup={handleDeleteBackup}
        onImportBackupJson={handleImportBackupJson}
        onRestoreInitialData={handleRestoreAllInitialData}
      />

      {/* Success Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-800 text-white rounded-2xl shadow-[4px_6px_0px_rgba(70,60,50,0.25)] border-2 border-emerald-600 flex items-center gap-3 animate-slideUp text-xs max-w-md">
          <div className="p-1.5 bg-emerald-700 rounded-xl shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          </div>
          <span className="font-medium leading-relaxed">{successToast}</span>
        </div>
      )}
    </div>
  );
}
