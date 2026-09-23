/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import PortalLayout from './PortalLayout';
import TeacherSidebar from './TeacherSidebar';

export default function TeacherLayout() {
  return <PortalLayout sidebar={<TeacherSidebar />} />;
}
