import React, { useState, useRef, useMemo } from 'react';
import { Staff, ShiftType, RoomId, MonthSchedule, UserSession, StaffCategory } from '../types';
import { getDaysInMonth, getDayOfWeek, THAI_DAYS_SHORT, isWeekend, formatYearMonthThai } from '../utils/dateUtils';
import { isShiftAllowedForStaff, getStaffPositionAbbr, STANDARD_POSITIONS } from '../utils/positionUtils';
import { exportElementToPdf } from '../utils/pdfExport';
import { Download, Printer, Wand2, Plus, Lock, Check, Info, Sparkles, UserCheck, DollarSign, Cloud, Eraser, Move, Hand, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Maximize2, Minimize2, Calendar } from 'lucide-react';
import { CuteAlien, CuteAstronaut, PaperStar, CuteSpaceBarStrip, CuteMiniSpaceCluster, PaperSpaceship, PaperSaturn } from './CuteSpaceDecorations';

interface ScheduleGridProps {
  roomId: RoomId;
  yearMonth: string;
  staffList: Staff[];
  shiftTypes: ShiftType[];
  schedule: MonthSchedule;
  currentUser: UserSession | null;
  onUpdateShift: (staffId: string, day: number, shiftCode: string) => Promise<void>;
  onOpenAutoSchedule: () => void;
  onOpenStaffModal: () => void;
  onOpenShiftModal: () => void;
  onOpenGoogleDriveModal?: () => void;
  onClearSchedule?: () => void;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  roomId,
  yearMonth,
  staffList,
  shiftTypes,
  schedule,
  currentUser,
  onUpdateShift,
  onOpenAutoSchedule,
  onOpenStaffModal,
  onOpenShiftModal,
  onOpenGoogleDriveModal,
  onClearSchedule,
}) => {
  const [selectedCell, setSelectedCell] = useState<{ staffId: string; day: number; staffName: string } | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Free Scroll & Pan States
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isPanToolActive, setIsPanToolActive] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isExpandedHeight, setIsExpandedHeight] = useState(false);
  const [viewRange, setViewRange] = useState({ startDay: 1, endDay: 15 });

  const isMouseDownRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const hasDraggedRef = useRef(false);

  // Today check for quick scroll and highlight
  const today = useMemo(() => new Date(), []);
  const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = yearMonth === currentYm;
  const todayDay = today.getDate();

  const scrollToDay = (day: number) => {
    if (!tableContainerRef.current) return;
    const targetX = Math.max(0, (day - 1) * 56 - 10);
    tableContainerRef.current.scrollTo({ left: targetX, behavior: 'smooth' });
  };

  const scrollByAmount = (deltaX: number) => {
    if (!tableContainerRef.current) return;
    tableContainerRef.current.scrollBy({ left: deltaX, behavior: 'smooth' });
  };

  const handleScroll = () => {
    const el = tableContainerRef.current;
    if (!el) return;
    const left = el.scrollLeft;
    const startDay = Math.min(daysInMonth, Math.max(1, Math.floor(left / 56) + 1));
    const visibleWidth = Math.max(100, el.clientWidth - 442);
    const visibleCount = Math.max(1, Math.floor(visibleWidth / 56));
    const endDay = Math.min(daysInMonth, startDay + visibleCount);
    setViewRange({ startDay, endDay });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, [data-no-drag]')) return;

    const container = tableContainerRef.current;
    if (!container) return;

    isMouseDownRef.current = true;
    hasDraggedRef.current = false;
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current) return;
    const container = tableContainerRef.current;
    if (!container) return;

    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;

    if (!hasDraggedRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      hasDraggedRef.current = true;
      setIsPanning(true);
    }

    if (hasDraggedRef.current) {
      container.scrollLeft = startPosRef.current.scrollLeft - dx;
      container.scrollTop = startPosRef.current.scrollTop - dy;
    }
  };

  const handleMouseUp = () => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    setTimeout(() => {
      hasDraggedRef.current = false;
      setIsPanning(false);
    }, 60);
  };

  const roomTitle = roomId === 'lab' ? 'ห้องปฏิบัติการ (Laboratory)' : 'ห้องรับบริจาคโลหิต (Blood Donation Room)';
  const daysInMonth = getDaysInMonth(yearMonth);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Filter active staff belonging to this room or both
  const activeStaff = staffList.filter((s) => s.isActive && (s.room === 'both' || s.room === roomId));

  // Partition staff into the 3 tiers
  const technologists = activeStaff.filter((s) => s.category === 'technologist');
  const assistants = activeStaff.filter((s) => s.category === 'assistant');
  const partTimes = activeStaff.filter((s) => s.category === 'part_time');

  // Permission check helper
  const canEditStaffCell = (staffId: string) => {
    if (!currentUser) return false;
    if (currentUser.isAdmin || currentUser.isSubAdmin) return true; // Super admin alisa and Sub-Admin
    return currentUser.staffId === staffId; // General staff can only edit their own
  };

  const handleCellClick = (staff: Staff, day: number) => {
    if (hasDraggedRef.current || isPanning || isPanToolActive) {
      return;
    }

    if (!currentUser) {
      setPermissionNotice('กรุณาเข้าสู่ระบบก่อนทำการจัดหรือแก้ไขเวร');
      setTimeout(() => setPermissionNotice(null), 3500);
      return;
    }

    if (!canEditStaffCell(staff.id)) {
      setPermissionNotice(`คุณสามารถแก้ไขได้เฉพาะเวรของตนเอง (@${currentUser.englishName}) เท่านั้น`);
      setTimeout(() => setPermissionNotice(null), 3500);
      return;
    }

    setSelectedCell({ staffId: staff.id, day, staffName: staff.thaiName });
  };

  const handleSelectShiftCode = async (code: string) => {
    if (!selectedCell) return;
    await onUpdateShift(selectedCell.staffId, selectedCell.day, code);
    setSelectedCell(null);
  };

  const getShiftBadge = (code: string | undefined) => {
    if (!code) {
      return (
        <span className="text-[10px] text-stone-300 font-mono tracking-widest">-</span>
      );
    }

    const st = shiftTypes.find((s) => s.code === code);
    if (!st) {
      return (
        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-sm bg-stone-100 text-stone-700 border border-stone-200">
          {code}
        </span>
      );
    }

    if (code === 'OFFF') {
      return (
        <span className="font-mono text-[11px] font-medium px-1.5 py-0.5 rounded-sm bg-stone-100/80 text-stone-600 border border-stone-200/60">
          OFF
        </span>
      );
    }

    return (
      <span
        className={`inline-block font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-sm border shadow-[1px_1px_0px_rgba(70,60,50,0.06)] ${st.color}`}
      >
        {st.code}
      </span>
    );
  };

  // Export A4 Landscape PDF
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      await exportElementToPdf({
        orientation: 'landscape',
        fileName: `ตารางเวร_${roomId === 'lab' ? 'ห้องปฏิบัติการ' : 'ห้องรับบริจาค'}_${yearMonth}.pdf`,
        elementId: 'printable-schedule-landscape',
      });
    } catch (err) {
      console.error('PDF export error:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativePrint = () => {
    window.print();
  };

  const renderStaffRow = (staff: Staff, index: number) => {
    const isSelf = currentUser?.staffId === staff.id;
    const canEdit = canEditStaffCell(staff.id);
    const rowBg = isSelf ? 'bg-[#FEF3C7]' : 'bg-[#FFFDF9]';

    return (
      <tr
        key={staff.id}
        className={`group border-b border-[#EFE7DC] transition-colors ${
          isSelf ? 'bg-[#FEF3C7]' : 'hover:bg-[#FAF6EE]'
        }`}
      >
        {/* Sticky Column 1: ลำดับ (Index) - 52px */}
        <td
          style={{ minWidth: 52, width: 52, maxWidth: 52, left: 0 }}
          className={`sticky left-0 z-20 ${rowBg} group-hover:bg-[#FAF4E8] py-2 px-2 text-center text-xs font-mono text-stone-600 border-r border-[#E8DEC8]`}
        >
          {index + 1}
        </td>

        {/* Sticky Column 2: ชื่อ-สกุล เจ้าหน้าที่ (Staff Name) - 210px */}
        <td
          style={{ minWidth: 210, width: 210, maxWidth: 210, left: 52 }}
          className={`sticky z-20 ${rowBg} group-hover:bg-[#FAF4E8] py-2 px-3 text-xs font-semibold text-stone-800 border-r border-[#E8DEC8]`}
        >
          <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
            <span
              className="truncate whitespace-nowrap overflow-hidden block text-stone-800 text-xs font-medium"
              title={staff.thaiName}
            >
              {staff.thaiName}
            </span>
            {isSelf && (
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-500 text-white rounded-xs shrink-0 font-normal">
                เวรฉัน
              </span>
            )}
          </div>
        </td>

        {/* Sticky Column 3: ตำแหน่ง (Position) - 180px with drop shadow */}
        <td
          style={{ minWidth: 180, width: 180, maxWidth: 180, left: 262 }}
          className={`sticky z-20 ${rowBg} group-hover:bg-[#FAF4E8] py-2 px-3 text-[11px] text-stone-600 border-r-2 border-[#D4C5B0] shadow-[3px_0_6px_-2px_rgba(70,60,50,0.15)]`}
        >
          <span
            className="truncate whitespace-nowrap overflow-hidden block text-stone-600"
            title={staff.position}
          >
            {staff.position}
          </span>
        </td>

        {/* Day Cells (1 to 28..31) */}
        {daysArray.map((day) => {
          const shiftCode = schedule?.assignments?.[staff.id]?.[day];
          const weekend = isWeekend(yearMonth, day);
          const isSelected = selectedCell?.staffId === staff.id && selectedCell?.day === day;

          return (
            <td
              key={day}
              onClick={() => handleCellClick(staff, day)}
              title={
                canEdit
                  ? `คลิกเพื่อแก้ไขเวรวันที่ ${day} (${staff.thaiName})`
                  : `ดูเวรวันที่ ${day}`
              }
              className={`p-1 text-center border-r border-[#EFE7DC] min-w-[56px] w-14 h-10 select-none transition-all cursor-pointer ${
                weekend ? 'bg-amber-50/50' : 'bg-white'
              } ${isSelected ? 'ring-2 ring-amber-500 bg-amber-100 z-10' : ''} ${
                canEdit ? 'hover:bg-amber-100/70' : 'hover:bg-stone-50 cursor-default'
              }`}
            >
              <div className="flex items-center justify-center h-full">
                {getShiftBadge(shiftCode)}
              </div>
            </td>
          );
        })}
      </tr>
    );
  };

  const renderSectionHeader = (title: string, count: number, badgeColor: string) => (
    <tr className="bg-[#EFE5D7] border-y border-[#DECFC0]">
      <td
        colSpan={3}
        style={{ left: 0, minWidth: 442, width: 442, maxWidth: 442 }}
        className="sticky left-0 z-20 bg-[#EFE5D7] py-2 px-3 text-xs font-bold text-stone-800 border-r-2 border-[#D4C5B0] shadow-[3px_0_6px_-2px_rgba(70,60,50,0.15)]"
      >
        <div className="flex items-center gap-2 truncate">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${badgeColor}`} />
          <span className="truncate">{title}</span>
          <span className="text-[11px] font-normal text-stone-600 shrink-0">({count} ท่าน)</span>
        </div>
      </td>
      <td colSpan={daysInMonth} className="bg-[#EFE5D7] py-2 px-2" />
    </tr>
  );

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[2px_3px_0px_rgba(70,60,50,0.12)]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#FBF0D9] border border-[#ECD9BA] rounded-xl shrink-0">
            <CuteAstronaut size={36} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-stone-800 font-['Prompt']">
              {roomTitle}
            </h1>
            <p className="text-xs text-stone-500">
              ประจำเดือน {formatYearMonthThai(yearMonth)} • รวมบุคลากร {activeStaff.length} ท่าน
            </p>
          </div>
        </div>

        {/* Paper-cut Space Decorative Bar in Empty Center Space */}
        <div className="hidden lg:flex items-center justify-center flex-1 mx-2 pointer-events-none select-none">
          <CuteSpaceBarStrip variant="minimal" />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(currentUser?.isAdmin || currentUser?.isSubAdmin) && (
            <>
              <button
                onClick={onOpenAutoSchedule}
                className="py-2 px-3.5 bg-[#4ADE80] hover:bg-[#22C55E] text-stone-900 font-bold text-xs rounded-xl border border-[#16A34A] shadow-[1px_2px_0px_rgba(70,60,50,0.12)] flex items-center gap-1.5 transition-all cursor-pointer"
                title="จัดเวรอัตโนมัติ (หมุนเวียนต่อจากคนที่ 1 ของแต่ละตำแหน่ง)"
              >
                <Sparkles className="w-3.5 h-3.5 text-stone-900" />
                <span>จัดเวรอัตโนมัติ (ต่อจากคนที่ 1)</span>
              </button>

              <button
                onClick={onOpenStaffModal}
                className="py-2 px-3 bg-white hover:bg-stone-50 text-stone-700 font-medium text-xs rounded-xl border border-stone-300 shadow-[1px_2px_0px_rgba(70,60,50,0.08)] flex items-center gap-1.5 transition-all cursor-pointer"
                title="จัดการเจ้าหน้าที่"
              >
                <span>จัดการเจ้าหน้าที่</span>
              </button>

              <button
                onClick={onOpenShiftModal}
                className="py-2 px-3 bg-white hover:bg-stone-50 text-stone-700 font-medium text-xs rounded-xl border border-stone-300 shadow-[1px_2px_0px_rgba(70,60,50,0.08)] flex items-center gap-1.5 transition-all cursor-pointer"
                title="กำหนดและแก้ไขอัตราค่าเวร"
              >
                <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                <span>กำหนดค่าเวร</span>
              </button>

              {onClearSchedule && (
                <button
                  onClick={onClearSchedule}
                  className="py-2 px-3 bg-white hover:bg-rose-50 text-stone-700 hover:text-rose-700 font-medium text-xs rounded-xl border border-stone-300 hover:border-rose-300 shadow-[1px_2px_0px_rgba(70,60,50,0.08)] flex items-center gap-1.5 transition-all cursor-pointer"
                  title="ล้างตารางเวรทั้งหมดของแผนกนี้ในเดือนนี้ให้เป็นตารางเปล่า"
                >
                  <Eraser className="w-3.5 h-3.5 text-stone-500" />
                  <span>ล้างเป็นตารางเปล่า</span>
                </button>
              )}

              {/* Google Drive & Sheet Backup Button */}
              {onOpenGoogleDriveModal && (
                <button
                  onClick={onOpenGoogleDriveModal}
                  className="py-2 px-3 bg-white hover:bg-emerald-50 text-emerald-800 font-medium text-xs rounded-xl border border-emerald-300 shadow-[1px_2px_0px_rgba(70,60,50,0.08)] flex items-center gap-1.5 transition-all cursor-pointer"
                  title="สำรองข้อมูลตารางเวรไปยัง Google Drive โฟลเดอร์ 'ตารางเวร' และ Sheet 'ตารางเวร-สำรอง'"
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span>สำรอง Drive</span>
                </button>
              )}
            </>
          )}

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="py-2 px-3.5 bg-[#F28C38] hover:bg-[#E57A24] text-white font-semibold text-xs rounded-xl border border-[#D56B16] shadow-[1px_2px_0px_rgba(70,60,50,0.15)] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="ดาวน์โหลดตารางเวร A4 แนวนอน"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด A4 แนวนอน'}</span>
          </button>

          <button
            onClick={handleNativePrint}
            className="p-2 bg-white hover:bg-stone-50 text-stone-600 rounded-xl border border-stone-300 shadow-[1px_2px_0px_rgba(70,60,50,0.08)] transition-all cursor-pointer"
            title="พิมพ์เอกสาร (Print)"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Permission Notice Alert */}
      {permissionNotice && (
        <div className="p-3 bg-amber-100 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center gap-2 animate-fadeIn shadow-xs">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{permissionNotice}</span>
        </div>
      )}

      {/* Active User Status Banner */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#FAF5EB] rounded-xl border border-[#E7DFD5] text-xs text-stone-600">
        <div className="flex items-center gap-2">
          <span>สถานะการแก้ไข:</span>
          {currentUser ? (
            currentUser.isAdmin ? (
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> ผู้ดูแลระบบสูงสุด (alisa) • จัดการได้ทุกตารางเวรและค่าเวร
              </span>
            ) : currentUser.isSubAdmin ? (
              <span className="font-semibold text-indigo-700 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-indigo-600" /> ผู้ดูแลระบบย่อย (@{currentUser.englishName}) • จัดการเจ้าหน้าที่และแก้ไขค่าเวรได้
              </span>
            ) : (
              <span className="font-medium text-amber-800 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> ล็อกอินในชื่อ @{currentUser.englishName} ({currentUser.thaiName}) • แก้ไขได้เฉพาะแถวเวรของตนเอง
              </span>
            )
          ) : (
            <span className="text-stone-500 italic">
              โหมดดูอย่างเดียว (กรุณาเข้าสู่ระบบด้านบนเพื่อแก้ไขเวร)
            </span>
          )}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <CuteSpaceBarStrip variant="compact" />
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-stone-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-amber-50 border border-amber-200 inline-block rounded-xs" />
              วันเสาร์-อาทิตย์
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-emerald-100 border border-emerald-300 inline-block rounded-xs" />
              เวรเช้า
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-amber-100 border border-amber-300 inline-block rounded-xs" />
              เวรบ่าย
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-indigo-100 border border-indigo-300 inline-block rounded-xs" />
              เวรดึก
            </span>
          </div>
        </div>
      </div>

      {/* Free Table Navigation & Quick Jump Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:px-4 sm:py-2.5 bg-[#F8F1E5] rounded-2xl border-2 border-[#E7DFD5] shadow-[1px_2px_0px_rgba(70,60,50,0.08)]">
        {/* Left: Pan Tool Toggle & Height Expand */}
        <div className="flex items-center gap-2">
          {/* Pan / Drag Tool Toggle Button */}
          <button
            type="button"
            onClick={() => setIsPanToolActive(!isPanToolActive)}
            className={`py-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              isPanToolActive
                ? 'bg-amber-500 text-white border-amber-600 shadow-inner'
                : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-300'
            }`}
            title={
              isPanToolActive
                ? 'เปิดโหมดเลื่อนตารางอิสระอยู่: คลิกและลากเพื่อเลื่อนดูตารางได้ทุกทิศทาง (คลิกเพื่อกลับสู่โหมดแก้ไขเวร)'
                : 'คลิกเพื่อเปิดโหมดเลื่อนตารางอิสระ (Hand Tool) เลื่อนดูตารางได้คล่องตัวไม่เผลอกดโดนเวร'
            }
          >
            <Hand className="w-3.5 h-3.5" />
            <span>{isPanToolActive ? 'โหมดเลื่อนอิสระ (เปิดอยู่)' : 'โหมดเลื่อนอิสระ'}</span>
          </button>

          {/* Expand Height Toggle */}
          <button
            type="button"
            onClick={() => setIsExpandedHeight(!isExpandedHeight)}
            className="py-1.5 px-2.5 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium rounded-xl border border-stone-300 shadow-xs flex items-center gap-1 transition-all cursor-pointer"
            title={isExpandedHeight ? 'ย่อความสูงตารางกลับขนาดมาตรฐาน' : 'ขยายความสูงตารางเพื่อดูรายชื่อได้เต็มตา'}
          >
            {isExpandedHeight ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-stone-600" />
                <span className="hidden sm:inline">ความสูงปกติ</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-stone-600" />
                <span className="hidden sm:inline">ขยายเต็มตา</span>
              </>
            )}
          </button>
        </div>

        {/* Center: Quick Range Jumpers (กระโดดไปยังช่วงวันที่) */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <span className="text-[11px] font-medium text-stone-600 mr-1 hidden md:inline">
            เลื่อนด่วน:
          </span>

          <button
            type="button"
            onClick={() => scrollToDay(1)}
            className="px-2 py-1 bg-white hover:bg-amber-50 active:bg-amber-100 text-stone-700 text-[11px] font-medium rounded-lg border border-stone-300 transition-colors cursor-pointer"
            title="เลื่อนไปต้นเดือน วันที่ 1"
          >
            วันที่ 1
          </button>

          <button
            type="button"
            onClick={() => scrollToDay(1)}
            className="px-2 py-1 bg-white hover:bg-amber-50 active:bg-amber-100 text-stone-700 text-[11px] font-medium rounded-lg border border-stone-300 transition-colors cursor-pointer"
            title="เลื่อนดูช่วงวันที่ 1 - 10"
          >
            1 - 10
          </button>

          <button
            type="button"
            onClick={() => scrollToDay(11)}
            className="px-2 py-1 bg-white hover:bg-amber-50 active:bg-amber-100 text-stone-700 text-[11px] font-medium rounded-lg border border-stone-300 transition-colors cursor-pointer"
            title="เลื่อนดูช่วงวันที่ 11 - 20"
          >
            11 - 20
          </button>

          <button
            type="button"
            onClick={() => scrollToDay(21)}
            className="px-2 py-1 bg-white hover:bg-amber-50 active:bg-amber-100 text-stone-700 text-[11px] font-medium rounded-lg border border-stone-300 transition-colors cursor-pointer"
            title="เลื่อนดูช่วงวันที่ 21 - สิ้นเดือน"
          >
            21 - {daysInMonth}
          </button>

          <button
            type="button"
            onClick={() => scrollToDay(daysInMonth)}
            className="px-2 py-1 bg-white hover:bg-amber-50 active:bg-amber-100 text-stone-700 text-[11px] font-medium rounded-lg border border-stone-300 transition-colors cursor-pointer"
            title={`เลื่อนไปวันสิ้นเดือน (วันที่ ${daysInMonth})`}
          >
            สิ้นเดือน
          </button>

          {/* Today Button (Only if viewing current month) */}
          {isCurrentMonth && (
            <button
              type="button"
              onClick={() => scrollToDay(todayDay)}
              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold rounded-lg border border-amber-300 transition-colors cursor-pointer flex items-center gap-1 shadow-xs ml-1"
              title={`เลื่อนไปดูเวรวันนี้ (วันที่ ${todayDay})`}
            >
              <Calendar className="w-3 h-3 text-amber-700" />
              <span>วันนี้ ({todayDay})</span>
            </button>
          )}
        </div>

        {/* Right: Step Scroll Arrows & Visible Range Badge */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-white rounded-xl border border-stone-300 shadow-xs p-0.5">
            <button
              type="button"
              onClick={() => scrollByAmount(-240)}
              className="p-1 hover:bg-stone-100 active:bg-stone-200 text-stone-700 rounded-lg transition-colors cursor-pointer"
              title="เลื่อนตารางไปทางซ้าย"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByAmount(240)}
              className="p-1 hover:bg-stone-100 active:bg-stone-200 text-stone-700 rounded-lg transition-colors cursor-pointer"
              title="เลื่อนตารางไปทางขวา"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-[11px] text-stone-600 font-mono hidden lg:inline px-2 py-1 bg-white/70 rounded-lg border border-[#E7DFD5]">
            วันที่ {viewRange.startDay} - {viewRange.endDay} / {daysInMonth}
          </span>
        </div>
      </div>

      {/* Main Schedule Table Wrapper */}
      <div className="relative bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[3px_4px_0px_rgba(70,60,50,0.12)] overflow-hidden">
        {/* Subtle indicator when dragging */}
        {isPanning && (
          <div className="absolute top-2 right-4 z-50 px-2.5 py-1 bg-amber-900/80 text-white text-[11px] rounded-lg backdrop-blur-xs shadow-md flex items-center gap-1.5 pointer-events-none animate-fadeIn">
            <Move className="w-3 h-3 animate-spin" />
            <span>กำลังเลื่อนตาราง...</span>
          </div>
        )}

        <div
          ref={tableContainerRef}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`overflow-auto custom-scrollbar select-none overscroll-contain transition-[max-height] duration-200 ${
            isExpandedHeight ? 'max-h-[86vh]' : 'max-h-[70vh]'
          } ${
            isPanToolActive
              ? isPanning
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : isPanning
              ? 'cursor-grabbing'
              : 'cursor-default'
          }`}
          style={{
            touchAction: 'pan-x pan-y',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <table className="w-full text-xs border-collapse">
            {/* Header Row */}
            <thead className="bg-[#F5ECE0] text-stone-700 font-bold sticky top-0 z-30 border-b-2 border-[#DECFC0]">
              <tr>
                {/* Sticky Header Column 1: ลำดับ - 52px */}
                <th
                  style={{ minWidth: 52, width: 52, maxWidth: 52, left: 0 }}
                  className="sticky left-0 z-40 bg-[#F5ECE0] py-3 px-2 border-r border-[#DACBBA] text-center"
                >
                  ลำดับ
                </th>

                {/* Sticky Header Column 2: ชื่อ-สกุล เจ้าหน้าที่ - 210px */}
                <th
                  style={{ minWidth: 210, width: 210, maxWidth: 210, left: 52 }}
                  className="sticky z-40 bg-[#F5ECE0] py-3 px-3 border-r border-[#DACBBA] text-left"
                >
                  ชื่อ-สกุล เจ้าหน้าที่
                </th>

                {/* Sticky Header Column 3: ตำแหน่ง - 180px with drop shadow */}
                <th
                  style={{ minWidth: 180, width: 180, maxWidth: 180, left: 262 }}
                  className="sticky z-40 bg-[#F5ECE0] py-3 px-3 border-r-2 border-[#D4C5B0] shadow-[3px_0_6px_-2px_rgba(70,60,50,0.15)] text-left"
                >
                  ตำแหน่ง
                </th>

                {/* Day Headers 1..31 */}
                {daysArray.map((day) => {
                  const dow = getDayOfWeek(yearMonth, day);
                  const weekend = isWeekend(yearMonth, day);
                  const isToday = isCurrentMonth && day === todayDay;

                  return (
                    <th
                      key={day}
                      className={`py-2 px-1 text-center border-r border-[#DACBBA] min-w-[54px] w-14 font-mono transition-colors ${
                        isToday
                          ? 'bg-amber-300/80 text-amber-950 font-bold border-b-2 border-amber-600'
                          : weekend
                          ? 'bg-[#EBDDC8] text-amber-950 font-bold'
                          : ''
                      }`}
                    >
                      <div className="text-[10px] text-stone-600 font-sans flex items-center justify-center gap-0.5">
                        {THAI_DAYS_SHORT[dow]}
                        {isToday && <span className="text-[9px] text-amber-800 font-bold">★</span>}
                      </div>
                      <div className="text-sm font-bold text-stone-800">{day}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {/* Section 1: นักเทคนิคการแพทย์ */}
              {renderSectionHeader('1. นักเทคนิคการแพทย์ (Medical Technologist)', technologists.length, 'bg-emerald-500')}
              {technologists.map((s, idx) => renderStaffRow(s, idx))}

              {/* Section 2: พนักงานผู้ช่วยนักเทคนิคการแพทย์ ธุรการ เจ้าหน้าที่ช่วยการบริการ */}
              {renderSectionHeader(
                '2. พนักงานผู้ช่วยนักเทคนิคการแพทย์ ธุรการ เจ้าหน้าที่ช่วยการบริการ',
                assistants.length,
                'bg-amber-500'
              )}
              {assistants.map((s, idx) => renderStaffRow(s, technologists.length + idx))}

              {/* Section 3: เจ้าหน้าที่ Part-time */}
              {renderSectionHeader('3. เจ้าหน้าที่ Part-time', partTimes.length, 'bg-violet-500')}
              {partTimes.map((s, idx) =>
                renderStaffRow(s, technologists.length + assistants.length + idx)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Shift Selector Popover when a cell is clicked */}
      {selectedCell && (() => {
        const targetStaff = staffList.find((s) => s.id === selectedCell.staffId);
        const targetAbbr = getStaffPositionAbbr(targetStaff);
        const posCfg = STANDARD_POSITIONS[targetAbbr];
        const allowedShifts = shiftTypes.filter((st) => isShiftAllowedForStaff(st, targetStaff));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[4px_6px_0px_rgba(70,60,50,0.2)] p-5 animate-scaleUp">
              <div className="flex items-center justify-between pb-3 border-b border-[#EFE7DC] mb-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-800 font-['Prompt'] flex items-center gap-2">
                    <span>เลือกเวรวันที่ {selectedCell.day}</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold text-stone-700">{selectedCell.staffName}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md border ${posCfg.badgeClass}`}>
                      [{targetAbbr}] {posCfg.thaiTitle}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="mb-2 text-[11px] text-stone-500 flex items-center justify-between">
                <span>เลือกได้เฉพาะเวรที่ตรงกับตำแหน่ง [{targetAbbr}] เท่านั้น ({allowedShifts.length} รูปแบบ):</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs max-h-[50vh] overflow-y-auto pr-1">
                {allowedShifts.length === 0 ? (
                  <div className="col-span-2 text-center py-6 text-stone-400">
                    ไม่มีรหัสเวรที่กำหนดไว้สำหรับตำแหน่ง [{targetAbbr}]
                  </div>
                ) : (
                  allowedShifts.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleSelectShiftCode(st.code)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all hover:scale-[1.02] cursor-pointer ${st.color}`}
                    >
                      <div>
                        <span className="font-mono font-bold text-sm block">{st.code}</span>
                        <span className="text-[11px] opacity-90">{st.name}</span>
                      </div>
                      {st.rate > 0 && (
                        <span className="text-[10px] font-semibold bg-white/70 px-1.5 py-0.5 rounded-sm shrink-0">
                          {st.rate}฿
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#EFE7DC] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectShiftCode('')}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                >
                  ล้างเวรออก (Clear)
                </button>
                <div className="flex items-center gap-2">
                  {(currentUser?.isAdmin || currentUser?.isSubAdmin) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCell(null);
                        onOpenShiftModal();
                      }}
                      className="px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100/70 border border-amber-300 rounded-lg cursor-pointer flex items-center gap-1 font-medium"
                      title="กำหนดและแก้ไขอัตราค่าเวรได้ตามต้องการ"
                    >
                      <DollarSign className="w-3 h-3 text-amber-600" />
                      <span>กำหนดค่าเวร</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedCell(null)}
                    className="px-4 py-1.5 bg-[#E8DEC8] hover:bg-[#DCD1BA] text-stone-800 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Offscreen printable A4 Landscape container specifically scaled for PDF generation and printing */}
      <div className="fixed -left-[99999px] top-0 pointer-events-none z-[-100] opacity-100">
        <div
          id="printable-schedule-landscape"
          className="p-6 bg-white text-stone-900 font-sans w-[1120px] min-h-[790px] flex flex-col justify-between"
        >
          <div>
            {/* Official Document Header */}
            <div className="text-center pb-3 mb-3 border-b-2 border-stone-800">
              <h1 className="text-base font-bold font-['Prompt']">ตารางการปฏิบัติงานเจ้าหน้าที่ (Duty Schedule)</h1>
              <h2 className="text-sm font-semibold">
                งานเวชศาสตร์บริการโลหิต โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
              </h2>
              <p className="text-xs text-stone-600 mt-0.5">
                แผนก: {roomTitle} • ประจำเดือน {formatYearMonthThai(yearMonth)}
              </p>
            </div>

            {/* Clean Landscape Table Matching the System Interface */}
            <table className="w-full text-[9px] border-collapse border border-stone-400">
              <thead>
                <tr className="bg-[#F5ECE0] text-stone-800 font-bold">
                  <th className="border border-stone-400 p-1 w-7 text-center">ลำดับ</th>
                  <th className="border border-stone-400 p-1 min-w-[125px] text-left">ชื่อ-สกุล</th>
                  <th className="border border-stone-400 p-1 min-w-[85px] text-left">ตำแหน่ง</th>
                  {daysArray.map((day) => (
                    <th
                      key={day}
                      className={`border border-stone-400 p-0.5 text-center font-mono ${
                        isWeekend(yearMonth, day) ? 'bg-[#ECE2D0] font-bold text-amber-900' : ''
                      }`}
                    >
                      <div className="text-[8px] leading-tight">{THAI_DAYS_SHORT[getDayOfWeek(yearMonth, day)]}</div>
                      <div className="font-bold leading-tight">{day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Category 1 */}
                <tr className="bg-stone-100 font-bold">
                  <td colSpan={3 + daysInMonth} className="border border-stone-400 px-2 py-0.5 text-stone-800">
                    1. นักเทคนิคการแพทย์ (MT)
                  </td>
                </tr>
                {technologists.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-stone-50">
                    <td className="border border-stone-400 p-0.5 text-center font-mono">{idx + 1}</td>
                    <td className="border border-stone-400 px-1 py-0.5 font-medium">{s.thaiName}</td>
                    <td className="border border-stone-400 px-1 py-0.5 text-stone-600">{s.position}</td>
                    {daysArray.map((day) => {
                      const code = schedule?.assignments?.[s.id]?.[day];
                      const st = shiftTypes.find((shift) => shift.code === code);
                      return (
                        <td
                          key={day}
                          className={`border border-stone-400 p-0.5 text-center font-mono ${
                            isWeekend(yearMonth, day) ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          {code ? (
                            <span
                              className={`inline-block font-mono text-[8.5px] font-bold px-1 py-0.2 rounded-xs border ${
                                st?.color || 'bg-stone-100 text-stone-700 border-stone-200'
                              }`}
                            >
                              {code === 'OFFF' ? 'OFF' : code}
                            </span>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Category 2 */}
                <tr className="bg-stone-100 font-bold">
                  <td colSpan={3 + daysInMonth} className="border border-stone-400 px-2 py-0.5 text-stone-800">
                    2. พนักงานผู้ช่วยนักเทคนิคการแพทย์ (AMT) / ธุรการ (Office) / เจ้าหน้าที่ช่วยการบริการ (Service)
                  </td>
                </tr>
                {assistants.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-stone-50">
                    <td className="border border-stone-400 p-0.5 text-center font-mono">
                      {technologists.length + idx + 1}
                    </td>
                    <td className="border border-stone-400 px-1 py-0.5 font-medium">{s.thaiName}</td>
                    <td className="border border-stone-400 px-1 py-0.5 text-stone-600">{s.position}</td>
                    {daysArray.map((day) => {
                      const code = schedule?.assignments?.[s.id]?.[day];
                      const st = shiftTypes.find((shift) => shift.code === code);
                      return (
                        <td
                          key={day}
                          className={`border border-stone-400 p-0.5 text-center font-mono ${
                            isWeekend(yearMonth, day) ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          {code ? (
                            <span
                              className={`inline-block font-mono text-[8.5px] font-bold px-1 py-0.2 rounded-xs border ${
                                st?.color || 'bg-stone-100 text-stone-700 border-stone-200'
                              }`}
                            >
                              {code === 'OFFF' ? 'OFF' : code}
                            </span>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Category 3 */}
                {partTimes.length > 0 && (
                  <>
                    <tr className="bg-stone-100 font-bold">
                      <td colSpan={3 + daysInMonth} className="border border-stone-400 px-2 py-0.5 text-stone-800">
                        3. เจ้าหน้าที่ Part-time
                      </td>
                    </tr>
                    {partTimes.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-stone-50">
                        <td className="border border-stone-400 p-0.5 text-center font-mono">
                          {technologists.length + assistants.length + idx + 1}
                        </td>
                        <td className="border border-stone-400 px-1 py-0.5 font-medium">{s.thaiName}</td>
                        <td className="border border-stone-400 px-1 py-0.5 text-stone-600">{s.position}</td>
                        {daysArray.map((day) => {
                          const code = schedule?.assignments?.[s.id]?.[day];
                          const st = shiftTypes.find((shift) => shift.code === code);
                          return (
                            <td
                              key={day}
                              className={`border border-stone-400 p-0.5 text-center font-mono ${
                                isWeekend(yearMonth, day) ? 'bg-amber-50/30' : ''
                              }`}
                            >
                              {code ? (
                                <span
                                  className={`inline-block font-mono text-[8.5px] font-bold px-1 py-0.2 rounded-xs border ${
                                    st?.color || 'bg-stone-100 text-stone-700 border-stone-200'
                                  }`}
                                >
                                  {code === 'OFFF' ? 'OFF' : code}
                                </span>
                              ) : (
                                <span className="text-stone-300">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Official Signatures Footer (ลงลายเซ็นต์หัวหน้างานท้ายตาราง) */}
          <div className="grid grid-cols-3 gap-6 pt-6 text-xs text-center shrink-0 border-t border-stone-200 mt-4">
            <div>
              <p className="mb-8">ลงชื่อ..........................................................</p>
              <p className="font-semibold">(..........................................................)</p>
              <p className="text-stone-600 text-[11px]">ผู้จัดทำตารางเวร</p>
            </div>
            <div>
              <p className="mb-8">ลงชื่อ..........................................................</p>
              <p className="font-semibold">(..........................................................)</p>
              <p className="text-stone-600 text-[11px]">ผู้ตรวจสอบ</p>
            </div>
            <div>
              <p className="mb-8">ลงชื่อ..........................................................</p>
              <p className="font-semibold">( ทนพญ.ณิชาภา เจียมจรรยา )</p>
              <p className="text-stone-600 text-[11px]">หัวหน้างานเวชศาสตร์บริการโลหิต</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
