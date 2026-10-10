import React, { useState } from 'react';
import { Staff, ShiftType, MonthSchedule, UserSession, OtClaimRow } from '../types';
import {
  getDaysInMonth,
  formatYearMonthThai,
  formatThaiDate,
} from '../utils/dateUtils';
import { exportElementToPdf } from '../utils/pdfExport';
import { Download, Printer, DollarSign, UserCheck, CheckCircle, Calculator, FileCheck } from 'lucide-react';
import { CuteAlien, CuteAstronaut, PaperStar } from './CuteSpaceDecorations';

interface OtClaimViewProps {
  yearMonth: string;
  staffList: Staff[];
  shiftTypes: ShiftType[];
  labSchedule: MonthSchedule;
  donorSchedule: MonthSchedule;
  currentUser: UserSession | null;
}

export const OtClaimView: React.FC<OtClaimViewProps> = ({
  yearMonth,
  staffList,
  shiftTypes,
  labSchedule,
  donorSchedule,
  currentUser,
}) => {
  // If general user is logged in, default to their staffId
  const initialStaffId =
    currentUser && !currentUser.isAdmin && currentUser.staffId
      ? currentUser.staffId
      : staffList[0]?.id || '';

  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaffId);
  const [isExporting, setIsExporting] = useState(false);

  const daysInMonth = getDaysInMonth(yearMonth);
  const selectedStaff = staffList.find((s) => s.id === selectedStaffId) || staffList[0];

  // Calculate OT duties for the selected staff
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
        // An OT shift is either flagged as isOt, or a night/afternoon shift
        if (st && st.isOt) {
          otRows.push({
            staffName: selectedStaff.thaiName,
            workDate: formatThaiDate(day, yearMonth),
            timeRange: `${st.timeRange} (${st.name} - ${room})`,
            shiftCode: st.code,
            shiftName: st.name,
            rate: st.rate,
            day,
          });
          totalOtAmount += st.rate;
        }
      });
    }
  }

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

                    {/* Col 3: ช่วงเวลาปฏิบัติงาน */}
                    <td className="py-3 px-4 text-stone-800 border-r border-[#EFE7DC]">
                      <div className="flex items-center justify-between">
                        <span>{row.timeRange}</span>
                        <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          +{row.rate.toLocaleString()} ฿
                        </span>
                      </div>
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

      {/* Offscreen printable A4 Portrait container specifically scaled for PDF generation */}
      <div className="fixed -left-[99999px] top-0 pointer-events-none z-[-100] opacity-100">
        <div
          id="printable-ot-claim-portrait"
          className="p-10 bg-white text-stone-900 font-sans w-[800px] min-h-[1130px]"
        >
          {/* Official Document Header */}
          <div className="text-center pb-4 mb-5 border-b-2 border-stone-800">
            <h1 className="text-lg font-bold">
              ใบเบิกเงินค่าตอบแทนการปฏิบัติงานนอกเวลาราชการ (OT)
            </h1>
            <h2 className="text-sm font-semibold">
              งานเวชศาสตร์บริการโลหิต โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ
            </h2>
            <p className="text-xs text-stone-600 mt-1">
              ประจำเดือน {formatYearMonthThai(yearMonth)}
            </p>
          </div>

          {/* Staff Info Banner */}
          <div className="mb-4 text-xs flex justify-between pb-2 border-b border-stone-300">
            <div>
              <strong>ชื่อผู้ปฏิบัติงาน:</strong> {selectedStaff?.thaiName}
            </div>
            <div>
              <strong>ตำแหน่ง:</strong> {selectedStaff?.position}
            </div>
          </div>

          {/* 4-Column Clean Table */}
          <table className="w-full text-xs border-collapse border border-stone-800 mb-6">
            <thead>
              <tr className="bg-stone-200 font-bold text-center">
                <th className="border border-stone-800 p-2 w-1/4">1. ชื่อ สกุล</th>
                <th className="border border-stone-800 p-2 w-1/5">2. วันปฏิบัติงาน</th>
                <th className="border border-stone-800 p-2 w-2/5">3. ช่วงเวลาปฏิบัติงาน</th>
                <th className="border border-stone-800 p-2 w-1/5">
                  4. ช่องลงลายมือชื่อผู้ปฏิบัติงาน
                </th>
              </tr>
            </thead>
            <tbody>
              {otRows.map((row, idx) => (
                <tr key={idx} className="border-b border-stone-400">
                  <td className="border border-stone-800 p-2 font-medium">{row.staffName}</td>
                  <td className="border border-stone-800 p-2 text-center font-mono">
                    {row.workDate}
                  </td>
                  <td className="border border-stone-800 p-2">
                    {row.timeRange} (อัตรา {row.rate} บ.)
                  </td>
                  <td className="border border-stone-800 p-2 text-center">
                    <div className="h-4 border-b border-dashed border-stone-400 w-24 mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total Summary */}
          <div className="p-3 bg-stone-100 border border-stone-400 rounded-sm text-xs flex justify-between font-bold mb-8">
            <span>รวมการปฏิบัติงานนอกเวลาทั้งสิ้น: {otRows.length} เวร</span>
            <span>รวมเป็นเงินค่าตอบแทนทั้งสิ้น: {totalOtAmount.toLocaleString()} บาท</span>
          </div>

          {/* Official Signatures Grid */}
          <div className="grid grid-cols-3 gap-6 pt-6 text-xs text-center">
            <div>
              <p className="mb-10">ลงชื่อ..........................................................</p>
              <p className="font-semibold">({selectedStaff?.thaiName})</p>
              <p className="text-stone-500">ผู้ขอเบิกเงิน</p>
            </div>
            <div>
              <p className="mb-10">ลงชื่อ..........................................................</p>
              <p className="font-semibold">(..........................................................)</p>
              <p className="text-stone-500">ผู้ตรวจสอบการปฏิบัติงาน</p>
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
