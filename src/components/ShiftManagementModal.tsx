import React, { useState } from 'react';
import { ShiftType, ShiftPeriod } from '../types';
import { X, Plus, Trash2, Edit2, Check, Clock, DollarSign, Tag } from 'lucide-react';
import { CuteAlien, PaperStar } from './CuteSpaceDecorations';

interface ShiftManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftTypes: ShiftType[];
  onSaveShiftType: (shift: ShiftType) => Promise<void>;
  onDeleteShiftType: (id: string) => Promise<void>;
}

const COLOR_OPTIONS = [
  { label: 'เขียวมิ้นต์', value: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { label: 'เหลืองส้ม', value: 'bg-amber-100 text-amber-900 border-amber-300' },
  { label: 'ม่วงคราม', value: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  { label: 'ฟ้าคราม', value: 'bg-sky-100 text-sky-900 border-sky-300' },
  { label: 'ม่วงลาเวนเดอร์', value: 'bg-violet-100 text-violet-900 border-violet-300' },
  { label: 'ชมพูกุหลาบ', value: 'bg-rose-100 text-rose-900 border-rose-300' },
  { label: 'ส้มพีช', value: 'bg-orange-100 text-orange-900 border-orange-300' },
  { label: 'เขียวทะเล', value: 'bg-teal-100 text-teal-900 border-teal-300' },
  { label: 'เทาธรรมชาติ', value: 'bg-stone-100 text-stone-500 border-stone-200' },
];

export const ShiftManagementModal: React.FC<ShiftManagementModalProps> = ({
  isOpen,
  onClose,
  shiftTypes,
  onSaveShiftType,
  onDeleteShiftType,
}) => {
  const [editingShift, setEditingShift] = useState<ShiftType | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<ShiftPeriod>('morning');
  const [timeRange, setTimeRange] = useState('');
  const [rate, setRate] = useState<number>(600);
  const [isOt, setIsOt] = useState(false);
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingShift({
      id: `shift-${Date.now()}`,
      code: '',
      name: '',
      period: 'morning',
      timeRange: '08:30 - 16:30 น.',
      rate: 600,
      isOt: false,
      color: COLOR_OPTIONS[0].value,
    });
    setCode('');
    setName('');
    setPeriod('morning');
    setTimeRange('08:30 - 16:30 น.');
    setRate(600);
    setIsOt(false);
    setColor(COLOR_OPTIONS[0].value);
    setError('');
  };

  const handleStartEdit = (st: ShiftType) => {
    setEditingShift(st);
    setCode(st.code);
    setName(st.name);
    setPeriod(st.period);
    setTimeRange(st.timeRange);
    setRate(st.rate);
    setIsOt(st.isOt);
    setColor(st.color || COLOR_OPTIONS[0].value);
    setError('');
  };

  const handleCancelForm = () => {
    setEditingShift(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    // Constraint: 1 to 4 characters
    if (cleanCode.length < 1 || cleanCode.length > 4) {
      setError('รหัสเวรต้องมีความยาว 1-4 ตัวอักษร (เช่น M, E1, MORN, EVN1, NGHT, OFFF)');
      return;
    }

    if (!name.trim()) {
      setError('กรุณากรอกชื่อเวร');
      return;
    }

    setIsSaving(true);
    try {
      const shiftToSave: ShiftType = {
        id: editingShift?.id || `shift-${cleanCode.toLowerCase()}`,
        code: cleanCode,
        name: name.trim(),
        period,
        timeRange: timeRange.trim() || '-',
        rate: Number(rate) || 0,
        isOt,
        color,
      };

      await onSaveShiftType(shiftToSave);
      setEditingShift(null);
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการบันทึกค่าเวร');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (confirm(`คุณต้องการลบรหัสเวร "${code}" หรือไม่?`)) {
      try {
        await onDeleteShiftType(id);
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการลบ');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[4px_6px_0px_rgba(70,60,50,0.18)] p-6 overflow-hidden flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-[#F3ECE0] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EFE7DC] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FBF0D9] border border-[#ECD9BA] rounded-xl">
              <DollarSign className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2 font-['Prompt']">
                กำหนดรหัสเวรและอัตราค่าตอบแทน (Shift Rates)
              </h2>
              <p className="text-xs text-stone-500">
                รหัสเวร 1-4 ตัวอักษร กำหนดช่วงเวลา และอัตราค่าตอบแทนการปฏิบัติงานนอกเวลา (OT)
              </p>
            </div>
          </div>
          {!editingShift && (
            <button
              onClick={handleStartAdd}
              className="mr-8 py-2 px-3.5 bg-[#F28C38] hover:bg-[#E57A24] text-white text-xs font-semibold rounded-xl border border-[#D56B16] shadow-[1px_2px_0px_rgba(70,60,50,0.15)] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มรหัสเวรใหม่</span>
            </button>
          )}
        </div>

        {/* Form */}
        {editingShift && (
          <form onSubmit={handleSubmit} className="p-4 my-3 bg-[#FAF5EC] border-2 border-[#E7DFD5] rounded-xl space-y-3 shrink-0">
            <div className="flex items-center justify-between border-b border-[#E8DEC8] pb-2">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <PaperStar size={16} />
                {editingShift.code ? `แก้ไขรหัสเวร: ${editingShift.code}` : 'เพิ่มรหัสเวรใหม่ (1-4 ตัวอักษร)'}
              </span>
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-xs text-stone-500 hover:text-stone-800 underline"
              >
                ยกเลิก
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  รหัสเวร (1-4 ตัวอักษร)*
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="เช่น M, E1, MORN, EVN1"
                  className="w-full px-3 py-2 bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-500 font-mono font-bold tracking-wider uppercase text-center"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  ชื่อเวร / รายละเอียด*
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น เวรบ่าย (OT)"
                  className="w-full px-3 py-2 bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  ช่วงเวลาของเวร (สำหรับใบสรุป/ใบเบิก)*
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as ShiftPeriod)}
                  className="w-full px-3 py-2 bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-500"
                >
                  <option value="morning">เวรเช้า (Morning)</option>
                  <option value="afternoon">เวรบ่าย (Afternoon)</option>
                  <option value="night">เวรดึก (Night)</option>
                  <option value="other">อื่นๆ / วันหยุด (Off/Other)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  เวลาปฏิบัติงาน (ช่วงเวลา)
                </label>
                <input
                  type="text"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  placeholder="เช่น 16:30 - 00:30 น."
                  className="w-full px-3 py-2 bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  อัตราค่าตอบแทน (บาท/เวร)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  โทนสีป้ายกระดาษ (Badge Color)
                </label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-500"
                >
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c.label} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isOtCheck"
                checked={isOt}
                onChange={(e) => setIsOt(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded-sm cursor-pointer"
              />
              <label htmlFor="isOtCheck" className="text-xs font-semibold text-stone-700 cursor-pointer">
                นับเป็นเวรปฏิบัติงานนอกเวลาราชการ (นำไปคิดคำนวณในใบเบิกเงินค่าตอบแทน OT)
              </label>
            </div>

            {error && <p className="text-xs text-rose-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200 rounded-lg cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 text-xs bg-[#F28C38] hover:bg-[#E57A24] text-white font-medium rounded-lg border border-[#D56B16] shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกรหัสเวร'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Shift List Table */}
        <div className="flex-1 overflow-y-auto mt-3 pr-1 border border-[#E7DFD5] rounded-xl bg-white">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F7F2EA] border-b border-[#E7DFD5] text-stone-700 font-semibold sticky top-0">
              <tr>
                <th className="py-2.5 px-3">รหัสเวร (1-4 หลัก)</th>
                <th className="py-2.5 px-3">ชื่อเวร</th>
                <th className="py-2.5 px-3">ช่วงเวลา</th>
                <th className="py-2.5 px-3">เวลาปฏิบัติงาน</th>
                <th className="py-2.5 px-3 text-right">ค่าเวร (บาท)</th>
                <th className="py-2.5 px-3 text-center">ประเภท OT</th>
                <th className="py-2.5 px-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {shiftTypes.map((st) => (
                <tr key={st.id} className="hover:bg-amber-50/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded-md border text-center ${st.color}`}>
                      {st.code}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-stone-800">{st.name}</td>
                  <td className="py-2.5 px-3 text-stone-600">
                    {st.period === 'morning' ? 'เวรเช้า' : st.period === 'afternoon' ? 'เวรบ่าย' : st.period === 'night' ? 'เวรดึก' : 'อื่นๆ / Off'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-stone-600">{st.timeRange}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-stone-800">
                    {st.rate > 0 ? `${st.rate.toLocaleString()} ฿` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {st.isOt ? (
                      <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full font-medium border border-rose-200">
                        OT นอกเวลา
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                        ในเวลา/ปกติ
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleStartEdit(st)}
                        className="p-1.5 text-stone-600 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                        title="แก้ไข"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {st.code !== 'OFFF' && (
                        <button
                          onClick={() => handleDelete(st.id, st.code)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#EFE7DC] text-[11px] text-stone-500 flex items-center justify-between shrink-0">
          <span>รหัสเวรทั้งหมด {shiftTypes.length} รูปแบบ</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#E8DEC8] hover:bg-[#DCD1BA] text-stone-800 font-medium rounded-lg text-xs cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
