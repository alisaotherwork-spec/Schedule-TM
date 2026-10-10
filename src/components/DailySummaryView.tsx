import React, { useState } from 'react';
import { Staff, ShiftType, RoomId, MonthSchedule } from '../types';
import {
  getDaysInMonth,
  formatYearMonthThai,
  formatShortDateCol,
  formatThaiDate,
  isWeekend,
} from '../utils/dateUtils';
import { exportElementToPdf } from '../utils/pdfExport';
import { Download, Printer, Filter, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { CuteAlien, CuteAstronaut, PaperStar } from './CuteSpaceDecorations';

interface DailySummaryViewProps {
  yearMonth: string;
  staffList: Staff[];
  shiftTypes: ShiftType[];
  labSchedule: MonthSchedule;
  donorSchedule: MonthSchedule;
}

export const DailySummaryView: React.FC<DailySummaryViewProps> = ({
  yearMonth,
  staffList,
  shiftTypes,
  labSchedule,
  donorSchedule,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<RoomId | 'all'>('lab');
  const [selectedDay, setSelectedDay] = useState<number | 'all'>(1);
  const [isExporting, setIsExporting] = useState(false);

  const daysInMonth = getDaysInMonth(yearMonth);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Helper to determine shift period for a code
  const getPeriodForCode = (code: string | undefined): 'morning' | 'afternoon' | 'night' | null => {
    if (!code || code === 'OFFF') return null;
    const st = shiftTypes.find((s) => s.code === code);
    if (!st) {
      if (code.startsWith('M') || code.includes('01')) return 'morning';
      if (code.startsWith('E') || code.includes('02')) return 'afternoon';
      if (code.startsWith('N') || code.includes('LAB2')) return 'night';
      return 'morning';
    }
    return st.period === 'other' ? null : st.period;
  };

  // Compile rows based on selected filters
  const rows: Array<{
    dateStr: string;
    day: number;
    staffName: string;
    position: string;
    category: string;
    morningShift: string;
    afternoonShift: string;
    nightShift: string;
    roomName: string;
  }> = [];

  const daysToInclude = selectedDay === 'all' ? daysArray : [selectedDay];

  daysToInclude.forEach((day) => {
    const dateStr = formatShortDateCol(day, yearMonth);

    // Active staff list
    staffList.forEach((staff) => {
      if (!staff.isActive) return;

      // Check Lab shifts
      const labCode = labSchedule?.assignments?.[staff.id]?.[day];
      // Check Donor shifts
      const donorCode = donorSchedule?.assignments?.[staff.id]?.[day];

      const roomsToProcess: Array<{ roomId: RoomId; code: string | undefined }> = [];
      if (selectedRoom === 'all') {
        if (staff.room === 'lab' || staff.room === 'both') roomsToProcess.push({ roomId: 'lab', code: labCode });
        if (staff.room === 'donor' || staff.room === 'both') roomsToProcess.push({ roomId: 'donor', code: donorCode });
      } else if (selectedRoom === 'lab' && (staff.room === 'lab' || staff.room === 'both')) {
        roomsToProcess.push({ roomId: 'lab', code: labCode });
      } else if (selectedRoom === 'donor' && (staff.room === 'donor' || staff.room === 'both')) {
        roomsToProcess.push({ roomId: 'donor', code: donorCode });
      }

      roomsToProcess.forEach(({ roomId, code }) => {
        const period = getPeriodForCode(code);
        const morningShift = period === 'morning' ? code || '' : '';
        const afternoonShift = period === 'afternoon' ? code || '' : '';
        const nightShift = period === 'night' ? code || '' : '';

        // Only include if on duty or if showing all staff for this date
        rows.push({
          dateStr,
          day,
          staffName: staff.thaiName,
          position: staff.position,
          category: staff.category,
          morningShift,
          afternoonShift,
          nightShift,
          roomName: roomId === 'lab' ? 'ห้องปฏิบัติการ' : 'ห้องรับบริจาค',
        });
      });
    });
  });

  const roomLabel =
    selectedRoom === 'lab'
      ? 'ห้องปฏิบัติการ'
      : selectedRoom === 'donor'
      ? 'ห้องรับบริจาคโลหิต'
      : 'รวมทุกห้อง (ปฏิบัติการ + รับบริจาค)';

  const dayLabel = selectedDay === 'all' ? 'ทั้งเดือน' : `วันที่ ${selectedDay}`;

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      await exportElementToPdf({
        orientation: 'portrait',
        fileName: `ใบสรุปเวรประจำวัน_${roomLabel}_${selectedDay === 'all' ? yearMonth : `วันที่${selectedDay}`}.pdf`,
        elementId: 'printable-daily-summary-portrait',
      });
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action and Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[2px_3px_0px_rgba(70,60,50,0.12)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl shrink-0">
            <FileText className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-stone-800 font-['Prompt']">
              ใบสรุปเวรประจำวัน (Daily Duty Summary)
            </h1>
            <p className="text-xs text-stone-500">
              6 คอลัมน์มาตรฐาน • ช่องไม่มีเวรสีเทาอ่อน ช่องมีเวรสีขาว • แยกดาวน์โหลด PDF A4 แนวตั้ง
            </p>
          </div>
        </div>

        {/* Filter and Download Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Room Selector Filter */}
          <div className="flex items-center gap-1.5 bg-[#FAF5EC] border border-[#E7DFD5] px-2.5 py-1.5 rounded-xl text-xs">
            <span className="font-semibold text-stone-700">ห้อง:</span>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value as RoomId | 'all')}
              className="bg-transparent font-medium text-stone-800 focus:outline-hidden cursor-pointer"
            >
              <option value="lab">ห้องปฏิบัติการ (Lab)</option>
              <option value="donor">ห้องรับบริจาค (Donor Room)</option>
              <option value="all">ทั้ง 2 ห้อง (รวม)</option>
            </select>
          </div>

          {/* Date Selector Filter */}
          <div className="flex items-center gap-1.5 bg-[#FAF5EC] border border-[#E7DFD5] px-2.5 py-1.5 rounded-xl text-xs">
            <span className="font-semibold text-stone-700">วันที่:</span>
            <select
              value={selectedDay}
              onChange={(e) =>
                setSelectedDay(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="bg-transparent font-medium text-stone-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">แสดงทุกวันในเดือน</option>
              {daysArray.map((d) => (
                <option key={d} value={d}>
                  วันที่ {d} ({formatThaiDate(d, yearMonth)})
                </option>
              ))}
            </select>
          </div>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="py-2 px-3.5 bg-[#F28C38] hover:bg-[#E57A24] text-white font-semibold text-xs rounded-xl border border-[#D56B16] shadow-[1px_2px_0px_rgba(70,60,50,0.15)] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="ดาวน์โหลด PDF A4 แนวตั้ง"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF A4 แนวตั้ง'}</span>
          </button>
        </div>
      </div>

      {/* Description / Legend Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAF5EB] rounded-xl border border-[#E7DFD5] text-xs text-stone-600">
        <div className="flex items-center gap-4">
          <span className="font-medium">
            สรุปข้อมูล: <strong>{roomLabel}</strong> • <strong>{dayLabel}</strong> •{' '}
            {formatYearMonthThai(yearMonth)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-stone-200 border border-stone-300 inline-block rounded-xs" />
            <span>ช่องไม่มีเวร (สีเทาอ่อน)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-white border border-stone-400 inline-block rounded-xs" />
            <span>ช่องมีเวร (สีขาว)</span>
          </span>
        </div>
      </div>

      {/* Interactive Display Table */}
      <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[3px_4px_0px_rgba(70,60,50,0.12)] overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[#F5ECE0] text-stone-800 font-bold sticky top-0 z-20 border-b-2 border-[#DECFC0]">
              <tr>
                <th className="py-3 px-3 text-center border-r border-[#DACBBA] w-24">
                  1. วัน/เดือน
                </th>
                <th className="py-3 px-4 text-left border-r border-[#DACBBA] min-w-[180px]">
                  2. ชื่อ-สกุล เจ้าหน้าที่
                </th>
                <th className="py-3 px-3 text-left border-r border-[#DACBBA] min-w-[160px]">
                  3. ตำแหน่ง
                </th>
                <th className="py-3 px-3 text-center border-r border-[#DACBBA] w-28">
                  4. เวรเช้า
                </th>
                <th className="py-3 px-3 text-center border-r border-[#DACBBA] w-28">
                  5. เวรบ่าย
                </th>
                <th className="py-3 px-3 text-center w-28">
                  6. เวรดึก
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE7DC]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    ไม่พบข้อมูลเวรตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const hasMorning = Boolean(row.morningShift);
                  const hasAfternoon = Boolean(row.afternoonShift);
                  const hasNight = Boolean(row.nightShift);

                  return (
                    <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                      {/* Col 1: วัน/เดือน */}
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-stone-700 border-r border-[#EFE7DC]">
                        {row.dateStr}
                      </td>

                      {/* Col 2: ชื่อ สกุล เจ้าหน้าที่ */}
                      <td className="py-2.5 px-4 font-semibold text-stone-800 border-r border-[#EFE7DC]">
                        <div>{row.staffName}</div>
                        {selectedRoom === 'all' && (
                          <div className="text-[10px] text-stone-500 font-normal">
                            ({row.roomName})
                          </div>
                        )}
                      </td>

                      {/* Col 3: ตำแหน่ง */}
                      <td className="py-2.5 px-3 text-stone-600 border-r border-[#EFE7DC]">
                        {row.position}
                      </td>

                      {/* Col 4: เวรเช้า (มีเวร = ขาว, ไม่มีเวร = เทาอ่อน) */}
                      <td
                        className={`py-2 px-3 text-center border-r border-[#EFE7DC] transition-colors ${
                          hasMorning ? 'bg-white font-bold text-stone-900' : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {hasMorning ? (
                          <span className="inline-block px-2 py-0.5 rounded-sm border border-emerald-300 bg-emerald-50 text-emerald-900 font-mono text-[11px]">
                            {row.morningShift}
                          </span>
                        ) : (
                          <span className="text-stone-300 text-xs">-</span>
                        )}
                      </td>

                      {/* Col 5: เวรบ่าย */}
                      <td
                        className={`py-2 px-3 text-center border-r border-[#EFE7DC] transition-colors ${
                          hasAfternoon ? 'bg-white font-bold text-stone-900' : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {hasAfternoon ? (
                          <span className="inline-block px-2 py-0.5 rounded-sm border border-amber-300 bg-amber-50 text-amber-900 font-mono text-[11px]">
                            {row.afternoonShift}
                          </span>
                        ) : (
                          <span className="text-stone-300 text-xs">-</span>
                        )}
                      </td>

                      {/* Col 6: เวรดึก */}
                      <td
                        className={`py-2 px-3 text-center transition-colors ${
                          hasNight ? 'bg-white font-bold text-stone-900' : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {hasNight ? (
                          <span className="inline-block px-2 py-0.5 rounded-sm border border-indigo-300 bg-indigo-50 text-indigo-900 font-mono text-[11px]">
                            {row.nightShift}
                          </span>
                        ) : (
                          <span className="text-stone-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Offscreen container specifically for A4 Portrait PDF Export */}
      <div className="fixed -left-[99999px] top-0 pointer-events-none z-[-100] opacity-100">
        <div
          id="printable-daily-summary-portrait"
          className="p-10 bg-white text-stone-900 font-sans w-[800px] min-h-[1130px]"
        >
          {/* Hospital Header */}
          <div className="text-center pb-4 mb-4 border-b-2 border-stone-800">
            <h1 className="text-lg font-bold">ใบสรุปเวรการปฏิบัติงานประจำวัน</h1>
            <h2 className="text-sm font-semibold">
              งานเวชศาสตร์บริการโลหิต โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
            </h2>
            <p className="text-xs text-stone-600 mt-1">
              แผนก: {roomLabel} • ประจำเดือน {formatYearMonthThai(yearMonth)}{' '}
              {selectedDay !== 'all' && `(${formatThaiDate(selectedDay, yearMonth)})`}
            </p>
          </div>

          {/* 6-Column Clean Table */}
          <table className="w-full text-xs border-collapse border border-stone-800">
            <thead>
              <tr className="bg-stone-200 font-bold text-center">
                <th className="border border-stone-800 p-2 w-20">1. วัน/เดือน</th>
                <th className="border border-stone-800 p-2 text-left min-w-[160px]">
                  2. ชื่อ-สกุล เจ้าหน้าที่
                </th>
                <th className="border border-stone-800 p-2 text-left min-w-[140px]">3. ตำแหน่ง</th>
                <th className="border border-stone-800 p-2 w-24">4. เวรเช้า</th>
                <th className="border border-stone-800 p-2 w-24">5. เวรบ่าย</th>
                <th className="border border-stone-800 p-2 w-24">6. เวรดึก</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const hasMorn = Boolean(row.morningShift);
                const hasAft = Boolean(row.afternoonShift);
                const hasNgt = Boolean(row.nightShift);

                return (
                  <tr key={idx} className="border-b border-stone-400">
                    <td className="border border-stone-800 p-1.5 text-center font-mono">
                      {row.dateStr}
                    </td>
                    <td className="border border-stone-800 p-1.5 font-medium">
                      {row.staffName}
                      {selectedRoom === 'all' && ` (${row.roomName})`}
                    </td>
                    <td className="border border-stone-800 p-1.5 text-stone-600">{row.position}</td>

                    {/* Morning: Light grey if empty, white if has duty */}
                    <td
                      className={`border border-stone-800 p-1.5 text-center font-mono font-bold ${
                        hasMorn ? 'bg-white' : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      {hasMorn ? row.morningShift : '-'}
                    </td>

                    {/* Afternoon: Light grey if empty, white if has duty */}
                    <td
                      className={`border border-stone-800 p-1.5 text-center font-mono font-bold ${
                        hasAft ? 'bg-white' : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      {hasAft ? row.afternoonShift : '-'}
                    </td>

                    {/* Night: Light grey if empty, white if has duty */}
                    <td
                      className={`border border-stone-800 p-1.5 text-center font-mono font-bold ${
                        hasNgt ? 'bg-white' : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      {hasNgt ? row.nightShift : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Signature Footer */}
          <div className="grid grid-cols-2 gap-8 pt-10 text-xs text-center">
            <div>
              <p className="mb-10">ลงชื่อ..........................................................</p>
              <p className="font-semibold">(..........................................................)</p>
              <p className="text-stone-500">ผู้รายงานเวรประจำวัน</p>
            </div>
            <div>
              <p className="mb-10">ลงชื่อ..........................................................</p>
              <p className="font-semibold">( ทนพญ. อลิสา รักดี )</p>
              <p className="text-stone-500">หัวหน้างานเวชศาสตร์บริการโลหิต</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
