import React, { useState, useRef } from 'react';
import { BackupSnapshot, MonthSchedule, Staff, ShiftType, UserSession } from '../types';
import {
  X,
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  Clock,
  Sparkles,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  HardDrive
} from 'lucide-react';
import { CuteAlien, CuteAstronaut, PaperStar } from './CuteSpaceDecorations';

interface RealtimeBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  backups: BackupSnapshot[];
  currentLabSchedule: MonthSchedule;
  currentDonorSchedule: MonthSchedule;
  staffList: Staff[];
  shiftTypes: ShiftType[];
  currentUser: UserSession | null;
  lastBackupTime: string | null;
  isSavingBackup: boolean;
  onTriggerManualBackup: (description?: string) => Promise<void>;
  onRestoreBackup: (snapshot: BackupSnapshot) => Promise<void>;
  onDeleteBackup: (backupId: string) => Promise<void>;
  onImportBackupJson: (data: any) => Promise<void>;
}

export const RealtimeBackupModal: React.FC<RealtimeBackupModalProps> = ({
  isOpen,
  onClose,
  backups = [],
  currentLabSchedule,
  currentDonorSchedule,
  staffList,
  shiftTypes,
  currentUser,
  lastBackupTime,
  isSavingBackup,
  onTriggerManualBackup,
  onRestoreBackup,
  onDeleteBackup,
  onImportBackupJson,
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<BackupSnapshot | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Trigger manual snapshot
  const handleCreateSnapshot = async () => {
    try {
      await onTriggerManualBackup(customNote.trim() || undefined);
      setCustomNote('');
      setNotice('สร้างจุดสำรองข้อมูล Real-time สำเร็จแล้ว');
      setTimeout(() => setNotice(null), 3000);
    } catch (e) {
      console.error(e);
      setNotice('เกิดข้อผิดพลาดในการสร้างจุดสำรองข้อมูล');
    }
  };

  // Restore confirmation
  const handleConfirmRestore = async () => {
    if (!selectedSnapshot) return;
    setIsRestoring(true);
    try {
      await onRestoreBackup(selectedSnapshot);
      setNotice(`กู้คืนข้อมูลจากจุด "${selectedSnapshot.description}" สำเร็จแล้ว`);
      setTimeout(() => setNotice(null), 4000);
      setSelectedSnapshot(null);
    } catch (err) {
      console.error(err);
      setNotice('เกิดข้อผิดพลาดในการกู้คืนข้อมูล');
    } finally {
      setIsRestoring(false);
    }
  };

  // Export full JSON backup
  const handleExportJson = () => {
    try {
      const backupPayload = {
        app: 'BloodBankDutyScheduleTUH',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser?.englishName || 'system',
        labSchedule: currentLabSchedule,
        donorSchedule: currentDonorSchedule,
        staffList,
        shiftTypes,
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `bloodbank_duty_backup_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setNotice('ส่งออกไฟล์สำรองข้อมูล JSON เรียบร้อยแล้ว');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      console.error(err);
      setNotice('เกิดข้อผิดพลาดในการส่งออกไฟล์สำรองข้อมูล');
    }
  };

  // Import JSON backup
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || (!parsed.labSchedule && !parsed.donorSchedule)) {
          alert('รูปแบบไฟล์ JSON ไม่ถูกต้องสำหรับระบบจัดตารางเวร');
          return;
        }
        await onImportBackupJson(parsed);
        setNotice('นำเข้าและกู้คืนข้อมูลจากไฟล์สำรองสำเร็จแล้ว');
        setTimeout(() => setNotice(null), 4000);
      } catch (err) {
        console.error('Import error:', err);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์สำรองข้อมูล JSON');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const getTriggerBadge = (type: string) => {
    switch (type) {
      case 'realtime_edit':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            ⚡ แก้ไขเวร Real-time
          </span>
        );
      case 'auto_schedule':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
            🪄 จัดเวรอัตโนมัติ
          </span>
        );
      case 'pre_clear':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            🛡️ จุดปลอดภัยก่อนล้างตาราง
          </span>
        );
      case 'staff_change':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            👥 ปรับปรุงรายชื่อ
          </span>
        );
      case 'shift_change':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-800 border border-violet-300">
            💰 ปรับค่าเวร
          </span>
        );
      case 'imported':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-300">
            📥 นำเข้าไฟล์
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-300">
            💾 สำรองโดยผู้ใช้
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[4px_6px_0px_rgba(70,60,50,0.18)] p-5 sm:p-6 overflow-hidden flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-[#F3ECE0] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#EFE7DC] shrink-0">
          <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-2xl shrink-0 shadow-xs">
            <ShieldCheck className="w-7 h-7 text-emerald-800" />
          </div>
          <div className="mr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-stone-800 font-['Prompt']">
                ระบบสำรองข้อมูลอัตโนมัติแบบ Real-time
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Real-time Active
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              บันทึกและซิงค์ข้อมูลบน Cloud Firestore ทันทีทุกครั้งที่มีการจัดหรือแก้ไขเวร พร้อมกู้คืนข้อมูลได้ตลอดเวลา
            </p>
          </div>
        </div>

        {/* Notice Toast */}
        {notice && (
          <div className="my-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2 animate-fadeIn shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Status Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-3 shrink-0 text-xs">
          {/* Layer 1: Firestore Realtime */}
          <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs flex items-start gap-2.5">
            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-700 shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-stone-800 flex items-center gap-1.5">
                <span>Cloud Firestore</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              </div>
              <p className="text-[11px] text-stone-500 leading-tight mt-0.5">
                ซิงค์แบบ Real-time ทุกการคลิกเปลี่ยนเวร
              </p>
            </div>
          </div>

          {/* Layer 2: Local Mirror */}
          <div className="p-3 bg-white rounded-xl border border-[#E7DFD5] shadow-xs flex items-start gap-2.5">
            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-700 shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-stone-800 flex items-center gap-1.5">
                <span>Local Offline Mirror</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              </div>
              <p className="text-[11px] text-stone-500 leading-tight mt-0.5">
                จำลองข้อมูลลงเครื่อง ปลอดภัยแม้อินเทอร์เน็ตหลุด
              </p>
            </div>
          </div>

          {/* Layer 3: Last Sync Time */}
          <div className="p-3 bg-white rounded-xl border border-[#E7DFD5] shadow-xs flex items-start gap-2.5">
            <div className="p-1.5 bg-sky-50 rounded-lg text-sky-700 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-stone-800">สำรองข้อมูลล่าสุด</div>
              <p className="text-[11px] text-stone-600 font-mono mt-0.5 truncate">
                {lastBackupTime || 'กำลังเชื่อมต่อแบบ Real-time...'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Backup & Export Bar */}
        <div className="p-3.5 bg-[#FAF5EC] rounded-xl border border-[#E7DFD5] mb-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px] flex items-center gap-2">
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="ระบุหมายเหตุจุดสำรอง (เช่น ก่อนแก้ไขเวรใหญ่, ปรับตารางใหม่)..."
              className="flex-1 px-3 py-1.5 bg-white border border-[#DACFBF] rounded-lg text-xs text-stone-800 focus:outline-hidden focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleCreateSnapshot}
              disabled={isSavingBackup}
              className="py-1.5 px-3 bg-[#4ADE80] hover:bg-[#22C55E] text-stone-900 text-xs font-bold rounded-lg border border-[#16A34A] shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSavingBackup ? 'กำลังบันทึก...' : 'สำรองข้อมูลทันที'}</span>
            </button>
          </div>

          {/* JSON Export and Import buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportJson}
              className="py-1.5 px-3 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="ดาวน์โหลดไฟล์ JSON สำรองเก็บไว้ในคอมพิวเตอร์"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span>ส่งออก JSON</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-1.5 px-3 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="นำเข้าไฟล์ JSON เพื่อกู้คืนตารางเวรทั้งหมด"
            >
              <Upload className="w-3.5 h-3.5 text-stone-600" />
              <span>นำเข้า JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Real-time Timeline List */}
        <div className="flex-1 flex flex-col min-h-0 border border-[#E7DFD5] rounded-xl bg-white overflow-hidden">
          <div className="px-3.5 py-2.5 bg-[#F7F2EA] border-b border-[#E7DFD5] flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-600" />
              ประวัติจุดสำรองข้อมูล Real-time ({backups.length} จุดล่าสุด)
            </span>
            <span className="text-[11px] text-stone-500">
              * ข้อมูลอัปเดตต่อเนื่องอัตโนมัติ
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {backups.length === 0 ? (
              <div className="p-8 text-center text-stone-400 text-xs flex flex-col items-center justify-center gap-2">
                <Database className="w-8 h-8 text-stone-300" />
                <span>ยังไม่มีประวัติจุดสำรองข้อมูล ระบบจะบันทึกอัตโนมัติเมื่อมีการแก้ไขเวร</span>
              </div>
            ) : (
              backups.map((b) => (
                <div
                  key={b.id}
                  className="p-3 sm:px-4 flex flex-wrap items-center justify-between gap-3 hover:bg-amber-50/40 transition-colors text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-stone-800">{b.formattedDateThai}</span>
                      {getTriggerBadge(b.triggerType)}
                      <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded-md">
                        โดย @{b.updatedBy || 'system'}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-600 flex items-center gap-2 flex-wrap">
                      <span>{b.description}</span>
                      <span>•</span>
                      <span>เดือน: {b.yearMonth}</span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-700">
                        รวมเวรที่จัด: {b.dutyCount} เวร
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedSnapshot(b)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="กู้คืนข้อมูลตารางเวรกลับมาเป็นจุดเวลานี้"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                      <span>กู้คืนจุดนี้</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteBackup(b.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="ลบจุดสำรองนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Restore Confirmation Dialog */}
        {selectedSnapshot && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fadeIn">
            <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-lg p-5 max-w-md w-full animate-scaleUp">
              <div className="flex items-center gap-2.5 text-amber-800 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <h4 className="text-sm font-bold">ยืนยันการกู้คืนข้อมูลตารางเวร</h4>
              </div>
              <p className="text-xs text-stone-600 mb-2 leading-relaxed">
                คุณกำลังจะกู้คืนตารางเวรกลับไปเป็นจุดสำรองเวลา:
              </p>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 mb-4 space-y-1">
                <div className="font-bold">{selectedSnapshot.formattedDateThai}</div>
                <div>{selectedSnapshot.description}</div>
                <div className="text-[11px] text-amber-800">
                  ประจำเดือน: {selectedSnapshot.yearMonth} • รวมเวร: {selectedSnapshot.dutyCount} เวร
                </div>
              </div>
              <p className="text-[11px] text-stone-500 mb-4">
                * ระบบจะบันทึกสถานะปัจจุบันไว้เป็นจุดสำรองอัตโนมัติก่อนกู้คืน เพื่อให้สามารถย้อนกลับได้เสมอ
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSnapshot(null)}
                  disabled={isRestoring}
                  className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  disabled={isRestoring}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isRestoring ? 'กำลังกู้คืนข้อมูล...' : 'ยืนยันกู้คืน'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
