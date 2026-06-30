import { Routes, Route, Navigate } from 'react-router-dom';
import StudentLayout     from '../composants/layout/StudentLayout';
import StudentDashboard  from '../pages/student/StudentDashboard';
import StudentProfile    from '../pages/student/StudentProfile';
import StudentMarks      from '../pages/student/StudentMarks';
import StudentAttendance from '../pages/student/StudentAttendance';
import StudentTimetable  from '../pages/student/StudentTimetable';

export default function StudentRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/student/dashboard" replace />} />
      <Route path="/student" element={<StudentLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"  element={<StudentDashboard  />} />
        <Route path="profile"    element={<StudentProfile    />} />
        <Route path="marks"      element={<StudentMarks      />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="timetable"  element={<StudentTimetable  />} />
      </Route>
      <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
    </Routes>
  );
}
