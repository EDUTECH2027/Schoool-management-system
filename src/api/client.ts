const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  try {
    const stored = localStorage.getItem('auth_user');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Reference data (subjects, grade levels) rarely changes but is independently
// re-fetched by many pages — cache per session and invalidate on mutation
// instead of hitting the network every time a page mounts.
const refCache = new Map<string, Promise<unknown>>();

function cachedGet<T>(key: string, path: string): Promise<T> {
  if (!refCache.has(key)) {
    const p = request<T>('GET', path).catch(err => { refCache.delete(key); throw err; });
    refCache.set(key, p);
  }
  return refCache.get(key) as Promise<T>;
}

export const api = {
  // ── Auth ─────────────────────────────────────────────────────────
  login:  (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>('POST', '/auth/login', { email, password }),
  me:     () => request<AuthUser>('GET', '/auth/me'),
  logout: () => request<void>('POST', '/auth/logout'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('PUT', '/auth/me/password', { currentPassword, newPassword }),

  // ── Dashboard ────────────────────────────────────────────────────
  dashboard: () => request<DashboardData>('GET', '/dashboard'),

  // ── School ───────────────────────────────────────────────────────
  getSchool:    () => request<School>('GET', '/school'),
  updateSchool: (data: Partial<School>) => request<School>('PUT', '/school', data),

  // ── Academic ─────────────────────────────────────────────────────
  getYears:    () => request<AcademicYear[]>('GET', '/academic/years'),
  createYear:  (data: { label: string; start_date: string; end_date: string; is_current?: boolean }) =>
    request<AcademicYear>('POST', '/academic/years', data),
  updateYear:  (id: string, data: Partial<AcademicYear>) =>
    request<AcademicYear>('PUT', `/academic/years/${id}`, data),
  getTerms:    (academic_year_id?: string) =>
    request<Term[]>('GET', `/academic/terms${academic_year_id ? `?academic_year_id=${academic_year_id}` : ''}`),
  createTerm:  (data: { academic_year_id: string; name: string; start_date: string; end_date: string; is_current?: boolean }) =>
    request<Term>('POST', '/academic/terms', data),
  updateTerm:  (id: string, data: Partial<Term>) =>
    request<Term>('PUT', `/academic/terms/${id}`, data),
  getGradeLevels: () => cachedGet<GradeLevel[]>('grade-levels', '/academic/grade-levels'),

  // ── Subjects ─────────────────────────────────────────────────────
  getSubjects:    () => cachedGet<Subject[]>('subjects', '/subjects'),
  createSubject:  (data: Partial<Subject>) => request<Subject>('POST', '/subjects', data).then(r => { refCache.delete('subjects'); return r; }),
  updateSubject:  (id: string, data: Partial<Subject>) => request<Subject>('PUT', `/subjects/${id}`, data).then(r => { refCache.delete('subjects'); return r; }),
  deleteSubject:  (id: string) => request<void>('DELETE', `/subjects/${id}`).then(r => { refCache.delete('subjects'); return r; }),

  // ── Teachers ─────────────────────────────────────────────────────
  getTeachers:   (params?: Record<string, string>) =>
    request<Teacher[]>('GET', `/teachers${toQS(params)}`),
  getTeacher:    (id: string) => request<Teacher>('GET', `/teachers/${id}`),
  createTeacher: (data: TeacherInput) => request<Teacher>('POST', '/teachers', data),
  updateTeacher: (id: string, data: TeacherInput) => request<Teacher>('PUT', `/teachers/${id}`, data),
  deleteTeacher: (id: string) => request<void>('DELETE', `/teachers/${id}`),

  // ── Classes ──────────────────────────────────────────────────────
  getClasses:      (params?: Record<string, string>) =>
    request<ClassRecord[]>('GET', `/classes${toQS(params)}`),
  getClass:        (id: string) => request<ClassRecord>('GET', `/classes/${id}`),
  getClassStudents:(id: string) => request<Student[]>('GET', `/classes/${id}/students`),
  createClass:     (data: Partial<ClassRecord>) => request<ClassRecord>('POST', '/classes', data),
  updateClass:     (id: string, data: Partial<ClassRecord>) => request<ClassRecord>('PUT', `/classes/${id}`, data),
  deleteClass:     (id: string) => request<void>('DELETE', `/classes/${id}`),

  // ── Students ─────────────────────────────────────────────────────
  getStudents:   (params?: Record<string, string>) =>
    request<Student[]>('GET', `/students${toQS(params)}`),
  getStudent:    (id: string) => request<Student>('GET', `/students/${id}`),
  createStudent: (data: Partial<Student>) => request<Student>('POST', '/students', data),
  updateStudent: (id: string, data: Partial<Student>) => request<Student>('PUT', `/students/${id}`, data),
  deleteStudent: (id: string) => request<void>('DELETE', `/students/${id}`),

  // ── Parents ──────────────────────────────────────────────────────
  getParents:   (params?: Record<string, string>) =>
    request<Parent[]>('GET', `/parents${toQS(params)}`),
  getParent:    (id: string) => request<Parent>('GET', `/parents/${id}`),
  createParent: (data: Partial<Parent>) => request<Parent>('POST', '/parents', data),
  updateParent: (id: string, data: Partial<Parent>) => request<Parent>('PUT', `/parents/${id}`, data),
  deleteParent: (id: string) => request<void>('DELETE', `/parents/${id}`),

  // ── Attendance ───────────────────────────────────────────────────
  getAttendance:      (params?: Record<string, string>) =>
    request<AttendanceRecord[]>('GET', `/attendance${toQS(params)}`),
  saveAttendance:     (records: Partial<AttendanceRecord>[]) =>
    request<{ saved: number }>('POST', '/attendance', records),
  getAttendanceStats: (classId: string, month: string) =>
    request<AttendanceStat[]>('GET', `/attendance/stats?classId=${classId}&month=${month}`),
  getTeacherAttendance:(params?: Record<string, string>) =>
    request<TeacherAttendanceRecord[]>('GET', `/attendance/teachers${toQS(params)}`),
  saveTeacherAttendance:(records: unknown[]) =>
    request<{ saved: number }>('POST', '/attendance/teachers', records),

  // ── Timetable ────────────────────────────────────────────────────
  getTimetable:   (params?: Record<string, string>) =>
    request<ScheduleEntry[]>('GET', `/timetable${toQS(params)}`),
  createSlot:     (data: Partial<ScheduleEntry>) => request<ScheduleEntry>('POST', '/timetable', data),
  updateSlot:     (id: string, data: Partial<ScheduleEntry>) => request<ScheduleEntry>('PUT', `/timetable/${id}`, data),
  deleteSlot:     (id: string) => request<void>('DELETE', `/timetable/${id}`),

  // ── Marks ────────────────────────────────────────────────────────
  getMarks:    (params?: Record<string, string>) =>
    request<Mark[]>('GET', `/marks${toQS(params)}`),
  saveMarks:   (records: Partial<Mark>[]) =>
    request<{ saved: number }>('POST', '/marks', records),
  updateMark:  (id: string, data: Partial<Mark>) => request<Mark>('PUT', `/marks/${id}`, data),

  // ── Report Cards ─────────────────────────────────────────────────
  getReportCards:       (params?: Record<string, string>) =>
    request<ReportCard[]>('GET', `/report-cards${toQS(params)}`),
  getReportCard:        (id: string) => request<ReportCard>('GET', `/report-cards/${id}`),
  generateReportCards:  (data: { classId: string; termId: string }) =>
    request<{ generated: number }>('POST', '/report-cards/generate', data),
  createReportCard:     (data: unknown) => request<ReportCard>('POST', '/report-cards', data),
  updateReportCard:     (id: string, data: unknown) => request<ReportCard>('PUT', `/report-cards/${id}`, data),
  setReportCardStatus:  (id: string, status: string) =>
    request<ReportCard>('PATCH', `/report-cards/${id}/status`, { status }),

  // ── Certificates ─────────────────────────────────────────────────
  getCertificates: (params?: Record<string, string>) =>
    request<SavedCertificate[]>('GET', `/certificates${toQS(params)}`),
  getCertificate:  (id: string) => request<SavedCertificate>('GET', `/certificates/${id}`),
  createCertificate: (data: CertificateInput) => request<SavedCertificate>('POST', '/certificates', data),
  updateCertificate: (id: string, data: Partial<CertificateInput>) => request<SavedCertificate>('PUT', `/certificates/${id}`, data),
  deleteCertificate: (id: string) => request<void>('DELETE', `/certificates/${id}`),

  // ── Fees ─────────────────────────────────────────────────────────
  getFees:        (params?: Record<string, string>) =>
    request<FeeRecord[]>('GET', `/fees${toQS(params)}`),
  getFeesSummary: (academicYear?: string) =>
    request<FeesSummary>('GET', `/fees/summary${academicYear ? `?academicYear=${academicYear}` : ''}`),
  getFee:         (id: string) => request<FeeRecord>('GET', `/fees/${id}`),
  createFee:      (data: Partial<FeeRecord>) => request<FeeRecord>('POST', '/fees', data),
  updateFee:      (id: string, data: Partial<FeeRecord>) => request<FeeRecord>('PUT', `/fees/${id}`, data),
  addPayment:     (feeId: string, payment: Partial<Payment>) =>
    request<FeeRecord>('POST', `/fees/${feeId}/payments`, payment),

  // ── Payroll ──────────────────────────────────────────────────────
  getPayroll:       (month: string) =>
    request<PayrollRecord[]>('GET', `/payroll?month=${month}`),
  initPayroll:      (month: string) =>
    request<{ created: number; skipped: number }>('POST', '/payroll/bulk', { month }),
  updatePayroll:    (id: string, data: Partial<PayrollRecord>) =>
    request<PayrollRecord>('PUT', `/payroll/${id}`, data),
  setPayrollStatus: (id: string, status: string) =>
    request<PayrollRecord>('PATCH', `/payroll/${id}/status`, { status }),

  // ── Announcements ────────────────────────────────────────────────
  getAnnouncements:   (params?: Record<string, string>) =>
    request<Announcement[]>('GET', `/announcements${toQS(params)}`),
  createAnnouncement: (data: Partial<Announcement>) =>
    request<Announcement>('POST', '/announcements', data),
  updateAnnouncement: (id: string, data: Partial<Announcement>) =>
    request<Announcement>('PUT', `/announcements/${id}`, data),
  deleteAnnouncement: (id: string) => request<void>('DELETE', `/announcements/${id}`),

  // ── Email Alerts ─────────────────────────────────────────────────
  getEmailAlerts:  (params?: Record<string, string>) =>
    request<EmailAlert[]>('GET', `/email-alerts${toQS(params)}`),
  sendEmailAlert:  (data: Partial<EmailAlert>) =>
    request<EmailAlert>('POST', '/email-alerts', data),
  deleteEmailAlert:(id: string) => request<void>('DELETE', `/email-alerts/${id}`),

  // ── Forums ───────────────────────────────────────────────────────
  getThreads:      (params?: Record<string, string>) =>
    request<ForumThread[]>('GET', `/forums/threads${toQS(params)}`),
  createThread:    (data: { title: string; tag?: string }) =>
    request<ForumThread>('POST', '/forums/threads', data),
  deleteThread:    (id: string) => request<void>('DELETE', `/forums/threads/${id}`),
  getMessages:     (threadId: string) =>
    request<ForumMessage[]>('GET', `/forums/threads/${threadId}/messages`),
  sendMessage:     (threadId: string, data: Partial<ForumMessage>) =>
    request<ForumMessage>('POST', `/forums/threads/${threadId}/messages`, data),
  deleteMessage:   (threadId: string, msgId: string) =>
    request<void>('DELETE', `/forums/threads/${threadId}/messages/${msgId}`),

  // ── User Management (admin) ───────────────────────────────────────
  getUsers:        () => request<PortalUser[]>('GET', '/users'),
  getUser:         (id: string) => request<PortalUser>('GET', `/users/${id}`),
  createUser:      (data: CreateUserInput) => request<PortalUser>('POST', '/users', data),
  updateUser:      (id: string, data: Partial<CreateUserInput>) => request<PortalUser>('PUT', `/users/${id}`, data),
  resetUserPw:     (id: string, password: string) => request<void>('PATCH', `/users/${id}/password`, { password }),
  deleteUser:      (id: string) => request<void>('DELETE', `/users/${id}`),

  // ── Behavior (admin / teacher) ────────────────────────────────────
  getBehavior:     (params?: Record<string, string>) => request<BehaviorRecord[]>('GET', `/behavior${toQS(params)}`),
  createBehavior:  (data: Partial<BehaviorRecord>) => request<BehaviorRecord>('POST', '/behavior', data),
  updateBehavior:  (id: string, data: Partial<BehaviorRecord>) => request<BehaviorRecord>('PUT', `/behavior/${id}`, data),
  deleteBehavior:  (id: string) => request<void>('DELETE', `/behavior/${id}`),

  // ── Withdrawals (admin) ───────────────────────────────────────────
  getWithdrawals:      (params?: Record<string, string>) => request<Withdrawal[]>('GET', `/withdrawals${toQS(params)}`),
  setWithdrawalStatus: (id: string, status: 'approved' | 'rejected', notes?: string) =>
    request<Withdrawal>('PATCH', `/withdrawals/${id}/status`, { status, notes }),

  // ── Portal migration ─────────────────────────────────────────────
  triggerPortalMigration: () => request<MigrationResult>('POST', '/migrate/portal-accounts'),

  // ── Portal: Teacher ───────────────────────────────────────────────
  portalTeacherProfile:          () => request<Teacher>('GET', '/portal/teacher/profile'),
  portalTeacherProfileUpdate:    (data: { phone?: string; qualification?: string }) =>
    request<Teacher>('PUT', '/portal/teacher/profile', data),
  portalTeacherClasses:          () => request<ClassRecord[]>('GET', '/portal/teacher/classes'),
  portalTeacherTimetable:        () => request<ScheduleEntry[]>('GET', '/portal/teacher/timetable'),
  portalTeacherMyAttendance:     (month?: string) =>
    request<TeacherAttendanceRecord[]>('GET', `/portal/teacher/my-attendance${month ? `?month=${month}` : ''}`),
  portalTeacherReportAbsence:    (data: { date: string; status: string; remarks?: string }) =>
    request<TeacherAttendanceRecord>('POST', '/portal/teacher/my-attendance', data),
  portalTeacherMarks:            (classId: string, termId: string) =>
    request<Mark[]>('GET', `/portal/teacher/marks?classId=${classId}&termId=${termId}`),
  portalTeacherSaveMarks:        (classId: string, termId: string, marks: Partial<Mark>[]) =>
    request<{ saved: number }>('POST', '/portal/teacher/marks', { classId, termId, marks }),
  portalTeacherStudentAttendance:(classId: string, date?: string) =>
    request<AttendanceRecord[]>('GET', `/portal/teacher/student-attendance?classId=${classId}${date ? `&date=${date}` : ''}`),
  portalTeacherSaveAttendance:   (classId: string, date: string, records: Partial<AttendanceRecord>[]) =>
    request<{ saved: number }>('POST', '/portal/teacher/student-attendance', { classId, date, records }),
  portalTeacherBehavior:         (classId?: string) =>
    request<BehaviorRecord[]>('GET', `/portal/teacher/behavior${classId ? `?classId=${classId}` : ''}`),
  portalTeacherCreateBehavior:   (data: Partial<BehaviorRecord>) => request<BehaviorRecord>('POST', '/portal/teacher/behavior', data),
  portalTeacherUpdateBehavior:   (id: string, data: Partial<BehaviorRecord>) => request<BehaviorRecord>('PUT', `/portal/teacher/behavior/${id}`, data),
  portalTeacherDeleteBehavior:   (id: string) => request<void>('DELETE', `/portal/teacher/behavior/${id}`),
  portalTeacherSalary:           (month?: string) =>
    request<PayrollRecord[]>('GET', `/portal/teacher/salary${month ? `?month=${month}` : ''}`),
  portalTeacherWithdrawals:      () => request<Withdrawal[]>('GET', '/portal/teacher/withdrawals'),
  portalTeacherRequestWithdrawal:(data: { payroll_id?: string; amount: number; reason?: string }) =>
    request<Withdrawal>('POST', '/portal/teacher/withdrawals', data),

  // ── Portal: Student ───────────────────────────────────────────────
  portalStudentProfile:      () => request<Student>('GET', '/portal/student/profile'),
  portalStudentMarks:        (termId?: string) =>
    request<Mark[]>('GET', `/portal/student/marks${termId ? `?termId=${termId}` : ''}`),
  portalStudentAttendance:   (params?: { from?: string; to?: string }) =>
    request<AttendanceRecord[]>('GET', `/portal/student/attendance${toQS(params as Record<string, string>)}`),
  portalStudentTimetable:    () => request<ScheduleEntry[]>('GET', '/portal/student/timetable'),
  portalStudentReportCards:  () => request<ReportCard[]>('GET', '/portal/student/report-cards'),
  portalStudentBehavior:     () => request<BehaviorRecord[]>('GET', '/portal/student/behavior'),

  // ── Portal: Parent ────────────────────────────────────────────────
  portalParentProfile:        () => request<Parent>('GET', '/portal/parent/profile'),
  portalParentProfileUpdate:  (data: Partial<Parent>) => request<Parent>('PUT', '/portal/parent/profile', data),
  portalParentChildren:       () => request<Student[]>('GET', '/portal/parent/children'),
  portalParentChildMarks:     (sid: string, termId?: string) =>
    request<Mark[]>('GET', `/portal/parent/children/${sid}/marks${termId ? `?termId=${termId}` : ''}`),
  portalParentChildAttendance:(sid: string, params?: { from?: string; to?: string }) =>
    request<AttendanceRecord[]>('GET', `/portal/parent/children/${sid}/attendance${toQS(params as Record<string, string>)}`),
  portalParentChildFees:      (sid: string) => request<FeeRecord[]>('GET', `/portal/parent/children/${sid}/fees`),
  portalParentChildReportCards:(sid: string) => request<ReportCard[]>('GET', `/portal/parent/children/${sid}/report-cards`),
  portalParentChildBehavior:  (sid: string) => request<BehaviorRecord[]>('GET', `/portal/parent/children/${sid}/behavior`),

  // ── Platform (Super Admin) ─────────────────────────────────────────
  platform: {
    getDashboard: () => request<PlatformDashboardData>('GET', '/platform/dashboard'),

    getSchools:      () => request<PlatformSchool[]>('GET', '/platform/schools'),
    getSchool:       (id: string) => request<PlatformSchool>('GET', `/platform/schools/${id}`),
    getSchoolSummary:(id: string) => request<SchoolSummary>('GET', `/platform/schools/${id}/summary`),
    createSchool:    (data: CreateSchoolInput) =>
      request<{ school: PlatformSchool; admin: { email: string; tempPassword: string } }>('POST', '/platform/schools', data),
    updateSchool:    (id: string, data: Partial<PlatformSchool>) => request<PlatformSchool>('PUT', `/platform/schools/${id}`, data),
    activateSchool:  (id: string) => request<PlatformSchool>('PATCH', `/platform/schools/${id}/activate`),
    deactivateSchool:(id: string) => request<PlatformSchool>('PATCH', `/platform/schools/${id}/deactivate`),

    getPlans:   () => request<SubscriptionPlan[]>('GET', '/platform/plans'),
    createPlan: (data: Partial<SubscriptionPlan>) => request<SubscriptionPlan>('POST', '/platform/plans', data),
    updatePlan: (id: string, data: Partial<SubscriptionPlan>) => request<SubscriptionPlan>('PUT', `/platform/plans/${id}`, data),
    deletePlan: (id: string) => request<void>('DELETE', `/platform/plans/${id}`),

    getUsers: () => request<PlatformUserRow[]>('GET', '/platform/users'),

    getLogs: (params?: { limit?: number; offset?: number; action?: string }) =>
      request<{ rows: SystemLog[]; total: number; limit: number; offset: number }>(
        'GET', `/platform/logs${toQS(params as unknown as Record<string, string>)}`
      ),

    getAdmins:   () => request<PlatformAdmin[]>('GET', '/platform/admins'),
    createAdmin: (data: { name: string; email: string; password: string; role?: string; permissions?: string[] }) =>
      request<PlatformAdmin>('POST', '/platform/admins', data),
    updateAdmin: (id: string, data: Partial<PlatformAdmin> & { permissions?: string[] }) => request<PlatformAdmin>('PUT', `/platform/admins/${id}`, data),
    deleteAdmin: (id: string) => request<void>('DELETE', `/platform/admins/${id}`),

    getAnnouncements:   () => request<PlatformAnnouncement[]>('GET', '/platform/announcements'),
    createAnnouncement: (data: { title: string; body: string; is_pinned?: boolean }) =>
      request<PlatformAnnouncement>('POST', '/platform/announcements', data),
    updateAnnouncement: (id: string, data: Partial<PlatformAnnouncement>) =>
      request<PlatformAnnouncement>('PUT', `/platform/announcements/${id}`, data),
    deleteAnnouncement: (id: string) => request<void>('DELETE', `/platform/announcements/${id}`),

    getSettings:    () => request<PlatformSettings>('GET', '/platform/settings'),
    updateSettings: (data: Partial<PlatformSettings>) => request<PlatformSettings>('PUT', '/platform/settings', data),

    getFeatures:   () => request<PlatformFeature[]>('GET', '/platform/features'),
    createFeature: (data: { key: string; label: string; description?: string }) =>
      request<PlatformFeature>('POST', '/platform/features', data),
    deleteFeature: (id: string) => request<void>('DELETE', `/platform/features/${id}`),

    getSchoolsByStatusReport: () => request<{ status: string; count: number }[]>('GET', '/platform/reports/schools-by-status'),
    getRevenueByPlanReport:   () => request<{ plan_name: string; price: number; school_count: number; revenue: number }[]>('GET', '/platform/reports/revenue-by-plan'),
    getSignupsByMonthReport:  () => request<{ month: string; count: number }[]>('GET', '/platform/reports/signups-by-month'),

    exportBackup: async (): Promise<Blob> => {
      const res = await fetch(`${BASE}/api/platform/backup/export`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    },
    restoreBackup: async (schoolId: string, file: File): Promise<{ message: string }> => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BASE}/api/platform/backup/restore/${schoolId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function toQS(params?: Record<string, string>): string {
  if (!params) return '';
  const q = new URLSearchParams(params).toString();
  return q ? `?${q}` : '';
}

// ── Minimal type stubs (mirrors existing types + API shapes) ─────────────────
export interface AuthUser {
  id: string; name: string; email: string;
  role: 'super_admin' | 'head_teacher' | 'teacher' | 'student' | 'parent' | 'platform_owner' | 'platform_admin';
  initials: string; teacher_id?: string | null; student_id?: string | null; parent_id?: string | null;
  must_change_password?: boolean;
}
export interface School { id: string; name: string; code: string; address: string; phone: string; email: string; head_teacher: string; motto: string; logo_url?: string; }
export interface AcademicYear { id: string; label: string; start_date: string; end_date: string; is_current: number; }
export interface Term { id: string; academic_year_id: string; name: string; start_date: string; end_date: string; is_current: number; }
export interface GradeLevel { id: string; name: string; sort_order: number; }
export interface Subject { id: string; name: string; code: string; }
export interface Teacher { id: string; first_name: string; last_name: string; email: string; phone: string; gender: string; subjects: string[]; class_assigned?: string; qualification: string; join_date: string; is_active: number; }
export interface TeacherInput { firstName?: string; lastName?: string; email?: string; phone?: string; gender?: string; subjects?: string[]; classAssigned?: string; qualification?: string; joinDate?: string; isActive?: boolean; }
export interface ClassRecord { id: string; grade_level_id: string; grade_level_name: string; name: string; capacity: number; room: string; class_teacher_id?: string; class_teacher_name?: string; enrolled: number; }
export interface Student { id: string; student_number: string; first_name: string; last_name: string; date_of_birth: string; gender: string; class_id: string; class_name: string; grade_level_name: string; guardian_name: string; guardian_phone: string; guardian_relationship: string; admission_date: string; is_active: number; address: string; }
export interface Parent { id: string; name: string; email?: string; phone: string; relationship?: string; address?: string; occupation?: string; children?: Student[]; }
export interface AttendanceRecord { id: string; student_id: string; student_name: string; student_number: string; class_id: string; class_name: string; date: string; status: string; remarks?: string; }
export interface AttendanceStat { student_id: string; student_name: string; present: number; absent: number; late: number; excused: number; total: number; }
export interface TeacherAttendanceRecord { id: string; teacher_id: string; date: string; status: string; remarks?: string; first_name: string; last_name: string; }
export interface ScheduleEntry { id: string; teacher_id: string; day: string; period_key: string; period_label: string; time: string; class_id: string; class_name: string; subject_name: string; room: string; first_name?: string; last_name?: string; }
export interface Mark { id: string; student_id: string; student_name: string; subject_id: string; subject_name: string; term_id: string; class_id: string; ca_score: number; exam_score: number; total_score: number; grade: string; remark: string; }
export interface ReportCard { id: string; student_id: string; student_name: string; term_name: string; academic_year: string; class_name: string; percentage: number; class_position: number; status: string; conduct: string; entries: ReportCardEntry[]; }
export interface ReportCardEntry { subject_id: string; subject_name: string; ca_score: number; exam_score: number; total_score: number; grade: string; position?: number; teacher_comment?: string; }
export interface Payment { id: string; fee_record_id: string; amount: number; method: string; reference: string; payment_date: string; receipt_number: string; }
export interface FeeRecord { id: string; student_id: string; student_name: string; student_number: string; class_id: string; class_name: string; fee_name: string; academic_year: string; amount_due: number; amount_paid: number; balance: number; status: string; due_date: string; payments: Payment[]; }
export interface FeesSummary { total_due: number; total_collected: number; total_pending: number; paid_count: number; partial_count: number; overdue_count: number; total_records: number; }
export interface PayrollRecord { id: string; teacher_id: string; month: string; hourly_rate: number; contracted_hours: number; base_allowance: number; absence_deduction: number; late_deduction: number; hours_worked: number; absences: number; late_coming: number; bonus: number; notes: string; status: string; gross: number; absenceDeduct: number; lateDeduct: number; totalDeductions: number; netPay: number; teacher?: Teacher; }
export interface Announcement { id: string; title: string; body: string; author: string; audience: string; type: 'info' | 'warning' | 'success'; is_pinned: number; created_at: string; updated_at: string; }
export interface EmailAlert { id: string; subject: string; body: string; recipient: string; sender: string; status: string; sent_at: string; }
export interface ForumThread { id: string; title: string; tag: string; author: string; is_pinned: number; message_count: number; created_at: string; updated_at: string; }
export interface ForumMessage { id: string; thread_id: string; author: string; type: string; content?: string; image_url?: string; voice_url?: string; voice_duration?: number; created_at: string; }
export interface DashboardData { totalStudents: number; totalTeachers: number; totalClasses: number; presentToday: number; absentToday: number; attendanceRate: number; feesCollected: number; feesPending: number; feesTotal: number; recentAnnouncements: Announcement[]; classSizes: { name: string; enrolled: number; capacity: number }[]; feesByStatus: { status: string; count: number; total_balance: number }[]; }
export interface PortalUser { id: string; name: string; email: string; role: string; initials: string; teacher_id?: string | null; student_id?: string | null; parent_id?: string | null; created_at: string; }
export interface CreateUserInput { name: string; email: string; password: string; role: string; initials?: string; teacher_id?: string | null; student_id?: string | null; parent_id?: string | null; }
export interface BehaviorRecord { id: string; student_id: string; class_id?: string | null; teacher_id?: string | null; date: string; category: 'positive' | 'negative' | 'neutral'; description: string; action_taken?: string | null; created_by?: string | null; student_name?: string; teacher_name?: string; created_at: string; }
export interface Withdrawal { id: string; teacher_id: string; payroll_id?: string | null; amount: number; reason?: string | null; status: 'pending' | 'approved' | 'rejected'; reviewed_by?: string | null; reviewed_at?: string | null; notes?: string | null; teacher_name?: string; teacher_email?: string; created_at: string; }
export interface MigrationResult { success: boolean; defaultPassword: string; result: { teachers: { created: number; skipped: number }; students: { created: number; skipped: number }; parents: { created: number; skipped: number }; }; }
export interface SavedCertificate {
  id: string; student_id: string; student_name?: string | null; student_number?: string | null; class_name?: string | null;
  doc_type_id: string; theme_id: string; kind: 'certificate' | 'attestation';
  doc_label: string; body_html: string; recipient_name: string;
  issue_date: string; cert_number: string; signatory_name?: string | null; signatory_title?: string | null;
  style?: unknown; created_by?: string | null; created_at: string; updated_at: string;
}
export interface CertificateInput {
  studentId: string; studentName?: string; studentNumber?: string; className?: string;
  docTypeId: string; themeId: string; kind: 'certificate' | 'attestation';
  docLabel: string; bodyHtml: string; recipientName: string;
  issueDate: string; certNumber: string; signatoryName?: string; signatoryTitle?: string;
  style?: unknown;
}

// ── Platform (Super Admin) types ──────────────────────────────────────────────
export interface PlatformSchool {
  id: string; name: string; code?: string | null; address?: string | null; phone?: string | null;
  email: string; admin_name: string; admin_email: string; plan_id: string;
  status: 'active' | 'inactive' | 'suspended' | 'archived';
  subscription_started?: string; subscription_expiry?: string | null;
  created_at: string; updated_at: string;
  plan_name?: string; plan_price?: number;
  students?: number; teachers?: number;
}
export interface CreateSchoolInput {
  name: string; email: string; phone?: string; address?: string; plan_id: string;
  admin_name: string; admin_email: string;
}
export interface SchoolSummary {
  students: number; teachers: number; classes: number;
  recentAnnouncements: { title: string; created_at: string }[];
  fees: { collected: number | null; pending: number | null };
}
export interface SubscriptionPlan {
  id: string; name: string; price: number; billing_cycle: 'monthly' | 'yearly';
  max_students: number | null; max_teachers: number | null; features: string[]; is_custom: number;
  school_count?: number; created_at: string; updated_at: string;
}
export interface PlatformUserRow {
  id: string; name: string; email: string; role: string; initials: string; created_at: string;
  school_id: string; school_name: string;
}
export interface SystemLog {
  id: string; actor_type: string; actor_id: string | null; actor_name: string | null;
  action: string; target_type: string | null; target_id: string | null; meta: string | null; created_at: string;
}
export interface PlatformAdmin {
  id: string; name: string; email: string; role: 'platform_owner' | 'platform_admin'; initials: string; permissions: string[]; created_at: string;
}
export interface PlatformAnnouncement { id: string; title: string; body: string; is_pinned: number; created_at: string; updated_at: string; }
export interface PlatformSettings { id: string; platform_name: string; logo_url?: string | null; support_email?: string | null; default_plan_id?: string | null; updated_at: string; }
export interface PlatformFeature { id: string; key: string; label: string; description?: string | null; }
export interface PlatformDashboardData {
  totalSchools: number; activeSchools: number; inactiveSchools: number;
  totalStudents: number; totalTeachers: number; totalParents: number; revenue: number;
  schoolsByPlan: { name: string; count: number }[];
  schoolsOverview: { month: string; active: number; new: number }[];
  recentActivities: SystemLog[];
}
