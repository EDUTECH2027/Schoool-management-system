export type Gender = 'male' | 'female';
export type TermName = 'first' | 'second' | 'third';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type ConductGrade = 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'Poor';
export type ReportStatus = 'draft' | 'finalized' | 'published' | 'printed';
export type FeeStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
export type GuardianRel    = 'mother' | 'father' | 'guardian' | 'grandparent' | 'sibling' | 'other';
export type WeekDay        = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface TeacherAttendance {
  id: string;
  teacherId: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface TeacherScheduleEntry {
  teacherId: string;
  day: WeekDay;
  periodKey: string;
  periodLabel: string;
  time: string;
  classId: string;
  className: string;
  subjectName: string;
  room: string;
}

export interface School {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  headTeacher: string;
  motto: string;
}

export interface AcademicYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface Term {
  id: string;
  academicYearId: string;
  name: TermName;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface GradeLevel {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Class {
  id: string;
  gradeLevelId: string;
  gradeLevelName: string;
  name: string;
  capacity: number;
  room: string;
  classTeacherId: string;
  classTeacherName: string;
  enrolled: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface Student {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  classId: string;
  className: string;
  gradeLevelName: string;
  photoUrl?: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelationship: GuardianRel;
  admissionDate: string;
  isActive: boolean;
  address: string;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: Gender;
  subjects: string[];
  classAssigned?: string;
  qualification: string;
  joinDate: string;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  classId: string;
  className: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface Mark {
  studentId: string;
  studentName: string;
  studentNumber: string;
  subjectId: string;
  subjectName: string;
  caScore: number;    // out of 40
  examScore: number;  // out of 60
  totalScore: number; // out of 100
  grade: string;
  remark: string;
}

export interface ReportCardEntry {
  subjectId: string;
  subjectName: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  remark: string;
  position: number;
  teacherComment: string;
}

export interface ReportCard {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  className: string;
  gradeLevelName: string;
  termName: TermName;
  academicYear: string;
  totalMarksObtained: number;
  totalMarksPossible: number;
  percentage: number;
  classPosition: number;
  outOf: number;
  daysPresent: number;
  daysAbsent: number;
  totalSchoolDays: number;
  conduct: ConductGrade;
  classTeacherComment: string;
  headTeacherComment: string;
  status: ReportStatus;
  entries: ReportCardEntry[];
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string;
  paymentDate: string;
  receiptNumber: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  classId: string;
  className: string;
  feeName: string;
  academicYear: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: FeeStatus;
  dueDate: string;
  payments: Payment[];
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
  feesCollected: number;
  feesPending: number;
  feesTotal: number;
}
