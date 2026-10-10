import React, { useState } from 'react';
import { Staff, StaffCategory, RoomId, UserSession } from '../types';
import { X, UserPlus, Trash2, Edit2, Check, Shield, Key, RotateCcw } from 'lucide-react';
import { CuteAlien, PaperStar } from './CuteSpaceDecorations';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  currentUser: UserSession | null;
  onSaveStaff: (staff: Staff) => Promise<void>;
  onDeleteStaff: (staffId: string) => Promise<void>;
  onResetSubAdminPassword?: (staffId: string) => Promise<void>;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  staffList,
  currentUser,
  onSaveStaff,
  onDeleteStaff,
  onResetSubAdminPassword,
}) => {
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [thaiName, setThaiName] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [category, setCategory] = useState<StaffCategory>('technologist');
  const [position, setPosition] = useState('');
  const [room, setRoom] = useState<RoomId | 'both'>('both');
  const [isActive, setIsActive] = useState(true);
  const [isSubAdminRole, setIsSubAdminRole] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const isSuperAdmin = currentUser?.isAdmin;

  const handleStartAdd = () => {
    setEditingStaff({
      id: `staff-${Date.now()}`,
      thaiName: '',
      englishName: '',
      category: 'technologist',
      position: 'นักเทคนิคการแพทย์ปฏิบัติการ',
      room: 'both',
      order: staffList.length + 1,
      isActive: true,
      role: 'staff',
    });
    setThaiName('');
    setEnglishName('');
    setCategory('technologist');
    setPosition('นักเทคนิคการแพทย์ปฏิบัติการ');
    setRoom('both');
    setIsActive(true);
    setIsSubAdminRole(false);
    setError('');
    setNotice(null);
  };

  const handleStartEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setThaiName(staff.thaiName);
    setEnglishName(staff.englishName);
    setCategory(staff.category);
    setPosition(staff.position);
    setRoom(staff.room);
    setIsActive(staff.isActive);
    setIsSubAdminRole(staff.role === 'sub_admin');
    setError('');
    setNotice(null);
  };

  const handleCancelForm = () => {
    setEditingStaff(null);
    setError('');
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thaiName.trim() || !englishName.trim()) {
      setError('กรุณากรอกทั้งชื่อไทย และชื่อภาษาอังกฤษ');
      return;
    }

    setIsSaving(true);
    try {
      // Determine role: Only Super Admin can change someone to sub_admin or staff
      let role = editingStaff?.role || 'staff';
      let password = editingStaff?.password;
      let mustChangePassword = editingStaff?.mustChangePassword;

      if (isSuperAdmin) {
        if (editingStaff?.englishName.toLowerCase() === 'alisa') {
          role = 'super_admin';
        } else {
          if (isSubAdminRole) {
            role = 'sub_admin';
            // If newly assigned as sub-admin or has no password, default to 1234 and require change on first login
            if (!password || editingStaff?.role !== 'sub_admin') {
              password = '1234';
              mustChangePassword = true;
            }
          } else {
            role = 'staff';
          }
        }
      } else {
        // Sub-admin cannot change anyone's admin status
        role = editingStaff?.role || 'staff';
        password = editingStaff?.password;
        mustChangePassword = editingStaff?.mustChangePassword;
      }

      const staffToSave: Staff = {
        id: editingStaff?.id || `staff-${Date.now()}`,
        thaiName: thaiName.trim(),
        englishName: englishName.trim(),
        category,
        position: position.trim() || 'เจ้าหน้าที่งานบริการโลหิต',
        room,
        order: editingStaff?.order || staffList.length + 1,
        isActive,
        role,
        password,
        mustChangePassword,
      };

      await onSaveStaff(staffToSave);
      setEditingStaff(null);
      setNotice('บันทึกข้อมูลเจ้าหน้าที่เรียบร้อยแล้ว');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (staffId: string, name: string) => {
    if (confirm(`คุณต้องการลบ "${name}" ออกจากรายชื่อเจ้าหน้าที่หรือไม่?`)) {
      try {
        await onDeleteStaff(staffId);
        setNotice(`ลบ "${name}" สำเร็จแล้ว`);
        setTimeout(() => setNotice(null), 3000);
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการลบ');
      }
    }
  };

  const handleResetPassword = async (staffId: string, name: string) => {
    if (
      confirm(
        `คุณต้องการรีเซ็ตรหัสผ่านของผู้ดูแลระบบย่อย "${name}" กลับเป็น "1234" และบังคับเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งถัดไปหรือไม่?`
      )
    ) {
      try {
        if (onResetSubAdminPassword) {
          await onResetSubAdminPassword(staffId);
          setNotice(`รีเซ็ตรหัสผ่านของ "${name}" กลับเป็น 1234 สำเร็จแล้ว`);
          setTimeout(() => setNotice(null), 4000);
        }
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน');
      }
    }
  };

  const getCategoryLabel = (cat: StaffCategory) => {
    switch (cat) {
      case 'technologist':
        return '1. นักเทคนิคการแพทย์';
      case 'assistant':
        return '2. ผู้ช่วยฯ / ธุรการ / ช่วยบริการ';
      case 'part_time':
        return '3. เจ้าหน้าที่ Part-time';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#FFFDF9] rounded-2xl border-2 border-[#E7DFD5] shadow-[4px_6px_0px_rgba(70,60,50,0.18)] p-6 overflow-hidden flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-[#F3ECE0] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EFE7DC] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FBF0D9] border border-[#ECD9BA] rounded-xl shrink-0">
              <CuteAlien size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2 font-['Prompt']">
                จัดการรายชื่อเจ้าหน้าที่ (Staff Management)
              </h2>
              <p className="text-xs text-stone-500">
                เพิ่ม ลบ แก้ไข รายชื่อ 3 หมวดหมู่ {isSuperAdmin ? '• กำหนดสิทธิ์ผู้ดูแลระบบย่อย' : ''}
              </p>
            </div>
          </div>
          {!editingStaff && (
            <button
              onClick={handleStartAdd}
              className="mr-8 py-2 px-3.5 bg-[#4ADE80] hover:bg-[#22C55E] text-stone-900 text-xs font-semibold rounded-xl border border-[#16A34A] shadow-[1px_2px_0px_rgba(70,60,50,0.15)] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>เพิ่มเจ้าหน้าที่ใหม่</span>
            </button>
          )}
        </div>

        {/* Notification Toast */}
        {notice && (
          <div className="my-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2 animate-fadeIn shrink-0">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{notice}</span>
          </div>
        )}

        {/* Edit or Add Form */}
        {editingStaff && (
          <form onSubmit={handleSubmit} className="p-4 my-3 bg-[#FAF5EC] border-2 border-[#E7DFD5] rounded-xl space-y-3 shrink-0">
            <div className="flex items-center justify-between border-b border-[#E8DEC8] pb-2">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <PaperStar size={16} />
                {editingStaff.id.startsWith('staff-') && !staffList.find(s => s.id === editingStaff.id)
                  ? 'เพิ่มรายชื่อเจ้าหน้าที่ใหม่'
                  : `แก้ไขข้อมูล: ${editingStaff.thaiName}`}
              </span>
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  ชื่อ-นามสกุล (ภาษาไทย)*
                </label>
                <input
                  type="text"
                  value={thaiName}
                  onChange={(e) => setThaiName(e.target.value)}
                  placeholder="เช่น ทนพญ. สุภาพร เกียรติอนันต์"
                  className="w-full px-3 py-2 bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  ชื่อจริงภาษาอังกฤษ (English Name - สำหรับล็อกอิน)*
                </label>
                <input
                  type="text"
                  value={englishName}
                  onChange={(e) => setEnglishName(e.target.value)}
                  placeholder="เช่น Supaporn"
                  className="w-full px-3 py-2 bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  กลุ่มบุคลากร (เรียงลำดับในตาราง)*
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as StaffCategory)}
                  className="w-full px-3 py-2 bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-500"
                >
                  <option value="technologist">1. นักเทคนิคการแพทย์ (MT)</option>
                  <option value="assistant">2. พนักงานผู้ช่วยฯ / ธุรการ / ช่วยการบริการ</option>
                  <option value="part_time">3. เจ้าหน้าที่ Part-time</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  ตำแหน่ง / สายงาน
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="เช่น นักเทคนิคการแพทย์ปฏิบัติการ"
                  className="w-full px-3 py-2 bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  ห้องปฏิบัติงานหลัก
                </label>
                <select
                  value={room}
                  onChange={(e) => setRoom(e.target.value as RoomId | 'both')}
                  className="w-full px-3 py-2 bg-white border border-[#DACFBF] rounded-lg focus:outline-hidden focus:border-amber-500"
                >
                  <option value="both">ทั้ง 2 ห้อง (ปฏิบัติการ + รับบริจาค)</option>
                  <option value="lab">เฉพาะ ห้องปฏิบัติการ (Lab)</option>
                  <option value="donor">เฉพาะ ห้องรับบริจาค (Donor Room)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-sm cursor-pointer"
                />
                <label htmlFor="isActiveCheck" className="font-semibold text-stone-700 cursor-pointer">
                  เปิดใช้งานในตารางเวร (Active)
                </label>
              </div>
            </div>

            {/* Sub-Admin Role Assignment (Only Super Admin can assign/revoke) */}
            {isSuperAdmin && editingStaff.englishName.toLowerCase() !== 'alisa' && (
              <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="subAdminRoleCheck"
                    checked={isSubAdminRole}
                    onChange={(e) => setIsSubAdminRole(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded-sm cursor-pointer"
                  />
                  <label
                    htmlFor="subAdminRoleCheck"
                    className="text-xs font-bold text-indigo-950 cursor-pointer flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    แต่งตั้งเป็นผู้ดูแลระบบย่อย (Sub-Admin)
                  </label>
                </div>
                <p className="text-[11px] text-indigo-700 pl-6">
                  ผู้ดูแลระบบย่อยสามารถเพิ่ม/ลบเจ้าหน้าที่ และแก้ไขค่าเวรได้ รหัสผ่านเริ่มต้นคือ <strong>1234</strong> (บังคับเปลี่ยนรหัสผ่านเมื่อเข้าใช้งานครั้งแรก)
                </p>
              </div>
            )}

            {!isSuperAdmin && editingStaff.role === 'sub_admin' && (
              <div className="p-2.5 bg-stone-100 rounded-lg text-[11px] text-stone-600 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>เจ้าหน้าที่ท่านนี้เป็นผู้ดูแลระบบย่อย (เฉพาะผู้ดูแลระบบสูงสุดเท่านั้นที่สามารถเปลี่ยนสิทธิ์ได้)</span>
              </div>
            )}

            {error && <p className="text-xs text-rose-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200 rounded-lg cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 text-xs bg-[#F28C38] hover:bg-[#E57A24] text-white font-medium rounded-lg border border-[#D56B16] shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Staff Table List */}
        <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-4">
          {(['technologist', 'assistant', 'part_time'] as StaffCategory[]).map((cat) => {
            const list = staffList.filter((s) => s.category === cat);
            return (
              <div key={cat} className="border border-[#E7DFD5] rounded-xl overflow-hidden bg-white">
                <div className="px-3.5 py-2 bg-[#F7F2EA] border-b border-[#E7DFD5] flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">
                    {getCategoryLabel(cat)} ({list.length} คน)
                  </span>
                </div>
                <div className="divide-y divide-stone-100">
                  {list.length === 0 ? (
                    <div className="p-3 text-xs text-stone-400 text-center">ไม่มีรายชื่อในหมวดนี้</div>
                  ) : (
                    list.map((staff) => {
                      const isSuper = staff.englishName.toLowerCase() === 'alisa';
                      const isSub = staff.role === 'sub_admin';

                      return (
                        <div
                          key={staff.id}
                          className="px-3.5 py-2.5 flex items-center justify-between hover:bg-amber-50/40 transition-colors text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold text-stone-800 flex items-center gap-2">
                              <span>{staff.thaiName}</span>
                              <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-md">
                                @{staff.englishName}
                              </span>

                              {isSuper && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded-md border border-amber-300 font-bold flex items-center gap-0.5">
                                  <Shield className="w-2.5 h-2.5 text-amber-700" /> Super Admin
                                </span>
                              )}

                              {isSub && !isSuper && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-900 rounded-md border border-indigo-300 font-bold flex items-center gap-0.5">
                                  <Shield className="w-2.5 h-2.5 text-indigo-600" /> ผู้ดูแลระบบย่อย
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500 flex items-center gap-2">
                              <span>{staff.position}</span>
                              <span>•</span>
                              <span>
                                ห้อง: {staff.room === 'both' ? 'ทั้ง 2 ห้อง' : staff.room === 'lab' ? 'ห้องปฏิบัติการ' : 'ห้องรับบริจาค'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Reset Password button for Sub-Admin (visible to Super Admin) */}
                            {isSuperAdmin && isSub && !isSuper && (
                              <button
                                onClick={() => handleResetPassword(staff.id, staff.thaiName)}
                                className="px-2.5 py-1 text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                title="รีเซ็ตรหัสผ่านกลับเป็น 1234 และบังคับเปลี่ยนใหม่เมื่อล็อกอิน"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-700" />
                                <span>รีเซ็ตรหัสผ่าน</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleStartEdit(staff)}
                              className="p-1.5 text-stone-600 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete restriction: Cannot delete alisa; Sub-admin cannot delete other Sub-admins */}
                            {!isSuper && (isSuperAdmin || !isSub) && (
                              <button
                                onClick={() => handleDelete(staff.id, staff.thaiName)}
                                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="ลบรายชื่อ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-[#EFE7DC] text-[11px] text-stone-500 flex items-center justify-between shrink-0">
          <span>รวมเจ้าหน้าที่ทั้งหมด {staffList.length} ท่าน</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#E8DEC8] hover:bg-[#DCD1BA] text-stone-800 font-medium rounded-lg text-xs cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
