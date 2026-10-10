import React, { useState } from 'react';
import { Staff, UserSession } from '../types';
import { CuteAlien, CuteAstronaut } from './CuteSpaceDecorations';
import { X, Lock, User, ShieldCheck, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { ForceChangePasswordModal } from './ForceChangePasswordModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  currentUser: UserSession | null;
  onLogin: (user: UserSession) => void;
  onSaveNewPassword: (staffId: string, newPassword: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  staffList,
  currentUser,
  onLogin,
  onSaveNewPassword,
}) => {
  const [englishName, setEnglishName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [forceChangeStaff, setForceChangeStaff] = useState<Staff | null>(null);

  if (!isOpen) return null;

  const cleanName = englishName.trim();
  const inputLower = cleanName.toLowerCase();

  // Find matched staff by English name, Thai name, or partial match
  const matchedStaff = staffList.find((s) => {
    const sEng = s.englishName.toLowerCase();
    const sThai = s.thaiName;
    return (
      sEng === inputLower ||
      sThai === cleanName ||
      sThai.includes(cleanName) ||
      cleanName.includes(sThai) ||
      inputLower.includes(sEng) ||
      sEng.includes(inputLower)
    );
  });

  const isAlisa =
    inputLower === 'alisa' ||
    cleanName.includes('อลิษา') ||
    Boolean(matchedStaff && matchedStaff.englishName.toLowerCase() === 'alisa');

  const isSubAdmin = Boolean(matchedStaff && matchedStaff.role === 'sub_admin');
  const requiresPassword = isAlisa || isSubAdmin;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cleanName) {
      setError('กรุณากรอกชื่อจริงภาษาไทยหรือภาษาอังกฤษ');
      return;
    }

    if (isAlisa) {
      if (password !== '1450') {
        setError('รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง');
        return;
      }

      const staffObj = staffList.find(
        (s) => s.englishName.toLowerCase() === 'alisa'
      );

      onLogin({
        englishName: 'alisa',
        thaiName: staffObj ? staffObj.thaiName : 'ทนพญ.อลิษา แก่นบำรุง',
        isAdmin: true,
        isSubAdmin: false,
        staffId: staffObj?.id,
        category: staffObj?.category,
        position: staffObj?.position || 'ผู้ดูแลระบบสูงสุด',
      });
      onClose();
      return;
    }

    if (!matchedStaff) {
      setError(`ไม่พบรายชื่อ "${cleanName}" ในระบบ กรุณาตรวจสอบการสะกดชื่อภาษาไทยหรือภาษาอังกฤษ`);
      return;
    }

    // Sub-Admin check
    if (isSubAdmin) {
      const correctPassword = matchedStaff.password || '1234';
      if (password !== correctPassword) {
        setError('รหัสผ่านผู้ดูแลระบบย่อยไม่ถูกต้อง');
        return;
      }

      // If mustChangePassword is true (first login or after reset), force change password
      if (matchedStaff.mustChangePassword !== false) {
        setForceChangeStaff(matchedStaff);
        return;
      }

      // Log in as Sub-Admin directly
      onLogin({
        englishName: matchedStaff.englishName,
        thaiName: matchedStaff.thaiName,
        isAdmin: false,
        isSubAdmin: true,
        staffId: matchedStaff.id,
        category: matchedStaff.category,
        position: matchedStaff.position,
      });
      onClose();
      return;
    }

    // General Staff login (no password required)
    onLogin({
      englishName: matchedStaff.englishName,
      thaiName: matchedStaff.thaiName,
      isAdmin: false,
      isSubAdmin: false,
      staffId: matchedStaff.id,
      category: matchedStaff.category,
      position: matchedStaff.position,
    });
    onClose();
  };

  const handleForcedPasswordSuccess = () => {
    if (!forceChangeStaff) return;
    const staff = forceChangeStaff;
    setForceChangeStaff(null);

    // Complete login as Sub-Admin
    onLogin({
      englishName: staff.englishName,
      thaiName: staff.thaiName,
      isAdmin: false,
      isSubAdmin: true,
      staffId: staff.id,
      category: staff.category,
      position: staff.position,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[4px_6px_0px_rgba(70,60,50,0.18)] p-6 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-[#F3ECE0] transition-colors cursor-pointer"
          title="ปิด"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Framed Mascots */}
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="flex items-center gap-1.5 p-2 bg-[#FBF0D9] border border-[#ECD9BA] rounded-xl shadow-[1px_2px_0px_rgba(70,60,50,0.1)] shrink-0">
            <CuteAstronaut size={32} />
            <CuteAlien size={30} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-800 flex items-center gap-1.5 font-['Prompt']">
              เข้าสู่ระบบจัดตารางเวร
            </h2>
            <p className="text-xs text-stone-500">
              งานเวชศาสตร์บริการโลหิต รพ.ธรรมศาสตร์ฯ
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Real Name Input (Thai or English) */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-600" />
                ชื่อ-สกุลเจ้าหน้าที่ หรือชื่อภาษาอังกฤษ
              </span>
            </label>
            <input
              type="text"
              list="modal-staff-name-list"
              value={englishName}
              onChange={(e) => {
                setEnglishName(e.target.value);
                setError('');
              }}
              placeholder="พิมพ์ชื่อไทย หรือชื่ออังกฤษ (เช่น alisa, ณิชาภา, สาริสา)..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-[#E3D9CC] rounded-xl focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all font-medium text-stone-800 placeholder:text-stone-400"
              autoFocus
              required
            />
            <datalist id="modal-staff-name-list">
              {staffList.map((s) => (
                <option key={`m-thai-${s.id}`} value={s.thaiName}>
                  {s.englishName} ({s.position})
                </option>
              ))}
              {staffList.map((s) => (
                <option key={`m-eng-${s.id}`} value={s.englishName}>
                  {s.thaiName}
                </option>
              ))}
            </datalist>
          </div>

          {/* Password for alisa or Sub-Admin */}
          {requiresPassword && (
            <div className={`p-3 rounded-xl space-y-2 animate-fadeIn border ${
              isAlisa ? 'bg-amber-50/80 border-amber-200' : 'bg-indigo-50/80 border-indigo-200'
            }`}>
              <div className={`flex items-center gap-2 text-xs font-semibold ${
                isAlisa ? 'text-amber-900' : 'text-indigo-950'
              }`}>
                <ShieldCheck className={`w-4 h-4 ${isAlisa ? 'text-amber-600' : 'text-indigo-600'}`} />
                <span>
                  {isAlisa ? 'ยืนยันสิทธิ์ผู้ดูแลระบบสูงสุด (Super Admin)' : 'ยืนยันสิทธิ์ผู้ดูแลระบบย่อย (Sub-Admin)'}
                </span>
              </div>
              <div>
                <label className={`block text-[11px] font-medium mb-1 flex items-center justify-between ${
                  isAlisa ? 'text-amber-800' : 'text-indigo-900'
                }`}>
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    รหัสผ่าน (Password)
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
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder={isAlisa ? 'กรอกรหัสผ่านผู้ดูแลระบบสูงสุด' : 'กรอกรหัสผ่านผู้ดูแลระบบย่อย'}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-300 font-medium text-stone-800"
                  required
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-[#F28C38] hover:bg-[#E57A24] active:bg-[#D56B16] text-white font-medium rounded-xl border border-[#D56B16] shadow-[2px_3px_0px_rgba(70,60,50,0.15)] flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>เข้าสู่ระบบ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Forced Password Change Modal */}
        {forceChangeStaff && (
          <ForceChangePasswordModal
            isOpen={true}
            staff={forceChangeStaff}
            onSaveNewPassword={onSaveNewPassword}
            onSuccess={handleForcedPasswordSuccess}
          />
        )}

        {/* Permissions note */}
        <div className="mt-4 pt-3 border-t border-[#EFE7DC] text-[10px] text-stone-500 text-center leading-relaxed">
          • <strong>alisa</strong>: ผู้ดูแลระบบสูงสุด (จัดการทุกเวรและกำหนดผู้ดูแลระบบย่อย)
          <br />• <strong>ผู้ดูแลระบบย่อย</strong>: จัดการเจ้าหน้าที่และแก้ไขค่าเวรได้
          <br />• <strong>เจ้าหน้าที่ทั่วไป</strong>: แก้ไขได้เฉพาะเวรของตนเอง
        </div>
      </div>
    </div>
  );
};
