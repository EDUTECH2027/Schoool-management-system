import { Routes, Route, Navigate } from 'react-router-dom';
import TeacherLayout      from '../composants/layout/TeacherLayout';
import TeacherDashboard   from '../pages/teacher/TeacherDashboard';
import TeacherProfile     from '../pages/teacher/TeacherProfile';
import TeacherMyClass     from '../pages/teacher/TeacherMyClass';
import TeacherMarks       from '../pages/teacher/TeacherMarks';
import TeacherAttendance  from '../pages/teacher/TeacherAttendance';
import TeacherMyAttendance from '../pages/teacher/TeacherMyAttendance';
import TeacherTimetable   from '../pages/teacher/TeacherTimetable';
import TeacherBehavior    from '../pages/teacher/TeacherBehavior';
import TeacherSalary      from '../pages/teacher/TeacherSalary';

export default function TeacherRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/teacher/dashboard" replace />} />
      <Route path="/teacher" element={<TeacherLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"     element={<TeacherDashboard   />} />
        <Route path="profile"       element={<TeacherProfile     />} />
        <Route path="my-class"      element={<TeacherMyClass     />} />
        <Route path="marks"         element={<TeacherMarks       />} />
        <Route path="attendance"    element={<TeacherAttendance  />} />
        <Route path="my-attendance" element={<TeacherMyAttendance />} />
        <Route path="timetable"     element={<TeacherTimetable   />} />
        <Route path="behavior"      element={<TeacherBehavior    />} />
        <Route path="salary"        element={<TeacherSalary      />} />
      </Route>
      <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
    </Routes>
  );
}
