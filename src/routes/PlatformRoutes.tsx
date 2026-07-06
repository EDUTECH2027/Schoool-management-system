import { Routes, Route, Navigate } from 'react-router-dom';
import PlatformLayout        from '../composants/layout/PlatformLayout';
import PlatformDashboard     from '../pages/platform/PlatformDashboard';
import Schools               from '../pages/platform/Schools';
import SchoolDetail          from '../pages/platform/SchoolDetail';
import PlatformUsers         from '../pages/platform/PlatformUsers';
import Subscriptions         from '../pages/platform/Subscriptions';
import Reports               from '../pages/platform/Reports';
import SystemLogs            from '../pages/platform/SystemLogs';
import PlansBilling          from '../pages/platform/PlansBilling';
import Features              from '../pages/platform/Features';
import PlatformAnnouncements from '../pages/platform/PlatformAnnouncements';
import RolesPermissions      from '../pages/platform/RolesPermissions';
import PlatformSettings      from '../pages/platform/PlatformSettings';
import BackupRestore         from '../pages/platform/BackupRestore';

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
