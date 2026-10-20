import React, { useState, useEffect } from 'react';
import { RoomId } from '../types';
import { X, Eraser, AlertTriangle, Check, Loader2 } from 'lucide-react';

interface ClearScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomId: RoomId;
  monthThai: string;
  onConfirmClear: (scope: 'current' | 'both') => Promise<void> | void;
}

export const ClearScheduleModal: React.FC<ClearScheduleModalProps> = ({
  isOpen,
  onClose,
  currentRoomId,
  monthThai,
  onConfirmClear,
}) => {
  const [scope, setScope] = useState<'current' | 'both'>('current');
  const [isClearing, setIsClearing] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isClearing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClearing, onClose]);

  if (!isOpen) return null;

  const currentRoomName =
    currentRoomId === 'lab' ? 'ห้องปฏิบัติการ (Lab)' : 'ห้องรับบริจาคโลหิต (Donor)';

  const handleConfirm = async () => {
    setIsClearing(true);
    try {
      // Wrap with 1.8s timeout guarantee so it NEVER hangs
      await Promise.race([
        Promise.resolve(onConfirmClear(scope)),
        new Promise((resolve) => setTimeout(resolve, 1800)),
      ]);
    } catch (err) {
      console.warn('Error during clear schedule execution:', err);
    } finally {
      setIsClearing(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[4px_6px_0px_rgba(70,60,50,0.22)] p-6 overflow-hidden animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isClearing}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-30"
          title="ปิด"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pr-8">
          <div className="p-2.5 bg-rose-50 border-2 border-rose-200 rounded-2xl shadow-xs shrink-0 flex items-center justify-center">
            <Eraser className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-800 font-['Prompt']">
              ล้างตารางเวรเป็นตารางเปล่า
            </h3>
            <p className="text-xs text-stone-500">
              ประจำเดือน {monthThai}
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            รายการเวรที่ถูกมอบหมายในเดือนนี้จะถูกล้างออกทั้งหมดกลับสู่ <strong>หน้าตารางเปล่า</strong> โดยระบบจะสำรองข้อมูลเดิมไว้ให้อัตโนมัติ สามารถกู้คืนย้อนหลังได้ตลอดเวลา
          </div>
        </div>

        {/* Scope Options */}
        <div className="space-y-2 mb-6">
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            เลือกขอบเขตที่ต้องการล้าง:
          </label>

          <label
            onClick={() => !isClearing && setScope('current')}
            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
              scope === 'current'
                ? 'bg-rose-50/70 border-rose-400 text-rose-950 font-medium shadow-xs'
                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
            } ${isClearing ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  scope === 'current' ? 'border-rose-500 bg-rose-500 text-white' : 'border-stone-400'
                }`}
              >
                {scope === 'current' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
              <span>
                ล้างเฉพาะ <strong>{currentRoomName}</strong>
              </span>
            </div>
            <span className="text-[11px] text-stone-500">แผนกปัจจุบัน</span>
          </label>

          <label
            onClick={() => !isClearing && setScope('both')}
            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
              scope === 'both'
                ? 'bg-rose-50/70 border-rose-400 text-rose-950 font-medium shadow-xs'
                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
            } ${isClearing ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  scope === 'both' ? 'border-rose-500 bg-rose-500 text-white' : 'border-stone-400'
                }`}
              >
                {scope === 'both' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
              <span>
                ล้างทั้งสองแผนก <strong>(Lab + Donor)</strong>
              </span>
            </div>
            <span className="text-[11px] text-stone-500">ทั้ง 2 แผนก</span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EFE7DC]">
          <button
            type="button"
            onClick={onClose}
            disabled={isClearing}
            className="py-2.5 px-4 bg-white hover:bg-stone-100 text-stone-700 font-semibold text-xs rounded-xl border border-stone-300 shadow-xs cursor-pointer transition-all disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isClearing}
            className="py-2.5 px-5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl border border-rose-700 shadow-[2px_2px_0px_rgba(70,60,50,0.15)] flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-60"
          >
            {isClearing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังล้างตาราง...</span>
              </>
            ) : (
              <>
                <Eraser className="w-3.5 h-3.5" />
                <span>ยืนยันล้างเป็นตารางเปล่า</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
