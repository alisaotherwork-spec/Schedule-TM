export const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export const THAI_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export function formatYearMonthThai(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const thaiMonth = THAI_MONTHS[month - 1];
  const thaiYear = year + 543;
  return `${thaiMonth} พ.ศ. ${thaiYear}`;
}

export function formatThaiDate(day: number, yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const thaiMonthShort = THAI_MONTHS_SHORT[month - 1];
  const thaiYear = year + 543;
  const dayStr = String(day).padStart(2, '0');
  return `${dayStr} ${thaiMonthShort} ${thaiYear}`;
}

export function formatShortDateCol(day: number, yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  const thaiYear = (year + 543).toString().slice(-2);
  return `${dayStr}/${monthStr}/${thaiYear}`;
}

export function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

export function getDayOfWeek(yearMonth: string, day: number): number {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month - 1, day).getDay(); // 0 is Sunday, 6 is Saturday
}

export function isWeekend(yearMonth: string, day: number): boolean {
  const dow = getDayOfWeek(yearMonth, day);
  return dow === 0 || dow === 6;
}

export function getPreviousMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

export function getNextMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}
