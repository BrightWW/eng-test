import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [teacher, setTeacher] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing teacher token
    const token = localStorage.getItem('teacherToken');
    const teacherData = localStorage.getItem('teacher');
    
    if (token && teacherData) {
      setTeacher(JSON.parse(teacherData));
    }

    // Check for existing student data
    const studentData = localStorage.getItem('student');
    if (studentData) {
      setStudent(JSON.parse(studentData));
    }

    setLoading(false);
  }, []);

  const teacherLogin = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { token, teacher: teacherData } = response.data;
    
    localStorage.setItem('teacherToken', token);
    localStorage.setItem('teacher', JSON.stringify(teacherData));
    setTeacher(teacherData);
    
    return teacherData;
  };

  const teacherLogout = () => {
    localStorage.removeItem('teacherToken');
    localStorage.removeItem('teacher');
    setTeacher(null);
  };

  const studentEnter = async (name) => {
    const response = await api.post('/students/enter', { name });
    const { student: studentData } = response.data;
    
    localStorage.setItem('student', JSON.stringify(studentData));
    setStudent(studentData);
    
    return studentData;
  };

  const studentLeave = () => {
    localStorage.removeItem('student');
    setStudent(null);
  };

  const value = {
    teacher,
    student,
    loading,
    teacherLogin,
    teacherLogout,
    studentEnter,
    studentLeave,
    isTeacher: !!teacher,
    isStudent: !!student,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
