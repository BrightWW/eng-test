import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Pages
import Home from './pages/Home';
import StudentEnter from './pages/student/Enter';
import StudentExam from './pages/student/Exam';
import StudentResult from './pages/student/Result';
import StudentHistory from './pages/student/History';
import StudentResultDetail from './pages/student/ResultDetail';
import TeacherLogin from './pages/teacher/Login';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherExamEditor from './pages/teacher/ExamEditor';
import TeacherGrading from './pages/teacher/Grading';
import TeacherUploadExam from './pages/teacher/UploadExam';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          
          {/* Student Routes */}
          <Route path="/student/enter" element={<StudentEnter />} />
          <Route path="/student/history" element={<StudentHistory />} />
          <Route path="/student/exam" element={<StudentExam />} />
          <Route path="/student/result" element={<StudentResult />} />
          <Route path="/student/result/:submissionId" element={<StudentResultDetail />} />
          
          {/* Teacher Routes */}
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/upload" element={<TeacherUploadExam />} />
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
