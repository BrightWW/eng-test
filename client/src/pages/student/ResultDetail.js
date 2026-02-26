import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const StudentResultDetail = () => {
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { student } = useAuth();
  const { submissionId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!student) {
      navigate('/student/enter');
      return;
    }

    loadResult();
  }, [student, submissionId, navigate]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/submissions/${submissionId}/result`);
      
      // Verify this submission belongs to the current student
      if (response.data.submission.student_id !== student.id) {
        setError('您無權查看此測驗結果');
        setLoading(false);
        return;
      }

      setSubmission(response.data.submission);
      setAnswers(response.data.answers);
      setLoading(false);
    } catch (err) {
      console.error('Load result error:', err);
      setError(err.response?.data?.error || '載入結果失敗');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">載入結果中...</div>;
  }

  if (error) {
    return (
      <div className="container" style={{ paddingTop: '80px' }}>
        <div className="alert alert-error">{error}</div>
        <Link to="/student/history" className="btn btn-secondary">
          返回歷史記錄
        </Link>
      </div>
    );
  }

  const isGraded = submission?.status === 'graded';

  // Group answers by part
  const groupedAnswers = answers.reduce((acc, answer) => {
    const partTitle = answer.part_title;
    if (!acc[partTitle]) {
      acc[partTitle] = {
        order: answer.part_order,
        answers: []
      };
    }
    acc[partTitle].answers.push(answer);
    return acc;
  }, {});

  const sortedParts = Object.entries(groupedAnswers).sort((a, b) => a[1].order - b[1].order);

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <div>
            <h1 style={{ fontSize: '24px' }}>{submission?.exam_title}</h1>
            <p style={{ color: '#666', marginTop: '5px' }}>學生：{student.name}</p>
          </div>
          <Link to="/student/history" className="btn btn-secondary">
            返回歷史記錄
          </Link>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>測驗結果摘要</h2>
          
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
            <>
              <div className="flex-space-between mb-20">
                <span>答對題數：</span>
                <strong style={{ fontSize: '28px', color: '#4CAF50' }}>
                  {submission.total_score} / {answers.length} 題
                </strong>
              </div>
              <div className="flex-space-between">
                <span>正確率：</span>
                <strong style={{ fontSize: '20px', color: '#2196F3' }}>
                  {answers.length > 0 ? ((submission.total_score / answers.length) * 100).toFixed(1) : 0}%
                </strong>
              </div>
            </>
          )}
        </div>

        {isGraded ? (
          sortedParts.map(([partTitle, partData]) => (
            <div key={partTitle} className="card">
              <h2 style={{ fontSize: '20px', marginBottom: '20px', borderBottom: '2px solid #4CAF50', paddingBottom: '10px' }}>
                {partTitle}
              </h2>
              
              {partData.answers.map((answer, index) => (
                <div key={answer.question_id} className="question" style={{
                  borderLeft: answer.is_correct ? '4px solid #4CAF50' : answer.is_correct === false ? '4px solid #f44336' : '4px solid #ddd'
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

                  <div className="question-content">{answer.content}</div>

                  {answer.type === 'multiple_choice' && answer.options && (
                    <div style={{ marginTop: '10px', marginBottom: '15px' }}>
                      {answer.options.map((opt, i) => {
                        const isStudentAnswer = answer.student_answer === opt;
                        const correctLetter = answer.correct_answer?.trim().toUpperCase();
                        const correctIndex = correctLetter ? correctLetter.charCodeAt(0) - 65 : -1;
                        const isCorrectOption = i === correctIndex;
                        const showCorrectAnswer = !answer.is_correct && isCorrectOption && answer.correct_answer;
                        
                        return (
                          <div 
                            key={i} 
                            style={{ 
                              padding: '8px', 
                              marginBottom: '5px',
                              backgroundColor: showCorrectAnswer ? '#e3f2fd' : (isStudentAnswer ? (answer.is_correct ? '#e8f5e9' : '#ffebee') : '#f5f5f5'),
                              borderRadius: '4px',
                              border: showCorrectAnswer 
                                ? '2px solid #2196F3'
                                : (isStudentAnswer 
                                  ? (answer.is_correct ? '2px solid #4CAF50' : '2px solid #f44336')
                                  : '1px solid #ddd')
                            }}
                          >
                            <strong>{String.fromCharCode(65 + i)})</strong> {opt}
                            {showCorrectAnswer && (
                              <span style={{ 
                                marginLeft: '10px', 
                                color: '#1565c0', 
                                fontWeight: 'bold',
                                fontSize: '14px'
                              }}>
                                ← 正確答案
                              </span>
                            )}
                            {isStudentAnswer && !answer.is_correct && (
                              <span style={{ 
                                marginLeft: '10px', 
                                color: '#c62828', 
                                fontWeight: 'bold',
                                fontSize: '14px'
                              }}>
                                (你的選擇)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <strong>你的答案：</strong>
                      <div style={{ 
                        padding: '10px', 
                        backgroundColor: answer.is_correct ? '#e8f5e9' : '#ffebee', 
                        borderRadius: '4px',
                        marginTop: '5px',
                        border: answer.is_correct ? '1px solid #81c784' : '1px solid #e57373'
                      }}>
                        {answer.student_answer || '未作答'}
                      </div>
                    </div>

                    {/* 選擇題答錯或未作答時顯示正確答案 */}
                    {answer.type === 'multiple_choice' && !answer.is_correct && answer.correct_answer && answer.options && (() => {
                      const correctLetter = answer.correct_answer.trim().toUpperCase();
                      const correctIndex = correctLetter.charCodeAt(0) - 65;
                      const correctOptionText = answer.options[correctIndex];
                      return (
                        <div style={{ marginBottom: '10px' }}>
                          <strong>正確答案：</strong>
                          <div style={{ 
                            padding: '10px', 
                            backgroundColor: '#e3f2fd', 
                            borderRadius: '4px',
                            marginTop: '5px',
                            border: '1px solid #64b5f6',
                            color: '#1565c0'
                          }}>
                            <strong>({correctLetter})</strong> {correctOptionText}
                          </div>
                        </div>
                      );
                    })()}

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
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="alert alert-info">
            <strong>提醒：</strong>您的答案已送出，請等待教師批改。批改完成後，您可以在此查看詳細結果。
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentResultDetail;
