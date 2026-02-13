import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const StudentResult = () => {
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { student, studentLeave } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!student) {
      navigate('/student/enter');
      return;
    }

    loadResults();
  }, [student, navigate]);

  const loadResults = async () => {
    try {
      setLoading(true);
      
      // Get active exam
      const examRes = await api.get('/exams/active');
      if (!examRes.data.exam) {
        setError('測驗不存在');
        setLoading(false);
        return;
      }

      // Get submission and answers
      const resultRes = await api.get(`/submissions/student/${student.id}/exam/${examRes.data.exam.id}`);
      
      if (!resultRes.data.submission) {
        setError('尚未作答');
        setLoading(false);
        return;
      }

      setSubmission(resultRes.data.submission);
      setAnswers(resultRes.data.answers);
      setLoading(false);
    } catch (err) {
      console.error('Load results error:', err);
      setError(err.response?.data?.error || '載入結果失敗');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    studentLeave();
    navigate('/');
  };

  if (loading) {
    return <div className="loading">載入結果中...</div>;
  }

  if (error) {
    return (
      <div className="container" style={{ paddingTop: '80px' }}>
        <div className="alert alert-error">{error}</div>
        <button onClick={() => navigate('/')} className="btn btn-secondary">
          返回首頁
        </button>
      </div>
    );
  }

  const isGraded = submission?.status === 'graded';

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <div>
            <h1 style={{ fontSize: '24px' }}>測驗結果</h1>
            <p style={{ color: '#666', marginTop: '5px' }}>學生：{student.name}</p>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            登出
          </button>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>作答狀態</h2>
          
          <div className="flex-space-between mb-20">
            <span>提交時間：</span>
            <strong>{submission?.submitted_at ? new Date(submission.submitted_at).toLocaleString('zh-TW') : '尚未提交'}</strong>
          </div>

          <div className="flex-space-between mb-20">
            <span>批改狀態：</span>
            {isGraded ? (
              <span className="badge badge-success">已批改</span>
            ) : (
              <span className="badge badge-warning">等待批改</span>
            )}
          </div>

          {isGraded && (
            <div className="flex-space-between">
              <span>總分：</span>
              <strong style={{ fontSize: '24px', color: '#4CAF50' }}>
                {submission.total_score} 分
              </strong>
            </div>
          )}
        </div>

        {isGraded ? (
          <div className="card">
            <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>批改詳情</h2>
            
            {answers.map((answer, index) => (
              <div key={answer.id} className="question" style={{
                borderLeft: answer.is_correct ? '4px solid #4CAF50' : '4px solid #f44336'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <strong>題目 {index + 1}</strong>
                  {answer.is_correct !== null && (
                    <span style={{ marginLeft: '10px' }}>
                      {answer.is_correct ? (
                        <span className="badge badge-success">✓ 正確</span>
                      ) : (
                        <span style={{ 
                          backgroundColor: '#f8d7da', 
                          color: '#721c24',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>✗ 錯誤</span>
                      )}
                    </span>
                  )}
                </div>

                <div className="question-content">{answer.question_content}</div>
                
                <div style={{ marginTop: '15px' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>你的答案：</strong>
                    <div style={{ 
                      padding: '10px', 
                      backgroundColor: '#f5f5f5', 
                      borderRadius: '4px',
                      marginTop: '5px'
                    }}>
                      {answer.student_answer || '未作答'}
                    </div>
                  </div>

                  {answer.comment && (
                    <div style={{ marginTop: '10px' }}>
                      <strong>教師評語：</strong>
                      <div style={{ 
                        padding: '10px', 
                        backgroundColor: '#fff3cd', 
                        borderRadius: '4px',
                        marginTop: '5px',
                        color: '#856404'
                      }}>
                        {answer.comment}
                      </div>
                    </div>
                  )}

                  {answer.score !== null && (
                    <div style={{ marginTop: '10px' }}>
                      <strong>得分：</strong> {answer.score} 分
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="alert alert-info">
            <strong>提醒：</strong>您的答案已送出，請等待教師批改。批改完成後，您可以再次進入查看結果。
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentResult;
