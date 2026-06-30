import type {
  School, AcademicYear, Term, GradeLevel, Class,
  Subject, Student, Teacher, AttendanceRecord, Mark,
  ReportCard, FeeRecord, DashboardStats,
  TeacherAttendance, TeacherScheduleEntry,
} from '../types';

export const school: School = {
  id: 's1',
  name: '',
  code: '',
  address: '',
  phone: '',
  email: '',
  headTeacher: '',
  motto: '',
};

export const academicYears: AcademicYear[] = [];

export const terms: Term[] = [];

export const gradeLevels: GradeLevel[] = [
  { id: 'gl0', name: 'ECD A',   sortOrder: 0 },
  { id: 'gl1', name: 'ECD B',   sortOrder: 1 },
  { id: 'gl2', name: 'Grade 1', sortOrder: 2 },
  { id: 'gl3', name: 'Grade 2', sortOrder: 3 },
  { id: 'gl4', name: 'Grade 3', sortOrder: 4 },
  { id: 'gl5', name: 'Grade 4', sortOrder: 5 },
  { id: 'gl6', name: 'Grade 5', sortOrder: 6 },
  { id: 'gl7', name: 'Grade 6', sortOrder: 7 },
  { id: 'gl8', name: 'Grade 7', sortOrder: 8 },
];

export const subjects: Subject[] = [
  { id: 'sub1', name: 'English Language',   code: 'ENG' },
  { id: 'sub2', name: 'Mathematics',        code: 'MTH' },
  { id: 'sub3', name: 'General Science',    code: 'SCI' },
  { id: 'sub4', name: 'Social Studies',     code: 'SST' },
  { id: 'sub5', name: 'Shona',             code: 'SHO' },
  { id: 'sub6', name: 'Religious & Moral',  code: 'RME' },
  { id: 'sub7', name: 'Art & Craft',        code: 'ART' },
  { id: 'sub8', name: 'Physical Education', code: 'PE'  },
];

export const classes: Class[] = [];

export const teachers: Teacher[] = [];

export const students: Student[] = [];

export const attendanceRecords: AttendanceRecord[] = [];

export const marks: Mark[] = [];

export const reportCards: ReportCard[] = [];

export const feeRecords: FeeRecord[] = [];

export const dashboardStats: DashboardStats = {
  totalStudents:  0,
  totalTeachers:  0,
  totalClasses:   0,
  presentToday:   0,
  absentToday:    0,
  attendanceRate: 0,
  feesCollected:  0,
  feesPending:    0,
  feesTotal:      0,
};

export const teacherAttendance: TeacherAttendance[] = [];

export const teacherSchedule: TeacherScheduleEntry[] = [];
