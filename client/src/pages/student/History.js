import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const StudentHistory = () => {
  const [submissions, setSubmissions] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { student, studentLeave } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!student) {
      navigate('/student/enter');
      return;
    }

    loadData();
  }, [student, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load history
      const historyRes = await api.get(`/submissions/student/${student.id}/history`);
      setSubmissions(historyRes.data.submissions);

      // Check if there's an active exam
      const examRes = await api.get('/exams/active');
      setActiveExam(examRes.data.exam);

      setLoading(false);
    } catch (err) {
      console.error('Load data error:', err);
      setError(err.response?.data?.error || '載入資料失敗');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    studentLeave();
    navigate('/');
  };

  if (loading) {
    return <div className="loading">載入中...</div>;
  }

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <div>
            <h1 style={{ fontSize: '24px' }}>學生測驗中心</h1>
            <p style={{ color: '#666', marginTop: '5px' }}>學生：{student?.name}</p>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            登出
          </button>
        </div>
      </div>

      <div className="container">
        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {/* Active Exam Card */}
        <div className="card">
          <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>進行中的測驗</h2>
          
          {activeExam ? (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#e8f5e9', 
              borderRadius: '8px',
              border: '2px solid #4CAF50'
            }}>
              <h3 style={{ marginBottom: '10px' }}>{activeExam.title}</h3>
              {activeExam.description && (
                <p style={{ color: '#666', marginBottom: '15px' }}>{activeExam.description}</p>
              )}
              <Link to="/student/exam" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                開始作答
              </Link>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              目前沒有進行中的測驗
            </div>
          )}
        </div>

        {/* History Card */}
        <div className="card">
          <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>測驗歷史記錄</h2>
          
          {submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              尚未完成任何測驗
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>測驗名稱</th>
                  <th>提交時間</th>
                  <th>狀態</th>
                  <th>總分</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td>
                      <strong>{submission.exam_title}</strong>
                      {submission.exam_description && (
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                          {submission.exam_description}
                        </div>
                      )}
                    </td>
                    <td>{new Date(submission.submitted_at).toLocaleString('zh-TW')}</td>
                    <td>
                      {submission.status === 'graded' ? (
                        <span className="badge badge-success">已批改</span>
                      ) : (
                        <span className="badge badge-warning">待批改</span>
                      )}
                    </td>
                    <td>
                      {submission.status === 'graded' ? (
                        <strong>{submission.total_score} 分</strong>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <Link 
                        to={`/student/result/${submission.id}`} 
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '14px', textDecoration: 'none' }}
                      >
                        查看詳情
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentHistory;
