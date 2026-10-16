import React, { useState } from 'react';
import {
  Folder,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Cloud,
  LogOut,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_DRIVE_FOLDER_NAME,
  GOOGLE_SHEET_NAME,
  GOOGLE_DRIVE_FOLDER_URL,
  SyncResult,
} from '../services/googleDriveService';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncNow: () => Promise<void>;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  currentMonthThai: string;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSignIn,
  onSignOut,
  onSyncNow,
  isSyncing,
  lastSyncResult,
  autoSyncEnabled,
  onToggleAutoSync,
  currentMonthThai,
}) => {
  const [showConfirmSync, setShowConfirmSync] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmAndSync = async () => {
    setShowConfirmSync(false);
    setErrorMessage(null);
    try {
      await onSyncNow();
    } catch (err: any) {
      setErrorMessage(err?.message || 'เกิดข้อผิดพลาดในการสำรองข้อมูลไปยัง Google Drive');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FAF7F2] rounded-2xl shadow-2xl border border-[#EFE7DC] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F2EDE4] border-b border-[#E8DFC8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006A4E]/10 flex items-center justify-center text-[#006A4E]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-serif">
                เชื่อมต่อและสำรองข้อมูล Google Drive
              </h2>
              <p className="text-xs text-stone-600">
                สำรองข้อมูลตารางเวรไปยัง Google Sheets อัตโนมัติและเรียกดูได้ทุกอุปกรณ์
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-[#E8DFC8] rounded-lg transition-colors cursor-pointer"
            title="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-stone-700">
          {/* Target Location Card */}
          <div className="bg-white rounded-xl p-4 border border-[#EFE7DC] space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              ตำแหน่งบันทึกข้อมูลบน Google Drive
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Folder Info */}
              <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 flex items-start gap-3">
                <Folder className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-emerald-900/70 font-medium">โฟลเดอร์เป้าหมาย</div>
                  <div className="text-sm font-semibold text-emerald-950 truncate">
                    {GOOGLE_DRIVE_FOLDER_NAME}
                  </div>
                  <a
                    href={GOOGLE_DRIVE_FOLDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline mt-1 font-mono"
                  >
                    ID: {GOOGLE_DRIVE_FOLDER_ID.slice(0, 10)}...
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Sheet Info */}
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-blue-900/70 font-medium">สเปรดชีตเป้าหมาย</div>
                  <div className="text-sm font-semibold text-blue-950 truncate">
                    {GOOGLE_SHEET_NAME}
                  </div>
                  {lastSyncResult?.spreadsheetUrl ? (
                    <a
                      href={lastSyncResult.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline mt-1"
                    >
                      เปิดดู Google Sheet
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <div className="text-[11px] text-blue-600/80 mt-1">
                      จะถูกสร้าง/อัปเดตอัตโนมัติในโฟลเดอร์
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-stone-500 flex items-center gap-2 pt-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>
                โครงสร้างข้อมูล: ปฏิทินตารางเวรแยกแท็บตามเดือน เช่น แท็บ <strong>{currentMonthThai}</strong>
              </span>
            </div>
          </div>

          {/* Account Connection Status */}
          <div className="bg-white rounded-xl p-4 border border-[#EFE7DC] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                สถานะการลงชื่อเข้าใช้ Google
              </span>
              {currentUser && (
                <button
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  ออกจากระบบ
                </button>
              )}
            </div>

            {currentUser ? (
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200/70">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Google User'}
                      className="w-10 h-10 rounded-full border border-stone-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                      {currentUser.displayName ? currentUser.displayName[0] : 'G'}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-stone-900 text-sm">
                      {currentUser.displayName || 'ผู้ใช้งาน Google'}
                    </div>
                    <div className="text-xs text-stone-500 font-mono">
                      {currentUser.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  เชื่อมต่อแล้ว
                </div>
              </div>
            ) : (
              <div className="text-center py-5 px-4 bg-stone-50/70 rounded-xl border border-dashed border-stone-300 space-y-3">
                <p className="text-xs text-stone-600 max-w-md mx-auto">
                  เข้าสู่ระบบด้วยบัญชี Google ที่มีสิทธิ์เข้าถึงโฟลเดอร์ "ตารางเวร" เพื่ออนุญาตให้ระบบสำรองข้อมูล
                </p>
                <div className="flex justify-center">
                  {/* Official Google Sign-in Button styling */}
                  <button
                    onClick={onSignIn}
                    className="inline-flex items-center gap-3 px-4 py-2 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg shadow-xs text-sm font-medium text-stone-700 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sync Controls & Options */}
          <div className="bg-white rounded-xl p-4 border border-[#EFE7DC] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-stone-900 text-sm">
                  ซิงค์อัตโนมัติเมื่อมีการบันทึกเวร (Auto-Sync)
                </div>
                <div className="text-xs text-stone-500">
                  เมื่อมีการแก้รหัสเวรในตาราง ระบบจะอัปเดตข้อมูลไปยัง Google Sheets ในเบื้องหลัง
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => onToggleAutoSync(e.target.checked)}
                  disabled={!currentUser}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006A4E] peer-disabled:opacity-50"></div>
              </label>
            </div>

            <hr className="border-[#EFE7DC]" />

            {/* Manual Sync Trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-stone-900 text-sm">
                  สำรองข้อมูลประจำเดือน {currentMonthThai}
                </div>
                <div className="text-xs text-stone-500">
                  ส่งออกตารางเวรทั้งหมดของเดือนปัจจุบันไปยัง Google Sheets ทันที
                </div>
              </div>
              <button
                onClick={() => {
                  if (!currentUser) {
                    onSignIn();
                  } else {
                    setShowConfirmSync(true);
                  }
                }}
                disabled={isSyncing}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#006A4E] hover:bg-[#00523C] text-white rounded-lg shadow-xs text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'กำลังส่งข้อมูล...' : 'สำรองข้อมูลทันที'}
              </button>
            </div>

            {/* Status alerts */}
            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMessage}</div>
              </div>
            )}

            {lastSyncResult && !errorMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    สำรองข้อมูลแท็บ <strong>{lastSyncResult.tabName}</strong> สำเร็จเมื่อ{' '}
                    {new Date(lastSyncResult.lastSynced).toLocaleTimeString('th-TH')}
                  </span>
                </div>
                {lastSyncResult.spreadsheetUrl && (
                  <a
                    href={lastSyncResult.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline shrink-0"
                  >
                    เปิดดูใน Sheet
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#F2EDE4] border-t border-[#E8DFC8] flex items-center justify-between text-xs text-stone-600">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-stone-500" />
            <span>เชื่อมต่อกับ Google Drive & Google Sheets API</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md font-medium transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>

      {/* Confirmation Dialog as MANDATED by workspace-integration skill */}
      {showConfirmSync && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-stone-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-900">
                  ยืนยันการสำรองข้อมูลไปยัง Google Sheet?
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  ระบบจะทำการเขียนหรืออัปเดตข้อมูลตารางเวรเดือน <strong>{currentMonthThai}</strong> ในแท็บชีตของสเปรดชีต{' '}
                  <strong>"{GOOGLE_SHEET_NAME}"</strong> ซึ่งอยู่ในโฟลเดอร์ <strong>"{GOOGLE_DRIVE_FOLDER_NAME}"</strong> บน Google Drive ของท่าน
                </p>
              </div>
            </div>

            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs text-stone-600 space-y-1">
              <div className="flex justify-between">
                <span>โฟลเดอร์:</span>
                <span className="font-semibold text-stone-800">{GOOGLE_DRIVE_FOLDER_NAME}</span>
              </div>
              <div className="flex justify-between">
                <span>ไฟล์ปลายทาง:</span>
                <span className="font-semibold text-stone-800">{GOOGLE_SHEET_NAME}</span>
              </div>
              <div className="flex justify-between">
                <span>แท็บเป้าหมาย:</span>
                <span className="font-semibold text-stone-800">{currentMonthThai}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmSync(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmAndSync}
                className="px-4 py-2 bg-[#006A4E] hover:bg-[#00523C] text-white rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer"
              >
                ยืนยันการสำรองข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
