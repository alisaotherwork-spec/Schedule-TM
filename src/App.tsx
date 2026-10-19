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
      return saved ? JSON.parse(saved) : INITIAL_STAFF;
    } catch {
      return INITIAL_STAFF;
    }
  });

  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>(() => {
    try {
      const saved = localStorage.getItem('bloodbank_shifts');
      return saved ? JSON.parse(saved) : INITIAL_SHIFT_TYPES;
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
  const backupDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

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
              if (parsed.length > 0 && !parsed.some((s: Staff) => s.id === 'staff-somchai')) {
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
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync with Firestore for Shift Types
  useEffect(() => {
    const unsubscribe = subscribeShiftTypes(
      (types) => {
        if (types && types.length > 0) {
          setShiftTypes(types);
          localStorage.setItem('bloodbank_shifts', JSON.stringify(types));
        } else {
          // Initialize seeds into Firestore if empty
          const saved = localStorage.getItem('bloodbank_shifts');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.length > 0) {
                setShiftTypes(parsed);
                parsed.forEach((st: ShiftType) => saveShiftType(st).catch(console.warn));
                return;
              }
            } catch {}
          }
          INITIAL_SHIFT_TYPES.forEach((st) => saveShiftType(st).catch(console.warn));
        }
      },
      () => {}
    );
    return () => unsubscribe();
  }, []);

  // Sync with Firestore for Lab Schedule (safely preserves existing schedules)
  useEffect(() => {
    // 1. Immediately load existing local copy if available
    try {
      const saved = localStorage.getItem(`bloodbank_sched_lab_${yearMonth}`);
      if (saved) {
        const parsed: MonthSchedule = JSON.parse(saved);
        setLabSchedule(parsed);
      } else {
        const initial = generateInitialSchedule('lab', yearMonth);
        setLabSchedule(initial);
      }
    } catch {}

    // 2. Subscribe to Firestore
    const unsubscribe = subscribeSchedule(
      'lab',
      yearMonth,
      (sched) => {
        if (sched && sched.assignments) {
          // Firestore has existing schedule: keep it and never overwrite!
          setLabSchedule(sched);
          localStorage.setItem(`bloodbank_sched_lab_${yearMonth}`, JSON.stringify(sched));
        } else {
          // If not in Firestore yet, check localStorage to see if user has arranged schedule
          const cached = localStorage.getItem(`bloodbank_sched_lab_${yearMonth}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setLabSchedule(parsed);
              saveSchedule(parsed).catch(console.warn);
              return;
            } catch {}
          }
          // Only if completely new and unscheduled, initialize as blank schedule
          const initial = generateInitialSchedule('lab', yearMonth);
          setLabSchedule(initial);
          localStorage.setItem(`bloodbank_sched_lab_${yearMonth}`, JSON.stringify(initial));
          saveSchedule(initial).catch(console.warn);
        }
      },
      () => {}
    );
    return () => unsubscribe();
  }, [yearMonth]);

  // Sync with Firestore for Donor Schedule (safely preserves existing schedules)
  useEffect(() => {
    // 1. Immediately load existing local copy if available
    try {
      const saved = localStorage.getItem(`bloodbank_sched_donor_${yearMonth}`);
      if (saved) {
        const parsed: MonthSchedule = JSON.parse(saved);
        setDonorSchedule(parsed);
      } else {
        const initial = generateInitialSchedule('donor', yearMonth);
        setDonorSchedule(initial);
      }
    } catch {}

    // 2. Subscribe to Firestore
    const unsubscribe = subscribeSchedule(
      'donor',
      yearMonth,
      (sched) => {
        if (sched && sched.assignments) {
          // Firestore has existing schedule: keep it and never overwrite!
          setDonorSchedule(sched);
          localStorage.setItem(`bloodbank_sched_donor_${yearMonth}`, JSON.stringify(sched));
        } else {
          // If not in Firestore yet, check localStorage to see if user has arranged schedule
          const cached = localStorage.getItem(`bloodbank_sched_donor_${yearMonth}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setDonorSchedule(parsed);
              saveSchedule(parsed).catch(console.warn);
              return;
            } catch {}
          }
          // Only if completely new and unscheduled, initialize as blank schedule
          const initial = generateInitialSchedule('donor', yearMonth);
          setDonorSchedule(initial);
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
    const targetLab = overrideLab || labSchedule;
    const targetDonor = overrideDonor || donorSchedule;
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

    try {
      await saveRealtimeBackupSnapshot(snapshot);
      setLastBackupTime(formattedThai);
      localStorage.setItem('bloodbank_last_backup_time', formattedThai);
    } catch (err) {
      console.warn('Realtime backup snapshot error:', err);
    } finally {
      setIsSavingBackup(false);
    }
  };

  const handleRestoreBackup = async (snapshot: BackupSnapshot) => {
    // 1. Safety snapshot of current state before restoring
    await createRealtimeBackupSnapshot('realtime_edit', 'จุดสำรองความปลอดภัยก่อนกู้คืนข้อมูล');

    // 2. Restore schedules
    if (snapshot.labSchedule) {
      setLabSchedule(snapshot.labSchedule);
      localStorage.setItem(`bloodbank_sched_lab_${snapshot.yearMonth}`, JSON.stringify(snapshot.labSchedule));
      await saveSchedule(snapshot.labSchedule).catch(console.warn);
    }
    if (snapshot.donorSchedule) {
      setDonorSchedule(snapshot.donorSchedule);
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

    if (payload.labSchedule) {
      setLabSchedule(payload.labSchedule);
      localStorage.setItem(`bloodbank_sched_lab_${payload.labSchedule.yearMonth || yearMonth}`, JSON.stringify(payload.labSchedule));
      await saveSchedule(payload.labSchedule).catch(console.warn);
    }
    if (payload.donorSchedule) {
      setDonorSchedule(payload.donorSchedule);
      localStorage.setItem(`bloodbank_sched_donor_${payload.donorSchedule.yearMonth || yearMonth}`, JSON.stringify(payload.donorSchedule));
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

  // Update a single shift cell
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

    const updatedSchedule: MonthSchedule = {
      ...currentSchedule,
      assignments: newAssignments,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.englishName || 'guest',
    };

    if (isLab) {
      setLabSchedule(updatedSchedule);
    } else {
      setDonorSchedule(updatedSchedule);
    }
    localStorage.setItem(`bloodbank_sched_${roomId}_${yearMonth}`, JSON.stringify(updatedSchedule));

    try {
      await saveSchedule(updatedSchedule);
    } catch (err) {
      console.warn('Failed to save to Firestore, stored locally:', err);
    }

    // Trigger Real-time Automated Backup (debounced 1.5s for seamless editing)
    if (backupDebounceTimerRef.current) {
      clearTimeout(backupDebounceTimerRef.current);
    }
    backupDebounceTimerRef.current = setTimeout(() => {
      createRealtimeBackupSnapshot(
        'realtime_edit',
        undefined,
        isLab ? updatedSchedule : labSchedule,
        isLab ? donorSchedule : updatedSchedule
      );
    }, 1500);

    // Trigger Debounced Auto-Sync to Google Drive if connected and enabled
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
    const exists = staffList.find((s) => s.id === staff.id);
    const updated = exists
      ? staffList.map((s) => (s.id === staff.id ? staff : s))
      : [...staffList, staff];

    setStaffList(updated);
    localStorage.setItem('bloodbank_staff', JSON.stringify(updated));
    try {
      await saveStaff(staff);
    } catch (err) {
      console.warn('Firestore write error:', err);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    const updated = staffList.filter((s) => s.id !== staffId);
    setStaffList(updated);
    localStorage.setItem('bloodbank_staff', JSON.stringify(updated));
    try {
      await removeStaff(staffId);
    } catch (err) {
      console.warn('Firestore delete error:', err);
    }
  };

  const handleReorderStaff = async (newOrderedList: Staff[]) => {
    const normalized = newOrderedList.map((s, idx) => ({ ...s, order: idx + 1 }));
    setStaffList(normalized);
    localStorage.setItem('bloodbank_staff', JSON.stringify(normalized));
    try {
      await replaceAllStaffInFirestore(normalized);
    } catch (err) {
      console.warn('Firestore reorder staff error:', err);
    }
  };

  // Shift Types CRUD
  const handleSaveShiftType = async (shift: ShiftType) => {
    const exists = shiftTypes.find((s) => s.id === shift.id);
    const updated = exists
      ? shiftTypes.map((s) => (s.id === shift.id ? shift : s))
      : [...shiftTypes, shift];

    setShiftTypes(updated);
    localStorage.setItem('bloodbank_shifts', JSON.stringify(updated));
    try {
      await saveShiftType(shift);
    } catch (err) {
      console.warn('Firestore write error:', err);
    }
  };

  const handleDeleteShiftType = async (id: string) => {
    const updated = shiftTypes.filter((s) => s.id !== id);
    setShiftTypes(updated);
    localStorage.setItem('bloodbank_shifts', JSON.stringify(updated));
    try {
      await removeShiftType(id);
    } catch (err) {
      console.warn('Firestore delete error:', err);
    }
  };

  // Apply Auto-Schedule
  const handleApplyAutoSchedule = async (schedule: MonthSchedule) => {
    if (schedule.roomId === 'lab') {
      setLabSchedule(schedule);
    } else {
      setDonorSchedule(schedule);
    }
    localStorage.setItem(`bloodbank_sched_${schedule.roomId}_${schedule.yearMonth}`, JSON.stringify(schedule));
    try {
      await saveSchedule(schedule);
    } catch (err) {
      console.warn('Firestore auto-schedule save error:', err);
    }

    // Realtime Backup Snapshot
    createRealtimeBackupSnapshot(
      'auto_schedule',
      `จัดเวรอัตโนมัติห้อง${schedule.roomId === 'lab' ? 'ปฏิบัติการ' : 'รับบริจาค'} (${formatYearMonthThai(yearMonth)})`,
      schedule.roomId === 'lab' ? schedule : labSchedule,
      schedule.roomId === 'donor' ? schedule : donorSchedule
    ).catch(console.warn);
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

  // Open Clear Schedule Modal
  const handleOpenClearModal = (roomId: RoomId) => {
    setClearModalRoom(roomId);
  };

  // Execute clearing schedule without window.confirm
  const handleExecuteClearSchedule = async (scope: 'current' | 'both') => {
    const targetRoom = clearModalRoom || (activeTab === 'donor' ? 'donor' : 'lab');
    const shouldClearLab = scope === 'both' || targetRoom === 'lab';
    const shouldClearDonor = scope === 'both' || targetRoom === 'donor';
    const updatedBy = currentUser?.englishName || 'admin';

    // 1. Safety Realtime Snapshot BEFORE clearing
    await createRealtimeBackupSnapshot(
      'pre_clear',
      `จุดปลอดภัยก่อนล้างตารางห้อง${scope === 'both' ? 'ทั้งหมด (Lab + รับบริจาค)' : targetRoom === 'lab' ? 'ปฏิบัติการ' : 'รับบริจาค'} (${formatYearMonthThai(yearMonth)})`
    );

    if (shouldClearLab) {
      const emptyLab: MonthSchedule = {
        id: `lab_${yearMonth}`,
        roomId: 'lab',
        yearMonth,
        assignments: {},
        updatedAt: new Date().toISOString(),
        updatedBy,
      };
      setLabSchedule(emptyLab);
      localStorage.setItem(`bloodbank_sched_lab_${yearMonth}`, JSON.stringify(emptyLab));
      try {
        await saveSchedule(emptyLab);
      } catch (err) {
        console.warn('Error clearing lab schedule in Firestore:', err);
      }
    }

    if (shouldClearDonor) {
      const emptyDonor: MonthSchedule = {
        id: `donor_${yearMonth}`,
        roomId: 'donor',
        yearMonth,
        assignments: {},
        updatedAt: new Date().toISOString(),
        updatedBy,
      };
      setDonorSchedule(emptyDonor);
      localStorage.setItem(`bloodbank_sched_donor_${yearMonth}`, JSON.stringify(emptyDonor));
      try {
        await saveSchedule(emptyDonor);
      } catch (err) {
        console.warn('Error clearing donor schedule in Firestore:', err);
      }
    }

    // 2. Snapshot AFTER clearing
    createRealtimeBackupSnapshot(
      'manual',
      `ล้างตารางเวร${scope === 'both' ? 'ทั้งหมด' : targetRoom === 'lab' ? 'ห้องปฏิบัติการ' : 'ห้องรับบริจาค'} เป็นตารางเปล่า (${formatYearMonthThai(yearMonth)})`
    ).catch(console.warn);

    setClearModalRoom(null);
    setSuccessToast(
      scope === 'both'
        ? `ล้างตารางเวรทั้งห้องปฏิบัติการและห้องรับบริจาค ประจำเดือน ${formatYearMonthThai(yearMonth)} เป็นตารางเปล่าเรียบร้อยแล้ว (มีจุดสำรองกู้คืนย้อนหลังได้ตลอด)`
        : `ล้างตารางเวร${targetRoom === 'lab' ? 'ห้องปฏิบัติการ' : 'ห้องรับบริจาค'} ประจำเดือน ${formatYearMonthThai(yearMonth)} เป็นตารางเปล่าเรียบร้อยแล้ว (มีจุดสำรองกู้คืนย้อนหลังได้ตลอด)`
    );
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
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
            onClearSchedule={() => handleOpenClearModal('lab')}
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
            onClearSchedule={() => handleOpenClearModal('donor')}
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
      />

      <ShiftManagementModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        shiftTypes={shiftTypes}
        onSaveShiftType={handleSaveShiftType}
        onDeleteShiftType={handleDeleteShiftType}
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
