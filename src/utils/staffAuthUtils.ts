import { Staff } from '../types';

export const THAI_PREFIXES = [
  'ทนพญ.', 'ทนพ.', 'ทนพญ', 'ทนพ',
  'นางสาว', 'น.ส.', 'นส.', 'นาง', 'นาย',
  'พนักงาน', 'จนท.', 'ผช.', 'ดร.', 'ศ.', 'ผศ.', 'รศ.', 'นพ.', 'พญ.', 'อาจารย์'
];

/**
 * Remove Thai prefixes/honorifics from name string
 * e.g. "ทนพญ.ณิชาภา เจียมจรรยา" -> "ณิชาภา เจียมจรรยา"
 *      "นางสาวสิริยากร สร้อยมั่น" -> "สิริยากร สร้อยมั่น"
 *      "นายกฤษรักษ์ นักผูก" -> "กฤษรักษ์ นักผูก"
 */
export function cleanThaiPrefix(name: string): string {
  let cleaned = (name || '').trim();
  // Normalize whitespace after dot if present, e.g. "ทนพญ. ณิชาภา" -> "ทนพญ.ณิชาภา"
  cleaned = cleaned.replace(/^([^\s]+)\.\s+/, '$1.');
  for (const prefix of THAI_PREFIXES) {
    if (cleaned.startsWith(prefix)) {
      cleaned = cleaned.substring(prefix.length).trim();
      break;
    }
  }
  return cleaned;
}

/**
 * Check if the input corresponds to the Super Admin (Alisa / อลิษา)
 */
export function isSuperAdminInput(input: string, staffList: Staff[]): boolean {
  const raw = (input || '').trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  const cleaned = cleanThaiPrefix(raw);

  if (
    lower === 'alisa' ||
    lower.startsWith('alisa') ||
    cleaned === 'อลิษา' ||
    cleaned.startsWith('อลิษา') ||
    raw.includes('อลิษา')
  ) {
    return true;
  }

  // Also check against staff list entry for alisa
  const staff = staffList.find(s => (s.englishName || '').toLowerCase() === 'alisa');
  if (staff) {
    const sCleaned = cleanThaiPrefix(staff.thaiName || '');
    if (
      cleaned === sCleaned ||
      raw === staff.thaiName ||
      lower === (staff.englishName || '').toLowerCase()
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Robust matching to find staff by Thai name, English name, prefix variations, or partial name
 */
export function findStaffByNameOrEnglish(input: string, staffList: Staff[]): Staff | null {
  const rawTrimmed = (input || '').trim();
  if (!rawTrimmed) return null;

  const rawLower = rawTrimmed.toLowerCase();
  const cleanedInput = cleanThaiPrefix(rawTrimmed);
  const cleanedInputLower = cleanedInput.toLowerCase();

  // 1. Exact match on raw englishName (case-insensitive) or raw thaiName
  let match = staffList.find(s =>
    (s.englishName || '').toLowerCase() === rawLower ||
    (s.thaiName || '').trim() === rawTrimmed
  );
  if (match) return match;

  // 2. Exact match after stripping Thai prefix from both input & staff thaiName
  match = staffList.find(s => {
    const sCleanedThai = cleanThaiPrefix(s.thaiName || '');
    return (
      sCleanedThai === cleanedInput ||
      sCleanedThai.toLowerCase() === cleanedInputLower ||
      (s.englishName || '').toLowerCase() === cleanedInputLower
    );
  });
  if (match) return match;

  // 3. Match on first name (first word before space) of Thai name or English name
  match = staffList.find(s => {
    const sCleanedThai = cleanThaiPrefix(s.thaiName || '');
    const sThaiFirstName = (sCleanedThai.split(/\s+/)[0] || '').trim();
    const inputThaiFirstName = (cleanedInput.split(/\s+/)[0] || '').trim();

    const sEngFirst = ((s.englishName || '').toLowerCase().split(/\s+/)[0] || '').trim();
    const inputEngFirst = (rawLower.split(/\s+/)[0] || '').trim();

    if (inputThaiFirstName && sThaiFirstName && sThaiFirstName === inputThaiFirstName) return true;
    if (inputEngFirst && sEngFirst && sEngFirst === inputEngFirst) return true;
    return false;
  });
  if (match) return match;

  // 4. StartsWith match (Thai name with/without prefix, or English name)
  match = staffList.find(s => {
    const sCleanedThai = cleanThaiPrefix(s.thaiName || '');
    return (
      (s.englishName || '').toLowerCase().startsWith(rawLower) ||
      (s.englishName || '').toLowerCase().startsWith(cleanedInputLower) ||
      sCleanedThai.startsWith(cleanedInput) ||
      (s.thaiName || '').startsWith(rawTrimmed)
    );
  });
  if (match) return match;

  // 5. Substring / Includes match
  match = staffList.find(s => {
    const sCleanedThai = cleanThaiPrefix(s.thaiName || '');
    return (
      (s.englishName || '').toLowerCase().includes(rawLower) ||
      (s.thaiName || '').includes(rawTrimmed) ||
      sCleanedThai.includes(cleanedInput)
    );
  });
  return match || null;
}

/**
 * Filter staff list for autocomplete suggestions based on query in Thai or English
 */
export function filterStaffSuggestions(query: string, staffList: Staff[], limit = 6): Staff[] {
  const rawTrimmed = (query || '').trim();
  if (!rawTrimmed) return [];

  const rawLower = rawTrimmed.toLowerCase();
  const cleanedInput = cleanThaiPrefix(rawTrimmed);

  const results: Staff[] = [];
  const addedIds = new Set<string>();

  const add = (s: Staff) => {
    if (!addedIds.has(s.id)) {
      addedIds.add(s.id);
      results.push(s);
    }
  };

  // Tier 1: exact matches
  staffList.forEach(s => {
    const sCleaned = cleanThaiPrefix(s.thaiName || '');
    if (
      (s.englishName || '').toLowerCase() === rawLower ||
      (s.thaiName || '').trim() === rawTrimmed ||
      sCleaned === cleanedInput
    ) {
      add(s);
    }
  });

  // Tier 2: startsWith matches
  if (results.length < limit) {
    staffList.forEach(s => {
      const sCleaned = cleanThaiPrefix(s.thaiName || '');
      if (
        (s.englishName || '').toLowerCase().startsWith(rawLower) ||
        sCleaned.startsWith(cleanedInput) ||
        (s.thaiName || '').startsWith(rawTrimmed)
      ) {
        add(s);
      }
    });
  }

  // Tier 3: includes matches
  if (results.length < limit) {
    staffList.forEach(s => {
      const sCleaned = cleanThaiPrefix(s.thaiName || '');
      if (
        (s.englishName || '').toLowerCase().includes(rawLower) ||
        (s.thaiName || '').includes(rawTrimmed) ||
        sCleaned.includes(cleanedInput)
      ) {
        add(s);
      }
    });
  }

  return results.slice(0, limit);
}
