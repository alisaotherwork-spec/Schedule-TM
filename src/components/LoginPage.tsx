import React, { useState } from 'react';
import { Staff, UserSession } from '../types';
import { CuteAlien, CuteAstronaut, SolarSystemBackground, CuteSpaceBarStrip } from './CuteSpaceDecorations';
import { Lock, User, ShieldCheck, ArrowRight, AlertCircle, Eye, EyeOff, Shield } from 'lucide-react';
import { ForceChangePasswordModal } from './ForceChangePasswordModal';

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
  const [englishName, setEnglishName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [forceChangeStaff, setForceChangeStaff] = useState<Staff | null>(null);

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

    // Super Admin: alisa
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
      <main className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-md bg-[#FFFDF9] rounded-3xl border-2 border-[#E7DFD5] shadow-[4px_6px_0px_rgba(70,60,50,0.16)] p-6 sm:p-8 relative">
          {/* Framed Mascot Header Banner */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#FAF4EA] border-2 border-[#ECD9BA] rounded-2xl shadow-[2px_2px_0px_rgba(70,60,50,0.08)] mb-3">
              <CuteAstronaut size={38} />
              <div className="h-8 w-px bg-[#E3D7C5]" />
              <CuteAlien size={36} />
            </div>
            <h1 className="text-xl font-bold text-stone-800 font-['Prompt']">
              เข้าสู่ระบบ (Sign In)
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              กรุณากรอกชื่อจริงภาษาไทยหรือภาษาอังกฤษเพื่อเข้าใช้งานระบบ
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Real Name Input (Thai or English) */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  ชื่อ-สกุลเจ้าหน้าที่ หรือชื่อภาษาอังกฤษ
                </span>
              </label>
              <input
                type="text"
                value={englishName}
                onChange={(e) => {
                  setEnglishName(e.target.value);
                  setError('');
                }}
                placeholder="กรอกชื่อภาษาอังกฤษ หรือชื่อ-สกุล..."
                className="w-full px-4 py-2.5 text-sm bg-white border-2 border-[#E3D9CC] rounded-xl focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all font-medium text-stone-800 placeholder:text-stone-400"
                autoFocus
                required
              />
            </div>

            {/* Password Field: Appears for Super Admin or Sub-Admin */}
            {requiresPassword && (
              <div className={`p-3.5 rounded-2xl space-y-2 animate-fadeIn border ${
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
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#DACFBF] rounded-xl focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-300 font-medium text-stone-800"
                    autoFocus
                    required
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#F28C38] hover:bg-[#E57A24] active:bg-[#D56B16] text-white font-bold text-sm rounded-xl border border-[#D56B16] shadow-[2px_3px_0px_rgba(70,60,50,0.15)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>เข้าสู่หน้าตารางเวร</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Continue as Guest option */}
          {onContinueAsGuest && (
            <div className="mt-5 pt-4 border-t border-[#EFE7DC] text-center">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="text-xs text-stone-500 hover:text-stone-800 hover:underline cursor-pointer"
              >
                ดูตารางเวรในฐานะผู้เยี่ยมชม (โหมดดูอย่างเดียว)
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
