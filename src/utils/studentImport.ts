/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
// Smart student-spreadsheet reader. Given the parsed rows of a CSV it:
//   1. finds the real header row (skips title/blank lines above it),
//   2. maps each column to a student field by header (exact, synonym, then fuzzy "contains"),
//   3. for columns whose header isn't recognised, infers the field from the CONTENT
//      (dates, genders, phone numbers, "First Last" names, existing class names),
//   4. normalises dates to YYYY-MM-DD and gender to male/female/other.
// It returns the mapped rows plus a human-readable report of what was detected.

export type StudentField =
  | 'fullName' | 'firstName' | 'middleName' | 'lastName' | 'studentNumber'
  | 'dateOfBirth' | 'gender' | 'className' | 'gradeLevelName'
  | 'guardianName' | 'guardianPhone' | 'guardianRelationship'
  | 'mobileNumber' | 'address' | 'city' | 'admissionDate' | 'isActive';

export const FIELD_LABELS: Record<StudentField, [string, string]> = {
  fullName: ['Full name', 'Nom complet'], firstName: ['First name', 'Prénom'], middleName: ['Middle name', 'Deuxième prénom'],
  lastName: ['Last name', 'Nom'], studentNumber: ['Student number', 'Matricule'], dateOfBirth: ['Date of birth', 'Date de naissance'],
  gender: ['Gender', 'Sexe'], className: ['Class', 'Classe'], gradeLevelName: ['Grade level', 'Niveau'],
  guardianName: ['Guardian', 'Tuteur'], guardianPhone: ['Guardian phone', 'Téléphone du tuteur'],
  guardianRelationship: ['Guardian relationship', 'Lien de parenté'], mobileNumber: ['Student phone', 'Téléphone élève'],
  address: ['Address', 'Adresse'], city: ['City', 'Ville'], admissionDate: ['Admission date', "Date d'admission"], isActive: ['Active', 'Actif'],
};

// Synonyms (already normalised: lowercase, no accents/spaces/punctuation). Order matters for
// the fuzzy pass: more specific fields come first so "guardianphone" never falls to "phone".
const ALIASES: [StudentField, string[]][] = [
  ['guardianPhone', ['guardianphone', 'guardiancontact', 'parentphone', 'parentcontact', 'parentmobile', 'parenttel', 'guardiantel', 'telephoneparent', 'telparent', 'telephonetuteur', 'contactparent', 'contacttuteur', 'fathersphone', 'mothersphone', 'emergencycontact', 'emergencyphone', 'guardianmobile', 'guardiannumber', 'parentnumber']],
  ['guardianRelationship', ['relationship', 'relation', 'guardianrelationship', 'parente', 'lienparente', 'lien']],
  ['guardianName', ['guardianname', 'guardian', 'parentname', 'parent', 'parents', 'tuteur', 'nomduparent', 'nomtuteur', 'nomparent', 'fathername', 'mothername', 'father', 'mother', 'pere', 'mere', 'responsable', 'nextofkin']],
  ['admissionDate', ['admissiondate', 'dateadmission', 'dateinscription', 'enrolmentdate', 'enrollmentdate', 'dateofadmission', 'dateofenrolment', 'dateofenrollment', 'datejoined', 'joined', 'admission', 'inscription']],
  ['dateOfBirth', ['dateofbirth', 'dob', 'birthdate', 'birthday', 'datedenaissance', 'datenaissance', 'ddn', 'bornon', 'born', 'naissance', 'birth']],
  ['studentNumber', ['studentnumber', 'studentno', 'studentid', 'studentcode', 'matricule', 'matric', 'matriculenumber', 'regno', 'registrationnumber', 'registrationno', 'admissionnumber', 'admissionno', 'admno', 'idnumber', 'idno', 'id', 'rollno', 'rollnumber', 'numeroeleve', 'code']],
  ['middleName', ['middlename', 'secondname', 'othernames', 'deuxiemeprenom', 'middle']],
  ['firstName', ['firstname', 'givenname', 'givennames', 'forename', 'prenom', 'prenoms', 'first']],
  ['lastName', ['lastname', 'surname', 'familyname', 'nomdefamille', 'nom', 'last']],
  ['fullName', ['name', 'names', 'fullname', 'fullnames', 'studentname', 'studentsname', 'studentnames', 'nomcomplet', 'nomprenom', 'nometprenom', 'nomsetprenoms', 'prenomnom', 'prenometnom', 'eleve', 'eleves', 'nomeleve', 'nomdeleleve', 'student', 'students', 'pupil', 'pupils', 'pupilname', 'learner', 'learnername', 'candidate', 'candidatename', 'nomsprenoms']],
  ['gender', ['gender', 'sexe', 'sex', 'genre', 'mf', 'gendersex']],
  ['gradeLevelName', ['gradelevel', 'grade', 'niveau', 'level', 'form', 'year', 'standard', 'cycle', 'section']],
  ['className', ['class', 'classe', 'classname', 'nomclasse', 'classroom', 'group', 'groupe', 'currentclass', 'stream', 'division']],
  ['city', ['city', 'town', 'ville', 'village', 'locality', 'localite']],
  ['address', ['address', 'adresse', 'residence', 'homeaddress', 'domicile', 'location', 'quartier']],
  ['mobileNumber', ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'tel', 'telephone', 'contact', 'whatsapp', 'studentphone', 'cell', 'cellphone', 'numerotelephone']],
  ['isActive', ['active', 'actif', 'status', 'statut', 'isactive', 'enabled']],
];

function stripDiacritics(s: string): string {
  return s.normalize('NFD').split('').filter(ch => {
    const c = ch.charCodeAt(0);
    return !(c >= 0x0300 && c <= 0x036f);
  }).join('');
}
const norm = (h: string) => stripDiacritics(String(h ?? '').toLowerCase()).replace(/[^a-z0-9]/g, '');

/** Returns the field a header most likely stands for, or null. */
export function matchHeader(raw: string): StudentField | null {
  const h = norm(raw);
  if (!h) return null;
  for (const [field, list] of ALIASES) if (list.includes(h) || norm(field) === h) return field;
  // Fuzzy: header contains a (>=4 char) alias, e.g. "Student's Date of Birth (DD/MM/YYYY)".
  let best: { field: StudentField; len: number } | null = null;
  for (const [field, list] of ALIASES) {
    for (const a of list) {
      if (a.length >= 4 && h.includes(a) && (!best || a.length > best.len)) best = { field, len: a.length };
    }
  }
  return best ? best.field : null;
}

// ── Value parsing ──────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');
const validYMD = (y: number, m: number, d: number) => {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};
const MONTHS: Record<string, number> = {
  jan: 1, january: 1, janvier: 1, feb: 2, february: 2, fev: 2, fevrier: 2, mar: 3, march: 3, mars: 3, apr: 4, april: 4, avr: 4, avril: 4,
  may: 5, mai: 5, jun: 6, june: 6, juin: 6, jul: 7, july: 7, juil: 7, juillet: 7, aug: 8, august: 8, aout: 8,
  sep: 9, sept: 9, september: 9, septembre: 9, oct: 10, october: 10, octobre: 10, nov: 11, november: 11, novembre: 11, dec: 12, december: 12, decembre: 12,
};

/** Normalises many date shapes to YYYY-MM-DD; returns null when it isn't a date. Day-first for ambiguous d/m/y (Cameroon). */
export function parseDate(raw: string): string | null {
  const s = stripDiacritics(raw.trim().toLowerCase());
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[t\s].*)?$/);
  if (m && validYMD(+m[1], +m[2], +m[3])) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{2}|\d{4})$/);
  if (m) {
    let y = +m[3]; if (m[3].length === 2) y += y > 30 ? 1900 : 2000;
    let d = +m[1], mo = +m[2];
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]; // clearly month-first
    if (validYMD(y, mo, d)) return `${y}-${pad(mo)}-${pad(d)}`;
  }
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th|er)?[\s\-/.,]+([a-z]+)\.?[\s\-/.,]+(\d{2}|\d{4})$/);
  if (m && MONTHS[m[2]]) {
    let y = +m[3]; if (m[3].length === 2) y += y > 30 ? 1900 : 2000;
    if (validYMD(y, MONTHS[m[2]], +m[1])) return `${y}-${pad(MONTHS[m[2]])}-${pad(+m[1])}`;
  }
  m = s.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (m && MONTHS[m[1]] && validYMD(+m[3], MONTHS[m[1]], +m[2])) return `${m[3]}-${pad(MONTHS[m[1]])}-${pad(+m[2])}`;
  m = s.match(/^\d{5}(?:\.\d+)?$/); // Excel serial date
  if (m) {
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(+s) * 86400000);
    if (validYMD(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())) return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }
  return null;
}

const MALE = new Set(['m', 'male', 'masculin', 'garcon', 'boy', 'homme', 'h', 'masc']);
const FEMALE = new Set(['f', 'female', 'feminin', 'fille', 'girl', 'femme', 'fem']);
export function parseGender(raw: string): 'male' | 'female' | 'other' | null {
  const s = stripDiacritics(raw.trim().toLowerCase()).replace(/[^a-z]/g, '');
  if (!s) return null;
  if (MALE.has(s)) return 'male';
  if (FEMALE.has(s)) return 'female';
  if (s === 'other' || s === 'autre' || s === 'o') return 'other';
  return null;
}

export function parsePhone(raw: string): string | null {
  const s = raw.trim();
  if (!/^[+\d][\d\s().-]{6,}$/.test(s)) return null;
  const digits = s.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  if (s.startsWith('+')) return `+${digits}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('237') && digits.length === 12) return `+${digits}`;
  if (digits.length === 9 && /^[62]/.test(digits)) return `+237${digits}`; // Cameroon national number
  return s.replace(/\s+/g, ' ');
}

const parseBool = (raw: string): boolean | null => {
  const s = norm(raw);
  if (['true', 'yes', 'oui', 'y', 'o', '1', 'active', 'actif'].includes(s)) return true;
  if (['false', 'no', 'non', 'n', '0', 'inactive', 'inactif'].includes(s)) return false;
  return null;
};

// ── Content-based inference for columns with unrecognised headers ───────────

const looksLikeName = (v: string) => /^[\p{L}][\p{L}'’.\- ]{1,}$/u.test(v) && !/\d/.test(v);
function inferFromContent(values: string[], knownClasses: Set<string>): StudentField | null {
  const vals = values.map(v => v.trim()).filter(Boolean).slice(0, 200);
  if (vals.length < 1) return null;
  const share = (fn: (v: string) => boolean) => vals.filter(fn).length / vals.length;
  if (share(v => parseGender(v) !== null) >= 0.8 && new Set(vals.map(v => v.toLowerCase())).size <= 6) return 'gender';
  if (share(v => parseDate(v) !== null) >= 0.8) return 'dateOfBirth';
  if (share(v => parsePhone(v) !== null) >= 0.8) return 'guardianPhone';
  if (knownClasses.size && share(v => knownClasses.has(v.toLowerCase())) >= 0.6) return 'className';
  if (share(v => /^[A-Za-z]{0,6}[-/ ]?\d{2,}[A-Za-z0-9/-]*$/.test(v)) >= 0.8 && new Set(vals).size === vals.length) return 'studentNumber';
  if (share(v => looksLikeName(v) && v.trim().split(/\s+/).length >= 2) >= 0.7) return 'fullName';
  return null;
}

// ── Main entry ─────────────────────────────────────────────────────────────

export interface ColumnMapping { column: string; field: StudentField | null; via: 'header' | 'content' | 'fallback' | 'ignored' }
export interface StudentImportParse {
  students: Record<string, string>[];
  mapping: ColumnMapping[];
  headerRow: number;      // 0-based index of the detected header row (-1 = none, first row is data)
  warnings: string[];
  skipped: number;        // rows dropped locally (no usable name)
}

function scoreHeaderRow(row: string[]): number {
  return row.reduce((n, c) => n + (matchHeader(c) ? 1 : 0), 0);
}

// Row counters / serial numbers (SN, S/N, N°, No…) are NOT student numbers — never import them as such.
const SERIAL_HEADERS = new Set(['sn', 'sno', 'serial', 'serialno', 'serialnumber', 'no', 'num', 'numero', 'n', 'rank', 'rang', 'index', 'ref']);

export function parseStudentRows(rows: string[][], knownClassNames: string[] = []): StudentImportParse {
  const warnings: string[] = [];
  const classes = new Set(knownClassNames.map(c => c.trim().toLowerCase()));

  // 1. Header row: best-scoring row among the first 15 (ties go to the earliest).
  let headerRow = -1, bestScore = 0;
  rows.slice(0, 15).forEach((r, i) => { const sc = scoreHeaderRow(r); if (sc > bestScore) { bestScore = sc; headerRow = i; } });
  // A single weak match on a row that looks like data (e.g. a name "Grace") is not a header.
  if (bestScore === 1 && headerRow >= 0 && rows[headerRow].some(c => parseDate(c) || parsePhone(c))) { headerRow = -1; }
  const headers = headerRow >= 0 ? rows[headerRow] : rows[0].map((_, i) => `Column ${i + 1}`);
  const dataRows = headerRow >= 0 ? rows.slice(headerRow + 1) : rows;
  if (headerRow > 0) warnings.push(`Skipped ${headerRow} line(s) above the header row.`);

  // 2. Header-based mapping; each field only claimed once (first column wins).
  const fields: (StudentField | null)[] = headers.map(() => null);
  const via: ColumnMapping['via'][] = headers.map(() => 'ignored');
  const taken = new Set<StudentField>();
  headers.forEach((h, i) => {
    const f = headerRow >= 0 ? matchHeader(h) : null;
    if (f && !taken.has(f)) { fields[i] = f; via[i] = 'header'; taken.add(f); }
  });

  // 3. Content-based inference for the rest.
  headers.forEach((h, i) => {
    if (fields[i] || SERIAL_HEADERS.has(norm(h))) return;
    const f = inferFromContent(dataRows.map(r => r[i] ?? ''), classes);
    if (f && !taken.has(f)) { fields[i] = f; via[i] = 'content'; taken.add(f); }
  });

  // 4. Ensure a name source exists.
  const hasName = taken.has('fullName') || taken.has('firstName') || taken.has('lastName');
  if (!hasName) {
    // Pick the unmapped column whose values look most like names; else the first unmapped column.
    let pick = -1, bestShare = 0;
    headers.forEach((_, i) => {
      if (fields[i]) return;
      const vals = dataRows.map(r => (r[i] ?? '').trim()).filter(Boolean);
      if (!vals.length) return;
      const s = vals.filter(looksLikeName).length / vals.length;
      if (s > bestShare) { bestShare = s; pick = i; }
    });
    if (pick === -1 || bestShare < 0.5) pick = fields.findIndex(f => !f);
    if (pick !== -1) { fields[pick] = 'fullName'; via[pick] = 'fallback'; taken.add('fullName'); }
  }

  const mapping: ColumnMapping[] = headers.map((h, i) => ({ column: h, field: fields[i], via: fields[i] ? via[i] : 'ignored' }));

  // 5. Build records.
  let skipped = 0, badDates = 0, badGender = 0;
  const students: Record<string, string>[] = [];
  for (const r of dataRows) {
    const o: Record<string, string> = {};
    fields.forEach((f, i) => {
      if (!f) return;
      const val = (r[i] ?? '').trim();
      if (!val) return;
      switch (f) {
        case 'fullName': {
          // "SURNAME Given names" and "Given Surname" are both common; keep file order: first token = first name.
          const parts = val.split(/\s+/);
          if (!o.firstName) o.firstName = parts[0];
          if (!o.lastName && parts.length > 1) o.lastName = parts.slice(1).join(' ');
          break;
        }
        case 'dateOfBirth': case 'admissionDate': {
          const d = parseDate(val);
          if (d) o[f] = d; else badDates++;
          break;
        }
        case 'gender': {
          const g = parseGender(val);
          if (g) o.gender = g; else badGender++;
          break;
        }
        case 'guardianPhone': case 'mobileNumber': o[f] = parsePhone(val) ?? val; break;
        case 'isActive': { const b = parseBool(val); if (b !== null) o.isActive = String(b); break; }
        default: o[f] = val;
      }
    });
    const nm = `${o.firstName ?? ''}${o.lastName ?? ''}`;
    if (!nm || !/\p{L}/u.test(nm)) { skipped++; continue; }
    students.push(o);
  }
  if (badDates) warnings.push(`${badDates} date value(s) could not be understood and were left empty.`);
  if (badGender) warnings.push(`${badGender} gender value(s) were not recognised (use M/F, male/female, masculin/féminin) and were left empty.`);
  return { students, mapping, headerRow, warnings, skipped };
}

// ── Excel (.xlsx) support ───────────────────────────────────────────────────

const cellToString = (c: unknown): string => {
  if (c == null) return '';
  if (c instanceof Date) return `${c.getUTCFullYear()}-${pad(c.getUTCMonth() + 1)}-${pad(c.getUTCDate())}`;
  return String(c).trim();
};

/** True when the bytes start with the ZIP signature (.xlsx/.docx/…). */
export const isZipFile = (buf: ArrayBuffer): boolean => {
  const b = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
  return b[0] === 0x50 && b[1] === 0x4b;
};

/** Reads the first non-empty sheet of an .xlsx workbook as rows of strings (dates become YYYY-MM-DD). */
export async function readXlsxRows(buf: ArrayBuffer): Promise<string[][]> {
  const { default: readExcelFile } = await import('read-excel-file/browser');
  const sheets = await readExcelFile(new Blob([buf]));
  for (const s of sheets) {
    const rows = (s.data as unknown[][])
      .map(r => r.map(cellToString))
      .filter(r => r.some(c => c !== ''));
    if (rows.length) return rows;
  }
  return [];
}
