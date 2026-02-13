import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Pages
import Home from './pages/Home';
import StudentEnter from './pages/student/Enter';
import StudentExam from './pages/student/Exam';
import StudentResult from './pages/student/Result';
import TeacherLogin from './pages/teacher/Login';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherExamEditor from './pages/teacher/ExamEditor';
import TeacherGrading from './pages/teacher/Grading';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          
          {/* Student Routes */}
          <Route path="/student/enter" element={<StudentEnter />} />
          <Route path="/student/exam" element={<StudentExam />} />
          <Route path="/student/result" element={<StudentResult />} />
          
          {/* Teacher Routes */}
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/exam/:examId" element={<TeacherExamEditor />} />
          <Route path="/teacher/exam/:examId/grading" element={<TeacherGrading />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
