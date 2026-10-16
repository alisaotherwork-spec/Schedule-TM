import { Staff, ShiftType, MonthSchedule } from '../types';
import { getDaysInMonth, getDayOfWeek, THAI_MONTHS, THAI_MONTHS_SHORT } from '../utils/dateUtils';

export const GOOGLE_DRIVE_FOLDER_ID = '1t4qGffGkG9cs95IVEOuZRS9-00rzRulo';
export const GOOGLE_DRIVE_FOLDER_NAME = 'ตารางเวร';
export const GOOGLE_SHEET_NAME = 'ตารางเวร-สำรอง';
export const GOOGLE_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}`;

export interface SyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  tabName: string;
  lastSynced: string;
  folderUrl: string;
}

/**
 * Checks if the destination Google Drive folder exists and is accessible.
 */
export async function checkDriveFolder(accessToken: string): Promise<{ id: string; name: string; webViewLink?: string }> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${GOOGLE_DRIVE_FOLDER_ID}?fields=id,name,webViewLink`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`ไม่พบโฟลเดอร์ Google Drive ID: ${GOOGLE_DRIVE_FOLDER_ID}`);
    }
    const errText = await res.text();
    console.warn('Drive folder check warning:', errText);
    return {
      id: GOOGLE_DRIVE_FOLDER_ID,
      name: GOOGLE_DRIVE_FOLDER_NAME,
      webViewLink: GOOGLE_DRIVE_FOLDER_URL,
    };
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name || GOOGLE_DRIVE_FOLDER_NAME,
    webViewLink: data.webViewLink || GOOGLE_DRIVE_FOLDER_URL,
  };
}

/**
 * Searches for the spreadsheet "ตารางเวร-สำรอง" in the specified folder.
 * If not found, creates it inside that folder.
 */
export async function findOrCreateBackupSpreadsheet(
  accessToken: string
): Promise<{ id: string; name: string; webViewLink: string }> {
  // Query inside the folder
  const query = `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and name = '${GOOGLE_SHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const existing = searchData.files[0];
      return {
        id: existing.id,
        name: existing.name,
        webViewLink: existing.webViewLink || `https://docs.google.com/spreadsheets/d/${existing.id}/edit`,
      };
    }
  }

  // Not found in folder, attempt to search anywhere in Drive by name as backup check
  const broadQuery = `name = '${GOOGLE_SHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const broadSearchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    broadQuery
  )}&fields=files(id,name,webViewLink,parents)`;

  const broadRes = await fetch(broadSearchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (broadRes.ok) {
    const broadData = await broadRes.json();
    if (broadData.files && broadData.files.length > 0) {
      const existing = broadData.files[0];
      return {
        id: existing.id,
        name: existing.name,
        webViewLink: existing.webViewLink || `https://docs.google.com/spreadsheets/d/${existing.id}/edit`,
      };
    }
  }

  // Create new spreadsheet inside the designated folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: GOOGLE_SHEET_NAME,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [GOOGLE_DRIVE_FOLDER_ID],
    }),
  });

  if (!createRes.ok) {
    // If parents failed (permission restrictions on shared folder), try creating without parents
    const fallbackCreate = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: GOOGLE_SHEET_NAME,
        mimeType: 'application/vnd.google-apps.spreadsheet',
      }),
    });

    if (!fallbackCreate.ok) {
      const err = await fallbackCreate.text();
      throw new Error(`ไม่สามารถสร้าง Google Sheet ได้: ${err}`);
    }

    const created = await fallbackCreate.json();
    return {
      id: created.id,
      name: created.name || GOOGLE_SHEET_NAME,
      webViewLink: created.webViewLink || `https://docs.google.com/spreadsheets/d/${created.id}/edit`,
    };
  }

  const created = await createRes.json();
  return {
    id: created.id,
    name: created.name || GOOGLE_SHEET_NAME,
    webViewLink: created.webViewLink || `https://docs.google.com/spreadsheets/d/${created.id}/edit`,
  };
}

/**
 * Formats full calendar matrix for a given month and schedules.
 */
export function buildMonthCalendarMatrix(
  yearMonth: string,
  labSchedule: MonthSchedule | null,
  donorSchedule: MonthSchedule | null,
  staffList: Staff[],
  shiftTypes: ShiftType[]
): (string | number)[][] {
  const daysInMonth = getDaysInMonth(yearMonth);
  const [yStr, mStr] = yearMonth.split('-');
  const monthIndex = parseInt(mStr, 10) - 1;
  const year = parseInt(yStr, 10);
  const monthName = THAI_MONTHS[monthIndex] || '';
  const yearThai = year + 543;
  const titleMonth = `${monthName} พ.ศ. ${yearThai}`;

  const matrix: (string | number)[][] = [];

  // Header Banner
  matrix.push([`ตารางเวรกลุ่มงานเวชศาสตร์บริการโลหิต ประจำเดือน ${titleMonth}`]);
  matrix.push([`สำรองข้อมูลจากระบบตารางเวร ณ วันที่ ${new Date().toLocaleString('th-TH')}`]);
  matrix.push([]); // blank row

  // Helper to build a room section
  const buildRoomSection = (roomName: string, schedule: MonthSchedule | null) => {
    matrix.push([`=== ${roomName} ===`]);

    // Row 1 of Table: Headers
    const headerRow: (string | number)[] = ['ลำดับ', 'ชื่อ - สกุล', 'ตำแหน่ง'];
    for (let d = 1; d <= daysInMonth; d++) {
      headerRow.push(d);
    }
    headerRow.push('รวมเวร (ผลัด)');
    matrix.push(headerRow);

    // Row 2 of Table: Days of week in Thai
    const dayOfWeekRow: (string | number)[] = ['', '', ''];
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = getDayOfWeek(yearMonth, d);
      dayOfWeekRow.push(dow);
    }
    dayOfWeekRow.push('');
    matrix.push(dayOfWeekRow);

    // Filter staff belonging to or having shifts in this room
    const isLab = roomName.includes('แลป') || roomName.includes('Lab');
    const targetRoom = isLab ? 'lab' : 'donor';
    const roomStaff = staffList.filter((s) => s.isActive && (s.room === 'both' || s.room === targetRoom));

    const dailyDutyCounts: number[] = new Array(daysInMonth).fill(0);

    // Rows for each staff member
    roomStaff.forEach((staff, idx) => {
      const row: (string | number)[] = [idx + 1, staff.thaiName, staff.position || '-'];
      let staffTotalShifts = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const code = schedule?.assignments?.[staff.id]?.[d] || '';
        row.push(code);
        if (code && code !== 'OFFF') {
          staffTotalShifts++;
          dailyDutyCounts[d - 1]++;
        }
      }

      row.push(staffTotalShifts);
      matrix.push(row);
    });

    // Summary Row: Total duties per day
    const summaryRow: (string | number)[] = ['รวม', 'รวมเวรปฏิบัติงานประจำวัน', ''];
    let grandTotal = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      summaryRow.push(dailyDutyCounts[d - 1]);
      grandTotal += dailyDutyCounts[d - 1];
    }
    summaryRow.push(grandTotal);
    matrix.push(summaryRow);
    matrix.push([]); // blank row separator
  };

  // Section 1: ห้องปฏิบัติการชันสูตร (Lab)
  buildRoomSection('ห้องปฏิบัติการชันสูตร (Lab)', labSchedule);

  // Section 2: ห้องรับบริจาคโลหิต (Donor)
  buildRoomSection('ห้องรับบริจาคโลหิต (Donor)', donorSchedule);

  // Section 3: Shift Legends & Info
  matrix.push(['=== คำอธิบายรหัสเวรและอัตราค่าตอบแทน ===']);
  matrix.push(['รหัสเวร', 'ชื่อเวร', 'ช่วงเวลาปฏิบัติงาน', 'ค่าตอบแทน (บาท)', 'นับเป็นเวร OT']);
  shiftTypes.forEach((st) => {
    matrix.push([
      st.code,
      st.name,
      st.timeRange || '-',
      st.rate > 0 ? st.rate : '-',
      st.isOt ? 'ใช่ (OT)' : 'ไม่ใช่',
    ]);
  });

  return matrix;
}

/**
 * Synchronizes the current month's schedule to Google Sheets in "ตารางเวร-สำรอง".
 * If the month tab exists, it overwrites with the latest data.
 * If not, it creates a new tab with the month name.
 */
export async function syncScheduleToGoogleSheet(
  accessToken: string,
  yearMonth: string,
  labSchedule: MonthSchedule | null,
  donorSchedule: MonthSchedule | null,
  staffList: Staff[],
  shiftTypes: ShiftType[]
): Promise<SyncResult> {
  // 1. Find or create the backup spreadsheet
  const sheetMeta = await findOrCreateBackupSpreadsheet(accessToken);
  const spreadsheetId = sheetMeta.id;

  // Format tab name: e.g. "ต.ค. 2569" or "2026-10"
  const [yStr, mStr] = yearMonth.split('-');
  const monthIndex = parseInt(mStr, 10) - 1;
  const year = parseInt(yStr, 10);
  const monthShort = THAI_MONTHS_SHORT[monthIndex] || '';
  const yearThai = year + 543;
  const tabName = `${monthShort} ${yearThai}`;

  // 2. Check existing sheets in the spreadsheet
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`ไม่สามารถอ่านข้อมูล Google Sheet ได้: ${errText}`);
  }

  const metaData = await metaRes.json();
  const existingSheets = metaData.sheets || [];
  const hasTab = existingSheets.some(
    (s: any) => s.properties?.title === tabName
  );

  // 3. If tab does not exist, create it
  if (!hasTab) {
    const addSheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: tabName,
                  gridProperties: {
                    rowCount: 120,
                    columnCount: 45,
                  },
                },
              },
            },
          ],
        }),
      }
    );

    if (!addSheetRes.ok) {
      console.warn('Could not add new sheet tab, might already exist or rename:', await addSheetRes.text());
    }
  }

  // 4. Clear the sheet range
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
      tabName
    )}'!A1:ZZ120:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  // 5. Build matrix and write values
  const matrix = buildMonthCalendarMatrix(
    yearMonth,
    labSchedule,
    donorSchedule,
    staffList,
    shiftTypes
  );

  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(
      tabName
    )}'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `'${tabName}'!A1`,
        majorDimension: 'ROWS',
        values: matrix,
      }),
    }
  );

  if (!writeRes.ok) {
    const errText = await writeRes.text();
    throw new Error(`บันทึกข้อมูลลง Google Sheet ไม่สำเร็จ: ${errText}`);
  }

  const result: SyncResult = {
    spreadsheetId,
    spreadsheetUrl: sheetMeta.webViewLink,
    tabName,
    lastSynced: new Date().toISOString(),
    folderUrl: GOOGLE_DRIVE_FOLDER_URL,
  };

  // Cache last sync metadata
  try {
    localStorage.setItem('bloodbank_last_drive_sync', JSON.stringify(result));
  } catch {}

  return result;
}
