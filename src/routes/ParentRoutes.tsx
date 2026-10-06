/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ParentLayout          from '../composants/layout/ParentLayout';

// Each page is its own chunk: only the page being viewed is downloaded.
const ParentDashboard = lazy(() => import('../pages/parent/ParentDashboard'));
const ParentProfile = lazy(() => import('../pages/parent/ParentProfile'));
const ParentChildren = lazy(() => import('../pages/parent/ParentChildren'));
const ParentChildMarks = lazy(() => import('../pages/parent/ParentChildMarks'));
const ParentChildAttendance = lazy(() => import('../pages/parent/ParentChildAttendance'));
const ParentChildFees = lazy(() => import('../pages/parent/ParentChildFees'));

export default function ParentRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/parent/dashboard" replace />} />
      <Route path="/parent" element={<ParentLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"                              element={<ParentDashboard       />} />
        <Route path="profile"                                element={<ParentProfile         />} />
        <Route path="children"                               element={<ParentChildren        />} />
        <Route path="children/:studentId/marks"              element={<ParentChildMarks      />} />
        <Route path="children/:studentId/attendance"         element={<ParentChildAttendance />} />
        <Route path="children/:studentId/fees"               element={<ParentChildFees       />} />
      </Route>
      <Route path="*" element={<Navigate to="/parent/dashboard" replace />} />
    </Routes>
  );
}
