/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentLayout     from '../composants/layout/StudentLayout';

// Each page is its own chunk: only the page being viewed is downloaded.
const StudentDashboard = lazy(() => import('../pages/student/StudentDashboard'));
const StudentProfile = lazy(() => import('../pages/student/StudentProfile'));
const StudentMarks = lazy(() => import('../pages/student/StudentMarks'));
const StudentAttendance = lazy(() => import('../pages/student/StudentAttendance'));
const StudentTimetable = lazy(() => import('../pages/student/StudentTimetable'));

export default function StudentRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/student/dashboard" replace />} />
      <Route path="/student" element={<StudentLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"  element={<StudentDashboard  />} />
        <Route path="profile"    element={<StudentProfile    />} />
        <Route path="marks"      element={<StudentMarks      />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="timetable"  element={<StudentTimetable  />} />
      </Route>
      <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
    </Routes>
  );
}
