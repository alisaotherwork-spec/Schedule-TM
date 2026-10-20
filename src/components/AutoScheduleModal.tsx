import React, { useState, useEffect } from 'react';
import { Staff, ShiftType, RoomId, MonthSchedule, StaffCategory } from '../types';
import { getDaysInMonth, formatYearMonthThai, isWeekend, THAI_DAYS_SHORT, getDayOfWeek } from '../utils/dateUtils';
import {
  X,
  Sparkles,
  Check,
  AlertCircle,
  ArrowDownRight,
  Layers,
  Calendar,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Info
} from 'lucide-react';
import { CuteAlien, CuteAstronaut, PaperStar } from './CuteSpaceDecorations';

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
  // 'cascade': จัดเรียงเวรต่อลงมาจากคนแรก (ตามรอบกะเวรหมุนเวียนลงมาทีละคน)
  // 'daily': รันเวรประจำวันต่อลงมาตามลำดับรายชื่อ (วันละ 1 คน เรียงต่อลงมา ช่องอื่นไม่เติมรหัส)
  // 'quota': จัดตามโควตาจำนวนคนต่อวัน
  const [scheduleMode, setScheduleMode] = useState<'cascade' | 'daily' | 'quota'>('cascade');
  const [dayOffsetStep, setDayOffsetStep] = useState<number>(1); // เลื่อนต่อลงมาทีละ 1 กะ/วัน

  // Quota mode states
  const [morningQuota, setMorningQuota] = useState(2);
  const [afternoonQuota, setAfternoonQuota] = useState(1);
  const [nightQuota, setNightQuota] = useState(1);

  // Daily mode states
  const [dailyShiftCode, setDailyShiftCode] = useState<string>(() => {
    return roomId === 'lab' ? 'MORN' : 'BD01';
  });

  // Patterns for Person 1 per category (array of shift codes, '' = empty/no shift)
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

  const [previewAssignments, setPreviewAssignments] = useState<Record<string, Record<number, string>> | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<StaffCategory>('technologist');

  // Filter valid shift types for selection (exclude OFFF from dropdown to prevent confusion)
  const availableShifts = shiftTypes.filter((s) => s.code !== 'OFFF');

  if (!isOpen) return null;

  const roomName = roomId === 'lab' ? 'ห้องปฏิบัติการ (Lab)' : 'ห้องรับบริจาคโลหิต (Donor Room)';
  const daysInMonth = getDaysInMonth(yearMonth);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Eligible active staff for this room
  const eligibleStaff = staffList.filter((s) => {
    if (!s.isActive) return false;
    return s.room === 'both' || s.room === roomId;
  });

  const categories: Array<{ id: StaffCategory; title: string; color: string }> = [
    { id: 'technologist', title: '1. นักเทคนิคการแพทย์', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
    { id: 'assistant', title: '2. ผู้ช่วยฯ / ธุรการ / ช่วยบริการ', color: 'text-amber-700 bg-amber-50 border-amber-300' },
    { id: 'part_time', title: '3. เจ้าหน้าที่ Part-time', color: 'text-violet-700 bg-violet-50 border-violet-300' },
  ];

  // Inspect Person 1 for each category in current schedule
  const categoryStatus = categories.map((cat) => {
    const list = eligibleStaff.filter((s) => s.category === cat.id);
    const person1 = list[0] || null;
    const p1Assignments = person1 ? currentSchedule.assignments[person1.id] || {} : {};
    const assignedDays = Object.entries(p1Assignments).filter(
      ([_, code]) => code && code.trim() !== '' && code !== 'OFFF'
    );

    return {
      category: cat.id,
      title: cat.title,
      color: cat.color,
      list,
      person1,
      assignedCount: assignedDays.length,
      assignments: p1Assignments,
    };
  });

  // Load existing shifts of Person 1 from schedule into pattern
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

  // Modify step in pattern
  const handleUpdatePatternStep = (categoryId: StaffCategory, stepIndex: number, newCode: string) => {
    setCategoryPatterns((prev) => {
      const current = [...(prev[categoryId] || [])];
      current[stepIndex] = newCode;
      return { ...prev, [categoryId]: current };
    });
  };

  // Add step to pattern
  const handleAddPatternStep = (categoryId: StaffCategory) => {
    setCategoryPatterns((prev) => {
      const current = [...(prev[categoryId] || [])];
      current.push(''); // Default blank slot (ไม่มีรหัสเวร)
      return { ...prev, [categoryId]: current };
    });
  };

  // Remove step from pattern
  const handleRemovePatternStep = (categoryId: StaffCategory, stepIndex: number) => {
    setCategoryPatterns((prev) => {
      const current = [...(prev[categoryId] || [])];
      if (current.length <= 1) return prev;
      current.splice(stepIndex, 1);
      return { ...prev, [categoryId]: current };
    });
  };

  // Reset pattern to default preset
  const handleResetPatternPreset = (categoryId: StaffCategory, preset: string[]) => {
    setCategoryPatterns((prev) => ({
      ...prev,
      [categoryId]: preset,
    }));
  };

  // 1. Cascade Shift Sequencing Logic
  // เรียงเวรต่อลงมาจากคนแรก และในช่องไหนไม่มีรหัสเวร ก็ไม่ต้องเติมให้
  const generateCascadeSchedule = () => {
    const newAssignments: Record<string, Record<number, string>> = {};

    // Copy existing untouched assignments
    Object.keys(currentSchedule.assignments || {}).forEach((sId) => {
      newAssignments[sId] = { ...(currentSchedule.assignments[sId] || {}) };
    });

    let totalCascadedStaff = 0;
    let totalDutyAssigned = 0;
    let totalEmptySlots = 0;

    categoryStatus.forEach(({ category, list, person1 }) => {
      if (!person1 || list.length === 0) return;

      const pattern = categoryPatterns[category] || ['MORN', 'EVN1', 'NGHT', ''];
      if (pattern.length === 0) return;

      // Staff index 0 (Person 1), Staff index 1 (Person 2), Staff index 2 (Person 3)...
      list.forEach((staff, staffIndex) => {
        const staffMap: Record<number, string> = {};

        for (let day = 1; day <= daysInMonth; day++) {
          // Flow shifts down from Person 1:
          // Day d:
          // Person 1 (staffIndex 0) gets pattern[(d - 1) % len]
          // Person 2 (staffIndex 1) gets pattern[((d - 1) + 1 * dayOffsetStep) % len] (ต่อลงมาจากคนแรก!)
          // Person 3 (staffIndex 2) gets pattern[((d - 1) + 2 * dayOffsetStep) % len]
          const patternIndex =
            (((day - 1) + staffIndex * dayOffsetStep) % pattern.length + pattern.length) % pattern.length;

          const rawCode = pattern[patternIndex];

          // ในช่องไหนไม่มีรหัสเวร ก็ไม่ต้องเติมให้ (เว้นว่างเป็น '' เด็ดขาด ไม่เติม OFFF หรือขีดใดๆ)
          if (rawCode && rawCode.trim() !== '' && rawCode.trim() !== 'OFFF') {
            staffMap[day] = rawCode.trim();
            totalDutyAssigned++;
          } else {
            staffMap[day] = ''; // Cleanly empty!
            totalEmptySlots++;
          }
        }

        newAssignments[staff.id] = staffMap;
        totalCascadedStaff++;
      });
    });

    setPreviewAssignments(newAssignments);
    setInfoMessage(
      `จัดเรียงเวรต่อลงมาจากคนแรกเรียบร้อยแล้ว: ครอบคลุมเจ้าหน้าที่ ${totalCascadedStaff} ท่าน • ปฏิบัติเวร ${totalDutyAssigned} ช่อง • ช่องที่ไม่มีรหัสเวรถูกเว้นว่างไว้ทั้งหมด ${totalEmptySlots} ช่อง (ไม่มีการเติมรหัสใดๆ)`
    );
  };

  // 2. Daily Sequential Duty Logic
  // รันเวรประจำวันต่อลงมาตามลำดับรายชื่อ (วันละ 1 คน เรียงต่อลงมา ช่องอื่นไม่เติมรหัส)
  const generateDailyRotationSchedule = () => {
    const newAssignments: Record<string, Record<number, string>> = {};

    eligibleStaff.forEach((s) => {
      newAssignments[s.id] = {};
    });

    let totalDaysAssigned = 0;
    categoryStatus.forEach(({ list }) => {
      if (list.length === 0) return;

      for (let day = 1; day <= daysInMonth; day++) {
        const onDutyIndex = (day - 1) % list.length;
        const onDutyStaff = list[onDutyIndex];

        list.forEach((staff, idx) => {
          if (idx === onDutyIndex) {
            newAssignments[staff.id][day] = dailyShiftCode;
            totalDaysAssigned++;
          } else {
            // ช่องที่ไม่มีรหัสเวร ไม่ต้องเติมให้ (เว้นว่าง '')
            newAssignments[staff.id][day] = '';
          }
        });
      }
    });

    setPreviewAssignments(newAssignments);
    setInfoMessage(
      `รันเวรประจำวัน (${dailyShiftCode}) ต่อลงมาจากคนแรกเรียบร้อยแล้ว: จัดเวร ${totalDaysAssigned} วัน • ช่องที่ไม่มีรหัสเวรเว้นว่างไว้ทั้งหมด 100%`
    );
  };

  // 3. Quota Schedule Logic
  // จัดตามโควตาจำนวนคนต่อวัน (ช่องที่ไม่มีเวร เว้นว่างไว้เสมอ)
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

      // In cells without shifts: DO NOT FILL (leave empty string '')
      staffIds.forEach((id) => {
        if (!assignedToday.has(id)) {
          newAssignments[id][day] = '';
        }
      });
    }

    setPreviewAssignments(newAssignments);
    setInfoMessage('คำนวณจัดเวรตามโควตาเรียบร้อยแล้ว (ช่องที่ไม่มีเวรเว้นว่างไว้ ไม่เติมรหัสใดๆ)');
  };

  const handleRunAutoSchedule = () => {
    if (scheduleMode === 'cascade') {
      generateCascadeSchedule();
    } else if (scheduleMode === 'daily') {
      generateDailyRotationSchedule();
    } else {
      generateQuotaSchedule();
    }
  };

  const handleApply = async () => {
    if (!previewAssignments) return;

    // Sanitize assignments: ensure empty cells are truly empty strings or deleted
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
      updatedBy: 'alisa (Cascade Auto-Scheduler)',
    };

    await onApplySchedule(scheduleToSave);
    onClose();
  };

  const currentPattern = categoryPatterns[activeCategoryTab] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[4px_6px_0px_rgba(70,60,50,0.18)] p-5 sm:p-6 overflow-hidden flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-[#F3ECE0] transition-colors cursor-pointer"
          title="ปิด"
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
            <h2 className="text-base sm:text-lg font-bold text-stone-800 font-['Prompt'] flex items-center gap-2">
              <span>ระบบจัดเวรอัตโนมัติ (Auto-Scheduler)</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full">
                เรียงต่อจากคนแรก
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
            onClick={() => setScheduleMode('cascade')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              scheduleMode === 'cascade'
                ? 'bg-[#F28C38] text-white border-[#D56B16] shadow-xs'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-[#FAF4EA]'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>1. หมุนเวียนกะต่อลงมาจากคนแรก (แนะนำ)</span>
          </button>

          <button
            type="button"
            onClick={() => setScheduleMode('daily')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              scheduleMode === 'daily'
                ? 'bg-[#F28C38] text-white border-[#D56B16] shadow-xs'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-[#FAF4EA]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>2. รันเวรประจำวันต่อลงมาตามลำดับคน (วันละ 1 คน)</span>
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
            <span>3. จัดตามโควตาจำนวนคน</span>
          </button>
        </div>

        {/* Highlight Guarantee Banner: No empty slots filled */}
        <div className="my-2.5 p-2.5 bg-emerald-50/90 border border-emerald-300 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>กฎการจัดเวร:</strong> เรียงเวรต่อลงมาจากคนแรก และ{' '}
            <span className="underline font-bold text-emerald-950">
              ในช่องไหนไม่มีรหัสเวร ก็จะไม่เติมให้เด็ดขาด
            </span>{' '}
            (เว้นว่างไว้เป็นช่องว่างเปล่า ไม่เติม OFFF หรือเครื่องหมายใดๆ)
          </span>
        </div>

        {/* Scrollable Configuration Body */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {scheduleMode === 'cascade' ? (
            /* Mode 1: Cascade Shift Sequencing */
            <div className="space-y-3">
              {/* Category Sub-tabs */}
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
                      <span>คนที่ 1 ของกลุ่มนี้:{' '}</span>
                      <strong className="text-stone-900">
                        {categoryStatus.find((s) => s.category === activeCategoryTab)?.person1?.thaiName ||
                          'ไม่มีเจ้าหน้าที่'}
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
                            handleResetPatternPreset(activeCategoryTab, ['MORN', 'EVN1', 'NGHT', ''])
                          }
                          className="px-2 py-1 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-md text-[11px] transition-colors cursor-pointer"
                        >
                          เซ็ตเริ่มต้น [เช้า-บ่าย-ดึก-เว้นว่าง]
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleResetPatternPreset(activeCategoryTab, ['BD01', 'BD02', ''])
                          }
                          className="px-2 py-1 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-md text-[11px] transition-colors cursor-pointer"
                        >
                          เซ็ตเริ่มต้น [รับบริจาคเช้า-บ่าย-เว้นว่าง]
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pattern Steps Badges & Selectors */}
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
                              onChange={(e) =>
                                handleUpdatePatternStep(activeCategoryTab, idx, e.target.value)
                              }
                              className={`py-1 px-1.5 text-xs font-bold rounded-md border cursor-pointer ${
                                isBlank
                                  ? 'bg-stone-100 text-stone-600 border-stone-300'
                                  : matchedShift?.color || 'bg-emerald-100 text-emerald-950 border-emerald-300'
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
                                onClick={() => handleRemovePatternStep(activeCategoryTab, idx)}
                                className="p-1 text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                                title="ลบขั้นตอนนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => handleAddPatternStep(activeCategoryTab)}
                        className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-dashed border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มกะ / ช่องเว้นว่าง</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-stone-500 mt-2">
                      💡 คำอธิบาย: คนที่ 1 จะเริ่มที่ลำดับ 1, คนที่ 2 จะเริ่มที่ลำดับ 2, คนที่ 3
                      จะเริ่มที่ลำดับ 3 เรียงต่อลงมาเรื่อยๆ •{' '}
                      <span className="text-amber-800 font-semibold">
                        ในช่องที่เป็น "(เว้นว่าง / ไม่มีรหัสเวร)" ระบบจะไม่ใส่รหัสใดๆ ให้
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : scheduleMode === 'daily' ? (
            /* Mode 2: Daily Sequential Rotation */
            <div className="p-3.5 bg-[#FAF5EC] border border-[#E7DFD5] rounded-xl space-y-3">
              <div className="font-bold text-stone-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>รันเวรประจำวันต่อลงมาตามลำดับรายชื่อ (วันละ 1 คน เรียงต่อลงมา):</span>
              </div>
              <p className="text-stone-600 text-[11px]">
                ระบบจะจัดให้มีเจ้าหน้าที่ปฏิบัติเวรวันละ 1 ท่าน โดยเริ่มจากคนที่ 1 ในวันที่ 1, คนที่ 2
                ในวันที่ 2, คนที่ 3 ในวันที่ 3 เรียงต่อลงมาจนครบทุกคนแล้ววนกลับมาคนที่ 1 ใหม่
                <br />
                <span className="font-semibold text-emerald-800">
                  ช่องวันอื่นๆ ที่เจ้าหน้าที่ท่านนั้นไม่ได้อยู่เวร จะถูกเว้นว่างไว้ทั้งหมด
                  ไม่มีการเติมรหัสใดๆ
                </span>
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <label className="font-semibold text-stone-700 text-xs">
                  เลือกรหัสเวรประจำวันที่ต้องการรัน:
                </label>
                <select
                  value={dailyShiftCode}
                  onChange={(e) => setDailyShiftCode(e.target.value)}
                  className="py-1.5 px-3 bg-white border border-stone-300 rounded-lg font-bold text-stone-800 text-xs cursor-pointer shadow-xs"
                >
                  {availableShifts.map((st) => (
                    <option key={st.id} value={st.code}>
                      {st.code} - {st.name} ({st.timeRange})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* Mode 3: Headcount Quota */
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

          {/* Trigger Generate Button */}
          <div className="flex items-center justify-center pt-2">
            <button
              type="button"
              onClick={handleRunAutoSchedule}
              className="py-2.5 px-6 bg-[#4ADE80] hover:bg-[#22C55E] text-stone-900 font-bold text-xs rounded-xl border border-[#16A34A] shadow-[2px_3px_0px_rgba(70,60,50,0.15)] flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-stone-900" />
              <span>
                {previewAssignments
                  ? 'คำนวณและปรับผลการจัดเวรใหม่'
                  : scheduleMode === 'cascade'
                  ? 'เริ่มจัดเรียงเวรต่อลงมาจากคนแรกทันที'
                  : scheduleMode === 'daily'
                  ? 'เริ่มรันเวรประจำวันต่อลงมาตามลำดับคน'
                  : 'เริ่มคำนวณจัดเวรตามโควตา'}
              </span>
            </button>
          </div>

          {/* Status Message */}
          {infoMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Live Preview Table */}
          {previewAssignments && (
            <div className="border border-[#E7DFD5] rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="px-3 py-2 bg-[#F7F2EA] border-b border-[#E7DFD5] flex items-center justify-between text-xs font-bold text-stone-800">
                <span className="flex items-center gap-1.5">
                  <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
                  <span>ตัวอย่างผลการจัดเวร (7 วันแรก):</span>
                </span>
                <span className="text-[11px] font-normal text-stone-500">
                  (ผลลัพธ์จะบันทึกครบทั้ง {daysInMonth} วันเมื่อกดยืนยันด้านล่าง)
                </span>
              </div>

              <div className="overflow-x-auto max-h-[35vh]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#FAF5EC] text-stone-700 border-b border-[#E7DFD5] sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-3">ลำดับ</th>
                      <th className="py-2 px-3">ชื่อ-สกุล</th>
                      <th className="py-2 px-2">ตำแหน่ง</th>
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                        <th key={day} className="py-2 px-1 text-center font-mono w-14">
                          <div className="text-[10px] text-stone-500">{THAI_DAYS_SHORT[getDayOfWeek(yearMonth, day)]}</div>
                          <div>ว.{day}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {eligibleStaff.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-amber-50/40">
                        <td className="py-1.5 px-3 font-mono text-stone-500 text-center w-10">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-stone-800 whitespace-nowrap">
                          {s.thaiName}
                        </td>
                        <td className="py-1.5 px-2 text-stone-500 text-[11px] whitespace-nowrap">
                          {s.position}
                        </td>
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                          const code = previewAssignments[s.id]?.[day] || '';
                          const isBlank = !code || code.trim() === '' || code === 'OFFF';
                          const shiftMeta = shiftTypes.find((st) => st.code === code);

                          return (
                            <td key={day} className="py-1 px-1 text-center font-mono text-[11px]">
                              {isBlank ? (
                                <span className="text-stone-300 font-mono">-</span>
                              ) : (
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded-sm border font-bold text-[10px] ${
                                    shiftMeta?.color || 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                  }`}
                                >
                                  {code}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
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
            className="px-4 py-2 text-xs text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
          >
            ยกเลิก
          </button>

          {previewAssignments && (
            <button
              type="button"
              onClick={handleApply}
              className="py-2.5 px-6 bg-[#F28C38] hover:bg-[#E57A24] text-white font-bold text-xs rounded-xl border border-[#D56B16] shadow-[2px_3px_0px_rgba(70,60,50,0.15)] flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>ยืนยันบันทึกผลการจัดเวรลงตาราง</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
