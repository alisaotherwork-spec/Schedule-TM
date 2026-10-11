export type StaffCategory = 'technologist' | 'assistant' | 'part_time';

export type PositionAbbr = 'MT' | 'AMT' | 'Office' | 'Service';

export type RoomId = 'lab' | 'donor';

export interface Staff {
  id: string;
  thaiName: string;
  englishName: string; // Used for login e.g. "Alisa", "Krit", "Supaporn"
  category: StaffCategory;
  position: string;
  positionAbbr?: PositionAbbr; // MT, AMT, Office, Service
  room: RoomId | 'both';
  order: number;
  isActive: boolean;
  phone?: string;
  role?: 'super_admin' | 'sub_admin' | 'staff'; // Sub-admin assignment
  password?: string; // Sub-admin password
  mustChangePassword?: boolean; // True when created or reset, requires change on next login
}

export type ShiftPeriod = 'morning' | 'afternoon' | 'night' | 'other';

export interface ShiftType {
  id: string;
  code: string; // 1-4 characters e.g. "M", "E1", "MORN", "EVN1", "OFFF"
  name: string; // e.g. "เวรเช้า", "เวรบ่าย", "เวรดึก", "วันหยุด"
  period?: ShiftPeriod; // for backwards compatibility
  periods?: ShiftPeriod[]; // Multiple selection of periods! e.g. ['morning', 'afternoon']
  allowedPositions?: PositionAbbr[]; // e.g. ['MT'], ['AMT', 'Office', 'Service']
  timeRange: string; // e.g. "08:30 - 16:30", "16:30 - 00:30", "00:30 - 08:30"
  rate: number; // e.g. 750 (บาท)
  isOt: boolean;
  color: string; // background badge styling
  textColor?: string;
  borderColor?: string;
}

export interface MonthSchedule {
  id: string; // e.g. "lab_2026-10" or "donor_2026-10"
  roomId: RoomId;
  yearMonth: string; // "2026-10"
  assignments: Record<string, Record<number, string>>; // staffId -> day (1..31) -> shiftCode
  updatedAt: string;
  updatedBy: string;
}

export interface UserSession {
  englishName: string;
  thaiName?: string;
  isAdmin: boolean; // Super Admin (alisa)
  isSubAdmin?: boolean; // Sub Admin
  staffId?: string;
  category?: StaffCategory;
  position?: string;
}

export interface DailySummaryRow {
  dateStr: string; // e.g. "01/10/2569"
  day: number;
  staffName: string;
  staffId: string;
  position: string;
  category: StaffCategory;
  morningShift: string; // shiftCode or empty
  afternoonShift: string; // shiftCode or empty
  nightShift: string; // shiftCode or empty
  roomId: RoomId;
}

export interface OtClaimRow {
  staffName: string;
  workDate: string; // วันปฏิบัติงาน e.g. "05 ต.ค. 2569"
  timeRange: string; // ช่วงเวลาปฏิบัติงาน e.g. "16:30 - 00:30 น."
  shiftCode: string;
  shiftName: string;
  rate: number;
  day: number;
}
