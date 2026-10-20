import React, { useState, useEffect, useMemo } from 'react';
import { Staff, ShiftType, RoomId, MonthSchedule, StaffCategory } from '../types';
import {
  getDaysInMonth,
  formatYearMonthThai,
  isWeekend,
  THAI_DAYS_SHORT,
  getDayOfWeek,
} from '../utils/dateUtils';
import {
  X,
  Sparkles,
  Check,
  ArrowDownRight,
  Layers,
  Calendar,
  RotateCcw,
  CheckCircle2,
  Users,
  User,
  Info,
  ChevronRight,
  ShieldCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import { CuteAlien, CuteAstronaut } from './CuteSpaceDecorations';

interface AutoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: RoomId;
  yearMonth: string;
  staffList: Staff[];
  shiftTypes: ShiftType[];
  currentSchedule: MonthSchedule;
  onApplySchedule: (schedule: MonthSchedule) => Promise<void>;
}

export const AutoScheduleModal: React.FC<AutoScheduleModalProps> = ({
  isOpen,
  onClose,
  roomId,
  yearMonth,
  staffList,
  shiftTypes,
  currentSchedule,
  onApplySchedule,
}) => {
  // Modes:
  // 'diagonal': เรียงไล่ลงมาจากซ้ายไปขวา จากคนแรก เช่น คนที่1 บด วันที่1, คนที่2 วันที่2 ... จนถึงคนสุดท้ายแล้ววนกลับขึ้นไปคนแรกจนครบเดือน (Default)
  // 'cascade': หมุนเวียนหลายกะต่อลงมา (เช้า-บ่าย-ดึก)
  // 'quota': จัดตามโควตาจำนวนคนต่อวัน
  const [scheduleMode, setScheduleMode] = useState<'diagonal' | 'cascade' | 'quota'>('diagonal');

  // ==========================================
  // Mode 1 (Diagonal Sequential) States
  // ==========================================
  // Target group:
  // 'technologist': เฉพาะนักเทคนิคการแพทย์ (ตามข้อกำหนด: "จากนักเทคนิคการแพทย์คนแรก")
  // 'both_separated': จัดแยกกันทั้งนักเทคนิคการแพทย์ และผู้ช่วยฯ (แยกคนละชุด)
  // 'assistant': เฉพาะเจ้าหน้าที่ช่วยบริการโลหิต / ผู้ช่วยฯ
  // 'all_together': รวมเจ้าหน้าที่ทุกคนในห้องต่อแถวเดียวกัน
  const [diagonalTarget, setDiagonalTarget] = useState<
    'technologist' | 'both_separated' | 'assistant' | 'all_together'
  >('technologist');

  // Selected shift code:
  // Donor room default: 'BD01' (เวรรับบริจาคเช้า / บด)
  // Lab room default: 'MORN' or 'LAB1'
  const [selectedShiftCode, setSelectedShiftCode] = useState<string>(() => {
    if (roomId === 'donor') {
      const bd = shiftTypes.find((s) => s.code === 'BD01' || s.code === 'BD');
      return bd ? bd.code : 'BD01';
    } else {
      const morn = shiftTypes.find((s) => s.code === 'MORN' || s.code === 'LAB1');
      return morn ? morn.code : 'MORN';
    }
  });

  // Assistant shift code (used if 'both_separated' is chosen)
  const [assistantShiftCode, setAssistantShiftCode] = useState<string>(() => {
    if (roomId === 'donor') return 'BD01';
    return 'MORN';
  });

  // Starting staff ID for technologists / primary group
  const [startStaffId, setStartStaffId] = useState<string>('');

  // Start day (1 to daysInMonth, default 1)
  const [startDay, setStartDay] = useState<number>(1);

  // Day filter: 'all' (default), 'weekdays', 'weekends'
  const [dayScope, setDayScope] = useState<'all' | 'weekdays' | 'weekends'>('all');

  // Whether to preserve existing shifts of groups not being scheduled
  const [preserveOtherGroups, setPreserveOtherGroups] = useState<boolean>(true);

  // ==========================================
  // Mode 2 (Cascade Multi-Shift Pattern) States
  // ==========================================
  const [dayOffsetStep, setDayOffsetStep] = useState<number>(1);
  const [categoryPatterns, setCategoryPatterns] = useState<Record<StaffCategory, string[]>>(() => {
    if (roomId === 'lab') {
      return {
        technologist: ['MORN', 'EVN1', 'NGHT', ''],
        assistant: ['MORN', 'EVN1', ''],
        part_time: ['PART', ''],
      };
    } else {
      return {
        technologist: ['BD01', 'BD02', ''],
        assistant: ['BD01', 'BD02', ''],
        part_time: ['PART', ''],
      };
    }
  });
  const [activeCategoryTab, setActiveCategoryTab] = useState<StaffCategory>('technologist');

  // ==========================================
  // Mode 3 (Quota) States
  // ==========================================
  const [morningQuota, setMorningQuota] = useState(2);
  const [afternoonQuota, setAfternoonQuota] = useState(1);
  const [nightQuota, setNightQuota] = useState(1);

  // Common Preview State
  const [previewAssignments, setPreviewAssignments] = useState<Record<
    string,
    Record<number, string>
  > | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Filter valid shift types for selection (exclude OFFF from dropdown)
  const availableShifts = useMemo(() => {
    return shiftTypes.filter((s) => s.code !== 'OFFF');
  }, [shiftTypes]);

  const daysInMonth = getDaysInMonth(yearMonth);
  const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  // Eligible active staff for this room
  const eligibleStaff = useMemo(() => {
    return staffList
      .filter((s) => {
        if (!s.isActive) return false;
        return s.room === 'both' || s.room === roomId;
      })
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [staffList, roomId]);

  // Technologists (นักเทคนิคการแพทย์)
  const technologistStaff = useMemo(() => {
    return eligibleStaff.filter((s) => s.category === 'technologist');
  }, [eligibleStaff]);

  // Assistants (เจ้าหน้าที่ช่วยบริการโลหิต / ผู้ช่วยฯ)
  const assistantStaff = useMemo(() => {
    return eligibleStaff.filter((s) => s.category === 'assistant');
  }, [eligibleStaff]);

  // Part-time
  const partTimeStaff = useMemo(() => {
    return eligibleStaff.filter((s) => s.category === 'part_time');
  }, [eligibleStaff]);

  // Set default startStaffId when technologist list is available
  useEffect(() => {
    if (!startStaffId && technologistStaff.length > 0) {
      setStartStaffId(technologistStaff[0].id);
    }
  }, [technologistStaff, startStaffId]);

  // Categories helper for Mode 2
  const categories: Array<{ id: StaffCategory; title: string; color: string }> = [
    {
      id: 'technologist',
      title: '1. นักเทคนิคการแพทย์',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
    },
    {
      id: 'assistant',
      title: '2. ผู้ช่วยฯ / ช่วยบริการโลหิต',
      color: 'text-amber-700 bg-amber-50 border-amber-300',
    },
    {
      id: 'part_time',
      title: '3. เจ้าหน้าที่ Part-time',
      color: 'text-violet-700 bg-violet-50 border-violet-300',
    },
  ];

  const categoryStatus = categories.map((cat) => {
    const list = eligibleStaff.filter((s) => s.category === cat.id);
    const person1 = list[0] || null;
    const p1Assignments = person1 ? currentSchedule.assignments[person1.id] || {} : {};
    return {
      category: cat.id,
      title: cat.title,
      color: cat.color,
      list,
      person1,
      assignments: p1Assignments,
    };
  });

  // ==========================================
  // Core Computation: Mode 1 (Diagonal Sequential Duty)
  // "เรียงไล่ลงมาจากซ้ายไปขวา จากนักเทคนิคการแพทย์คนแรก เช่น คนที่1 บด วันที่1 ลงมาเป็นคนที่2 บด วันที่2 ,คนที่3 บด วันที่3 จนถึงคนสุดท้ายแล้วให้กลับขึ้นไปที่คนแรกและไล่ไปเรื่อยๆ จนครบเดือน"
  // ==========================================
  const generateDiagonalSchedule = () => {
    const newAssignments: Record<string, Record<number, string>> = {};

    // 1. Initialize empty assignment maps for all eligible staff
    eligibleStaff.forEach((s) => {
      newAssignments[s.id] = {};
    });

    // 2. If preserving other groups, copy their existing assignments
    if (preserveOtherGroups) {
      Object.keys(currentSchedule.assignments || {}).forEach((sId) => {
        const staffObj = staffList.find((s) => s.id === sId);
        if (!staffObj) return;

        // If target is technologist only, preserve assistants and part-timers
        if (diagonalTarget === 'technologist' && staffObj.category !== 'technologist') {
          newAssignments[sId] = { ...(currentSchedule.assignments[sId] || {}) };
        } else if (diagonalTarget === 'assistant' && staffObj.category !== 'assistant') {
          newAssignments[sId] = { ...(currentSchedule.assignments[sId] || {}) };
        }
      });
    }

    // Determine target groups and their lists
    interface DutyTrack {
      groupName: string;
      staffList: Staff[];
      shiftCode: string;
      startIndex: number;
    }

    const tracks: DutyTrack[] = [];

    if (diagonalTarget === 'technologist') {
      const sIndex = Math.max(
        0,
        technologistStaff.findIndex((s) => s.id === startStaffId)
      );
      tracks.push({
        groupName: 'นักเทคนิคการแพทย์',
        staffList: technologistStaff,
        shiftCode: selectedShiftCode,
        startIndex: sIndex >= 0 ? sIndex : 0,
      });
    } else if (diagonalTarget === 'assistant') {
      tracks.push({
        groupName: 'ผู้ช่วยฯ / ช่วยบริการโลหิต',
        staffList: assistantStaff,
        shiftCode: selectedShiftCode,
        startIndex: 0,
      });
    } else if (diagonalTarget === 'both_separated') {
      const sIndex = Math.max(
        0,
        technologistStaff.findIndex((s) => s.id === startStaffId)
      );
      tracks.push({
        groupName: 'นักเทคนิคการแพทย์',
        staffList: technologistStaff,
        shiftCode: selectedShiftCode,
        startIndex: sIndex >= 0 ? sIndex : 0,
      });
      tracks.push({
        groupName: 'ผู้ช่วยฯ / ช่วยบริการโลหิต',
        staffList: assistantStaff,
        shiftCode: assistantShiftCode,
        startIndex: 0,
      });
    } else {
      // all_together
      const sIndex = Math.max(
        0,
        eligibleStaff.findIndex((s) => s.id === startStaffId)
      );
      tracks.push({
        groupName: 'เจ้าหน้าที่ทั้งหมด',
        staffList: eligibleStaff,
        shiftCode: selectedShiftCode,
        startIndex: sIndex >= 0 ? sIndex : 0,
      });
    }

    let totalDutiesAssigned = 0;
    let daysRunCount = 0;

    tracks.forEach((track) => {
      const { staffList: list, shiftCode, startIndex } = track;
      if (list.length === 0) return;

      // Initialize all days for staff in this track to '' (empty)
      list.forEach((s) => {
        newAssignments[s.id] = newAssignments[s.id] || {};
        for (let d = 1; d <= daysInMonth; d++) {
          newAssignments[s.id][d] = '';
        }
      });

      let stepCounter = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        // Day filtering
        const isWk = isWeekend(yearMonth, day);
        if (dayScope === 'weekdays' && isWk) continue;
        if (dayScope === 'weekends' && !isWk) continue;

        if (day < startDay) continue;

        // Diagonal downward modulo:
        // Day 1 (stepCounter 0) -> person index 0
        // Day 2 (stepCounter 1) -> person index 1
        // Day 3 (stepCounter 2) -> person index 2
        // ...
        // Day K (stepCounter K) -> person index K % length
        // When reaching last person, loops cleanly back to index 0 (Person 1)!
        const staffIndex = (startIndex + stepCounter) % list.length;
        const onDutyStaff = list[staffIndex];

        newAssignments[onDutyStaff.id][day] = shiftCode;
        totalDutiesAssigned++;
        stepCounter++;
      }
      daysRunCount = Math.max(daysRunCount, stepCounter);
    });

    const shiftMeta = shiftTypes.find((s) => s.code === selectedShiftCode);
    const shiftLabel = shiftMeta ? `${shiftMeta.code} (${shiftMeta.name})` : selectedShiftCode;
    const person1Name =
      tracks[0]?.staffList[tracks[0]?.startIndex]?.thaiName ||
      technologistStaff[0]?.thaiName ||
      'คนที่ 1';

    const loopCount = tracks[0]?.staffList.length
      ? Math.floor(daysRunCount / tracks[0].staffList.length)
      : 0;
    const remainder = tracks[0]?.staffList.length
      ? daysRunCount % tracks[0].staffList.length
      : 0;

    setPreviewAssignments(newAssignments);
    setInfoMessage(
      `จัดเรียงเวรไล่ลงมาจากซ้ายไปขวาเรียบร้อย: เริ่มจากคนที่ 1 (${person1Name}) วันที่ ${startDay} ลงมาทีละคน จนครบ ${tracks[0]?.staffList.length} คน แล้ววนกลับมาที่คนแรก รวมทั้งสิ้น ${daysRunCount} วัน (${loopCount} รอบเต็ม + ${remainder} วัน) • เวร "${shiftLabel}" • ช่องที่ไม่มีเวรเว้นว่างไว้ทั้งหมด 100%`
    );
  };

  // ==========================================
  // Mode 2: Multi-Shift Cascade
  // ==========================================
  const generateCascadeSchedule = () => {
    const newAssignments: Record<string, Record<number, string>> = {};

    Object.keys(currentSchedule.assignments || {}).forEach((sId) => {
      newAssignments[sId] = { ...(currentSchedule.assignments[sId] || {}) };
    });

    let totalDutyAssigned = 0;

    categoryStatus.forEach(({ category, list, person1 }) => {
      if (!person1 || list.length === 0) return;

      const pattern = categoryPatterns[category] || ['MORN', 'EVN1', 'NGHT', ''];
      if (pattern.length === 0) return;

      list.forEach((staff, staffIndex) => {
        const staffMap: Record<number, string> = {};

        for (let day = 1; day <= daysInMonth; day++) {
          const patternIndex =
            (((day - 1) + staffIndex * dayOffsetStep) % pattern.length + pattern.length) %
            pattern.length;

          const rawCode = pattern[patternIndex];
          if (rawCode && rawCode.trim() !== '' && rawCode.trim() !== 'OFFF') {
            staffMap[day] = rawCode.trim();
            totalDutyAssigned++;
          } else {
            staffMap[day] = '';
          }
        }

        newAssignments[staff.id] = staffMap;
      });
    });

    setPreviewAssignments(newAssignments);
    setInfoMessage(
      `จัดเรียงเวรแบบหมุนเวียนหลายกะเรียบร้อย: มอบหมาย ${totalDutyAssigned} ช่อง • ช่องที่ไม่มีรหัสเวรเว้นว่างไว้ทั้งหมด`
    );
  };

  // ==========================================
  // Mode 3: Headcount Quota
  // ==========================================
  const generateQuotaSchedule = () => {
    const mornCode = roomId === 'lab' ? 'MORN' : 'BD01';
    const evnCode = roomId === 'lab' ? 'EVN1' : 'BD02';
    const nghtCode = roomId === 'lab' ? 'NGHT' : 'EVN1';

    const newAssignments: Record<string, Record<number, string>> = {};
    eligibleStaff.forEach((s) => {
      newAssignments[s.id] = {};
    });

    const staffIds = eligibleStaff.map((s) => s.id);
    if (staffIds.length === 0) return;

    let pointer = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dayIsWk = isWeekend(yearMonth, day);
      const mQuota = dayIsWk ? Math.max(1, morningQuota - 1) : morningQuota;
      const eQuota = afternoonQuota;
      const nQuota = roomId === 'lab' ? nightQuota : 0;
      const assignedToday = new Set<string>();

      // Night shift
      for (let n = 0; n < nQuota; n++) {
        const bestStaff =
          staffIds.find(
            (id) => !assignedToday.has(id) && newAssignments[id][day - 1] !== nghtCode
          ) || staffIds[pointer % staffIds.length];
        assignedToday.add(bestStaff);
        newAssignments[bestStaff][day] = nghtCode;
        pointer++;
      }

      // Afternoon shift
      for (let e = 0; e < eQuota; e++) {
        const bestStaff =
          staffIds.find(
            (id) => !assignedToday.has(id) && newAssignments[id][day - 1] !== nghtCode
          ) || staffIds[pointer % staffIds.length];
        assignedToday.add(bestStaff);
        newAssignments[bestStaff][day] = evnCode;
        pointer++;
      }

      // Morning shift
      for (let m = 0; m < mQuota; m++) {
        const bestStaff =
          staffIds.find(
            (id) => !assignedToday.has(id) && newAssignments[id][day - 1] !== nghtCode
          ) || staffIds[pointer % staffIds.length];
        assignedToday.add(bestStaff);
        newAssignments[bestStaff][day] = mornCode;
        pointer++;
      }

      staffIds.forEach((id) => {
        if (!assignedToday.has(id)) {
          newAssignments[id][day] = '';
        }
      });
    }

    setPreviewAssignments(newAssignments);
    setInfoMessage('คำนวณจัดเวรตามโควตาเรียบร้อยแล้ว (ช่องที่ไม่มีเวรเว้นว่างไว้ ไม่เติมรหัสใดๆ)');
  };

  // Run calculation based on selected mode
  const handleRunAutoSchedule = () => {
    if (scheduleMode === 'diagonal') {
      generateDiagonalSchedule();
    } else if (scheduleMode === 'cascade') {
      generateCascadeSchedule();
    } else {
      generateQuotaSchedule();
    }
  };

  // Automatically trigger preview calculation on modal open or when key parameters change
  useEffect(() => {
    if (isOpen) {
      if (scheduleMode === 'diagonal') {
        generateDiagonalSchedule();
      } else if (scheduleMode === 'cascade') {
        generateCascadeSchedule();
      } else {
        generateQuotaSchedule();
      }
    }
  }, [
    isOpen,
    scheduleMode,
    diagonalTarget,
    selectedShiftCode,
    assistantShiftCode,
    startStaffId,
    startDay,
    dayScope,
    preserveOtherGroups,
  ]);

  // Apply previewed schedule
  const handleApply = async () => {
    if (!previewAssignments || isApplying) return;
    setIsApplying(true);

    try {
      const sanitizedAssignments: Record<string, Record<number, string>> = {};
      Object.entries(previewAssignments).forEach(([staffId, dayMap]) => {
        sanitizedAssignments[staffId] = {};
        Object.entries(dayMap).forEach(([dayStr, code]) => {
          const dayNum = Number(dayStr);
          if (code && code.trim() !== '' && code.trim() !== 'OFFF') {
            sanitizedAssignments[staffId][dayNum] = code.trim();
          } else {
            sanitizedAssignments[staffId][dayNum] = '';
          }
        });
      });

      const scheduleToSave: MonthSchedule = {
        id: `${roomId}_${yearMonth}`,
        roomId,
        yearMonth,
        assignments: sanitizedAssignments,
        updatedAt: new Date().toISOString(),
        updatedBy: 'alisa (Auto-Scheduler)',
      };

      await onApplySchedule(scheduleToSave);
      onClose();
    } catch (e) {
      console.error('Apply schedule error:', e);
    } finally {
      setIsApplying(false);
    }
  };

  // Helper to load pattern in cascade mode
  const handleLoadFromPerson1Grid = (categoryId: StaffCategory) => {
    const status = categoryStatus.find((c) => c.category === categoryId);
    if (!status || !status.person1) return;

    const p1Map = currentSchedule.assignments[status.person1.id] || {};
    const filledDays = Object.keys(p1Map)
      .map(Number)
      .filter((d) => p1Map[d] && p1Map[d].trim() !== '' && p1Map[d] !== 'OFFF')
      .sort((a, b) => a - b);

    if (filledDays.length === 0) {
      alert(`คนที่ 1 (${status.person1.thaiName}) ยังไม่มีเวรที่บันทึกไว้ในตาราง`);
      return;
    }

    const maxDay = Math.min(Math.max(...filledDays), daysInMonth);
    const newPattern: string[] = [];
    for (let d = 1; d <= maxDay; d++) {
      const code = p1Map[d];
      newPattern.push(code && code.trim() !== '' && code !== 'OFFF' ? code.trim() : '');
    }

    setCategoryPatterns((prev) => ({
      ...prev,
      [categoryId]: newPattern.length > 0 ? newPattern : ['MORN', 'EVN1', 'NGHT', ''],
    }));
  };

  const currentPattern = categoryPatterns[activeCategoryTab] || [];

  if (!isOpen) return null;

  const roomName = roomId === 'lab' ? 'ห้องปฏิบัติการ (Lab)' : 'ห้องรับบริจาคโลหิต (Donor Room)';

  // Find shift metadata for display
  const primaryShiftMeta = shiftTypes.find((s) => s.code === selectedShiftCode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl max-h-[94vh] bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[6px_8px_0px_rgba(70,60,50,0.22)] p-4 sm:p-6 overflow-hidden flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-[#F3ECE0] transition-colors cursor-pointer"
          title="ปิดหน้าต่าง"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-[#EFE7DC] shrink-0">
          <div className="flex items-center gap-1.5 p-2 bg-[#DCFCE7] border border-[#86EFAC] rounded-xl shrink-0">
            <CuteAstronaut size={30} />
            <CuteAlien size={28} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-800 font-['Prompt'] flex items-center gap-2 flex-wrap">
              <span>ระบบจัดเวรอัตโนมัติ (Auto-Scheduler)</span>
              <span className="text-xs font-bold px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>เรียงไล่ลงมาจากซ้ายไปขวา</span>
              </span>
            </h2>
            <p className="text-xs text-stone-500">
              {roomName} • ประจำเดือน {formatYearMonthThai(yearMonth)} ({daysInMonth} วัน)
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-3 shrink-0">
          <button
            type="button"
            onClick={() => setScheduleMode('diagonal')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              scheduleMode === 'diagonal'
                ? 'bg-[#F28C38] text-white border-[#D56B16] shadow-xs ring-2 ring-amber-200'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-[#FAF4EA]'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>1. เรียงไล่ลงมาจากซ้ายไปขวา (แนะนำตามข้อกำหนด)</span>
          </button>

          <button
            type="button"
            onClick={() => setScheduleMode('cascade')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              scheduleMode === 'cascade'
                ? 'bg-[#F28C38] text-white border-[#D56B16] shadow-xs'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-[#FAF4EA]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>2. หมุนเวียนหลายกะต่อลงมา (เช้า-บ่าย-ดึก)</span>
          </button>

          <button
            type="button"
            onClick={() => setScheduleMode('quota')}
            className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
              scheduleMode === 'quota'
                ? 'bg-[#F28C38] text-white border-[#D56B16] shadow-xs'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-[#FAF4EA]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3. จัดตามโควตาจำนวนคนต่อวัน</span>
          </button>
        </div>

        {/* Highlight Guarantee Banner: 100% empty slots & auto-backup on save */}
        <div className="my-2.5 p-2.5 bg-emerald-50/90 border border-emerald-300 rounded-xl text-[11px] text-emerald-950 flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>กฎการจัดเวร:</strong> เรียงเวรต่อลงมาจากคนแรก และ{' '}
              <span className="underline font-bold text-emerald-900">
                ในช่องที่ไม่มีเวร จะเว้นว่างไว้ทั้งหมด 100%
              </span>{' '}
              (ไม่เติมรหัส OFFF หรือสัญลักษณ์ใดๆ)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>สำรองข้อมูลอัตโนมัติทันทีเมื่อกดยืนยัน</span>
          </div>
        </div>

        {/* Scrollable Configuration Body */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
          {scheduleMode === 'diagonal' ? (
            /* ========================================================= */
            /* Mode 1: Diagonal Sequential Duty (Left-to-Right Loop)     */
            /* ========================================================= */
            <div className="space-y-3">
              {/* Card 1: Target Group and Shift Code */}
              <div className="p-3.5 bg-[#FAF5EC] border border-[#E7DFD5] rounded-xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#EFE7DC] pb-2">
                  <div className="font-bold text-stone-800 flex items-center gap-2">
                    <span className="p-1 bg-amber-200/80 rounded-md text-stone-800">
                      <Sparkles className="w-4 h-4 text-amber-700" />
                    </span>
                    <span>
                      การเรียงอัตโนมัติไล่ลงมาจากซ้ายไปขวา: คนที่ 1 วันที่ 1 → คนที่ 2 วันที่ 2 →
                      จนถึงคนสุดท้าย แล้ววนกลับขึ้นไปที่คนแรก
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Left Column: Target Group */}
                  <div className="space-y-2">
                    <label className="block font-bold text-stone-700 text-xs flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-stone-600" />
                      <span>กลุ่มเจ้าหน้าที่เป้าหมายที่ต้องการจัดเรียง:</span>
                    </label>

                    <div className="space-y-1.5">
                      <label
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                          diagonalTarget === 'technologist'
                            ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300'
                            : 'bg-white border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="diagonalTarget"
                          checked={diagonalTarget === 'technologist'}
                          onChange={() => setDiagonalTarget('technologist')}
                          className="mt-0.5 text-emerald-600 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                            <span>1. เฉพาะนักเทคนิคการแพทย์ (แนะนำตามข้อกำหนด)</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-semibold">
                              {technologistStaff.length} ท่าน
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            เริ่มจากคนที่ 1 ({technologistStaff[0]?.thaiName || 'คนแรก'}) ไล่ลงมาถึงคนสุดท้าย ({technologistStaff[technologistStaff.length - 1]?.thaiName || 'คนสุดท้าย'}) แล้ววนกลับไปคนแรก
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                          diagonalTarget === 'both_separated'
                            ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-300'
                            : 'bg-white border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="diagonalTarget"
                          checked={diagonalTarget === 'both_separated'}
                          onChange={() => setDiagonalTarget('both_separated')}
                          className="mt-0.5 text-amber-600 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                            <span>2. จัดแยกกันทั้ง 2 กลุ่ม (นักเทคนิคการแพทย์ + ผู้ช่วยฯ)</span>
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-semibold">
                              {technologistStaff.length} + {assistantStaff.length} ท่าน
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            นักเทคนิคการแพทย์หมุนเวียน 1 ชุด และผู้ช่วยฯ หมุนเวียนคู่ขนานอีก 1 ชุด
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                          diagonalTarget === 'assistant'
                            ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-300'
                            : 'bg-white border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="diagonalTarget"
                          checked={diagonalTarget === 'assistant'}
                          onChange={() => setDiagonalTarget('assistant')}
                          className="mt-0.5 text-amber-600 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                            <span>3. เฉพาะผู้ช่วยฯ / เจ้าหน้าที่ช่วยบริการโลหิต</span>
                            <span className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.2 rounded-full font-semibold">
                              {assistantStaff.length} ท่าน
                            </span>
                          </div>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                          diagonalTarget === 'all_together'
                            ? 'bg-stone-100 border-stone-400 ring-1 ring-stone-300'
                            : 'bg-white border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="diagonalTarget"
                          checked={diagonalTarget === 'all_together'}
                          onChange={() => setDiagonalTarget('all_together')}
                          className="mt-0.5 text-stone-600 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                            <span>4. รวมเจ้าหน้าที่ทุกคนในห้องต่อแถวเดียวกัน</span>
                            <span className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.2 rounded-full font-semibold">
                              รวม {eligibleStaff.length} ท่าน
                            </span>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Right Column: Shift Code Selection */}
                  <div className="space-y-2.5">
                    <div>
                      <label className="block font-bold text-stone-700 text-xs mb-1">
                        เลือกรหัสเวรที่ต้องการลง (Shift Code):
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedShiftCode}
                          onChange={(e) => setSelectedShiftCode(e.target.value)}
                          className="flex-1 py-1.5 px-3 bg-white border border-stone-300 rounded-lg font-bold text-stone-800 text-xs cursor-pointer shadow-xs focus:ring-2 focus:ring-amber-300"
                        >
                          {availableShifts.map((st) => (
                            <option key={st.id} value={st.code}>
                              {st.code} - {st.name} ({st.timeRange})
                            </option>
                          ))}
                        </select>

                        {primaryShiftMeta && (
                          <span
                            className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs shrink-0 ${
                              primaryShiftMeta.color ||
                              'bg-emerald-100 text-emerald-950 border-emerald-300'
                            }`}
                          >
                            {primaryShiftMeta.code}
                          </span>
                        )}
                      </div>

                      {/* Quick Shift Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-stone-500 font-semibold">เลือกด่วน:</span>
                        {roomId === 'donor' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedShiftCode('BD01')}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border cursor-pointer transition-colors ${
                                selectedShiftCode === 'BD01'
                                  ? 'bg-rose-500 text-white border-rose-600 shadow-2xs'
                                  : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50'
                              }`}
                            >
                              BD01 (บด - รับบริจาคเช้า)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedShiftCode('BD02')}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border cursor-pointer transition-colors ${
                                selectedShiftCode === 'BD02'
                                  ? 'bg-orange-500 text-white border-orange-600 shadow-2xs'
                                  : 'bg-white text-orange-800 border-orange-200 hover:bg-orange-50'
                              }`}
                            >
                              BD02 (บด บ่าย OT)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedShiftCode('PART')}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border cursor-pointer transition-colors ${
                                selectedShiftCode === 'PART'
                                  ? 'bg-teal-600 text-white border-teal-700 shadow-2xs'
                                  : 'bg-white text-teal-800 border-teal-200 hover:bg-teal-50'
                              }`}
                            >
                              PART (พาร์ทไทม์)
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedShiftCode('MORN')}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border cursor-pointer transition-colors ${
                                selectedShiftCode === 'MORN'
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                  : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                              }`}
                            >
                              MORN (เช้า)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedShiftCode('EVN1')}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border cursor-pointer transition-colors ${
                                selectedShiftCode === 'EVN1'
                                  ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                                  : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
                              }`}
                            >
                              EVN1 (บ่าย OT)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedShiftCode('NGHT')}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border cursor-pointer transition-colors ${
                                selectedShiftCode === 'NGHT'
                                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                                  : 'bg-white text-indigo-800 border-indigo-200 hover:bg-indigo-50'
                              }`}
                            >
                              NGHT (ดึก OT)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedShiftCode('LAB1')}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border cursor-pointer transition-colors ${
                                selectedShiftCode === 'LAB1'
                                  ? 'bg-sky-600 text-white border-sky-700 shadow-2xs'
                                  : 'bg-white text-sky-800 border-sky-200 hover:bg-sky-50'
                              }`}
                            >
                              LAB1 (ปฏิบัติการเช้า)
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {diagonalTarget === 'both_separated' && (
                      <div className="pt-2 border-t border-stone-200">
                        <label className="block font-bold text-stone-700 text-xs mb-1">
                          รหัสเวรสำหรับกลุ่มผู้ช่วยฯ / ช่วยบริการโลหิต:
                        </label>
                        <select
                          value={assistantShiftCode}
                          onChange={(e) => setAssistantShiftCode(e.target.value)}
                          className="w-full py-1.5 px-3 bg-white border border-stone-300 rounded-lg font-bold text-stone-800 text-xs cursor-pointer shadow-xs"
                        >
                          {availableShifts.map((st) => (
                            <option key={st.id} value={st.code}>
                              {st.code} - {st.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Start Staff and Start Day Settings */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200">
                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-stone-500" />
                          <span>เริ่มจากคนที่ 1:</span>
                        </label>
                        <select
                          value={startStaffId}
                          onChange={(e) => setStartStaffId(e.target.value)}
                          className="w-full py-1 px-2 bg-white border border-stone-300 rounded-md text-xs font-semibold text-stone-800 cursor-pointer"
                        >
                          {(diagonalTarget === 'assistant'
                            ? assistantStaff
                            : diagonalTarget === 'all_together'
                            ? eligibleStaff
                            : technologistStaff
                          ).map((s, idx) => (
                            <option key={s.id} value={s.id}>
                              ลำดับ {idx + 1}: {s.thaiName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-stone-500" />
                          <span>เริ่มจากวันที่:</span>
                        </label>
                        <select
                          value={startDay}
                          onChange={(e) => setStartDay(Number(e.target.value))}
                          className="w-full py-1 px-2 bg-white border border-stone-300 rounded-md text-xs font-semibold text-stone-800 cursor-pointer"
                        >
                          {daysArray.map((d) => (
                            <option key={d} value={d}>
                              วันที่ {d} ({THAI_DAYS_SHORT[getDayOfWeek(yearMonth, d)]})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Scope and Preserve Toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-stone-700">ขอบเขตวัน:</span>
                        <button
                          type="button"
                          onClick={() => setDayScope('all')}
                          className={`px-2 py-0.5 rounded-md font-semibold border cursor-pointer ${
                            dayScope === 'all'
                              ? 'bg-stone-800 text-white border-stone-900'
                              : 'bg-white text-stone-700 border-stone-200'
                          }`}
                        >
                          ทุกวัน (1-{daysInMonth})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDayScope('weekdays')}
                          className={`px-2 py-0.5 rounded-md font-semibold border cursor-pointer ${
                            dayScope === 'weekdays'
                              ? 'bg-stone-800 text-white border-stone-900'
                              : 'bg-white text-stone-700 border-stone-200'
                          }`}
                        >
                          จันทร์-ศุกร์
                        </button>
                        <button
                          type="button"
                          onClick={() => setDayScope('weekends')}
                          className={`px-2 py-0.5 rounded-md font-semibold border cursor-pointer ${
                            dayScope === 'weekends'
                              ? 'bg-stone-800 text-white border-stone-900'
                              : 'bg-white text-stone-700 border-stone-200'
                          }`}
                        >
                          เสาร์-อาทิตย์
                        </button>
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={preserveOtherGroups}
                          onChange={(e) => setPreserveOtherGroups(e.target.checked)}
                          className="rounded text-amber-600 cursor-pointer"
                        />
                        <span className="text-[11px] font-medium text-stone-700">
                          รักษาเวรเดิมของกลุ่มอื่นไว้
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : scheduleMode === 'cascade' ? (
            /* ========================================================= */
            /* Mode 2: Multi-Shift Pattern Cascade                       */
            /* ========================================================= */
            <div className="space-y-3">
              <div className="p-3 bg-[#FAF5EC] border border-[#E7DFD5] rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>เลือกลำดับรหัสเวรของคนที่ 1 ในแต่ละกลุ่มตำแหน่ง:</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-stone-600">การเลื่อนวันถัดไป:</span>
                    <button
                      type="button"
                      onClick={() => setDayOffsetStep(1)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border cursor-pointer ${
                        dayOffsetStep === 1
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-white text-stone-700 border-stone-200'
                      }`}
                    >
                      ต่อลงมาทีละ +1 กะ (มาตรฐาน)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDayOffsetStep(2)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border cursor-pointer ${
                        dayOffsetStep === 2
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-white text-stone-700 border-stone-200'
                      }`}
                    >
                      ต่อลงมาทีละ +2 กะ
                    </button>
                  </div>
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const st = categoryStatus.find((s) => s.category === cat.id);
                    const isSelected = activeCategoryTab === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategoryTab(cat.id)}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs border flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-stone-800 text-white border-stone-900 shadow-xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <span>{cat.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isSelected ? 'bg-stone-700 text-amber-300' : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {st?.list.length || 0} ท่าน
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Category Pattern Setup */}
                <div className="p-3 bg-white border border-[#E7DFD5] rounded-xl space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
                    <div className="text-stone-700">
                      <span>คนที่ 1 ของกลุ่มนี้: </span>
                      <strong className="text-stone-900">
                        {categoryStatus.find((s) => s.category === activeCategoryTab)?.person1
                          ?.thaiName || 'ไม่มีเจ้าหน้าที่'}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleLoadFromPerson1Grid(activeCategoryTab)}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="ดึงรหัสเวรที่เคยใส่ไว้ให้คนที่ 1 ในตารางปัจจุบันมาเป็นแบบแผน"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-600" />
                        <span>ดึงจากเวรในตารางของคนที่ 1</span>
                      </button>

                      {roomId === 'lab' ? (
                        <button
                          type="button"
                          onClick={() =>
                            setCategoryPatterns((prev) => ({
                              ...prev,
                              [activeCategoryTab]: ['MORN', 'EVN1', 'NGHT', ''],
                            }))
                          }
                          className="px-2 py-1 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-md text-[11px] transition-colors cursor-pointer"
                        >
                          เซ็ตเริ่มต้น [เช้า-บ่าย-ดึก-ว่าง]
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setCategoryPatterns((prev) => ({
                              ...prev,
                              [activeCategoryTab]: ['BD01', 'BD02', ''],
                            }))
                          }
                          className="px-2 py-1 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-md text-[11px] transition-colors cursor-pointer"
                        >
                          เซ็ตเริ่มต้น [บดเช้า-บดบ่าย-ว่าง]
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1.5">
                      วงรอบเวรของคนที่ 1 (วนซ้ำ {currentPattern.length} กะ/วัน • คนถัดไปจะเรียงต่อลงมาตามลำดับนี้):
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      {currentPattern.map((code, idx) => {
                        const isBlank = !code || code.trim() === '' || code === 'OFFF';
                        const matchedShift = shiftTypes.find((s) => s.code === code);

                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-1 p-1.5 bg-[#FAF7F0] border border-stone-200 rounded-lg"
                          >
                            <span className="font-mono text-[10px] text-stone-500 font-bold px-1">
                              ลำดับ {idx + 1}:
                            </span>

                            <select
                              value={isBlank ? '' : code}
                              onChange={(e) => {
                                const newP = [...currentPattern];
                                newP[idx] = e.target.value;
                                setCategoryPatterns((prev) => ({
                                  ...prev,
                                  [activeCategoryTab]: newP,
                                }));
                              }}
                              className={`py-1 px-1.5 text-xs font-bold rounded-md border cursor-pointer ${
                                isBlank
                                  ? 'bg-stone-100 text-stone-600 border-stone-300'
                                  : matchedShift?.color ||
                                    'bg-emerald-100 text-emerald-950 border-emerald-300'
                              }`}
                            >
                              <option value="">(เว้นว่าง / ไม่มีรหัสเวร)</option>
                              {availableShifts.map((st) => (
                                <option key={st.id} value={st.code}>
                                  {st.code} - {st.name}
                                </option>
                              ))}
                            </select>

                            {currentPattern.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newP = [...currentPattern];
                                  newP.splice(idx, 1);
                                  setCategoryPatterns((prev) => ({
                                    ...prev,
                                    [activeCategoryTab]: newP,
                                  }));
                                }}
                                className="p-1 text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                                title="ลบกะนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => {
                          setCategoryPatterns((prev) => ({
                            ...prev,
                            [activeCategoryTab]: [...(prev[activeCategoryTab] || []), ''],
                          }));
                        }}
                        className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-dashed border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มกะ / ช่องเว้นว่าง</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* Mode 3: Headcount Quota                                   */
            /* ========================================================= */
            <div className="p-3.5 bg-[#FAF5EC] border border-[#E7DFD5] rounded-xl space-y-3">
              <h3 className="font-bold text-stone-800">
                ⚙️ กำหนดจำนวนเจ้าหน้าที่ที่ต้องการในแต่ละช่วงเวลา (คน/วัน):
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-2.5 bg-white rounded-lg border border-[#DACFBF]">
                  <label className="block font-semibold text-stone-700 mb-1">เวรเช้า (Morning)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={morningQuota}
                    onChange={(e) => setMorningQuota(Math.max(1, Number(e.target.value)))}
                    className="w-full px-2 py-1 border border-stone-200 rounded-md font-semibold text-center text-sm"
                  />
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-[#DACFBF]">
                  <label className="block font-semibold text-stone-700 mb-1">เวรบ่าย (Afternoon)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={afternoonQuota}
                    onChange={(e) => setAfternoonQuota(Math.max(0, Number(e.target.value)))}
                    className="w-full px-2 py-1 border border-stone-200 rounded-md font-semibold text-center text-sm"
                  />
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-[#DACFBF]">
                  <label className="block font-semibold text-stone-700 mb-1">เวรดึก (Night)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={nightQuota}
                    onChange={(e) => setNightQuota(Math.max(0, Number(e.target.value)))}
                    className="w-full px-2 py-1 border border-stone-200 rounded-md font-semibold text-center text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Recalculate Button */}
          <div className="flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={handleRunAutoSchedule}
              className="py-2 px-5 bg-[#4ADE80] hover:bg-[#22C55E] text-stone-900 font-bold text-xs rounded-xl border border-[#16A34A] shadow-[1px_2px_0px_rgba(70,60,50,0.12)] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-stone-900" />
              <span>คำนวณและปรับผลการจัดเวรใหม่</span>
            </button>
          </div>

          {/* Status Message */}
          {infoMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-start gap-2 shadow-2xs">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{infoMessage}</div>
            </div>
          )}

          {/* Live Preview Table */}
          {previewAssignments && (
            <div className="border border-[#E7DFD5] rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="px-3 py-2 bg-[#F7F2EA] border-b border-[#E7DFD5] flex items-center justify-between text-xs font-bold text-stone-800 flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4 text-amber-600" />
                  <span>
                    ตัวอย่างผลการจัดเวรประจำเดือน {formatYearMonthThai(yearMonth)} (แสดงครบทุกวัน):
                  </span>
                </span>
                <span className="text-[11px] font-normal text-stone-600 flex items-center gap-1">
                  <span>💡 เครื่องหมาย</span>
                  <span className="font-mono text-stone-400 font-bold">-</span>
                  <span>คือช่องว่างเปล่า (ไม่มีเวร)</span>
                </span>
              </div>

              <div className="overflow-x-auto max-h-[38vh]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#FAF5EC] text-stone-700 border-b border-[#E7DFD5] sticky top-0 z-20">
                    <tr>
                      <th className="py-2 px-2.5 text-center font-bold sticky left-0 bg-[#FAF5EC] z-30 w-10 border-r border-[#E7DFD5]">
                        ลำดับ
                      </th>
                      <th className="py-2 px-3 font-bold sticky left-10 bg-[#FAF5EC] z-30 min-w-[170px] border-r border-[#E7DFD5]">
                        ชื่อ-สกุล
                      </th>
                      <th className="py-2 px-2 text-stone-500 font-normal min-w-[130px] border-r border-[#E7DFD5]">
                        ตำแหน่ง
                      </th>
                      {daysArray.map((day) => {
                        const dayOfWeek = getDayOfWeek(yearMonth, day);
                        const isWk = isWeekend(yearMonth, day);
                        return (
                          <th
                            key={day}
                            className={`py-1.5 px-1 text-center font-mono w-11 border-r border-stone-200/60 ${
                              isWk ? 'bg-amber-100/60 text-amber-900 font-bold' : ''
                            }`}
                          >
                            <div className="text-[9px] text-stone-500">{THAI_DAYS_SHORT[dayOfWeek]}</div>
                            <div className="text-[11px] font-bold">{day}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(diagonalTarget === 'technologist'
                      ? eligibleStaff.filter((s) => s.category === 'technologist')
                      : diagonalTarget === 'assistant'
                      ? eligibleStaff.filter((s) => s.category === 'assistant')
                      : eligibleStaff
                    ).map((s, idx) => {
                      const isTech = s.category === 'technologist';
                      const isAsst = s.category === 'assistant';

                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-amber-50/50 transition-colors ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-[#FDFBF7]'
                          }`}
                        >
                          <td className="py-1.5 px-2.5 font-mono text-stone-500 text-center sticky left-0 bg-inherit z-10 border-r border-[#E7DFD5]">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-3 font-semibold text-stone-800 whitespace-nowrap sticky left-10 bg-inherit z-10 border-r border-[#E7DFD5]">
                            <div className="flex items-center gap-1.5">
                              <span>{s.thaiName}</span>
                              {idx === 0 && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                                  คนแรก
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-1.5 px-2 text-stone-500 text-[11px] whitespace-nowrap border-r border-[#E7DFD5]">
                            <span
                              className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${
                                isTech
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : isAsst
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-stone-50 text-stone-600 border border-stone-200'
                              }`}
                            >
                              {s.position}
                            </span>
                          </td>
                          {daysArray.map((day) => {
                            const code = previewAssignments[s.id]?.[day] || '';
                            const isBlank = !code || code.trim() === '' || code === 'OFFF';
                            const shiftMeta = shiftTypes.find((st) => st.code === code);
                            const isWk = isWeekend(yearMonth, day);

                            return (
                              <td
                                key={day}
                                className={`py-1 px-1 text-center font-mono text-[11px] border-r border-stone-200/50 ${
                                  isWk ? 'bg-amber-50/30' : ''
                                }`}
                              >
                                {isBlank ? (
                                  <span className="text-stone-300 font-mono">-</span>
                                ) : (
                                  <span
                                    className={`inline-block px-1 py-0.5 rounded-sm border font-bold text-[10px] shadow-2xs ${
                                      shiftMeta?.color ||
                                      'bg-emerald-100 text-emerald-950 border-emerald-300'
                                    }`}
                                    title={`${s.thaiName} วันที่ ${day}: ${code}`}
                                  >
                                    {code}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#EFE7DC] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
          >
            ยกเลิก
          </button>

          {previewAssignments && (
            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying}
              className="py-2.5 px-6 bg-[#F28C38] hover:bg-[#E57A24] text-white font-bold text-xs rounded-xl border border-[#D56B16] shadow-[2px_3px_0px_rgba(70,60,50,0.15)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>
                {isApplying
                  ? 'กำลังบันทึกข้อมูลและสำรอง...'
                  : 'ยืนยันบันทึกผลการจัดเวรลงตาราง'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
