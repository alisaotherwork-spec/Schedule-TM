import React from 'react';
import { RoomId, UserSession } from '../types';
import {
  formatYearMonthThai,
  getPreviousMonth,
  getNextMonth,
  THAI_MONTHS,
} from '../utils/dateUtils';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  LogOut,
  LogIn,
  Hospital,
  Activity,
  HeartHandshake,
  FileText,
  DollarSign,
  Menu,
  X,
  Cloud,
} from 'lucide-react';
import {
  CuteAlien,
  CuteAstronaut,
  PaperStar,
  PaperPlanet,
  PaperRocket,
  CuteSpaceBarStrip,
  PaperSpaceship,
  PaperSaturn,
} from './CuteSpaceDecorations';

export type ActiveTab = 'lab' | 'donor' | 'daily_summary' | 'ot_claim';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  yearMonth: string;
  onChangeYearMonth: (ym: string) => void;
  currentUser: UserSession | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenShiftModal?: () => void;
  onOpenGoogleDriveModal?: () => void;
  isGoogleDriveConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  yearMonth,
  onChangeYearMonth,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenShiftModal,
  onOpenGoogleDriveModal,
  isGoogleDriveConnected,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const [currentYear, currentMonthStr] = yearMonth.split('-');
  const selectedYear = Number(currentYear);
  const selectedMonth = Number(currentMonthStr);

  const [isCustomDateModalOpen, setIsCustomDateModalOpen] = React.useState(false);
  const [customThaiYear, setCustomThaiYear] = React.useState(String(selectedYear + 543));
  const [customMonth, setCustomMonth] = React.useState(selectedMonth);

  const handlePrevMonth = () => {
    onChangeYearMonth(getPreviousMonth(yearMonth));
  };

  const handleNextMonth = () => {
    onChangeYearMonth(getNextMonth(yearMonth));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const m = String(e.target.value).padStart(2, '0');
    onChangeYearMonth(`${selectedYear}-${m}`);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      setCustomThaiYear(String(selectedYear + 543));
      setCustomMonth(selectedMonth);
      setIsCustomDateModalOpen(true);
      return;
    }
    onChangeYearMonth(`${val}-${String(selectedMonth).padStart(2, '0')}`);
  };

  const handleApplyCustomDate = (e: React.FormEvent) => {
    e.preventDefault();
    const thaiYearNum = parseInt(customThaiYear, 10);
    if (isNaN(thaiYearNum) || thaiYearNum < 2400 || thaiYearNum > 3000) {
      alert('กรุณากรอกปี พ.ศ. ให้ถูกต้อง (เช่น 2569, 2575, 2600)');
      return;
    }
    const gregorianYear = thaiYearNum - 543;
    const mStr = String(customMonth).padStart(2, '0');
    onChangeYearMonth(`${gregorianYear}-${mStr}`);
    setIsCustomDateModalOpen(false);
  };

  // Dynamic years range centered around selectedYear (always ±30 years into past and future)
  const startYear = selectedYear - 20;
  const endYear = selectedYear + 35;
  const yearsRange: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    yearsRange.push(y);
  }

  // Permissions: Super Admin & Sub-Admin
  const isSuperAdmin = currentUser?.isAdmin;
  const isSubAdmin = currentUser?.isSubAdmin;
  const hasManagementAccess = isSuperAdmin || isSubAdmin;

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-b-2 border-[#E7DFD5] shadow-xs">
      {/* Top Banner with Paper Cut Space Theme */}
      <div className="px-4 sm:px-6 py-2.5 bg-[#FAF4EA] border-b border-[#EDE3D3] flex items-center justify-between">
        {/* Brand & Hospital Info with Dedicated Mascot Frame */}
        <div className="flex items-center gap-3">
          {/* Dedicated Mascots Frame (Astronaut & Green Alien) without overlapping text */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border-2 border-[#E3D7C5] shadow-[2px_2px_0px_rgba(70,60,50,0.12)] shrink-0">
            <CuteAstronaut size={32} />
            <CuteAlien size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-stone-800 font-['Prompt'] tracking-tight">
                งานเวชศาสตร์บริการโลหิต
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-sm border border-rose-200 shrink-0">
                Blood Bank
              </span>
            </div>
            <p className="text-[11px] text-stone-500 truncate max-w-[240px] sm:max-w-none">
              โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ (TUH)
            </p>
          </div>
        </div>

        {/* Paper-cut Space Celestial & Spaceship Banner in Center of Bar */}
        <div className="hidden xl:flex items-center mx-4 flex-1 justify-center pointer-events-none select-none">
          <CuteSpaceBarStrip variant="full" />
        </div>

        {/* Date Month/Year Navigator (ดูเวรล่วงหน้าและย้อนหลังได้) */}
        <div className="flex items-center gap-1 sm:gap-2 relative z-10 bg-white/90 px-2 sm:px-3 py-1 rounded-xl border border-[#DACFBF] shadow-[1px_2px_0px_rgba(70,60,50,0.08)]">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 text-xs">
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="font-semibold text-stone-800 bg-transparent focus:outline-hidden cursor-pointer"
            >
              {THAI_MONTHS.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <span className="text-stone-400">/</span>

            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="font-semibold text-stone-800 bg-transparent focus:outline-hidden cursor-pointer"
            >
              {yearsRange.map((y) => (
                <option key={y} value={y}>
                  พ.ศ. {y + 543}
                </option>
              ))}
              <option value="custom">➕ ระบุปี พ.ศ. อื่นๆ...</option>
            </select>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            title="เดือนถัดไป"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setCustomThaiYear(String(selectedYear + 543));
              setCustomMonth(selectedMonth);
              setIsCustomDateModalOpen(true);
            }}
            className="hidden sm:flex items-center gap-1 ml-1 px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[10px] font-semibold transition-colors cursor-pointer"
            title="เพิ่มเดือน/ระบุปี พ.ศ. ล่วงหน้าได้ตลอด"
          >
            <span>+ระบุเดือน/ปี</span>
          </button>
        </div>

        {/* User Session Area */}
        <div className="hidden sm:flex items-center gap-2 relative z-10">
          {currentUser ? (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#DACFBF] shadow-[1px_2px_0px_rgba(70,60,50,0.08)]">
              {currentUser.isAdmin ? (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  alisa (Super Admin)
                </span>
              ) : currentUser.isSubAdmin ? (
                <span className="flex items-center gap-1 text-xs font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  @{currentUser.englishName} (ผู้ดูแลระบบย่อย)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-stone-700">
                  <User className="w-3.5 h-3.5 text-stone-500" />
                  @{currentUser.englishName} ({currentUser.thaiName || 'เจ้าหน้าที่'})
                </span>
              )}
              <button
                onClick={onLogout}
                className="p-1 text-stone-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="py-1.5 px-3 bg-[#4ADE80] hover:bg-[#22C55E] text-stone-900 text-xs font-bold rounded-xl border border-[#16A34A] shadow-[1px_2px_0px_rgba(70,60,50,0.12)] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>เข้าสู่ระบบ (ชื่ออังกฤษ)</span>
            </button>
          )}
        </div>

        {/* Mobile Hamburger toggle */}
        <div className="sm:hidden flex items-center gap-1 relative z-10">
          {currentUser ? (
            <button
              onClick={onLogout}
              className="p-1 text-stone-500 hover:text-rose-600"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-2 py-1 text-xs bg-[#4ADE80] text-stone-900 font-bold rounded-lg border border-[#16A34A]"
            >
              ล็อกอิน
            </button>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-stone-600 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <nav className="px-4 sm:px-6 py-2 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-2">
          {/* 1. ห้องปฏิบัติการ (Lab) */}
          <button
            onClick={() => onSelectTab('lab')}
            className={`py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeTab === 'lab'
                ? 'bg-[#F28C38] text-white border-[#D56B16] shadow-[2px_2px_0px_rgba(70,60,50,0.15)]'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-[#FAF4EA]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>ห้องปฏิบัติการ (Lab)</span>
          </button>

          {/* 2. ห้องรับบริจาค (Donor Room) */}
          <button
            onClick={() => onSelectTab('donor')}
            className={`py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeTab === 'donor'
                ? 'bg-[#F28C38] text-white border-[#D56B16] shadow-[2px_2px_0px_rgba(70,60,50,0.15)]'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-[#FAF4EA]'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>ห้องรับบริจาคโลหิต</span>
          </button>

          {/* 3. ใบสรุปเวรประจำวัน (Visible ONLY if Super Admin or Sub-Admin) */}
          {hasManagementAccess && (
            <button
              onClick={() => onSelectTab('daily_summary')}
              className={`py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                activeTab === 'daily_summary'
                  ? 'bg-[#F28C38] text-white border-[#D56B16] shadow-[2px_2px_0px_rgba(70,60,50,0.15)]'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-[#FAF4EA]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>ใบสรุปเวรประจำวัน (6 คอลัมน์)</span>
            </button>
          )}

          {/* 4. ใบเบิกเงินค่าตอบแทน OT (Visible ONLY if Super Admin or Sub-Admin) */}
          {hasManagementAccess && (
            <button
              onClick={() => onSelectTab('ot_claim')}
              className={`py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                activeTab === 'ot_claim'
                  ? 'bg-[#F28C38] text-white border-[#D56B16] shadow-[2px_2px_0px_rgba(70,60,50,0.15)]'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-[#FAF4EA]'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>ใบเบิกเงินค่าตอบแทน OT (4 คอลัมน์)</span>
            </button>
          )}

          {/* Quick Configure Shift Rates Button (Visible ONLY if Super Admin or Sub-Admin) */}
          {hasManagementAccess && onOpenShiftModal && (
            <button
              onClick={onOpenShiftModal}
              className="py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 shadow-xs"
              title="กำหนดและแก้ไขอัตราค่าตอบแทนเวร"
            >
              <DollarSign className="w-3.5 h-3.5 text-amber-700" />
              <span>กำหนดค่าเวร</span>
            </button>
          )}
        </div>

        {/* Right side controls: Google Drive Sync and Month Indicator */}
        <div className="flex items-center gap-3 text-xs font-medium text-stone-500 shrink-0">
          {hasManagementAccess && onOpenGoogleDriveModal && (
            <button
              onClick={onOpenGoogleDriveModal}
              className="py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-emerald-50/90 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-[1px_2px_0px_rgba(70,60,50,0.06)] shrink-0"
              title="เชื่อมต่อและสำรองข้อมูล Google Drive / Google Sheets"
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-700" />
              <span>Google Drive</span>
              {isGoogleDriveConnected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" title="เชื่อมต่อแล้ว" />
              )}
            </button>
          )}

          <div className="hidden lg:flex items-center gap-3">
            <CuteSpaceBarStrip variant="compact" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/80 rounded-xl border border-[#DACFBF] shadow-[1px_2px_0px_rgba(70,60,50,0.06)]">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>เดือนที่เลือก: {formatYearMonthThai(yearMonth)}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden px-4 py-3 bg-[#FAF5EB] border-t border-[#E7DFD5] space-y-2">
          {currentUser && (
            <div className="p-2.5 bg-white rounded-xl border border-stone-200 text-xs">
              <span className="font-semibold text-stone-800">
                ผู้ใช้ปัจจุบัน: @{currentUser.englishName}
              </span>
              <p className="text-[11px] text-stone-500">
                {currentUser.isAdmin ? 'ผู้ดูแลระบบสูงสุด (alisa)' : currentUser.thaiName}
              </p>
            </div>
          )}
          {hasManagementAccess && onOpenGoogleDriveModal && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenGoogleDriveModal();
              }}
              className="w-full py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-emerald-700" />
              <span>สำรองข้อมูล Google Drive / Sheets</span>
              {isGoogleDriveConnected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              )}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <button
              onClick={() => {
                onSelectTab('lab');
                setIsMobileMenuOpen(false);
              }}
              className="p-2 bg-white rounded-lg border text-center font-medium"
            >
              ห้องปฏิบัติการ
            </button>
            <button
              onClick={() => {
                onSelectTab('donor');
                setIsMobileMenuOpen(false);
              }}
              className="p-2 bg-white rounded-lg border text-center font-medium"
            >
              ห้องรับบริจาค
            </button>
            {hasManagementAccess && (
              <>
                <button
                  onClick={() => {
                    onSelectTab('daily_summary');
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 bg-white rounded-lg border text-center font-medium"
                >
                  ใบสรุปเวรประจำวัน
                </button>
                <button
                  onClick={() => {
                    onSelectTab('ot_claim');
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 bg-white rounded-lg border text-center font-medium"
                >
                  ใบเบิกเงิน OT
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: เพิ่มหรือระบุเดือนและปี พ.ศ. ไปได้ตลอด */}
      {isCustomDateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[4px_6px_0px_rgba(70,60,50,0.18)] p-5 relative animate-scaleUp">
            <button
              onClick={() => setIsCustomDateModalOpen(false)}
              className="absolute top-3 right-3 p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-stone-800 font-['Prompt']">
                เพิ่ม / เลือกเดือนและปี พ.ศ. ล่วงหน้า
              </h3>
            </div>

            <p className="text-xs text-stone-500 mb-4">
              คุณสามารถระบุปี พ.ศ. ใดๆ ได้อย่างอิสระ ระบบจะจัดเตรียมตารางเวรและบันทึกข้อมูลให้อัตโนมัติ
            </p>

            <form onSubmit={handleApplyCustomDate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  เลือกเดือน
                </label>
                <select
                  value={customMonth}
                  onChange={(e) => setCustomMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-500 font-medium text-stone-800 cursor-pointer"
                >
                  {THAI_MONTHS.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      เดือนที่ {idx + 1}: {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  ระบุปี พ.ศ. (เช่น 2569, 2570, 2575, 2580, ...)
                </label>
                <input
                  type="number"
                  min="2400"
                  max="3000"
                  value={customThaiYear}
                  onChange={(e) => setCustomThaiYear(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-500 font-semibold text-stone-800"
                  placeholder="เช่น 2570"
                  required
                />
              </div>

              {/* Quick Jump buttons */}
              <div className="pt-1 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const nextM = selectedMonth === 12 ? 1 : selectedMonth + 1;
                    const nextY = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
                    onChangeYearMonth(`${nextY}-${String(nextM).padStart(2, '0')}`);
                    setIsCustomDateModalOpen(false);
                  }}
                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-[11px] cursor-pointer"
                >
                  +1 เดือน
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangeYearMonth(`${selectedYear + 1}-${String(selectedMonth).padStart(2, '0')}`);
                    setIsCustomDateModalOpen(false);
                  }}
                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md text-[11px] font-medium cursor-pointer"
                >
                  +1 ปี (พ.ศ. {selectedYear + 544})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangeYearMonth(`${selectedYear + 5}-${String(selectedMonth).padStart(2, '0')}`);
                    setIsCustomDateModalOpen(false);
                  }}
                  className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-md text-[11px] font-medium cursor-pointer"
                >
                  +5 ปี (พ.ศ. {selectedYear + 548})
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EFE7DC]">
                <button
                  type="button"
                  onClick={() => setIsCustomDateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-[#F28C38] hover:bg-[#E57A24] text-white font-medium rounded-lg border border-[#D56B16] shadow-xs cursor-pointer"
                >
                  เปิดดูตารางเวรเดือนนี้
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
