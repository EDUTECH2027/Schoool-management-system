/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import ParentLayout          from '../composants/layout/ParentLayout';
import ParentDashboard       from '../pages/parent/ParentDashboard';
import ParentProfile         from '../pages/parent/ParentProfile';
import ParentChildren        from '../pages/parent/ParentChildren';
import ParentChildMarks      from '../pages/parent/ParentChildMarks';
import ParentChildAttendance from '../pages/parent/ParentChildAttendance';
import ParentChildFees       from '../pages/parent/ParentChildFees';

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
