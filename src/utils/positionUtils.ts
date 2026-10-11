import { Staff, ShiftType, PositionAbbr, StaffCategory } from '../types';

export interface PositionConfig {
  abbr: PositionAbbr;
  thaiTitle: string;
  category: StaffCategory;
  badgeClass: string;
  colorHex: string;
}

export const STANDARD_POSITIONS: Record<PositionAbbr, PositionConfig> = {
  MT: {
    abbr: 'MT',
    thaiTitle: 'นักเทคนิคการแพทย์',
    category: 'technologist',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    colorHex: '#059669',
  },
  AMT: {
    abbr: 'AMT',
    thaiTitle: 'ผู้ช่วยนักเทคนิคการแพทย์',
    category: 'assistant',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    colorHex: '#0284c7',
  },
  Office: {
    abbr: 'Office',
    thaiTitle: 'เจ้าหน้าที่ธุรการ',
    category: 'assistant',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-300',
    colorHex: '#7c3aed',
  },
  Service: {
    abbr: 'Service',
    thaiTitle: 'เจ้าหน้าที่ช่วยการบริการ',
    category: 'assistant',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    colorHex: '#d97706',
  },
};

export const ALL_POSITION_ABBRS: PositionAbbr[] = ['MT', 'AMT', 'Office', 'Service'];

/**
 * Derives the standard PositionAbbr from staff information.
 */
export function getStaffPositionAbbr(
  staff: Staff | { position?: string; category?: string; positionAbbr?: string } | null | undefined
): PositionAbbr {
  if (!staff) return 'MT';

  if (staff.positionAbbr && (ALL_POSITION_ABBRS as string[]).includes(staff.positionAbbr)) {
    return staff.positionAbbr as PositionAbbr;
  }

  const pos = (staff.position || '').toLowerCase();
  if (pos.includes('ผู้ช่วย') || pos.includes('amt') || pos.includes('assistant')) {
    return 'AMT';
  }
  if (pos.includes('ธุรการ') || pos.includes('office') || pos.includes('admin')) {
    return 'Office';
  }
  if (pos.includes('ช่วยการบริการ') || pos.includes('ช่วยบริการ') || pos.includes('service') || pos.includes('บริการ')) {
    return 'Service';
  }
  if (pos.includes('นักเทคนิค') || pos.includes('mt') || pos.includes('เทคนิค')) {
    return 'MT';
  }

  if (staff.category === 'technologist') return 'MT';
  return 'AMT';
}

/**
 * Checks whether a given shift type is allowed for a staff member based on their position abbreviation.
 */
export function isShiftAllowedForStaff(shift: ShiftType, staff: Staff | null | undefined): boolean {
  if (!staff) return true;
  // OFFF is always allowed for all staff
  if (shift.code === 'OFFF') return true;

  // If no specific positions restricted, allowed for all
  if (!shift.allowedPositions || shift.allowedPositions.length === 0) {
    return true;
  }

  const staffAbbr = getStaffPositionAbbr(staff);
  return shift.allowedPositions.includes(staffAbbr);
}
