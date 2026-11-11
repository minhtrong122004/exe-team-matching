import * as XLSX from 'xlsx';
import type { FapStudentItem } from '../types/space';

const SPREADSHEET_NS = 'urn:schemas-microsoft-com:office:spreadsheet';
const CSV_HEADER = 'studentCode,email,fullName,major,cohort,classCode';

/** Ngành theo tiền tố MSSV, cùng quy tắc với User Service (BR-04). */
const majorFromStudentCode = (studentCode: string): string => {
  const code = studentCode.toUpperCase();
  if (/^(SE|HE|QE|CE|DE)/.test(code)) return 'SE';
  if (code.startsWith('AI')) return 'AI';
  if (code.startsWith('IA')) return 'IA';
  if (/^(GD|HA|SA|CA)/.test(code)) return 'GD';
  if (/^(MKT|MK|MC)/.test(code)) return 'MKT';
  if (/^(IB|HS|SS|CS|BA)/.test(code)) return 'IB';
  return 'SE';
};

/** Khóa theo 2 chữ số đầu của MSSV, ví dụ SE190218 → K19 (BR-04). */
const cohortFromStudentCode = (studentCode: string): string => {
  const match = /^[A-Za-z]*(\d{2})/.exec(studentCode);
  return match ? `K${match[1]}` : 'K19';
};

const csvCell = (value: string): string => value.replace(/[,\r\n]+/g, ' ').trim();

/** Đọc các dòng của file Excel XML Spreadsheet, tính cả ô bị bỏ qua qua thuộc tính ss:Index. */
const readSpreadsheetRows = (xml: string): string[][] => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Không đọc được file Excel. Vui lòng kiểm tra lại file.');
  }

  return Array.from(doc.getElementsByTagNameNS(SPREADSHEET_NS, 'Row')).map((row) => {
    const values: string[] = [];
    Array.from(row.getElementsByTagNameNS(SPREADSHEET_NS, 'Cell')).forEach((cell) => {
      const index = cell.getAttributeNS(SPREADSHEET_NS, 'Index');
      if (index) values.length = Number(index) - 1;
      const data = cell.getElementsByTagNameNS(SPREADSHEET_NS, 'Data')[0];
      values.push(data?.textContent?.trim() ?? '');
    });
    return Array.from(values, (value) => value ?? '');
  });
};

/**
 * Chuyển nội dung file danh sách lớp sang CSV import. File CSV giữ nguyên; file .xls xuất từ FAP
 * (cột Class, RollNumber, Email, FullName) được đổi sang CSV, tách ngành và khóa từ MSSV.
 */
export const convertFapFileToCsv = (content: string): string => {
  if (!content.includes(SPREADSHEET_NS)) return content;

  const rows = readSpreadsheetRows(content);
  const header = (rows[0] ?? []).map((name) => name.toLowerCase());
  const column = (name: string) => header.indexOf(name.toLowerCase());
  const codeColumn = column('RollNumber') >= 0 ? column('RollNumber') : column('studentcode');
  const emailColumn = column('Email');
  const nameColumn = column('FullName') >= 0 ? column('FullName') : column('name');
  const classColumn = column('Class') >= 0 ? column('Class') : column('classcode');
  const majorCol = column('Major');
  const cohortCol = column('Cohort');

  if (codeColumn < 0 || emailColumn < 0 || nameColumn < 0) {
    throw new Error('File Excel phải có các cột RollNumber (hoặc StudentCode), Email và FullName.');
  }

  // Giữ cả dòng trống và dòng thiếu dữ liệu để số dòng báo lỗi khớp với số dòng trong Excel.
  const lines = rows.slice(1).map((row) => {
    const studentCode = row[codeColumn] ?? '';
    const email = row[emailColumn] ?? '';
    if (!studentCode && !email) return '';
    const major = majorCol >= 0 && row[majorCol] ? row[majorCol] : (studentCode ? majorFromStudentCode(studentCode) : 'SE');
    const cohort = cohortCol >= 0 && row[cohortCol] ? row[cohortCol] : cohortFromStudentCode(studentCode);
    const classCode = classColumn >= 0 ? row[classColumn] ?? '' : '';
    const fullName = row[nameColumn] ?? '';

    return [
      studentCode,
      email,
      fullName,
      major,
      cohort,
      classCode,
    ]
      .map(csvCell)
      .join(',');
  });

  return [CSV_HEADER, ...lines].join('\n');
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParsedFapCsv {
  students: FapStudentItem[];
  /** Mỗi phần tử mô tả một dòng sai, ví dụ: Dòng 5: email "abc" không đúng định dạng. */
  errors: string[];
}

/** Đọc CSV import và kiểm tra từng dòng, để báo đúng dòng sai trước khi gửi lên máy chủ. */
export const parseFapCsv = (text: string): ParsedFapCsv => {
  const students: FapStudentItem[] = [];
  const errors: string[] = [];
  let isFirstContentLine = true;

  text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .forEach((rawLine, index) => {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) return;

      const isHeader = isFirstContentLine && line.toLowerCase().startsWith('studentcode');
      isFirstContentLine = false;
      if (isHeader) return;

      const [studentCode = '', email = '', fullName = '', major = '', cohort = '', classCode = ''] = line
        .split(',')
        .map((part) => part.trim());

      const missing = [
        { label: 'MSSV', value: studentCode },
        { label: 'email', value: email },
        { label: 'họ tên', value: fullName },
        { label: 'ngành', value: major },
      ]
        .filter((field) => !field.value)
        .map((field) => field.label);

      if (missing.length > 0) {
        errors.push(`Dòng ${index + 1}: thiếu ${missing.join(', ')}.`);
      } else if (!EMAIL_PATTERN.test(email)) {
        errors.push(`Dòng ${index + 1}: email "${email}" không đúng định dạng.`);
      } else {
        students.push({ studentCode, email, fullName, major, cohort: cohort || null, classCode: classCode || null });
      }
    });

  return { students, errors };
};

/** Đọc file .xlsx, .xls hoặc .csv người dùng chọn. */
export const readFapFile = async (file: File): Promise<ParsedFapCsv & { csv: string }> => {
  if (file.name.toLowerCase().endsWith('.xlsx')) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!data || data.length === 0) {
      return { csv: CSV_HEADER, students: [], errors: ['File Excel trống.'] };
    }

    const header = (data[0] ?? []).map((name: any) => String(name).toLowerCase().trim());
    const column = (name: string) => header.indexOf(name.toLowerCase());
    const codeColumn = column('RollNumber') >= 0 ? column('RollNumber') : column('studentcode');
    const emailColumn = column('Email');
    const nameColumn = column('FullName') >= 0 ? column('FullName') : column('name');
    const classColumn = column('Class') >= 0 ? column('Class') : column('classcode');
    const majorCol = column('Major');
    const cohortCol = column('Cohort');

    if (codeColumn < 0 || emailColumn < 0 || nameColumn < 0) {
      throw new Error('File Excel phải có các cột RollNumber (hoặc StudentCode), Email và FullName.');
    }

    const lines = data.slice(1).map((row) => {
      const studentCode = String(row[codeColumn] ?? '').trim();
      const email = String(row[emailColumn] ?? '').trim();
      if (!studentCode && !email) return '';
      const major = majorCol >= 0 && row[majorCol] ? String(row[majorCol]).trim() : majorFromStudentCode(studentCode);
      const cohort = cohortCol >= 0 && row[cohortCol] ? String(row[cohortCol]).trim() : cohortFromStudentCode(studentCode);
      const classCode = classColumn >= 0 ? String(row[classColumn] ?? '').trim() : '';
      const fullName = String(row[nameColumn] ?? '').trim();
      return [studentCode, email, fullName, major, cohort, classCode].map(csvCell).join(',');
    });

    const csv = [CSV_HEADER, ...lines.filter(Boolean)].join('\n');
    return { csv, ...parseFapCsv(csv) };
  }

  // XML Spreadsheet hoặc CSV
  const text = await file.text();
  const csv = convertFapFileToCsv(text);
  return { csv, ...parseFapCsv(csv) };
};
