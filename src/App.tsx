import React, { useState, useEffect } from 'react';
import { Staff, ShiftType, MonthSchedule, UserSession, RoomId } from './types';
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

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('bloodbank_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isGuest, setIsGuest] = useState(false);

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

  // Sync with Firestore for Lab Schedule (never overwrites user edits)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bloodbank_sched_lab_${yearMonth}`);
      if (saved) {
        setLabSchedule(JSON.parse(saved));
      }
    } catch {}

    const unsubscribe = subscribeSchedule(
      'lab',
      yearMonth,
      (sched) => {
        if (sched && sched.assignments) {
          setLabSchedule(sched);
          localStorage.setItem(`bloodbank_sched_lab_${yearMonth}`, JSON.stringify(sched));
        } else {
          const cached = localStorage.getItem(`bloodbank_sched_lab_${yearMonth}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setLabSchedule(parsed);
              saveSchedule(parsed).catch(console.warn);
              return;
            } catch {}
          }
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

  // Sync with Firestore for Donor Schedule (never overwrites user edits)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bloodbank_sched_donor_${yearMonth}`);
      if (saved) {
        setDonorSchedule(JSON.parse(saved));
      }
    } catch {}

    const unsubscribe = subscribeSchedule(
      'donor',
      yearMonth,
      (sched) => {
        if (sched && sched.assignments) {
          setDonorSchedule(sched);
          localStorage.setItem(`bloodbank_sched_donor_${yearMonth}`, JSON.stringify(sched));
        } else {
          const cached = localStorage.getItem(`bloodbank_sched_donor_${yearMonth}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setDonorSchedule(parsed);
              saveSchedule(parsed).catch(console.warn);
              return;
            } catch {}
          }
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
    localStorage.setItem('bloodbank_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsGuest(false);
    localStorage.removeItem('bloodbank_user');
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

  // Login Gate: Show LoginPage before entering the schedule page
  if (!currentUser && !isGuest) {
    return (
      <LoginPage
        staffList={staffList}
        onLogin={handleLogin}
        onContinueAsGuest={() => setIsGuest(true)}
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
          />
        )}

        {/* 3. Daily Duty Summary Tab (6 columns) */}
        {activeTab === 'daily_summary' && (
          <DailySummaryView
            yearMonth={yearMonth}
            staffList={staffList}
            shiftTypes={shiftTypes}
            labSchedule={labSchedule}
            donorSchedule={donorSchedule}
          />
        )}

        {/* 4. Overtime (OT) Compensation Claim Sheet Tab (4 columns) */}
        {activeTab === 'ot_claim' && (
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
    </div>
  );
}
