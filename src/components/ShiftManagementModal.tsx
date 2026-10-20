import React, { useState } from 'react';
import { ShiftType, ShiftPeriod, PositionAbbr } from '../types';
import { ALL_POSITION_ABBRS, STANDARD_POSITIONS } from '../utils/positionUtils';
import { X, Plus, Trash2, Edit2, Check, Clock, DollarSign, Tag, Users } from 'lucide-react';
import { CuteAlien, PaperStar } from './CuteSpaceDecorations';

interface ShiftManagementModalProps {
  isOpen: boolean;
  isPageMode?: boolean;
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

const PERIOD_OPTIONS: { id: ShiftPeriod; label: string; bg: string }[] = [
  { id: 'morning', label: 'เวรเช้า (Morning)', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { id: 'afternoon', label: 'เวรบ่าย (Afternoon)', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'night', label: 'เวรดึก (Night)', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { id: 'other', label: 'อื่นๆ / วันหยุด (Off/Other)', bg: 'bg-stone-50 text-stone-700 border-stone-200' },
];

export const COMMON_RATE_PRESETS = [0, 300, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 1000, 1200, 1500];

export const ShiftManagementModal: React.FC<ShiftManagementModalProps> = ({
  isOpen,
  isPageMode = false,
  onClose,
  shiftTypes = [],
  onSaveShiftType,
  onDeleteShiftType,
}) => {
  const safeShiftTypes = (shiftTypes || []).filter((s): s is ShiftType => Boolean(s && s.id));
  const [editingShift, setEditingShift] = useState<ShiftType | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [selectedPeriods, setSelectedPeriods] = useState<ShiftPeriod[]>(['morning']);
  const [allowedPositions, setAllowedPositions] = useState<PositionAbbr[]>(ALL_POSITION_ABBRS);
  const [timeRange, setTimeRange] = useState('');
  const [rate, setRate] = useState<number>(600);
  const [rateInput, setRateInput] = useState<string>('600');
  const [isOt, setIsOt] = useState(false);
  const [color, setColor] = useState(COLOR_OPTIONS[0].value);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Quick Inline Rate Editor in Table
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineRateInput, setInlineRateInput] = useState<string>('0');
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'MT' | 'AMT' | 'Office' | 'Service' | 'paid' | 'free'>('all');
  const [deletingShift, setDeletingShift] = useState<{ id: string; code: string } | null>(null);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingShift({
      id: `shift-${Date.now()}`,
      code: '',
      name: '',
      period: 'morning',
      periods: ['morning'],
      allowedPositions: [...ALL_POSITION_ABBRS],
      timeRange: '08:30 - 16:30 น.',
      rate: 600,
      isOt: false,
      color: COLOR_OPTIONS[0].value,
    });
    setCode('');
    setName('');
    setSelectedPeriods(['morning']);
    setAllowedPositions([...ALL_POSITION_ABBRS]);
    setTimeRange('08:30 - 16:30 น.');
    setRate(600);
    setRateInput('600');
    setIsOt(false);
    setColor(COLOR_OPTIONS[0].value);
    setError('');
  };

  const handleStartEdit = (st: ShiftType) => {
    setEditingShift(st);
    setCode(st.code);
    setName(st.name);
    const periodsArr: ShiftPeriod[] =
      st.periods && st.periods.length > 0
        ? st.periods
        : st.period
        ? [st.period]
        : ['morning'];
    setSelectedPeriods(periodsArr);

    const posArr: PositionAbbr[] =
      st.allowedPositions && st.allowedPositions.length > 0
        ? st.allowedPositions
        : [...ALL_POSITION_ABBRS];
    setAllowedPositions(posArr);

    setTimeRange(st.timeRange);
    setRate(st.rate);
    setRateInput(String(st.rate || 0));
    setIsOt(st.isOt);
    setColor(st.color || COLOR_OPTIONS[0].value);
    setError('');
  };

  const handleCancelForm = () => {
    setEditingShift(null);
    setCode('');
    setName('');
    setSelectedPeriods(['morning']);
    setAllowedPositions([...ALL_POSITION_ABBRS]);
    setTimeRange('08:30 - 16:30 น.');
    setRate(600);
    setRateInput('600');
    setIsOt(false);
    setColor(COLOR_OPTIONS[0].value);
    setError('');
    setNotice(null);
  };

  const togglePeriod = (p: ShiftPeriod) => {
    if (selectedPeriods.includes(p)) {
      if (selectedPeriods.length === 1) return;
      setSelectedPeriods(selectedPeriods.filter((item) => item !== p));
    } else {
      setSelectedPeriods([...selectedPeriods, p]);
    }
  };

  const togglePosition = (pos: PositionAbbr) => {
    if (allowedPositions.includes(pos)) {
      if (allowedPositions.length === 1) return;
      setAllowedPositions(allowedPositions.filter((item) => item !== pos));
    } else {
      setAllowedPositions([...allowedPositions, pos]);
    }
  };

  const handleSelectAllPositions = () => {
    setAllowedPositions([...ALL_POSITION_ABBRS]);
  };

  const handleAdjustRate = (delta: number) => {
    setRate((prev) => {
      const nextVal = Math.max(0, (Number(prev) || 0) + delta);
      setRateInput(String(nextVal));
      if (nextVal > 0) setIsOt(true);
      return nextVal;
    });
  };

  const handleSelectPresetRate = (val: number) => {
    setRate(val);
    setRateInput(String(val));
    if (val > 0) {
      setIsOt(true);
    }
  };

  const handleStartInlineEdit = (st: ShiftType) => {
    setInlineEditingId(st.id);
    setInlineRateInput(String(st.rate || 0));
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingId(null);
  };

  const handleSaveInlineRate = async (st: ShiftType) => {
    const finalRate = Math.max(0, parseFloat(inlineRateInput) || 0);
    try {
      const updated: ShiftType = {
        ...st,
        rate: finalRate,
        isOt: finalRate > 0 ? true : st.isOt,
      };
      await onSaveShiftType(updated);
      setInlineEditingId(null);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกค่าเวร');
    }
  };

  const doSave = async (keepOpenForNext: boolean = false) => {
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

    if (selectedPeriods.length === 0) {
      setError('กรุณาเลือกช่วงเวลาของเวรอย่างน้อย 1 ช่วงเวลา');
      return;
    }

    if (allowedPositions.length === 0) {
      setError('กรุณากำหนดตำแหน่งที่สามารถปฏิบัติเวรนี้ได้');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const shiftToSave: ShiftType = {
        id: editingShift?.id || `shift-${cleanCode.toLowerCase()}`,
        code: cleanCode,
        name: name.trim(),
        period: selectedPeriods[0],
        periods: selectedPeriods,
        allowedPositions: allowedPositions,
        timeRange: timeRange.trim() || '-',
        rate: Math.max(0, Number(rate) || 0),
        isOt,
        color,
      };

      // Wrap in Promise.race with 2.2s timeout so button never hangs or freezes
      await Promise.race([
        onSaveShiftType(shiftToSave),
        new Promise((resolve) => setTimeout(resolve, 2200)),
      ]);

      const savedCode = shiftToSave.code;

      // Always clear the old form data cleanly to wait for next new item
      setCode('');
      setName('');
      setSelectedPeriods(['morning']);
      setAllowedPositions([...ALL_POSITION_ABBRS]);
      setTimeRange('08:30 - 16:30 น.');
      setRate(600);
      setRateInput('600');
      setIsOt(false);
      setColor(COLOR_OPTIONS[0].value);
      setError('');

      if (keepOpenForNext) {
        setEditingShift({
          id: `shift-${Date.now()}`,
          code: '',
          name: '',
          period: 'morning',
          periods: ['morning'],
          allowedPositions: [...ALL_POSITION_ABBRS],
          timeRange: '08:30 - 16:30 น.',
          rate: 600,
          isOt: false,
          color: COLOR_OPTIONS[0].value,
        });
        setNotice(`✅ บันทึกรหัสเวร "${savedCode}" สำเร็จแล้ว (ล้างข้อมูลเก่าพร้อมเพิ่มรหัสเวรใหม่ได้ทันที)`);
      } else {
        setEditingShift(null);
        setNotice(`✅ บันทึกรหัสเวร "${savedCode}" สำเร็จแล้ว (ล้างข้อมูลเก่าเรียบร้อย)`);
      }
      setTimeout(() => setNotice(null), 3500);
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการบันทึกค่าเวร');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndAddNext = async (e: React.MouseEvent) => {
    e.preventDefault();
    await doSave(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSave(false);
  };

  const handleDelete = (id: string, code: string) => {
    setDeletingShift({ id, code });
  };

  const handleConfirmDelete = async () => {
    if (!deletingShift) return;
    try {
      await onDeleteShiftType(deletingShift.id);
      setNotice(`ลบรหัสเวร "${deletingShift.code}" สำเร็จแล้ว`);
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      console.error(err);
      setNotice('เกิดข้อผิดพลาดในการลบ');
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setDeletingShift(null);
    }
  };

  const content = (
    <div
      className={`bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[2px_3px_0px_rgba(70,60,50,0.12)] p-4 sm:p-6 flex flex-col ${
        isPageMode
          ? 'w-full max-w-6xl mx-auto'
          : 'relative w-full max-w-4xl max-h-[92vh] overflow-hidden'
      }`}
    >
      {/* Close Button (Only show in modal mode) */}
      {!isPageMode && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-[#F3ECE0] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      )}

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EFE7DC] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FBF0D9] border border-[#ECD9BA] rounded-xl">
              <DollarSign className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2 font-['Prompt']">
                กำหนดรหัสเวร อัตราค่าตอบแทน และตำแหน่งที่ปฏิบัติเวร
              </h2>
              <p className="text-xs text-stone-500">
                รหัสเวร 1-4 ตัวอักษร • เลือกช่วงเวลาได้หลายอัน • เชื่อมโยงเวรเฉพาะตำแหน่ง (MT, AMT, Office, Service)
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

        {/* Notice Banner */}
        {notice && (
          <div className="p-3 my-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 animate-fadeIn font-medium">
            {notice}
          </div>
        )}

        {/* Form */}
        {editingShift && (
          <form onSubmit={handleSubmit} className="p-4 my-3 bg-[#FAF5EC] border-2 border-[#E7DFD5] rounded-xl space-y-3 shrink-0 overflow-y-auto max-h-[50vh]">
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

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-stone-700 text-xs">
                    อัตราค่าตอบแทน (บาท/เวร) - กำหนดได้ตามต้องการ
                  </label>
                  <span className="text-[11px] font-bold text-amber-800">
                    {rate > 0 ? `${rate.toLocaleString()} บาท/เวร` : '0 บาท (ไม่มีค่าตอบแทน)'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAdjustRate(-100)}
                    className="px-2 py-1.5 bg-white hover:bg-stone-100 border border-[#DACFBF] rounded-lg text-xs font-semibold text-stone-700 cursor-pointer"
                    title="ลด 100 บาท"
                  >
                    -100
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustRate(-50)}
                    className="px-2 py-1.5 bg-white hover:bg-stone-100 border border-[#DACFBF] rounded-lg text-xs font-semibold text-stone-700 cursor-pointer"
                    title="ลด 50 บาท"
                  >
                    -50
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={rateInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setRateInput(raw);
                      const num = parseFloat(raw);
                      if (!isNaN(num) && num >= 0) {
                        setRate(num);
                        if (num > 0) setIsOt(true);
                      } else if (raw === '') {
                        setRate(0);
                      }
                    }}
                    placeholder="ระบุจำนวนเงินค่าเวร เช่น 600, 750 (กำหนดได้ตามต้องการ)"
                    className="flex-1 px-3 py-1.5 bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-500 font-mono font-bold text-stone-800 text-sm text-center"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleAdjustRate(50)}
                    className="px-2 py-1.5 bg-white hover:bg-stone-100 border border-[#DACFBF] rounded-lg text-xs font-semibold text-stone-700 cursor-pointer"
                    title="เพิ่ม 50 บาท"
                  >
                    +50
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustRate(100)}
                    className="px-2 py-1.5 bg-white hover:bg-stone-100 border border-[#DACFBF] rounded-lg text-xs font-semibold text-stone-700 cursor-pointer"
                    title="เพิ่ม 100 บาท"
                  >
                    +100
                  </button>
                </div>

                {/* Popular Presets */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-stone-500 mr-1">เลือกด่วน:</span>
                  {COMMON_RATE_PRESETS.map((pVal) => (
                    <button
                      key={pVal}
                      type="button"
                      onClick={() => handleSelectPresetRate(pVal)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium border cursor-pointer transition-colors ${
                        rate === pVal
                          ? 'bg-amber-600 text-white border-amber-600 font-bold'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-50'
                      }`}
                    >
                      {pVal === 0 ? '0฿ (เวรปกติ)' : `${pVal.toLocaleString()}฿`}
                    </button>
                  ))}
                </div>
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

            {/* Request 4: ช่องช่วงเวลาของเวร สามารถเลือกได้หลายอัน */}
            <div className="pt-1">
              <label className="block font-semibold text-stone-700 text-xs mb-1.5">
                ช่องช่วงเวลาของเวร (สามารถเลือกได้หลายอัน)*
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PERIOD_OPTIONS.map((po) => {
                  const isChecked = selectedPeriods.includes(po.id);
                  return (
                    <button
                      key={po.id}
                      type="button"
                      onClick={() => togglePeriod(po.id)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium text-left flex items-center justify-between transition-all cursor-pointer ${
                        isChecked
                          ? `${po.bg} border-current ring-1 ring-amber-500 shadow-xs font-semibold`
                          : 'bg-white border-[#E2D8C9] text-stone-600 hover:bg-[#FAF4EB]'
                      }`}
                    >
                      <span>{po.label.split(' ')[0]}</span>
                      <span className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border ${
                        isChecked ? 'bg-amber-600 text-white border-amber-600' : 'border-stone-300'
                      }`}>
                        {isChecked && '✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Request 5: กำหนดตำแหน่งที่สามารถปฏิบัติเวรนี้ได้ (MT, AMT, Office, Service) */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-stone-700 text-xs flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-stone-600" />
                  <span>ตำแหน่งที่สามารถปฏิบัติเวรนี้ได้ (เฉพาะเวรที่ตรงกับตำแหน่งเท่านั้น)*</span>
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllPositions}
                  className="text-[11px] text-amber-700 hover:underline cursor-pointer"
                >
                  เลือกทุกตำแหน่ง (All)
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ALL_POSITION_ABBRS.map((pos) => {
                  const isChecked = allowedPositions.includes(pos);
                  const cfg = STANDARD_POSITIONS[pos];
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => togglePosition(pos)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium text-left flex items-center justify-between transition-all cursor-pointer ${
                        isChecked
                          ? `${cfg.badgeClass} ring-1 ring-current shadow-xs font-bold`
                          : 'bg-white border-[#E2D8C9] text-stone-600 hover:bg-[#FAF4EB]'
                      }`}
                    >
                      <div>
                        <span className="font-mono text-sm block">{pos}</span>
                        <span className="text-[10px] opacity-80">{cfg.thaiTitle}</span>
                      </div>
                      <span className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] border ${
                        isChecked ? 'bg-amber-600 text-white border-amber-600' : 'border-stone-300'
                      }`}>
                        {isChecked && '✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                * ระบบจะจำกัดให้ผู้จัดตารางเวรและเจ้าหน้าที่เลือกได้เฉพาะเวรที่ตรงกับตำแหน่งนี้เท่านั้น
              </p>
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

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200 rounded-lg cursor-pointer"
              >
                ยกเลิก
              </button>
              {editingShift && !shiftTypes.find(s => s.id === editingShift.id) && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveAndAddNext}
                  className="px-3.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg border border-emerald-700 shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="บันทึกและล้างข้อมูลเก่าพร้อมเพิ่มรหัสเวรใหม่ทันที"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกและเพิ่มรหัสถัดไป'}</span>
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 text-xs bg-[#F28C38] hover:bg-[#E57A24] text-white font-medium rounded-lg border border-[#D56B16] shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="บันทึกรหัสเวรและปิดฟอร์ม"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกรหัสเวร'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Shift List Table */}
        <div className="flex-1 flex flex-col min-h-0 mt-3 border border-[#E7DFD5] rounded-xl bg-white overflow-hidden">
          {/* Table Search & Category Filter Toolbar */}
          <div className="p-3 bg-[#FAF5EB] border-b border-[#E7DFD5] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-semibold text-stone-700 mr-1">กรองตำแหน่ง:</span>
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-[#E0D5C3] hover:bg-stone-50'
                }`}
              >
                ทั้งหมด ({safeShiftTypes.length})
              </button>
              {(['MT', 'AMT', 'Office', 'Service'] as PositionAbbr[]).map((pos) => {
                const count = safeShiftTypes.filter((st) => {
                  const allowed = st.allowedPositions && st.allowedPositions.length > 0 ? st.allowedPositions : ALL_POSITION_ABBRS;
                  return allowed.includes(pos);
                }).length;
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setCategoryFilter(pos)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      categoryFilter === pos
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-stone-600 border border-[#E0D5C3] hover:bg-stone-50'
                    }`}
                  >
                    {pos} ({count})
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCategoryFilter('paid')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  categoryFilter === 'paid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                มีค่าเวร ({safeShiftTypes.filter((s) => (Number(s.rate) || 0) > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('free')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  categoryFilter === 'free'
                    ? 'bg-stone-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                0 ฿ ({safeShiftTypes.filter((s) => !(Number(s.rate) || 0)).length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="ค้นหารหัสเวร / ชื่อเวร..."
                className="px-2.5 py-1 bg-white border border-[#DACFBF] rounded-lg text-xs text-stone-800 focus:outline-hidden focus:border-amber-500 w-48"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F7F2EA] border-b border-[#E7DFD5] text-stone-700 font-semibold sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">รหัสเวร (1-4 หลัก)</th>
                  <th className="py-2.5 px-3">ชื่อเวร</th>
                  <th className="py-2.5 px-3">ช่วงเวลา</th>
                  <th className="py-2.5 px-3">ตำแหน่งที่เลือกได้</th>
                  <th className="py-2.5 px-3">เวลาปฏิบัติงาน</th>
                  <th className="py-2.5 px-3 text-right">ค่าเวร (บาท) [คลิกเพื่อแก้ด่วน]</th>
                  <th className="py-2.5 px-3 text-center">ประเภท OT</th>
                  <th className="py-2.5 px-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(() => {
                  const filtered = safeShiftTypes.filter((st) => {
                    if (!st) return false;
                    if (searchFilter.trim()) {
                      const q = searchFilter.trim().toLowerCase();
                      const matchCode = (st.code || '').toLowerCase().includes(q);
                      const matchName = (st.name || '').toLowerCase().includes(q);
                      const matchTime = (st.timeRange || '').toLowerCase().includes(q);
                      if (!matchCode && !matchName && !matchTime) return false;
                    }
                    if (categoryFilter === 'paid') return (Number(st.rate) || 0) > 0;
                    if (categoryFilter === 'free') return !(Number(st.rate) || 0);
                    if (categoryFilter !== 'all') {
                      const allowed = st.allowedPositions && st.allowedPositions.length > 0 ? st.allowedPositions : ALL_POSITION_ABBRS;
                      if (!allowed.includes(categoryFilter)) return false;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-stone-400">
                          ไม่พบรหัสเวรที่ตรงกับเงื่อนไขการค้นหา
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((st) => {
                    const periods = st.periods && st.periods.length > 0 ? st.periods : st.period ? [st.period] : ['morning'];
                    const allowed = st.allowedPositions && st.allowedPositions.length > 0 ? st.allowedPositions : ALL_POSITION_ABBRS;
                    const isAllPos = allowed.length === ALL_POSITION_ABBRS.length;
                    const isInline = inlineEditingId === st.id;

                    return (
                      <tr key={st.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded-md border text-center ${st.color}`}>
                            {st.code}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-stone-800">{st.name}</td>
                        <td className="py-2.5 px-3 text-stone-600">
                          <div className="flex flex-wrap gap-1">
                            {periods.map((p) => (
                              <span key={p} className="text-[10px] px-1.5 py-0.2 bg-[#F3ECE0] rounded-sm font-medium">
                                {p === 'morning' ? 'เช้า' : p === 'afternoon' ? 'บ่าย' : p === 'night' ? 'ดึก' : 'อื่นๆ/Off'}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-stone-600">
                          {st.code === 'OFFF' || isAllPos ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded-md border border-stone-200">
                              ทุกตำแหน่ง
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {allowed.map((pos) => {
                                const cfg = STANDARD_POSITIONS[pos];
                                return (
                                  <span
                                    key={pos}
                                    className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md border ${cfg.badgeClass}`}
                                  >
                                    {pos}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-stone-600">{st.timeRange}</td>

                        {/* Inline Editable Rate Column */}
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {isInline ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={inlineRateInput}
                                onChange={(e) => setInlineRateInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineRate(st);
                                  if (e.key === 'Escape') handleCancelInlineEdit();
                                }}
                                className="w-20 px-1.5 py-1 bg-white border-2 border-amber-500 rounded-md text-right font-mono font-bold text-xs focus:outline-hidden"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlineRate(st)}
                                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md cursor-pointer"
                                title="บันทึกค่าเวร"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelInlineEdit}
                                className="p-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-md cursor-pointer"
                                title="ยกเลิก"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1 group">
                              <span
                                onClick={() => handleStartInlineEdit(st)}
                                className={`font-mono font-bold cursor-pointer hover:underline ${
                                  st.rate > 0 ? 'text-emerald-700' : 'text-stone-400'
                                }`}
                                title="คลิกเพื่อแก้ไขค่าเวรด่วน"
                              >
                                {st.rate > 0 ? `${st.rate.toLocaleString()} ฿` : '0 ฿'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartInlineEdit(st)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-stone-400 hover:text-amber-700 transition-opacity cursor-pointer"
                                title="แก้ไขค่าเวรด่วน"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
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
                              title="แก้ไขทั้งหมด"
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
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {deletingShift && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fadeIn">
            <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-lg p-5 max-w-sm w-full animate-scaleUp">
              <h4 className="text-sm font-bold text-stone-800 mb-2">ยืนยันการลบรหัสเวร</h4>
              <p className="text-xs text-stone-600 mb-4">
                คุณต้องการลบรหัสเวร <strong>"{deletingShift.code}"</strong> ออกจากระบบใช่หรือไม่?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingShift(null)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
                >
                  ยืนยันลบ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );

  if (isPageMode) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      {content}
    </div>
  );
};
