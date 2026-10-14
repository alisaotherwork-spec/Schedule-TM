import React, { useState } from 'react';
import { Staff, ShiftType, MonthSchedule, UserSession, OtClaimRow } from '../types';
import {
  getDaysInMonth,
  formatYearMonthThai,
  formatThaiDate,
} from '../utils/dateUtils';
import { exportElementToPdf } from '../utils/pdfExport';
import { Download, Printer, DollarSign, UserCheck, CheckCircle, Calculator, FileCheck, Edit2, X, Check } from 'lucide-react';
import { CuteAlien, CuteAstronaut, PaperStar, CuteSpaceBarStrip } from './CuteSpaceDecorations';

interface OtClaimViewProps {
  yearMonth: string;
  staffList: Staff[];
  shiftTypes: ShiftType[];
  labSchedule: MonthSchedule;
  donorSchedule: MonthSchedule;
  currentUser: UserSession | null;
  onOpenShiftModal?: () => void;
  onSaveShiftType?: (shift: ShiftType) => Promise<void>;
}

export const OtClaimView: React.FC<OtClaimViewProps> = ({
  yearMonth,
  staffList,
  shiftTypes,
  labSchedule,
  donorSchedule,
  currentUser,
  onOpenShiftModal,
  onSaveShiftType,
}) => {
  // If general user is logged in, default to their staffId
  const initialStaffId =
    currentUser && !currentUser.isAdmin && currentUser.staffId
      ? currentUser.staffId
      : staffList[0]?.id || '';

  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaffId);
  const [isExporting, setIsExporting] = useState(false);

  // Quick Shift Rate Editor
  const [quickEditShift, setQuickEditShift] = useState<ShiftType | null>(null);
  const [quickRateInput, setQuickRateInput] = useState<string>('0');
  const [isSavingQuickRate, setIsSavingQuickRate] = useState(false);

  const daysInMonth = getDaysInMonth(yearMonth);
  const selectedStaff = staffList.find((s) => s.id === selectedStaffId) || staffList[0];

  // Calculate OT duties for the selected staff
  // Requirement 4: ดึงเฉพาะเวรที่กำหนดให้ "นับเป็นเวรปฏิบัติงานนอกเวลาราชการ" (isOt === true) เท่านั้น
  const otRows: OtClaimRow[] = [];
  let totalOtAmount = 0;

  if (selectedStaff) {
    for (let day = 1; day <= daysInMonth; day++) {
      // Check Lab schedule
      const labCode = labSchedule?.assignments?.[selectedStaff.id]?.[day];
      // Check Donor schedule
      const donorCode = donorSchedule?.assignments?.[selectedStaff.id]?.[day];

      const checkCodes = [
        { code: labCode, room: 'ห้องปฏิบัติการ' },
        { code: donorCode, room: 'ห้องรับบริจาค' },
      ];

      checkCodes.forEach(({ code, room }) => {
        if (!code || code === 'OFFF') return;
        const st = shiftTypes.find((s) => s.code === code);
        // Requirement 4: ดึงเวรที่กำหนดให้ "นับเป็นเวรปฏิบัติงานนอกเวลาราชการ" (isOt === true) มาแสดงเท่านั้น
        if (st && Boolean(st.isOt)) {
          otRows.push({
            staffName: selectedStaff.thaiName,
            workDate: formatThaiDate(day, yearMonth),
            timeRange: `${st.timeRange} (${st.name} - ${room})`,
            shiftCode: st.code,
            shiftName: st.name,
            rate: st.rate || 0,
            day,
          });
          totalOtAmount += st.rate || 0;
        }
      });
    }
  }

  // Multi-page pagination chunking for OT Claim PDF Export
  // Requirement 3 & 4: Multi-page support with repeated headers on every page
  const paginatedOtPages = React.useMemo(() => {
    if (otRows.length === 0) {
      return [
        {
          pageNumber: 1,
          totalPages: 1,
          isFirst: true,
          isLast: true,
          hasSignatures: true,
          rows: [] as OtClaimRow[],
        },
      ];
    }

    if (otRows.length <= 16) {
      return [
        {
          pageNumber: 1,
          totalPages: 1,
          isFirst: true,
          isLast: true,
          hasSignatures: true,
          rows: otRows,
        },
      ];
    }

    const pages: Array<{
      isFirst: boolean;
      isLast: boolean;
      hasSignatures: boolean;
      rows: typeof otRows;
    }> = [];

    let remaining = [...otRows];
    let pageIdx = 0;

    while (remaining.length > 0) {
      const isFirst = pageIdx === 0;
      const maxWithSig = 15;
      const maxNoSig = isFirst ? 20 : 22;

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
        takeCount = Math.max(12, takeCount - 3);
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
  }, [otRows]);

  const handleDownloadPdf = async () => {
    if (!selectedStaff) return;
    setIsExporting(true);
    try {
      await exportElementToPdf({
        orientation: 'portrait',
        fileName: `ใบเบิกเงินค่าตอบแทนOT_${selectedStaff.thaiName}_${yearMonth}.pdf`,
        elementId: 'printable-ot-claim-portrait',
      });
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenQuickEditRate = (shiftCode: string) => {
    const st = shiftTypes.find((s) => s.code === shiftCode);
    if (!st) return;
    setQuickEditShift(st);
    setQuickRateInput(String(st.rate || 0));
  };

  const handleSaveQuickRate = async () => {
    if (!quickEditShift) return;
    if (!onSaveShiftType) {
      if (onOpenShiftModal) onOpenShiftModal();
      return;
    }
    const parsedRate = Math.max(0, parseFloat(quickRateInput) || 0);
    setIsSavingQuickRate(true);
    try {
      await onSaveShiftType({
        ...quickEditShift,
        rate: parsedRate,
        isOt: parsedRate > 0 ? true : quickEditShift.isOt,
      });
      setQuickEditShift(null);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกค่าเวร');
    } finally {
      setIsSavingQuickRate(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[2px_3px_0px_rgba(70,60,50,0.12)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#DCFCE7] border border-[#86EFAC] rounded-xl shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-stone-800 font-['Prompt']">
              ใบเบิกเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ (OT)
            </h1>
            <p className="text-xs text-stone-500">
              แยกตามรายบุคคล • 4 คอลัมน์มาตรฐานราชการ • ดาวน์โหลด PDF A4 แนวตั้ง
            </p>
          </div>
        </div>

        {/* Paper-cut Space Decorative Bar in Empty Center Space */}
        <div className="hidden xl:flex items-center justify-center flex-1 mx-2 pointer-events-none select-none">
          <CuteSpaceBarStrip variant="minimal" />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Staff Selector (Disabled or limited if general user) */}
          <div className="flex items-center gap-1.5 bg-[#FAF5EC] border border-[#E7DFD5] px-3 py-1.5 rounded-xl text-xs">
            <span className="font-semibold text-stone-700">เลือกเจ้าหน้าที่:</span>
            {currentUser && !currentUser.isAdmin ? (
              <span className="font-bold text-amber-800">
                {selectedStaff?.thaiName} (@{currentUser.englishName})
              </span>
            ) : (
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="bg-transparent font-medium text-stone-800 focus:outline-hidden cursor-pointer"
              >
                {staffList
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.thaiName} ({s.position})
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Configure Shift Rates Button */}
          {onOpenShiftModal && (
            <button
              onClick={onOpenShiftModal}
              className="py-2 px-3 bg-white hover:bg-stone-50 text-stone-700 font-medium text-xs rounded-xl border border-stone-300 shadow-[1px_2px_0px_rgba(70,60,50,0.08)] flex items-center gap-1.5 transition-all cursor-pointer"
              title="กำหนดและแก้ไขอัตราค่าตอบแทนเวรแต่ละประเภท"
            >
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
              <span>กำหนดค่าเวร</span>
            </button>
          )}

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting || otRows.length === 0}
            className="py-2 px-3.5 bg-[#F28C38] hover:bg-[#E57A24] text-white font-semibold text-xs rounded-xl border border-[#D56B16] shadow-[1px_2px_0px_rgba(70,60,50,0.15)] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="ดาวน์โหลด PDF A4 แนวตั้ง"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF A4 แนวตั้ง'}</span>
          </button>
        </div>
      </div>

      {/* Staff Overview Card */}
      {selectedStaff && (
        <div className="p-4 bg-[#FAF5EC] rounded-2xl border-2 border-[#E7DFD5] shadow-[2px_2px_0px_rgba(70,60,50,0.08)] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl border border-[#DACFBF]">
              <CuteAstronaut size={36} />
            </div>
            <div>
              <div className="font-bold text-sm text-stone-800 font-['Prompt']">
                {selectedStaff.thaiName}
              </div>
              <div className="text-stone-500">
                {selectedStaff.position} • ประจำเดือน {formatYearMonthThai(yearMonth)}
              </div>
            </div>
          </div>

          {/* Cute Paper-cut Space Ribbon in Overview Card */}
          <div className="hidden lg:flex items-center justify-center flex-1 mx-4 pointer-events-none select-none">
            <CuteSpaceBarStrip variant="compact" />
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[11px] text-stone-500 block">จำนวนเวร OT ทั้งหมด</span>
              <span className="font-mono text-base font-bold text-stone-800">
                {otRows.length} <span className="text-xs font-normal">เวร</span>
              </span>
            </div>
            <div className="text-right pl-4 border-l border-[#DACFBF]">
              <span className="text-[11px] text-stone-500 block">รวมยอดเงินเบิกทั้งสิ้น</span>
              <span className="font-mono text-base font-bold text-emerald-700">
                {totalOtAmount.toLocaleString()} <span className="text-xs font-normal">บาท</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4-Column Table */}
      <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[3px_4px_0px_rgba(70,60,50,0.12)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[#F5ECE0] text-stone-800 font-bold border-b-2 border-[#DECFC0]">
              <tr>
                <th className="py-3 px-4 text-left border-r border-[#DACBBA] w-1/4">
                  1. ชื่อ สกุล
                </th>
                <th className="py-3 px-4 text-center border-r border-[#DACBBA] w-1/5">
                  2. วันปฏิบัติงาน
                </th>
                <th className="py-3 px-4 text-left border-r border-[#DACBBA] w-2/5">
                  3. ช่วงเวลาปฏิบัติงาน
                </th>
                <th className="py-3 px-4 text-center w-1/5">
                  4. ช่องลงลายมือชื่อผู้ปฏิบัติงาน
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE7DC]">
              {otRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-stone-400">
                    ไม่พบรายการเวรนอกเวลาราชการ (OT) ของเจ้าหน้าที่ท่านนี้ในเดือนนี้
                  </td>
                </tr>
              ) : (
                otRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                    {/* Col 1: ชื่อ สกุล */}
                    <td className="py-3 px-4 font-semibold text-stone-800 border-r border-[#EFE7DC]">
                      {row.staffName}
                    </td>

                    {/* Col 2: วันปฏิบัติงาน */}
                    <td className="py-3 px-4 text-center font-mono text-stone-700 border-r border-[#EFE7DC]">
                      {row.workDate}
                    </td>

                    {/* Col 3: ช่วงเวลาปฏิบัติงาน - แสดงเฉพาะช่วงเวลาปฏิบัติงาน ไม่แสดงค่าปฏิบัติงาน */}
                    <td className="py-3 px-4 text-stone-800 border-r border-[#EFE7DC]">
                      <span>{row.timeRange}</span>
                    </td>

                    {/* Col 4: ลายมือชื่อ */}
                    <td className="py-3 px-4 text-center">
                      <div className="h-6 border-b border-dashed border-stone-300 w-32 mx-auto" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Offscreen printable A4 Portrait container specifically scaled for PDF generation & printing */}
      <div className="fixed -left-[99999px] top-0 pointer-events-none z-[-100] opacity-100 flex flex-col gap-6">
        <div id="printable-ot-claim-portrait">
          {paginatedOtPages.map((page) => (
            <div
              key={page.pageNumber}
              className="pdf-page p-8 bg-white text-stone-900 font-sans w-[800px] h-[1130px] flex flex-col justify-between mb-8 border border-stone-200"
              style={{ boxSizing: 'border-box' }}
            >
              <div>
                {/* Header: Full on Page 1, Continuation Header with department info & page count on Page 2+ */}
                {page.isFirst ? (
                  <>
                    <div className="text-center pb-3 mb-4 border-b-2 border-stone-800">
                      <h1 className="text-base font-bold font-['Prompt']">
                        ใบเบิกเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ (OT)
                      </h1>
                      <h2 className="text-sm font-semibold">
                        งานเวชศาสตร์บริการโลหิต โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
                      </h2>
                      <p className="text-xs text-stone-600 mt-0.5">
                        ประจำเดือน {formatYearMonthThai(yearMonth)}
                      </p>
                    </div>

                    {/* Staff Info Banner */}
                    <div className="mb-4 text-xs flex justify-between items-center p-3 bg-[#FAF5EC] border border-[#E7DFD5] rounded-xl">
                      <div>
                        <strong>ชื่อผู้ปฏิบัติงาน:</strong> {selectedStaff?.thaiName}
                      </div>
                      <div>
                        <strong>ตำแหน่ง:</strong> {selectedStaff?.position}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="pb-2.5 mb-3 border-b-2 border-stone-800 flex items-center justify-between">
                    <div>
                      <h1 className="text-sm font-bold font-['Prompt'] text-stone-800">
                        ใบเบิกเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ (OT) (ต่อ)
                      </h1>
                      <p className="text-[11px] text-stone-600">
                        ผู้ปฏิบัติงาน: {selectedStaff?.thaiName} ({selectedStaff?.position}) • ประจำเดือน {formatYearMonthThai(yearMonth)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-md font-mono text-xs font-bold">
                        หน้า {page.pageNumber} / {page.totalPages}
                      </span>
                    </div>
                  </div>
                )}

                {/* 4-Column Clean Table with repeating thead on EVERY page */}
                <table className="w-full text-xs border-collapse border border-stone-800 mb-4">
                  <thead className="bg-[#F5ECE0] font-bold text-center">
                    <tr>
                      <th className="border border-stone-800 p-2 w-1/4">1. ชื่อ สกุล</th>
                      <th className="border border-stone-800 p-2 w-1/5">2. วันปฏิบัติงาน</th>
                      <th className="border border-stone-800 p-2 w-2/5">3. ช่วงเวลาปฏิบัติงาน</th>
                      <th className="border border-stone-800 p-2 w-1/5">
                        4. ช่องลงลายมือชื่อผู้ปฏิบัติงาน
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-stone-400">
                        <td className="border border-stone-800 p-2 font-medium">{row.staffName}</td>
                        <td className="border border-stone-800 p-2 text-center font-mono">
                          {row.workDate}
                        </td>
                        {/* Col 3: ช่วงเวลาปฏิบัติงาน - แสดงเฉพาะช่วงเวลาปฏิบัติงาน ไม่แสดงค่าปฏิบัติงาน */}
                        <td className="border border-stone-800 p-2">
                          <span>{row.timeRange}</span>
                        </td>
                        <td className="border border-stone-800 p-2 text-center">
                          <div className="h-4 border-b border-dashed border-stone-400 w-24 mx-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Total Summary Banner on Last Page */}
                {page.isLast && (
                  <div className="p-3 bg-[#FAF5EB] border border-[#DACFBF] rounded-xl text-xs flex justify-between font-bold mb-4">
                    <span>รวมการปฏิบัติงานนอกเวลาทั้งสิ้น: {otRows.length} เวร</span>
                    <span className="text-emerald-800 font-mono">
                      รวมเป็นเงินค่าตอบแทนทั้งสิ้น: {totalOtAmount.toLocaleString()} บาท
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Area: Signatures on last page and page footer on every page */}
              <div>
                {/* Official Signature Area: Requirement 4 - ในหน้าดาวน์โหลด PDF ให้เอาผู้ขอเบิกเงิน กับผู้ตรวจสอบการปฏิบัติงานออก */}
                {page.hasSignatures && (
                  <div className="flex justify-end pt-6 text-xs text-center border-t border-stone-300 mt-4">
                    <div className="w-72">
                      <p className="mb-8">ลงชื่อ..........................................................</p>
                      <p className="font-semibold">( ทนพญ.ณิชาภา เจียมจรรยา )</p>
                      <p className="text-stone-600 text-[11px] mt-0.5">หัวหน้างานเวชศาสตร์บริการโลหิต</p>
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
          #printable-ot-claim-portrait,
          #printable-ot-claim-portrait * {
            visibility: visible;
          }
          #printable-ot-claim-portrait {
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

      {/* Quick Shift Rate Editor Modal */}
      {quickEditShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[4px_6px_0px_rgba(70,60,50,0.2)] p-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFE7DC] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 border border-amber-300 rounded-xl text-amber-800">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-800 text-sm font-['Prompt']">
                    กำหนดค่าเวร: {quickEditShift.code}
                  </h3>
                  <p className="text-[11px] text-stone-500">{quickEditShift.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickEditShift(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  อัตราค่าเวรที่ต้องการ (บาท/เวร):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(quickRateInput) || 0;
                      setQuickRateInput(String(Math.max(0, cur - 50)));
                    }}
                    className="px-2.5 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 cursor-pointer"
                  >
                    -50
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={quickRateInput}
                    onChange={(e) => setQuickRateInput(e.target.value)}
                    placeholder="ระบุจำนวนเงินค่าเวร"
                    className="flex-1 px-3 py-2 bg-white border-2 border-amber-500 rounded-lg font-mono font-bold text-center text-stone-800 text-base focus:outline-hidden"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(quickRateInput) || 0;
                      setQuickRateInput(String(cur + 50));
                    }}
                    className="px-2.5 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 cursor-pointer"
                  >
                    +50
                  </button>
                </div>
              </div>

              {/* Quick rate preset chips */}
              <div>
                <span className="text-[10px] text-stone-500 block mb-1">เลือกจำนวนเงินด่วน:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 300, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 1000, 1200, 1500].map((pr) => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => setQuickRateInput(String(pr))}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium border cursor-pointer transition-colors ${
                        parseFloat(quickRateInput) === pr
                          ? 'bg-amber-600 text-white border-amber-600 font-bold'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-50'
                      }`}
                    >
                      {pr === 0 ? '0฿' : `${pr}฿`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#EFE7DC] flex justify-between items-center">
              {onOpenShiftModal && (
                <button
                  type="button"
                  onClick={() => {
                    setQuickEditShift(null);
                    onOpenShiftModal();
                  }}
                  className="text-[11px] text-amber-700 hover:underline cursor-pointer"
                >
                  เปิดเมนูกำหนดค่าเวรเต็มรูปแบบ ↗
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setQuickEditShift(null)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickRate}
                  disabled={isSavingQuickRate}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingQuickRate ? 'กำลังบันทึก...' : 'บันทึกค่าเวร'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
