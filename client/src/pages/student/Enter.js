import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const StudentEnter = () => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const { studentEnter } = useAuth();
  const navigate = useNavigate();

  // Load existing students on component mount
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get('/students');
        setStudents(response.data.students || []);
      } catch (err) {
        console.error('Failed to load students:', err);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('請輸入您的姓名');
      return;
    }

    try {
      setLoading(true);
      await studentEnter(name.trim());
      navigate('/student/history');
    } catch (err) {
      setError(err.response?.data?.error || '發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = async (studentName) => {
    try {
      setLoading(true);
      setError('');
      await studentEnter(studentName);
      navigate('/student/history');
    } catch (err) {
      setError(err.response?.data?.error || '發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container pt-page">
      <div className="card max-w-sm mx-auto">
        <h1 className="page-title">
          學生作答
        </h1>
        
        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {/* Existing students selection */}
        {!loadingStudents && students.length > 0 && (
          <div className="mb-30">
            <label className="label">選擇已登入的學生</label>
            <div className="grid-students mb-20">
              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => handleSelectStudent(student.name)}
                  disabled={loading}
                  className="student-name-btn"
                >
                  {student.name}
                </button>
              ))}
            </div>
            <div className="divider-text">
              或
            </div>
          </div>
        )}

        {/* Manual name input */}
        <form onSubmit={handleSubmit}>
          <label className="label">
            {students.length > 0 ? '輸入新的姓名' : '請輸入您的姓名'}
          </label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：王小明"
            disabled={loading}
            autoFocus={students.length === 0}
          />

          <button 
            type="submit" 
            className="btn btn-primary w-full" 
            disabled={loading}
          >
            {loading ? '進入中...' : '開始測驗'}
          </button>
        </form>

        <div className="mt-20 text-center">
          <a href="/" className="link-back">
            ← 返回首頁
          </a>
        </div>
      </div>
    </div>
  );
};

export default StudentEnter;
