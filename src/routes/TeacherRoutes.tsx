/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TeacherLayout      from '../composants/layout/TeacherLayout';

// Each page is its own chunk: only the page being viewed is downloaded.
const TeacherDashboard = lazy(() => import('../pages/teacher/TeacherDashboard'));
const TeacherProfile = lazy(() => import('../pages/teacher/TeacherProfile'));
const TeacherMyClass = lazy(() => import('../pages/teacher/TeacherMyClass'));
const TeacherMarks = lazy(() => import('../pages/teacher/TeacherMarks'));
const TeacherAttendance = lazy(() => import('../pages/teacher/TeacherAttendance'));
const TeacherMyAttendance = lazy(() => import('../pages/teacher/TeacherMyAttendance'));
const TeacherScanAttendance = lazy(() => import('../pages/teacher/TeacherScanAttendance'));
const TeacherTimetable = lazy(() => import('../pages/teacher/TeacherTimetable'));
const TeacherBehavior = lazy(() => import('../pages/teacher/TeacherBehavior'));
const TeacherSalary = lazy(() => import('../pages/teacher/TeacherSalary'));

export default function TeacherRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/teacher/dashboard" replace />} />
      <Route path="/teacher" element={<TeacherLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"     element={<TeacherDashboard   />} />
        <Route path="profile"       element={<TeacherProfile     />} />
        <Route path="my-class"      element={<TeacherMyClass     />} />
        <Route path="marks"         element={<TeacherMarks       />} />
        <Route path="attendance"    element={<TeacherAttendance  />} />
        <Route path="my-attendance" element={<TeacherMyAttendance />} />
        <Route path="scan-attendance" element={<TeacherScanAttendance />} />
        <Route path="timetable"     element={<TeacherTimetable   />} />
        <Route path="behavior"      element={<TeacherBehavior    />} />
        <Route path="salary"        element={<TeacherSalary      />} />
      </Route>
      <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
    </Routes>
  );
}
