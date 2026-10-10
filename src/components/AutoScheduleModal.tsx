import React, { useState, useEffect } from 'react';
import { Staff, ShiftType, RoomId, MonthSchedule, StaffCategory } from '../types';
import { getDaysInMonth, formatYearMonthThai, isWeekend, THAI_DAYS_SHORT, getDayOfWeek } from '../utils/dateUtils';
import { X, Sparkles, Wand2, Check, AlertCircle, RefreshCw, ArrowDownRight, Layers, UserCheck } from 'lucide-react';
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
  // Mode: 'cascade' (จัดเรียงต่อจากคนที่ 1) or 'quota' (จัดตามโควตาจำนวนคน)
  const [scheduleMode, setScheduleMode] = useState<'cascade' | 'quota'>('cascade');
  const [dayOffsetStep, setDayOffsetStep] = useState(1); // เลื่อนถัดไปทีละ 1 วัน
  const [includePartTime, setIncludePartTime] = useState(true);

  // Quota mode states
  const [morningQuota, setMorningQuota] = useState(2);
  const [afternoonQuota, setAfternoonQuota] = useState(1);
  const [nightQuota, setNightQuota] = useState(1);

  const [previewAssignments, setPreviewAssignments] = useState<Record<string, Record<number, string>> | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const roomName = roomId === 'lab' ? 'ห้องปฏิบัติการ (Lab)' : 'ห้องรับบริจาคโลหิต (Donor Room)';
  const daysInMonth = getDaysInMonth(yearMonth);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Eligible staff for this room
  const eligibleStaff = staffList.filter((s) => {
    if (!s.isActive) return false;
    if (!includePartTime && s.category === 'part_time') return false;
    return s.room === 'both' || s.room === roomId;
  });

  const categories: Array<{ id: StaffCategory; title: string }> = [
    { id: 'technologist', title: '1. นักเทคนิคการแพทย์' },
    { id: 'assistant', title: '2. ผู้ช่วยฯ / ธุรการ / ช่วยบริการ' },
    { id: 'part_time', title: '3. เจ้าหน้าที่ Part-time' },
  ];

  // Find Person 1 of each category and check their existing shifts
  const categoryStatus = categories.map((cat) => {
    const list = eligibleStaff.filter((s) => s.category === cat.id);
    const person1 = list[0] || null;
    const p1Assignments = person1 ? currentSchedule.assignments[person1.id] || {} : {};
    const assignedDays = Object.entries(p1Assignments).filter(
      ([_, code]) => code && code.trim() !== ''
    );

    return {
      category: cat.id,
      title: cat.title,
      list,
      person1,
      assignedCount: assignedDays.length,
      assignments: p1Assignments,
    };
  });

  // Fill sample rotation (เช้า -> บ่าย -> ดึก -> Off) for Person 1 of a category if empty
  const handleFillTemplateForPerson1 = (person1Id: string, categoryId: StaffCategory) => {
    const defaultCycle =
      roomId === 'lab'
        ? ['MORN', 'EVN1', 'NGHT', 'OFFF']
        : ['MORN', 'EVN1', 'BD01', 'OFFF'];

    const newCurrent = { ...currentSchedule.assignments };
    const p1Map: Record<number, string> = { ...(newCurrent[person1Id] || {}) };

    for (let day = 1; day <= daysInMonth; day++) {
      p1Map[day] = defaultCycle[(day - 1) % defaultCycle.length];
    }

    newCurrent[person1Id] = p1Map;
    currentSchedule.assignments = newCurrent;

    // Immediately trigger cascade logic
    generateCascadeSchedule(newCurrent);
  };

  // Logic 1: Cascade from Person 1 (หมุนเวียนเวรลงมาถัดจากวันของคนที่มีอยู่)
  const generateCascadeSchedule = (sourceAssignments = currentSchedule.assignments) => {
    const newAssignments: Record<string, Record<number, string>> = { ...sourceAssignments };
    let totalCascadedStaff = 0;

    categoryStatus.forEach(({ category, list, person1 }) => {
      if (!person1 || list.length === 0) return;

      const p1Map = sourceAssignments[person1.id] || {};
      const activeDays = Object.entries(p1Map).filter(([_, c]) => c && c.trim() !== '');

      if (activeDays.length === 0) {
        // No shifts for person 1 in this category
        return;
      }

      // Check if Person 1 has a pattern across the month or just initial days
      // Build a full 1..daysInMonth map for Person 1
      const p1FullMonth: Record<number, string> = {};
      const sortedAssignedDays = Object.keys(p1Map)
        .map(Number)
        .filter((d) => p1Map[d] && p1Map[d].trim() !== '')
        .sort((a, b) => a - b);

      if (sortedAssignedDays.length < daysInMonth && sortedAssignedDays.length > 0) {
        // Person 1 only filled a repeating pattern (e.g. days 1..4)
        // Repeat this pattern cyclically across all days of the month for Person 1
        const patternCodes = sortedAssignedDays.map((d) => p1Map[d]);
        for (let day = 1; day <= daysInMonth; day++) {
          p1FullMonth[day] = patternCodes[(day - 1) % patternCodes.length];
        }
      } else {
        // Person 1 already has shifts across the month
        for (let day = 1; day <= daysInMonth; day++) {
          p1FullMonth[day] = p1Map[day] || 'OFFF';
        }
      }

      // Person 1 retains their pattern
      newAssignments[person1.id] = p1FullMonth;

      // Now cascade down to subsequent people in this category (index 1, 2, 3...)
      // Offset by dayOffsetStep (default: 1 day per person)
      for (let i = 1; i < list.length; i++) {
        const staff = list[i];
        const staffMap: Record<number, string> = {};
        const offset = i * dayOffsetStep; // Person 2 = +1 day, Person 3 = +2 days...

        for (let day = 1; day <= daysInMonth; day++) {
          // The shift of staff `i` on `day` is Person 1's shift from (day - offset)
          // Wrapping cyclically around the month
          const sourceDay = ((day - 1 - offset) % daysInMonth + daysInMonth) % daysInMonth + 1;
          staffMap[day] = p1FullMonth[sourceDay] || 'OFFF';
        }

        newAssignments[staff.id] = staffMap;
        totalCascadedStaff++;
      }
    });

    setPreviewAssignments(newAssignments);
    setInfoMessage(`จัดเรียงเวรต่อจากคนที่ 1 เรียบร้อยแล้ว (ครอบคลุม ${totalCascadedStaff} ท่านในกลุ่มตำแหน่ง)`);
  };

  // Logic 2: Standard Quota Headcount (ทางเลือกสำรอง)
  const generateQuotaSchedule = () => {
    const mornCode = roomId === 'lab' ? 'MORN' : 'MORN';
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
        let bestStaff =
          staffIds.find(
            (id) => !assignedToday.has(id) && newAssignments[id][day - 1] !== nghtCode
          ) || staffIds[pointer % staffIds.length];
        assignedToday.add(bestStaff);
        newAssignments[bestStaff][day] = nghtCode;
        pointer++;
      }

      // Afternoon shift
      for (let e = 0; e < eQuota; e++) {
        let bestStaff =
          staffIds.find(
            (id) => !assignedToday.has(id) && newAssignments[id][day - 1] !== nghtCode
          ) || staffIds[pointer % staffIds.length];
        assignedToday.add(bestStaff);
        newAssignments[bestStaff][day] = evnCode;
        pointer++;
      }

      // Morning shift
      for (let m = 0; m < mQuota; m++) {
        let bestStaff =
          staffIds.find(
            (id) => !assignedToday.has(id) && newAssignments[id][day - 1] !== nghtCode
          ) || staffIds[pointer % staffIds.length];
        assignedToday.add(bestStaff);
        newAssignments[bestStaff][day] = mornCode;
        pointer++;
      }

      // Fill remaining OFFF
      staffIds.forEach((id) => {
        if (!assignedToday.has(id)) {
          newAssignments[id][day] = 'OFFF';
        }
      });
    }

    setPreviewAssignments(newAssignments);
    setInfoMessage('คำนวณจัดเวรตามโควตาจำนวนคนเรียบร้อยแล้ว');
  };

  const handleRunAutoSchedule = () => {
    if (scheduleMode === 'cascade') {
      generateCascadeSchedule();
    } else {
      generateQuotaSchedule();
    }
  };

  const handleApply = async () => {
    if (!previewAssignments) return;

    const scheduleToSave: MonthSchedule = {
      id: `${roomId}_${yearMonth}`,
      roomId,
      yearMonth,
      assignments: previewAssignments,
      updatedAt: new Date().toISOString(),
      updatedBy: 'alisa (Cascade Auto-Scheduler)',
    };

    await onApplySchedule(scheduleToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[4px_6px_0px_rgba(70,60,50,0.18)] p-5 sm:p-6 overflow-hidden flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-[#F3ECE0] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#EFE7DC] shrink-0">
          <div className="flex items-center gap-1.5 p-2 bg-[#DCFCE7] border border-[#86EFAC] rounded-xl shrink-0">
            <CuteAstronaut size={32} />
            <CuteAlien size={30} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-800 font-['Prompt']">
              ระบบจัดเวรอัตโนมัติ (Auto-Scheduler)
            </h2>
            <p className="text-xs text-stone-500">
              {roomName} • ประจำเดือน {formatYearMonthThai(yearMonth)}
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 pt-3 shrink-0">
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
            <span>จัดเรียงต่อจากคนที่ 1 ของแต่ละตำแหน่ง (แนะนำ)</span>
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
            <span>จัดตามโควตาจำนวนคนต่อวัน</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {scheduleMode === 'cascade' ? (
            /* Mode 1: Cascade from Person 1 */
            <div className="space-y-3">
              <div className="p-3.5 bg-[#FAF5EC] border-2 border-[#E7DFD5] rounded-xl text-xs space-y-2">
                <div className="font-bold text-stone-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>หลักการจัดเรียงเวรต่อจากคนที่ 1 (Cascade Shift Rotation):</span>
                </div>
                <p className="text-stone-600 leading-relaxed text-[11px]">
                  เมื่อคุณได้จัดเวรให้ <strong>คนที่ 1</strong> ของกลุ่มตำแหน่งนั้นแล้ว (เช่น ทนพญ.ณิชาภา หรือ นางสาวสิริยากร)
                  ระบบจะนำลำดับเวรของคนที่ 1 มาหมุนเวียนจัดเรียงลงมายังคนถัดไป (คนที่ 2, 3, 4...)
                  โดยเริ่มเวร <strong>ถัดจากวันของคนที่มีอยู่ทีละ 1 วัน</strong> ทำให้ได้ตารางเวรหมุนเวียนที่ครอบคลุมทุกวันอย่างเป็นระเบียบ
                </p>

                <div className="flex items-center gap-3 pt-1 border-t border-[#E8DEC8]">
                  <span className="font-semibold text-stone-700">การเลื่อนวันถัดไป:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDayOffsetStep(1)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                        dayOffsetStep === 1
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-white text-stone-700 border-stone-200'
                      }`}
                    >
                      ถัดไปทีละ +1 วัน (มาตรฐาน)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDayOffsetStep(2)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                        dayOffsetStep === 2
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-white text-stone-700 border-stone-200'
                      }`}
                    >
                      ถัดไปทีละ +2 วัน
                    </button>
                  </div>
                </div>
              </div>

              {/* Status of Person 1 in each position */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-stone-800">
                  ตรวจสอบเวรของคนที่ 1 ในแต่ละกลุ่มตำแหน่ง:
                </div>

                <div className="space-y-2">
                  {categoryStatus.map((cat) => {
                    const hasShifts = cat.assignedCount > 0;

                    return (
                      <div
                        key={cat.category}
                        className="p-3 bg-white rounded-xl border border-[#E7DFD5] shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-stone-800 flex items-center gap-2">
                            <span>{cat.title}</span>
                            <span className="text-[11px] font-normal text-stone-500">
                              (รวม {cat.list.length} ท่าน)
                            </span>
                          </div>
                          {cat.person1 ? (
                            <div className="text-stone-600 flex items-center gap-2">
                              <span>
                                คนที่ 1: <strong>{cat.person1.thaiName}</strong>
                              </span>
                              <span>•</span>
                              {hasShifts ? (
                                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> มีเวรตั้งต้นแล้ว ({cat.assignedCount} วัน)
                                </span>
                              ) : (
                                <span className="text-amber-700 font-medium flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> ยังไม่มีเวรตั้งต้น
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-stone-400 italic">ไม่มีเจ้าหน้าที่ในกลุ่มนี้</div>
                          )}
                        </div>

                        {cat.person1 && !hasShifts && (
                          <button
                            type="button"
                            onClick={() =>
                              handleFillTemplateForPerson1(cat.person1.id, cat.category)
                            }
                            className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>เติมเวรเริ่มต้นให้คนที่ 1 (เช้า-บ่าย-ดึก-Off)</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Mode 2: Quota */
            <div className="p-3.5 bg-[#FAF5EC] border border-[#E7DFD5] rounded-xl space-y-3 text-xs">
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

          {/* Action Trigger Button */}
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
                  ? 'เริ่มจัดเรียงเวรต่อจากคนที่ 1 ทันที'
                  : 'เริ่มคำนวณจัดเวรตามโควตา'}
              </span>
            </button>
          </div>

          {/* Feedback Info Box */}
          {infoMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Preview Snapshot */}
          {previewAssignments && (
            <div className="border border-[#E7DFD5] rounded-xl overflow-hidden bg-white">
              <div className="px-3 py-2 bg-[#F7F2EA] border-b border-[#E7DFD5] flex items-center justify-between text-xs font-bold text-stone-800">
                <span>ตัวอย่างผลการจัดเวรล่วงหน้า (7 วันแรก):</span>
                <span className="text-[11px] font-normal text-stone-500">
                  (ระบบจะบันทึกผลครบทั้ง {daysInMonth} วันเมื่อกดยืนยัน)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#FAF5EC] text-stone-700 border-b border-[#E7DFD5]">
                    <tr>
                      <th className="py-2 px-3">ชื่อ-สกุล</th>
                      <th className="py-2 px-2">ตำแหน่ง</th>
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                        <th key={day} className="py-2 px-1 text-center font-mono w-12">
                          <div>ว.{day}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {eligibleStaff.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-amber-50/40">
                        <td className="py-2 px-3 font-semibold text-stone-800 whitespace-nowrap">
                          {idx + 1}. {s.thaiName}
                        </td>
                        <td className="py-2 px-2 text-stone-500 text-[11px] whitespace-nowrap">
                          {s.position}
                        </td>
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                          const code = previewAssignments[s.id]?.[day] || '-';
                          const isOff = code === 'OFFF';
                          return (
                            <td key={day} className="py-1 px-1 text-center font-mono text-[11px]">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded-sm border font-bold ${
                                  isOff
                                    ? 'bg-stone-100 text-stone-500 border-stone-200'
                                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                }`}
                              >
                                {code}
                              </span>
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
              className="py-2 px-5 bg-[#F28C38] hover:bg-[#E57A24] text-white font-bold text-xs rounded-xl border border-[#D56B16] shadow-[2px_3px_0px_rgba(70,60,50,0.15)] flex items-center gap-1.5 cursor-pointer"
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
