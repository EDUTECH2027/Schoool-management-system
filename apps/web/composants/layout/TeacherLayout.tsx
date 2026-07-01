import PortalLayout from './PortalLayout';
import TeacherSidebar from './TeacherSidebar';

export default function TeacherLayout() {
  return <PortalLayout sidebar={<TeacherSidebar />} />;
}
