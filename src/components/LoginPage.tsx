import React, { useState, useRef, useEffect } from 'react';
import { Staff, UserSession } from '../types';
import { CuteAlien, CuteAstronaut, SolarSystemBackground, CuteSpaceBarStrip } from './CuteSpaceDecorations';
import {
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

interface LoginPageProps {
  staffList: Staff[];
  onLogin: (user: UserSession) => void;
  onContinueAsGuest?: () => void;
  onSaveNewPassword: (staffId: string, newPassword: string) => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  staffList,
  onLogin,
  onContinueAsGuest,
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

  // Focus management
  useEffect(() => {
    if (step === 'password') {
      passwordInputRef.current?.focus();
    } else {
      nameInputRef.current?.focus();
    }
  }, [step]);

  const cleanInput = inputName.trim();

  // Perform login or transition to password for a identified staff member
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

    // If Sub-Admin: Requires password, switch to Step 2
    if (staff.role === 'sub_admin') {
      setConfirmedStaff(staff);
      setIsAlisaAdmin(false);
      setStep('password');
      return;
    }

    // General Staff: Direct login without password!
    onLogin({
      englishName: staff.englishName,
      thaiName: staff.thaiName,
      isAdmin: false,
      isSubAdmin: false,
      staffId: staff.id,
      category: staff.category,
      position: staff.position,
    });
  };

  // Step 1: Submit Name via manual typing
  const handleProceedName = () => {
    setError('');
    const targetQuery = cleanInput;

    if (!targetQuery) {
      setError('กรุณากรอกชื่อจริงภาษาไทย หรือชื่อภาษาอังกฤษ');
      nameInputRef.current?.focus();
      return;
    }

    // 1. Check Super Admin (alisa / อลิษา)
    if (isSuperAdminInput(targetQuery, staffList)) {
      proceedWithStaff(null, true);
      return;
    }

    // 2. Search staff by Thai name or English name
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

    // Super Admin: alisa
    if (isAlisaAdmin) {
      if (password !== '1450') {
        setError('รหัสผ่านผู้ดูแลระบบสูงสุดไม่ถูกต้อง');
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

      // If mustChangePassword is true (first login or after reset), force change password
      if (confirmedStaff.mustChangePassword !== false) {
        setForceChangeStaff(confirmedStaff);
        return;
      }

      // Log in as Sub-Admin directly
      onLogin({
        englishName: confirmedStaff.englishName,
        thaiName: confirmedStaff.thaiName,
        isAdmin: false,
        isSubAdmin: true,
        staffId: confirmedStaff.id,
        category: confirmedStaff.category,
        position: confirmedStaff.position,
      });
      return;
    }
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
  };

  // Return back to Step 1 to change name
  const handleBackToNameStep = () => {
    setStep('name');
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-between p-4 sm:p-6 text-stone-800 relative">
      {/* Paper-cut Solar System Background */}
      <SolarSystemBackground />

      {/* Top hospital header strip */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-4 border-b border-[#E7DFD5] relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border-2 border-[#E3D7C5] shadow-[2px_2px_0px_rgba(70,60,50,0.1)] shrink-0">
            <CuteAstronaut size={28} />
            <CuteAlien size={26} />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-stone-800 font-['Prompt']">
              งานเวชศาสตร์บริการโลหิต
            </span>
            <p className="text-[11px] text-stone-500">
              โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ (TUH)
            </p>
          </div>
        </div>

        {/* Paper-cut Space Celestial Strip */}
        <div className="hidden sm:inline-flex pointer-events-none select-none">
          <CuteSpaceBarStrip variant="compact" />
        </div>

        <span className="text-[10px] sm:text-xs px-2.5 py-1 bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-300">
          ระบบจัดตารางเวรปฏิบัติงาน
        </span>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center py-8 relative z-10">
        <div className="w-full max-w-md bg-[#FFFDF9] rounded-3xl border-2 border-[#E7DFD5] shadow-[4px_6px_0px_rgba(70,60,50,0.16)] p-6 sm:p-8 relative">
          {/* Framed Mascot Header Banner */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#FAF4EA] border-2 border-[#ECD9BA] rounded-2xl shadow-[2px_2px_0px_rgba(70,60,50,0.08)] mb-3">
              <CuteAstronaut size={38} />
              <div className="h-8 w-px bg-[#E3D7C5]" />
              <CuteAlien size={36} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-800 font-['Prompt']">
              เข้าสู่ระบบ (Sign In)
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              {step === 'name'
                ? 'สามารถ Login ได้ทั้งภาษาไทยและภาษาอังกฤษ'
                : 'กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบ'}
            </p>
          </div>

          {/* Step 1: Input Name Form */}
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
                    className="w-full px-4 py-2.5 text-sm bg-white border-2 border-[#E3D9CC] rounded-xl focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all font-medium text-stone-800 placeholder:text-stone-400"
                    autoFocus
                    required
                  />
                </div>

                <p className="text-xs text-amber-800/80 mt-1.5 flex items-center justify-center gap-1 font-medium bg-amber-50/70 py-1 px-2 rounded-lg border border-amber-200/60">
                  <span>💡 สามารถ Log in ได้ทั้งภาษาไทยและภาษาอังกฤษ</span>
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Next / Submit Button */}
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#F28C38] hover:bg-[#E57A24] active:bg-[#D56B16] text-white font-bold text-sm rounded-xl border border-[#D56B16] shadow-[2px_3px_0px_rgba(70,60,50,0.15)] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>ถัดไป (ตรวจสอบชื่อและเข้าใช้งาน)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Step 2: Password Form (Only for Super Admin or Sub-Admin) */}
          {step === 'password' && (
            <form onSubmit={handleProceedPassword} className="space-y-4 animate-fadeIn">
              {/* Confirmed User Profile Card */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                isAlisaAdmin ? 'bg-amber-50/80 border-amber-300' : 'bg-indigo-50/80 border-indigo-300'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl text-white ${isAlisaAdmin ? 'bg-amber-600' : 'bg-indigo-600'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <span>{isAlisaAdmin ? 'ทนพญ.อลิษา แก่นบำรุง' : confirmedStaff?.thaiName}</span>
                      <span className="text-[10px] font-mono text-stone-500 bg-white/70 px-1.5 py-0.5 rounded">
                        @{isAlisaAdmin ? 'alisa' : confirmedStaff?.englishName}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-stone-500">
                      {isAlisaAdmin ? 'ผู้ดูแลระบบสูงสุด (Super Admin)' : confirmedStaff?.position || 'งานเวชศาสตร์บริการโลหิต'}
                    </div>
                  </div>
                </div>

                {/* Change User button */}
                <button
                  type="button"
                  onClick={handleBackToNameStep}
                  className="px-2.5 py-1 text-xs text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                  title="เปลี่ยนชื่อผู้ใช้งาน"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>เปลี่ยนชื่อ</span>
                </button>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-stone-500" />
                    รหัสผ่าน (Password)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-stone-500 hover:text-stone-800 text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
                  className="w-full px-4 py-2.5 text-sm bg-white border-2 border-[#DACFBF] rounded-xl focus:outline-hidden focus:border-amber-600 focus:ring-2 focus:ring-amber-200 font-medium text-stone-800"
                  autoFocus
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
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
                  className="flex-1 py-2.5 px-4 bg-[#F28C38] hover:bg-[#E57A24] active:bg-[#D56B16] text-white font-bold text-sm rounded-xl border border-[#D56B16] shadow-[2px_3px_0px_rgba(70,60,50,0.15)] flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>เข้าสู่ระบบ</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Continue as Guest option */}
          {onContinueAsGuest && (
            <div className="mt-5 pt-4 border-t border-[#EFE7DC] text-center">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs rounded-xl border border-stone-300 shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>เข้าดูหน้าตารางเวรทั่วไป (โหมดดูอย่างเดียว)</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-500" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Forced Password Change Modal */}
      {forceChangeStaff && (
        <ForceChangePasswordModal
          isOpen={true}
          staff={forceChangeStaff}
          onSaveNewPassword={onSaveNewPassword}
          onSuccess={handleForcedPasswordSuccess}
        />
      )}

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto pt-4 border-t border-[#E7DFD5] text-center text-xs text-stone-500 flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-xl border border-[#E3D7C5]">
          <CuteAlien size={20} />
          <span className="font-semibold text-stone-700">งานเวชศาสตร์บริการโลหิต</span>
          <CuteAstronaut size={20} />
        </div>
        <span>โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ</span>
      </footer>
    </div>
  );
};
