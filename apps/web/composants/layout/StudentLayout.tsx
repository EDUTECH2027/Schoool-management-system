import PortalLayout from './PortalLayout';
import StudentSidebar from './StudentSidebar';

export default function StudentLayout() {
  return <PortalLayout sidebar={<StudentSidebar />} />;
}
