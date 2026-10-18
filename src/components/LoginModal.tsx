import React, { useState, useRef, useEffect } from 'react';
import { Staff, UserSession } from '../types';
import { CuteAlien, CuteAstronaut } from './CuteSpaceDecorations';
import { X, Lock, User, ShieldCheck, ArrowRight, AlertCircle, Eye, EyeOff, RotateCcw } from 'lucide-react';
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
  // Step 1: 'name', Step 2: 'password' (for admin/sub-admin)
  const [step, setStep] = useState<'name' | 'password'>('name');
  const [englishName, setEnglishName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [forceChangeStaff, setForceChangeStaff] = useState<Staff | null>(null);

  // Identified user info after completing name step
  const [confirmedStaff, setConfirmedStaff] = useState<Staff | null>(null);
  const [isAlisaAdmin, setIsAlisaAdmin] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setStep('name');
      setPassword('');
      setError('');
      setConfirmedStaff(null);
      setIsAlisaAdmin(false);
    }
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (!isOpen) return;
    if (step === 'password') {
      passwordInputRef.current?.focus();
    } else {
      nameInputRef.current?.focus();
    }
  }, [step, isOpen]);

  if (!isOpen) return null;

  const cleanName = englishName.trim();
  const inputLower = cleanName.toLowerCase();

  // Suggestions while typing name (at least 2 letters)
  const matchingSuggestions = cleanName.length >= 2
    ? staffList
        .filter((s) => s.isActive)
        .filter((s) => {
          const sEng = s.englishName.toLowerCase();
          const sThai = s.thaiName;
          return sEng.includes(inputLower) || sThai.includes(cleanName);
        })
        .slice(0, 4)
    : [];

  // Helper to find staff
  const findStaffByInput = (input: string) => {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();
    if (!trimmed) return null;

    // 1. Exact match
    let found = staffList.find(
      (s) => s.englishName.toLowerCase() === lower || s.thaiName === trimmed
    );
    if (found) return found;

    // 2. Starts with match
    found = staffList.find(
      (s) => s.englishName.toLowerCase().startsWith(lower) || s.thaiName.startsWith(trimmed)
    );
    if (found) return found;

    // 3. Includes match
    found = staffList.find(
      (s) => s.englishName.toLowerCase().includes(lower) || s.thaiName.includes(trimmed)
    );
    return found || null;
  };

  // Step 1: Submit Name
  const handleProceedName = (selectedNameOverride?: string) => {
    setError('');
    const targetName = (selectedNameOverride !== undefined ? selectedNameOverride : cleanName).trim();
    const targetLower = targetName.toLowerCase();

    if (!targetName) {
      setError('กรุณากรอกชื่อจริงภาษาไทยหรือชื่อภาษาอังกฤษ');
      nameInputRef.current?.focus();
      return;
    }

    // Check if Super Admin "alisa" or "อลิษา"
    const isAlisa =
      targetLower === 'alisa' ||
      targetName === 'อลิษา' ||
      targetLower.startsWith('alisa') ||
      targetName.includes('อลิษา');

    if (isAlisa) {
      const staffObj = staffList.find(
        (s) => s.englishName.toLowerCase() === 'alisa'
      );
      setConfirmedStaff(staffObj || null);
      setIsAlisaAdmin(true);
      setStep('password');
      return;
    }

    // Check staff in list
    const matched = findStaffByInput(targetName);
    if (!matched) {
      setError(`ไม่พบรายชื่อ "${targetName}" ในระบบ กรุณาตรวจสอบการสะกดชื่อ หรือเลือกจากรายชื่อด้านล่าง`);
      nameInputRef.current?.focus();
      return;
    }

    // If Sub-Admin: Requires password, switch to Step 2
    if (matched.role === 'sub_admin') {
      setConfirmedStaff(matched);
      setIsAlisaAdmin(false);
      setStep('password');
      return;
    }

    // If General Staff: Log in directly without password!
    onLogin({
      englishName: matched.englishName,
      thaiName: matched.thaiName,
      isAdmin: false,
      isSubAdmin: false,
      staffId: matched.id,
      category: matched.category,
      position: matched.position,
    });
    onClose();
  };

  // Step 2: Submit Password
  const handleProceedPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!password) {
      setError('กรุณากรอกรหัสผ่าน');
      passwordInputRef.current?.focus();
      return;
    }

    if (isAlisaAdmin) {
      if (password !== '1450') {
        setError('รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง');
        passwordInputRef.current?.focus();
        return;
      }

      onLogin({
        englishName: 'alisa',
        thaiName: confirmedStaff ? confirmedStaff.thaiName : 'ทนพญ.อลิษา แก่นบำรุง',
        isAdmin: true,
        isSubAdmin: false,
        staffId: confirmedStaff?.id,
        category: confirmedStaff?.category,
        position: confirmedStaff?.position || 'ผู้ดูแลระบบสูงสุด',
      });
      onClose();
      return;
    }

    // Sub-Admin check
    if (confirmedStaff && confirmedStaff.role === 'sub_admin') {
      const correctPassword = confirmedStaff.password || '1234';
      if (password !== correctPassword) {
        setError('รหัสผ่านผู้ดูแลระบบย่อยไม่ถูกต้อง');
        passwordInputRef.current?.focus();
        return;
      }

      if (confirmedStaff.mustChangePassword !== false) {
        setForceChangeStaff(confirmedStaff);
        return;
      }

      onLogin({
        englishName: confirmedStaff.englishName,
        thaiName: confirmedStaff.thaiName,
        isAdmin: false,
        isSubAdmin: true,
        staffId: confirmedStaff.id,
        category: confirmedStaff.category,
        position: confirmedStaff.position,
      });
      onClose();
      return;
    }
  };

  const handleForcedPasswordSuccess = () => {
    if (!forceChangeStaff) return;
    const staff = forceChangeStaff;
    setForceChangeStaff(null);

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

  const handleBackToNameStep = () => {
    setStep('name');
    setPassword('');
    setError('');
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
              {step === 'name' ? 'กรอกชื่อของคุณเพื่อเข้าสู่ระบบ' : 'ยืนยันรหัสผ่านผู้ดูแลระบบ'}
            </p>
          </div>
        </div>

        {/* Step 1: Input Name */}
        {step === 'name' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProceedName();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  ชื่อ-สกุลเจ้าหน้าที่ หรือชื่อภาษาอังกฤษ
                </span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={englishName}
                onChange={(e) => {
                  setEnglishName(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleProceedName();
                  }
                }}
                placeholder="กรอกชื่อภาษาอังกฤษ หรือชื่อ-สกุล..."
                className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-[#E3D9CC] rounded-xl focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all font-medium text-stone-800 placeholder:text-stone-400"
                autoFocus
                required
              />

              {/* Suggestions */}
              {matchingSuggestions.length > 0 && (
                <div className="mt-2 p-2 bg-[#FAF5EB] border border-[#E3D7C5] rounded-xl">
                  <span className="text-[10px] font-semibold text-stone-600 block mb-1">
                    คลิกเพื่อเลือกชื่อ:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {matchingSuggestions.map((staff) => (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => {
                          setEnglishName(staff.thaiName);
                          handleProceedName(staff.thaiName);
                        }}
                        className="px-2 py-0.5 text-xs bg-white hover:bg-amber-100 text-stone-800 rounded-lg border border-[#DACFBF] shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>{staff.thaiName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Select Dropdown */}
              <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
                <span>หรือเลือกจากรายชื่อ:</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setEnglishName(e.target.value);
                      handleProceedName(e.target.value);
                    }
                  }}
                  className="text-xs bg-[#FAF5EC] border border-[#E0D5C5] rounded-lg px-2 py-1 text-stone-700 font-medium focus:outline-hidden cursor-pointer max-w-[210px] truncate"
                >
                  <option value="">-- เลือกลงชื่อจากรายชื่อ --</option>
                  <option value="alisa">ทนพญ.อลิษา แก่นบำรุง (alisa)</option>
                  {staffList
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.thaiName}>
                        {s.thaiName} {s.role === 'sub_admin' ? '[ผู้ดูแลระบบย่อย]' : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>

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
              <span>ถัดไป (ตรวจสอบชื่อและเข้าสู่ระบบ)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 2: Password */}
        {step === 'password' && (
          <form onSubmit={handleProceedPassword} className="space-y-4 animate-fadeIn">
            {/* User Profile Card */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              isAlisaAdmin ? 'bg-amber-50/80 border-amber-300' : 'bg-indigo-50/80 border-indigo-300'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-5 h-5 ${isAlisaAdmin ? 'text-amber-600' : 'text-indigo-600'}`} />
                <div>
                  <div className="text-xs font-bold text-stone-800">
                    {isAlisaAdmin ? 'ทนพญ.อลิษา แก่นบำรุง' : confirmedStaff?.thaiName}
                  </div>
                  <div className={`text-[10px] font-semibold ${isAlisaAdmin ? 'text-amber-800' : 'text-indigo-800'}`}>
                    {isAlisaAdmin ? '👑 ผู้ดูแลระบบสูงสุด (Super Admin)' : '🛡️ ผู้ดูแลระบบย่อย (Sub-Admin)'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleBackToNameStep}
                className="px-2 py-1 text-xs text-stone-600 hover:text-stone-900 bg-white border border-stone-300 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>เปลี่ยนชื่อ</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-700 mb-1 flex items-center justify-between">
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
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder={isAlisaAdmin ? 'กรอกรหัสผ่านผู้ดูแลระบบสูงสุด (1450)' : 'กรอกรหัสผ่านผู้ดูแลระบบย่อย'}
                className="w-full px-3 py-2 text-sm bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-300 font-medium text-stone-800"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleBackToNameStep}
                className="py-2.5 px-3 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs rounded-xl border border-stone-300 shadow-xs cursor-pointer"
              >
                ย้อนกลับ
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-[#F28C38] hover:bg-[#E57A24] active:bg-[#D56B16] text-white font-medium rounded-xl border border-[#D56B16] shadow-[2px_3px_0px_rgba(70,60,50,0.15)] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>เข้าสู่ระบบ</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

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
          <br />• <strong>เจ้าหน้าที่ทั่วไป</strong>: บันทึกเวรได้ทันทีไม่ต้องใส่รหัสผ่าน
        </div>
      </div>
    </div>
  );
};
