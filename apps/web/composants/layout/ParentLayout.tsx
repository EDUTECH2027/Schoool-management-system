import PortalLayout from './PortalLayout';
import ParentSidebar from './ParentSidebar';

export default function ParentLayout() {
  return <PortalLayout sidebar={<ParentSidebar />} />;
}
