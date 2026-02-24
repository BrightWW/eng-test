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
    <div className="container" style={{ paddingTop: '80px' }}>
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '30px', textAlign: 'center' }}>
          學生作答
        </h1>
        
        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {/* Existing students selection */}
        {!loadingStudents && students.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <label className="label">選擇已登入的學生</label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
              gap: '10px',
              marginBottom: '20px'
            }}>
              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => handleSelectStudent(student.name)}
                  disabled={loading}
                  style={{
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    color: '#333'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#4CAF50';
                    e.target.style.background = '#f0f9f0';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#e0e0e0';
                    e.target.style.background = 'white';
                  }}
                >
                  {student.name}
                </button>
              ))}
            </div>
            <div style={{ 
              textAlign: 'center', 
              color: '#666', 
              fontSize: '14px',
              margin: '15px 0'
            }}>
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
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? '進入中...' : '開始測驗'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a href="/" style={{ color: '#666', textDecoration: 'none' }}>
            ← 返回首頁
          </a>
        </div>
      </div>
    </div>
  );
};

export default StudentEnter;
