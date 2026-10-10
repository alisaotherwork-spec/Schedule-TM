import React, { useState } from 'react';
import { Staff } from '../types';
import { Lock, Check, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { CuteAstronaut, CuteAlien } from './CuteSpaceDecorations';

interface ForceChangePasswordModalProps {
  isOpen: boolean;
  staff: Staff;
  onSaveNewPassword: (staffId: string, newPassword: string) => Promise<void>;
  onSuccess: () => void;
}

export const ForceChangePasswordModal: React.FC<ForceChangePasswordModalProps> = ({
  isOpen,
  staff,
  onSaveNewPassword,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 4) {
      setError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }

    if (newPassword === '1234') {
      setError('กรุณากำหนดรหัสผ่านใหม่ที่ไม่ใช่รหัสผ่านเริ่มต้น (1234)');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveNewPassword(staff.id, newPassword);
      onSuccess();
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการบันทึกรหัสผ่านใหม่');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#FFFDF9] rounded-3xl border-2 border-[#E7DFD5] shadow-[4px_6px_0px_rgba(70,60,50,0.18)] p-6 sm:p-8 animate-scaleUp">
        {/* Header with Mascots */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 p-2 bg-[#FAF4EA] border-2 border-[#ECD9BA] rounded-2xl shadow-xs mb-3">
            <CuteAstronaut size={32} />
            <CuteAlien size={30} />
          </div>
          <h2 className="text-lg font-bold text-stone-800 font-['Prompt'] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <span>ตั้งรหัสผ่านใหม่ (ผู้ดูแลระบบย่อย)</span>
          </h2>
          <p className="text-xs text-stone-600 mt-1">
            สวัสดีคุณ <strong>{staff.thaiName}</strong> (@{staff.englishName})
            <br />
            ระบบบังคับเปลี่ยนรหัสผ่านสำหรับการเข้าสู่ระบบครั้งแรก เพื่อความปลอดภัย
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                กำหนดรหัสผ่านใหม่ (New Password)
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-stone-500 hover:text-stone-800 text-[10px] flex items-center gap-0.5 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPassword ? 'ซ่อน' : 'แสดง'}</span>
              </button>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError('');
              }}
              placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)"
              className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-[#E3D9CC] rounded-xl focus:outline-hidden focus:border-amber-500 font-medium text-stone-800"
              autoFocus
              required
            />
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              ยืนยันรหัสผ่านใหม่อีกครั้ง (Confirm Password)
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
              }}
              placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
              className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-[#E3D9CC] rounded-xl focus:outline-hidden focus:border-amber-500 font-medium text-stone-800"
              required
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 px-4 bg-[#F28C38] hover:bg-[#E57A24] active:bg-[#D56B16] text-white font-bold text-sm rounded-xl border border-[#D56B16] shadow-[2px_3px_0px_rgba(70,60,50,0.15)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึกรหัสผ่าน...' : 'บันทึกรหัสผ่านและเข้าสู่ระบบ'}</span>
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-[10px] text-stone-500">
          * คุณจะใช้รหัสผ่านใหม่นี้ในการเข้าสู่ระบบครั้งถัดไป จนกว่าจะเปลี่ยนใหม่
        </p>
      </div>
    </div>
  );
};
