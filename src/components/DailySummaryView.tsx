import React, { useState } from 'react';
import { Staff, ShiftType, RoomId, MonthSchedule, ShiftPeriod } from '../types';
import {
  getDaysInMonth,
  formatYearMonthThai,
  formatShortDateCol,
  formatThaiDate,
  isWeekend,
  getDayOfWeek,
  THAI_DAYS_SHORT,
} from '../utils/dateUtils';
import { exportElementToPdf } from '../utils/pdfExport';
import { Download, Printer, Filter, Calendar, FileText, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { CuteAlien, CuteAstronaut, PaperStar, CuteSpaceBarStrip } from './CuteSpaceDecorations';

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
  const [selectedDay, setSelectedDay] = useState<number | 'all_shifts' | 'all'>('all_shifts');
  const [onlyOnDuty, setOnlyOnDuty] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState(false);

  const daysInMonth = getDaysInMonth(yearMonth);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Helper to determine shift periods for a code (supports multiple periods)
  const getPeriodsForCode = (code: string | undefined): Array<'morning' | 'afternoon' | 'night'> => {
    if (!code || code === 'OFFF') return [];
    const st = shiftTypes.find((s) => s.code === code);
    if (!st) {
      if (code.startsWith('M') || code.includes('01')) return ['morning'];
      if (code.startsWith('E') || code.includes('02')) return ['afternoon'];
      if (code.startsWith('N') || code.includes('LAB2')) return ['night'];
      return ['morning'];
    }
    const periodsArr: ShiftPeriod[] =
      st.periods && st.periods.length > 0
        ? st.periods
        : st.period
        ? [st.period]
        : ['morning'];

    return periodsArr.filter((p): p is 'morning' | 'afternoon' | 'night' => p !== 'other');
  };

  // Calculate which days have actual duties assigned in the selected room(s)
  const daysWithShiftsMap = React.useMemo(() => {
    const map = new Map<number, { count: number; staffNames: string[] }>();

    daysArray.forEach((day) => {
      let shiftCount = 0;
      const names: string[] = [];

      staffList.forEach((staff) => {
        if (!staff.isActive) return;

        const labCode = labSchedule?.assignments?.[staff.id]?.[day];
        const donorCode = donorSchedule?.assignments?.[staff.id]?.[day];

        const labPeriods = getPeriodsForCode(labCode);
        const donorPeriods = getPeriodsForCode(donorCode);

        let hasLabDuty = false;
        let hasDonorDuty = false;

        if (selectedRoom === 'all') {
          hasLabDuty = (staff.room === 'lab' || staff.room === 'both') && labPeriods.length > 0;
          hasDonorDuty = (staff.room === 'donor' || staff.room === 'both') && donorPeriods.length > 0;
        } else if (selectedRoom === 'lab') {
          hasLabDuty = (staff.room === 'lab' || staff.room === 'both') && labPeriods.length > 0;
        } else if (selectedRoom === 'donor') {
          hasDonorDuty = (staff.room === 'donor' || staff.room === 'both') && donorPeriods.length > 0;
        }

        if (hasLabDuty || hasDonorDuty) {
          shiftCount += (hasLabDuty ? 1 : 0) + (hasDonorDuty ? 1 : 0);
          names.push(staff.thaiName);
        }
      });

      if (shiftCount > 0) {
        map.set(day, { count: shiftCount, staffNames: names });
      }
    });

    return map;
  }, [daysArray, staffList, labSchedule, donorSchedule, selectedRoom, shiftTypes]);

  const activeDaysList = React.useMemo(() => {
    return Array.from(daysWithShiftsMap.keys()).sort((a, b) => a - b);
  }, [daysWithShiftsMap]);

  // Determine which days to extract for interactive screen display
  const daysToInclude = React.useMemo(() => {
    if (selectedDay === 'all_shifts') {
      return activeDaysList.length > 0 ? activeDaysList : daysArray;
    }
    if (selectedDay === 'all') {
      return daysArray;
    }
    return [selectedDay];
  }, [selectedDay, activeDaysList, daysArray]);

  // Helper row builder
  const buildRowsForDays = (targetDays: number[], enforceOnlyDuty: boolean) => {
    const result: Array<{
      dateStr: string;
      fullDateStr: string;
      day: number;
      dowShort: string;
      staffName: string;
      position: string;
      category: string;
      morningShift: string;
      afternoonShift: string;
      nightShift: string;
      roomName: string;
      hasDuty: boolean;
      activeCodes: string[];
    }> = [];

    targetDays.forEach((day) => {
      const dow = getDayOfWeek(yearMonth, day);
      const dowShort = THAI_DAYS_SHORT[dow];
      const shortDate = formatShortDateCol(day, yearMonth);
      const dateStr = `${dowShort}. ${shortDate}`;
      const fullDateStr = `${dowShort}. ${formatThaiDate(day, yearMonth)}`;

      staffList.forEach((staff) => {
        if (!staff.isActive) return;

        const labCode = labSchedule?.assignments?.[staff.id]?.[day];
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
          const periods = getPeriodsForCode(code);
          const morningShift = periods.includes('morning') ? code || '' : '';
          const afternoonShift = periods.includes('afternoon') ? code || '' : '';
          const nightShift = periods.includes('night') ? code || '' : '';
          const hasDuty = Boolean(morningShift || afternoonShift || nightShift);

          if (enforceOnlyDuty && !hasDuty) {
            return;
          }

          result.push({
            dateStr,
            fullDateStr,
            day,
            dowShort,
            staffName: staff.thaiName,
            position: staff.position,
            category: staff.category,
            morningShift,
            afternoonShift,
            nightShift,
            roomName: roomId === 'lab' ? 'ห้องปฏิบัติการ' : 'ห้องรับบริจาค',
            hasDuty,
            activeCodes: [morningShift, afternoonShift, nightShift].filter(Boolean),
          });
        });
      });
    });

    return result;
  };

  // Compile rows for interactive display table
  const rows = React.useMemo(() => {
    return buildRowsForDays(daysToInclude, onlyOnDuty);
  }, [daysToInclude, onlyOnDuty, staffList, labSchedule, donorSchedule, selectedRoom, shiftTypes]);

  // Compile rows strictly for DOWNLOAD (PDF and Excel/CSV):
  // Requirement 4: ดึงเฉพาะวันที่มีเวรจริงใส่ในตารางที่ดาวน์โหลด
  const downloadDaysToInclude = React.useMemo(() => {
    if (typeof selectedDay === 'number') {
      return [selectedDay];
    }
    // For 'all_shifts' or 'all', download only the actual active duty days!
    return activeDaysList.length > 0 ? activeDaysList : daysArray;
  }, [selectedDay, activeDaysList, daysArray]);

  const downloadRows = React.useMemo(() => {
    // Strictly enforce only staff who actually have duties on these active days
    return buildRowsForDays(downloadDaysToInclude, true);
  }, [downloadDaysToInclude, staffList, labSchedule, donorSchedule, selectedRoom, shiftTypes]);

  // Multi-page pagination chunking: Each page fits on an A4 sheet with repeating table header
  const paginatedDownloadPages = React.useMemo(() => {
    if (downloadRows.length === 0) {
      return [
        {
          pageNumber: 1,
          totalPages: 1,
          isFirst: true,
          isLast: true,
          hasSignatures: true,
          rows: [],
        },
      ];
    }

    if (downloadRows.length <= 16) {
      return [
        {
          pageNumber: 1,
          totalPages: 1,
          isFirst: true,
          isLast: true,
          hasSignatures: true,
          rows: downloadRows,
        },
      ];
    }

    const pages: Array<{
      isFirst: boolean;
      isLast: boolean;
      hasSignatures: boolean;
      rows: typeof downloadRows;
    }> = [];

    let remaining = [...downloadRows];
    let pageIdx = 0;

    while (remaining.length > 0) {
      const isFirst = pageIdx === 0;
      const maxWithSig = 16;
      const maxNoSig = isFirst ? 22 : 24;

      if (remaining.length <= maxWithSig) {
        pages.push({
          isFirst,
          isLast: true,
          hasSignatures: true,
          rows: remaining,
        });
        break;
      }

      let takeCount = maxNoSig;
      const itemsLeft = remaining.length - takeCount;
      if (itemsLeft > 0 && itemsLeft < 3) {
        takeCount = Math.max(14, takeCount - 3);
      }

      pages.push({
        isFirst,
        isLast: false,
        hasSignatures: false,
        rows: remaining.slice(0, takeCount),
      });

      remaining = remaining.slice(takeCount);
      pageIdx++;
    }

    const totalPages = pages.length;
    return pages.map((p, idx) => ({
      ...p,
      pageNumber: idx + 1,
      totalPages,
    }));
  }, [downloadRows]);

  const roomLabel =
    selectedRoom === 'lab'
      ? 'ห้องปฏิบัติการ'
      : selectedRoom === 'donor'
      ? 'ห้องรับบริจาคโลหิต'
      : 'รวมทุกห้อง (ปฏิบัติการ + รับบริจาค)';

  const dayLabel =
    selectedDay === 'all_shifts'
      ? `เฉพาะวันที่มีเวรจริง (${activeDaysList.length} วัน)`
      : selectedDay === 'all'
      ? `ทั้งเดือน (1 - ${daysInMonth})`
      : `วันที่ ${selectedDay} (${formatThaiDate(selectedDay, yearMonth)})`;

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const dayFileName =
        typeof selectedDay === 'number'
          ? `วันที่${selectedDay}`
          : `วันที่มีเวรจริง_${activeDaysList.length}วัน`;
      await exportElementToPdf({
        orientation: 'portrait',
        fileName: `ใบสรุปเวรประจำวัน_${roomLabel}_${yearMonth}_${dayFileName}.pdf`,
        elementId: 'printable-daily-summary-portrait',
      });
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCsv = () => {
    // Generate CSV UTF-8 with BOM for Excel compatibility with Thai characters
    const headers = [
      'ลำดับ',
      'วัน/เดือน/ปี',
      'วัน',
      'ชื่อ-สกุล เจ้าหน้าที่',
      'ตำแหน่ง',
      'แผนก/ห้อง',
      'เวรเช้า',
      'เวรบ่าย',
      'เวรดึก',
      'รหัสเวรที่ปฏิบัติงาน',
    ];

    const csvContent = downloadRows.map((r, idx) => {
      const activeShifts = r.activeCodes.join('/');
      return [
        idx + 1,
        `"${formatThaiDate(r.day, yearMonth)}"`,
        `"${r.dowShort}"`,
        `"${r.staffName}"`,
        `"${r.position}"`,
        `"${r.roomName}"`,
        `"${r.morningShift || '-'}"`,
        `"${r.afternoonShift || '-'}"`,
        `"${r.nightShift || '-'}"`,
        `"${activeShifts}"`,
      ].join(',');
    });

    const bom = '\uFEFF';
    const csvString = bom + [headers.join(','), ...csvContent].join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dayFileName =
      typeof selectedDay === 'number'
        ? `วันที่${selectedDay}`
        : `วันที่มีเวรจริง_${activeDaysList.length}วัน`;
    link.setAttribute(
      'download',
      `ใบสรุปเวรประจำวัน_${roomLabel}_${yearMonth}_${dayFileName}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

        {/* Paper-cut Space Decorative Bar in Empty Center Space */}
        <div className="hidden xl:flex items-center justify-center flex-1 mx-2 pointer-events-none select-none">
          <CuteSpaceBarStrip variant="minimal" />
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
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'all_shifts' || val === 'all') {
                  setSelectedDay(val);
                } else {
                  setSelectedDay(Number(val));
                }
              }}
              className="bg-transparent font-medium text-stone-800 focus:outline-hidden cursor-pointer max-w-[260px] truncate"
            >
              <option value="all_shifts">
                🌟 ดึงเฉพาะวันที่มีเวรจริง ({activeDaysList.length} วัน)
              </option>
              <option value="all">แสดงทุกวันในเดือน (1 - {daysInMonth})</option>
              <optgroup label="เลือกดูรายวัน">
                {daysArray.map((d) => {
                  const info = daysWithShiftsMap.get(d);
                  const hasShifts = Boolean(info && info.count > 0);
                  return (
                    <option key={d} value={d}>
                      วันที่ {d} ({formatThaiDate(d, yearMonth)}){' '}
                      {hasShifts ? `• [มีเวร ${info?.count} คน]` : '• (ไม่มีเวร)'}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>

          {/* Toggle for Only Staff with Duties */}
          <button
            type="button"
            onClick={() => setOnlyOnDuty(!onlyOnDuty)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              onlyOnDuty
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
            }`}
            title="สลับการแสดงผลระหว่างเฉพาะผู้มีเวรจริง กับเจ้าหน้าที่ทุกคน"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{onlyOnDuty ? 'เฉพาะผู้มีเวรจริง' : 'แสดงทุกคน'}</span>
          </button>

          {/* Download PDF Button (Pulling actual duty dates with repeating table header on every page) */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting || downloadRows.length === 0}
            className="py-2 px-3.5 bg-[#F28C38] hover:bg-[#E57A24] text-white font-semibold text-xs rounded-xl border border-[#D56B16] shadow-[1px_2px_0px_rgba(70,60,50,0.15)] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title={`ดาวน์โหลด PDF A4 แนวตั้ง (จัดหน้าพอดี ${paginatedDownloadPages.length} หน้า • แสดงหัวตารางทุกหน้า)`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {isExporting
                ? 'กำลังสร้าง PDF...'
                : `ดาวน์โหลด PDF (${paginatedDownloadPages.length} หน้า)`}
            </span>
          </button>

          {/* Download Excel / CSV Button */}
          <button
            onClick={handleDownloadCsv}
            disabled={downloadRows.length === 0}
            className="py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl border border-emerald-800 shadow-[1px_2px_0px_rgba(70,60,50,0.15)] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title={`ดาวน์โหลดไฟล์ Excel / CSV (ดึงเฉพาะวันที่มีเวรจริง ${activeDaysList.length} วัน รวม ${downloadRows.length} รายการ)`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel / CSV</span>
          </button>

          {/* Native Print Button */}
          <button
            type="button"
            onClick={() => window.print()}
            disabled={downloadRows.length === 0}
            className="p-2 bg-white hover:bg-stone-50 text-stone-600 rounded-xl border border-stone-300 shadow-[1px_2px_0px_rgba(70,60,50,0.08)] transition-all cursor-pointer disabled:opacity-50"
            title={`สั่งพิมพ์เอกสาร (${paginatedDownloadPages.length} หน้า)`}
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description / Legend Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#FAF5EB] rounded-xl border border-[#E7DFD5] text-xs text-stone-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-stone-800">
            สรุปข้อมูล: <strong>{roomLabel}</strong> • <strong>{dayLabel}</strong> •{' '}
            {formatYearMonthThai(yearMonth)}
          </span>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-semibold text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>
              ดึงวันที่มีเวรจริงใส่ในตารางที่ดาวน์โหลด: <strong>{activeDaysList.length} วัน</strong>{' '}
              ({activeDaysList.length <= 15 ? `วันที่ ${activeDaysList.join(', ')}` : `วันที่ ${activeDaysList.slice(0, 8).join(', ')}... ถึง ${activeDaysList[activeDaysList.length - 1]}`}) • รวม {downloadRows.length} รายการ
            </span>
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
        <div className="overflow-auto custom-scrollbar max-h-[74vh] overscroll-contain">
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
                      <td className="py-2.5 px-3 text-center border-r border-[#EFE7DC]">
                        <div className="font-mono font-bold text-stone-800">{row.dateStr}</div>
                        <div className="text-[10px] text-stone-500 font-normal">{row.fullDateStr}</div>
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

                      {/* Col 4: เวรเช้า (มีเวร = ช่องว่างสีขาว ไม่แสดงรหัสเวร, ไม่มีเวร = สีเทาอ่อน) */}
                      <td
                        className={`py-2 px-3 text-center border-r border-[#EFE7DC] transition-colors ${
                          hasMorning ? 'bg-white' : 'bg-stone-200/80'
                        }`}
                        title={hasMorning ? `มีเวรเช้า (${row.morningShift})` : 'ไม่มีเวร'}
                      >
                        {hasMorning ? (
                          <div className="h-5 w-full flex items-center justify-center">
                            {/* ช่องว่างสีขาวตามมาตรฐานโรงพยาบาล */}
                          </div>
                        ) : (
                          <div className="h-5 w-full" />
                        )}
                      </td>

                      {/* Col 5: เวรบ่าย (มีเวร = ช่องว่างสีขาว ไม่แสดงรหัสเวร, ไม่มีเวร = สีเทาอ่อน) */}
                      <td
                        className={`py-2 px-3 text-center border-r border-[#EFE7DC] transition-colors ${
                          hasAfternoon ? 'bg-white' : 'bg-stone-200/80'
                        }`}
                        title={hasAfternoon ? `มีเวรบ่าย (${row.afternoonShift})` : 'ไม่มีเวร'}
                      >
                        {hasAfternoon ? (
                          <div className="h-5 w-full flex items-center justify-center">
                            {/* ช่องว่างสีขาวตามมาตรฐานโรงพยาบาล */}
                          </div>
                        ) : (
                          <div className="h-5 w-full" />
                        )}
                      </td>

                      {/* Col 6: เวรดึก (มีเวร = ช่องว่างสีขาว ไม่แสดงรหัสเวร, ไม่มีเวร = สีเทาอ่อน) */}
                      <td
                        className={`py-2 px-3 text-center transition-colors ${
                          hasNight ? 'bg-white' : 'bg-stone-200/80'
                        }`}
                        title={hasNight ? `มีเวรดึก (${row.nightShift})` : 'ไม่มีเวร'}
                      >
                        {hasNight ? (
                          <div className="h-5 w-full flex items-center justify-center">
                            {/* ช่องว่างสีขาวตามมาตรฐานโรงพยาบาล */}
                          </div>
                        ) : (
                          <div className="h-5 w-full" />
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

      {/* Offscreen container specifically for A4 Portrait PDF Export & Printing */}
      <div className="fixed -left-[99999px] top-0 pointer-events-none z-[-100] opacity-100 flex flex-col gap-6">
        <div id="printable-daily-summary-portrait">
          {paginatedDownloadPages.map((page) => (
            <div
              key={page.pageNumber}
              className="pdf-page p-8 bg-white text-stone-900 font-sans w-[800px] h-[1130px] flex flex-col justify-between mb-8 border border-stone-200"
              style={{ boxSizing: 'border-box' }}
            >
              <div>
                {/* Header: Full on Page 1, Continuation Header with repeating department & page count on Page 2+ */}
                {page.isFirst ? (
                  <>
                    <div className="text-center pb-3 mb-3 border-b-2 border-stone-800">
                      <h1 className="text-base font-bold font-['Prompt']">ใบสรุปเวรการปฏิบัติงานประจำวัน</h1>
                      <h2 className="text-sm font-semibold">
                        งานเวชศาสตร์บริการโลหิต โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
                      </h2>
                      <p className="text-xs text-stone-600 mt-0.5">
                        แผนก: {roomLabel} • ประจำเดือน {formatYearMonthThai(yearMonth)}
                      </p>
                      <p className="text-[11px] font-medium text-stone-700 mt-0.5">
                        {typeof selectedDay === 'number'
                          ? `(ข้อมูลประจำวันที่ ${formatThaiDate(selectedDay, yearMonth)})`
                          : `(ดึงเฉพาะวันที่มีเวรปฏิบัติงานจริง: วันที่ ${activeDaysList.join(', ')} รวม ${activeDaysList.length} วัน • ${downloadRows.length} รายการ)`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-stone-600 mb-2 px-1">
                      <span>* สรุปการปฏิบัติงานตามตารางเวรประจำวัน (ดึงเฉพาะวันที่มีเวรจริงใส่ในตารางดาวน์โหลด)</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-white border border-stone-400 inline-block" />
                          <span>มีเวร (ช่องว่างสีขาว)</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 bg-stone-200 border border-stone-300 inline-block" />
                          <span>ไม่มีเวร (สีเทา)</span>
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="pb-2.5 mb-3 border-b-2 border-stone-800 flex items-center justify-between">
                    <div>
                      <h1 className="text-sm font-bold font-['Prompt'] text-stone-800">
                        ใบสรุปเวรการปฏิบัติงานประจำวัน (ต่อ)
                      </h1>
                      <p className="text-[11px] text-stone-600">
                        งานเวชศาสตร์บริการโลหิต โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ • แผนก: {roomLabel} • ประจำเดือน {formatYearMonthThai(yearMonth)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-md font-mono text-xs font-bold">
                        หน้า {page.pageNumber} / {page.totalPages}
                      </span>
                    </div>
                  </div>
                )}

                {/* 6-Column Clean Table with repeating thead on EVERY page */}
                <table className="w-full text-xs border-collapse border border-stone-800">
                  <thead className="bg-[#F5ECE0] font-bold text-center">
                    <tr>
                      <th className="border border-stone-800 p-2 w-24">1. วัน/เดือน</th>
                      <th className="border border-stone-800 p-2 text-left min-w-[160px]">
                        2. ชื่อ-สกุล เจ้าหน้าที่
                      </th>
                      <th className="border border-stone-800 p-2 text-left min-w-[130px]">3. ตำแหน่ง</th>
                      <th className="border border-stone-800 p-2 w-20">4. เวรเช้า</th>
                      <th className="border border-stone-800 p-2 w-20">5. เวรบ่าย</th>
                      <th className="border border-stone-800 p-2 w-20">6. เวรดึก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows.map((row, idx) => {
                      const hasMorn = Boolean(row.morningShift);
                      const hasAft = Boolean(row.afternoonShift);
                      const hasNgt = Boolean(row.nightShift);

                      return (
                        <tr key={idx} className="border-b border-stone-400">
                          <td className="border border-stone-800 p-1 text-center font-mono">
                            <div className="font-bold text-xs">{row.dateStr}</div>
                            <div className="text-[9px] text-stone-600 font-sans">{formatThaiDate(row.day, yearMonth)}</div>
                          </td>
                          <td className="border border-stone-800 p-1.5 font-medium">
                            {row.staffName}
                            {selectedRoom === 'all' && ` (${row.roomName})`}
                          </td>
                          <td className="border border-stone-800 p-1.5 text-stone-600">{row.position}</td>

                          {/* Morning: white blank if has duty, light grey if no duty */}
                          <td
                            className={`border border-stone-800 p-1.5 text-center ${
                              hasMorn ? 'bg-white' : 'bg-stone-200/80'
                            }`}
                          >
                            <div className="h-4" />
                          </td>

                          {/* Afternoon: white blank if has duty, light grey if no duty */}
                          <td
                            className={`border border-stone-800 p-1.5 text-center ${
                              hasAft ? 'bg-white' : 'bg-stone-200/80'
                            }`}
                          >
                            <div className="h-4" />
                          </td>

                          {/* Night: white blank if has duty, light grey if no duty */}
                          <td
                            className={`border border-stone-800 p-1.5 text-center ${
                              hasNgt ? 'bg-white' : 'bg-stone-200/80'
                            }`}
                          >
                            <div className="h-4" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Area: Signatures on last page and page number footer on every page */}
              <div>
                {page.hasSignatures && (
                  <div className="grid grid-cols-2 gap-8 pt-6 pb-2 text-xs text-center border-t border-stone-300 mt-4">
                    <div>
                      <p className="mb-7">ลงชื่อ..........................................................</p>
                      <p className="font-semibold">(..........................................................)</p>
                      <p className="text-stone-500 text-[11px]">ผู้รายงานเวรประจำวัน</p>
                    </div>
                    <div>
                      <p className="mb-7">ลงชื่อ..........................................................</p>
                      <p className="font-semibold">( ทนพญ.ณิชาภา เจียมจรรยา )</p>
                      <p className="text-stone-500 text-[11px]">หัวหน้างานเวชศาสตร์บริการโลหิต</p>
                    </div>
                  </div>
                )}

                {/* Footer on EVERY page with page count */}
                <div className="flex items-center justify-between text-[10px] text-stone-500 pt-2 border-t border-stone-200 mt-2">
                  <span>งานเวชศาสตร์บริการโลหิต โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ</span>
                  <span className="font-mono font-medium">
                    หน้า {page.pageNumber} จากทั้งหมด {page.totalPages} หน้า
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print stylesheet to ensure .pdf-page breaks cleanly per page */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-daily-summary-portrait,
          #printable-daily-summary-portrait * {
            visibility: visible;
          }
          #printable-daily-summary-portrait {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .pdf-page {
            page-break-after: always;
            break-after: page;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            height: auto !important;
            min-height: 98vh !important;
            padding: 1.5cm 1.5cm !important;
          }
        }
      `}</style>
    </div>
  );
};
