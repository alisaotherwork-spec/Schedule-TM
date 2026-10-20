import React, { useState, useRef, useEffect } from 'react';
import { Staff, UserSession } from '../types';
import { CuteAlien, CuteAstronaut } from './CuteSpaceDecorations';
import {
  X,
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { ForceChangePasswordModal } from './ForceChangePasswordModal';
import {
  isSuperAdminInput,
  findStaffByNameOrEnglish
} from '../utils/staffAuthUtils';

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
  const [inputName, setInputName] = useState('');
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
      setInputName('');
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

  const cleanInput = inputName.trim();

  const proceedWithStaff = (staff: Staff | null, isSuperAdmin: boolean) => {
    setError('');

    if (isSuperAdmin) {
      const staffObj = staff || staffList.find((s) => (s.englishName || '').toLowerCase() === 'alisa') || null;
      setConfirmedStaff(staffObj);
      setIsAlisaAdmin(true);
      setStep('password');
      return;
    }

    if (!staff) {
      setError(`ไม่พบรายชื่อ "${cleanInput}" ในระบบ กรุณาตรวจสอบการสะกดชื่อภาษาไทย หรือชื่อภาษาอังกฤษ`);
      nameInputRef.current?.focus();
      return;
    }

    // Sub-Admin requires password
    if (staff.role === 'sub_admin') {
      setConfirmedStaff(staff);
      setIsAlisaAdmin(false);
      setStep('password');
      return;
    }

    // General Staff: direct login
    onLogin({
      englishName: staff.englishName,
      thaiName: staff.thaiName,
      isAdmin: false,
      isSubAdmin: false,
      staffId: staff.id,
      category: staff.category,
      position: staff.position,
    });
    onClose();
  };

  // Step 1: Submit Name via typing
  const handleProceedName = () => {
    setError('');
    const targetQuery = cleanInput;

    if (!targetQuery) {
      setError('กรุณากรอกชื่อจริงภาษาไทย หรือชื่อภาษาอังกฤษ');
      nameInputRef.current?.focus();
      return;
    }

    if (isSuperAdminInput(targetQuery, staffList)) {
      proceedWithStaff(null, true);
      return;
    }

    const matched = findStaffByNameOrEnglish(targetQuery, staffList);
    if (matched) {
      if ((matched.englishName || '').toLowerCase() === 'alisa' || matched.role === 'super_admin') {
        proceedWithStaff(matched, true);
      } else {
        proceedWithStaff(matched, false);
      }
      return;
    }

    setError(`ไม่พบรายชื่อ "${targetQuery}" ในระบบ กรุณาตรวจสอบการสะกดชื่อภาษาไทย หรือชื่อภาษาอังกฤษ`);
    nameInputRef.current?.focus();
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
              เข้าสู่ระบบ / สลับผู้ใช้งาน
            </h2>
            <p className="text-xs text-stone-500">
              {step === 'name' ? 'สามารถ Login ได้ทั้งภาษาไทยและภาษาอังกฤษ' : 'กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบ'}
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
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-600" />
                <span>ชื่อเจ้าหน้าที่</span>
              </label>

              <div className="relative">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={inputName}
                  onChange={(e) => {
                    setInputName(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleProceedName();
                    }
                  }}
                  placeholder="พิมพ์ชื่อภาษาไทย หรือภาษาอังกฤษ..."
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-[#E3D9CC] rounded-xl focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all font-medium text-stone-800 placeholder:text-stone-400"
                  autoFocus
                  required
                />
              </div>

              <p className="text-xs text-amber-800/80 mt-1.5 flex items-center justify-center gap-1 font-medium bg-amber-50/70 py-1 px-2 rounded-lg border border-amber-200/60">
                <span>💡 สามารถ Log in ได้ทั้งภาษาไทยและภาษาอังกฤษ</span>
              </p>
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
                  <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <span>{isAlisaAdmin ? 'ทนพญ.อลิษา แก่นบำรุง' : confirmedStaff?.thaiName}</span>
                    <span className="text-[10px] font-mono text-stone-500 bg-white/70 px-1 py-0.2 rounded">
                      @{isAlisaAdmin ? 'alisa' : confirmedStaff?.englishName}
                    </span>
                  </div>
                  <div className="text-[10px] font-medium text-stone-500">
                    {isAlisaAdmin ? 'ผู้ดูแลระบบสูงสุด (Super Admin)' : confirmedStaff?.position || 'งานเวชศาสตร์บริการโลหิต'}
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
                placeholder="กรอกรหัสผ่านเพื่อเข้าสู่ระบบ"
                autoComplete="current-password"
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
      </div>
    </div>
  );
};
