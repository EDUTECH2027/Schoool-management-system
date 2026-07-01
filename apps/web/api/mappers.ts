import type { Teacher, Class, Student, Term, Subject, FeeRecord, Payment } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

export function mapTeacher(t: Raw): Teacher {
  return {
    id:            t.id,
    firstName:     t.first_name ?? t.firstName ?? '',
    lastName:      t.last_name  ?? t.lastName  ?? '',
    email:         t.email      ?? '',
    phone:         t.phone      ?? '',
    gender:        (t.gender    ?? 'male') as 'male' | 'female',
    subjects:      Array.isArray(t.subjects) ? t.subjects : [],
    classAssigned: t.class_assigned ?? t.classAssigned ?? undefined,
    qualification: t.qualification  ?? '',
    joinDate:      t.join_date      ?? t.joinDate ?? '',
    isActive:      t.isActive !== undefined ? Boolean(t.isActive) : Boolean(t.is_active),
  };
}

export function mapClass(c: Raw): Class {
  return {
    id:               c.id,
    gradeLevelId:     c.grade_level_id   ?? c.gradeLevelId   ?? '',
    gradeLevelName:   c.grade_level_name ?? c.gradeLevelName ?? '',
    name:             c.name             ?? '',
    capacity:         c.capacity         ?? 40,
    room:             c.room             ?? '',
    classTeacherId:   c.class_teacher_id   ?? c.classTeacherId   ?? '',
    classTeacherName: c.class_teacher_name ?? c.classTeacherName ?? '',
    enrolled:         c.enrolled          ?? 0,
  };
}

export function mapStudent(s: Raw): Student {
  return {
    id:                   s.id,
    studentNumber:        s.student_number      ?? s.studentNumber      ?? '',
    firstName:            s.first_name          ?? s.firstName          ?? '',
    lastName:             s.last_name           ?? s.lastName           ?? '',
    dateOfBirth:          s.date_of_birth       ?? s.dateOfBirth        ?? '',
    gender:               (s.gender             ?? 'male') as 'male' | 'female',
    classId:              s.class_id            ?? s.classId            ?? '',
    className:            s.class_name          ?? s.className          ?? '',
    gradeLevelName:       s.grade_level_name    ?? s.gradeLevelName     ?? '',
    address:              s.address             ?? '',
    guardianName:         s.guardian_name       ?? s.guardianName       ?? '',
    guardianPhone:        s.guardian_phone      ?? s.guardianPhone      ?? '',
    guardianRelationship: (s.guardian_relationship ?? s.guardianRelationship ?? 'guardian') as Student['guardianRelationship'],
    admissionDate:        s.admission_date      ?? s.admissionDate      ?? '',
    isActive:             s.isActive !== undefined ? Boolean(s.isActive) : Boolean(s.is_active),
  };
}

export function mapTerm(t: Raw): Term {
  return {
    id:             t.id,
    academicYearId: t.academic_year_id ?? t.academicYearId ?? '',
    name:           (t.name ?? 'first') as Term['name'],
    startDate:      t.start_date ?? t.startDate ?? '',
    endDate:        t.end_date   ?? t.endDate   ?? '',
    isCurrent:      t.is_current !== undefined ? Boolean(t.is_current) : Boolean(t.isCurrent),
  };
}

export function mapSubject(s: Raw): Subject {
  return { id: s.id, name: s.name ?? '', code: s.code ?? '' };
}

export function mapPayment(p: Raw): Payment {
  return {
    id:            p.id,
    amount:        p.amount        ?? 0,
    method:        p.method        ?? '',
    reference:     p.reference     ?? '',
    paymentDate:   p.payment_date  ?? p.paymentDate  ?? '',
    receiptNumber: p.receipt_number ?? p.receiptNumber ?? '',
  };
}

export function mapFeeRecord(f: Raw): FeeRecord {
  return {
    id:            f.id,
    studentId:     f.student_id    ?? f.studentId    ?? '',
    studentName:   f.student_name  ?? f.studentName  ?? '',
    studentNumber: f.student_number ?? f.studentNumber ?? '',
    classId:       f.class_id      ?? f.classId      ?? '',
    className:     f.class_name    ?? f.className    ?? '',
    feeName:       f.fee_name      ?? f.feeName      ?? '',
    academicYear:  f.academic_year ?? f.academicYear ?? '',
    amountDue:     f.amount_due    ?? f.amountDue    ?? 0,
    amountPaid:    f.amount_paid   ?? f.amountPaid   ?? 0,
    balance:       f.balance       ?? 0,
    status:        (f.status       ?? 'pending') as FeeRecord['status'],
    dueDate:       f.due_date      ?? f.dueDate      ?? '',
    payments:      Array.isArray(f.payments) ? f.payments.map(mapPayment) : [],
  };
}
