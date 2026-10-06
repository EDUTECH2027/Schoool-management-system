/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout          from '../composants/layout/Layout';

// Each page is its own chunk: only the page being viewed is downloaded.
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Students = lazy(() => import('../pages/Students'));
const Classes = lazy(() => import('../pages/Classes'));
const Teachers = lazy(() => import('../pages/Teachers'));
const Attendance = lazy(() => import('../pages/Attendance'));
const Assessments = lazy(() => import('../pages/Assessments'));
const ReportCards = lazy(() => import('../pages/ReportCards'));
const Fees = lazy(() => import('../pages/Fees'));
const Timetable = lazy(() => import('../pages/Timetable'));
const Parents = lazy(() => import('../pages/Parents'));
const Settings = lazy(() => import('../pages/Settings'));
const Announcements = lazy(() => import('../pages/Announcements'));
const EmailAlerts = lazy(() => import('../pages/EmailAlerts'));
const DiscussionForums = lazy(() => import('../pages/DiscussionForums'));
const TeacherPayment = lazy(() => import('../pages/TeacherPayment'));
const Certificates = lazy(() => import('../pages/Certificates'));
const UserManagement = lazy(() => import('../pages/admin/UserManagement'));
const AdminWithdrawals = lazy(() => import('../pages/admin/AdminWithdrawals'));
const ReportCardTemplateDesigner = lazy(() => import('../pages/admin/ReportCardTemplateDesigner'));

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"         element={<Dashboard        />} />
        <Route path="students"          element={<Students         />} />
        <Route path="classes"           element={<Classes          />} />
        <Route path="teachers"          element={<Teachers         />} />
        <Route path="attendance"        element={<Attendance       />} />
        <Route path="assessments"       element={<Assessments      />} />
        <Route path="report-cards"      element={<ReportCards      />} />
        <Route path="certificates"      element={<Certificates     />} />
        <Route path="fees"              element={<Fees             />} />
        <Route path="timetable"         element={<Timetable        />} />
        <Route path="parents"           element={<Parents          />} />
        <Route path="settings"          element={<Settings         />} />
        <Route path="report-card-template" element={<ReportCardTemplateDesigner />} />
        <Route path="announcements"     element={<Announcements    />} />
        <Route path="email-alerts"      element={<EmailAlerts      />} />
        <Route path="discussion-forums" element={<DiscussionForums />} />
        <Route path="teacher-payment"   element={<TeacherPayment  />} />
        <Route path="user-management"   element={<UserManagement  />} />
        <Route path="withdrawals"       element={<AdminWithdrawals />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
