/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PlatformLayout        from '../composants/layout/PlatformLayout';

// Each page is its own chunk: only the page being viewed is downloaded.
const PlatformDashboard = lazy(() => import('../pages/platform/PlatformDashboard'));
const Schools = lazy(() => import('../pages/platform/Schools'));
const SchoolDetail = lazy(() => import('../pages/platform/SchoolDetail'));
const PlatformUsers = lazy(() => import('../pages/platform/PlatformUsers'));
const Subscriptions = lazy(() => import('../pages/platform/Subscriptions'));
const Reports = lazy(() => import('../pages/platform/Reports'));
const SystemLogs = lazy(() => import('../pages/platform/SystemLogs'));
const PlansBilling = lazy(() => import('../pages/platform/PlansBilling'));
const Features = lazy(() => import('../pages/platform/Features'));
const PlatformAnnouncements = lazy(() => import('../pages/platform/PlatformAnnouncements'));
const RolesPermissions = lazy(() => import('../pages/platform/RolesPermissions'));
const PlatformSettings = lazy(() => import('../pages/platform/PlatformSettings'));
const BackupRestore = lazy(() => import('../pages/platform/BackupRestore'));

export default function PlatformRoutes() {
  return (
    <Routes>
      <Route path="/platform" element={<PlatformLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"          element={<PlatformDashboard />} />
        <Route path="schools"            element={<Schools />} />
        <Route path="schools/:id"        element={<SchoolDetail />} />
        <Route path="users"              element={<PlatformUsers />} />
        <Route path="subscriptions"      element={<Subscriptions />} />
        <Route path="reports"            element={<Reports />} />
        <Route path="system-logs"        element={<SystemLogs />} />
        <Route path="plans-billing"      element={<PlansBilling />} />
        <Route path="features"           element={<Features />} />
        <Route path="announcements"      element={<PlatformAnnouncements />} />
        <Route path="roles-permissions"  element={<RolesPermissions />} />
        <Route path="settings"           element={<PlatformSettings />} />
        <Route path="backup-restore"     element={<BackupRestore />} />
      </Route>
      <Route path="*" element={<Navigate to="/platform/dashboard" replace />} />
    </Routes>
  );
}
