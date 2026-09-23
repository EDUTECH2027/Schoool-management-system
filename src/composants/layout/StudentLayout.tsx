/*
 * Copyright (c) 2026 [COMPANY LEGAL NAME]. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or
 * modification of this file, via any medium, is strictly prohibited.
 */
import PortalLayout from './PortalLayout';
import StudentSidebar from './StudentSidebar';

export default function StudentLayout() {
  return <PortalLayout sidebar={<StudentSidebar />} />;
}
