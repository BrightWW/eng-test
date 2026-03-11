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
      <div className="container pt-page">
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
            <h1 className="text-xl">{submission?.exam_title}</h1>
            <p className="text-muted mt-sm">學生：{student.name}</p>
          </div>
          <Link to="/student/history" className="btn btn-secondary">
            返回歷史記錄
          </Link>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <h2 className="text-xl mb-20">測驗結果摘要</h2>
          
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
                <strong className="text-2xl color-success">
                  {submission.total_score} / {answers.length} 題
                </strong>
              </div>
              <div className="flex-space-between">
                <span>正確率：</span>
                <strong className="text-xl color-secondary">
                  {answers.length > 0 ? ((submission.total_score / answers.length) * 100).toFixed(1) : 0}%
                </strong>
              </div>
            </>
          )}
        </div>

        {isGraded ? (
          sortedParts.map(([partTitle, partData]) => (
            <div key={partTitle} className="card">
              <h2 className="part-section-title">
                {partTitle}
              </h2>
              
              {partData.answers.map((answer, index) => (
                <div key={answer.question_id} className={`question ${answer.is_correct === true ? 'question--correct' : answer.is_correct === false ? 'question--incorrect' : 'question--pending'}`}>
                  <div className="mb-10">
                    <strong>題目 {index + 1}</strong>
                    {answer.is_correct !== null && (
                      <span className="ml-sm">
                        {answer.is_correct ? (
                          <span className="badge badge-success">✓ 正確</span>
                        ) : (
                          <span className="badge-incorrect">✗ 錯誤</span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="question-content">{answer.content}</div>

                  {answer.type === 'multiple_choice' && answer.options && (
                    <div className="mt-sm mb-15">
                      {answer.options.map((opt, i) => {
                        const isStudentAnswer = answer.student_answer === opt;
                        const correctLetter = answer.correct_answer?.trim().toUpperCase();
                        const correctIndex = correctLetter ? correctLetter.charCodeAt(0) - 65 : -1;
                        const isCorrectOption = i === correctIndex;
                        const showCorrectAnswer = !answer.is_correct && isCorrectOption && answer.correct_answer;
                        
                        return (
                          <div 
                            key={i} 
                            className={`result-option ${showCorrectAnswer ? 'result-option--hint' : isStudentAnswer ? (answer.is_correct ? 'result-option--correct' : 'result-option--incorrect') : 'result-option--default'}`}
                          >
                            <strong>{String.fromCharCode(65 + i)})</strong> {opt}
                            {showCorrectAnswer && (
                              <span className="hint-label">
                                ← 正確答案
                              </span>
                            )}
                            {isStudentAnswer && !answer.is_correct && (
                              <span className="wrong-label">
                                (你的選擇)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="mt-15">
                    <div className="mb-10">
                      <strong>你的答案：</strong>
                      <div className={`answer-box ${answer.is_correct ? 'answer-box--correct' : 'answer-box--incorrect'}`}>
                        {answer.student_answer || '未作答'}
                      </div>
                    </div>

                    {/* 選擇題答錯或未作答時顯示正確答案 */}
                    {answer.type === 'multiple_choice' && !answer.is_correct && answer.correct_answer && answer.options && (() => {
                      const correctLetter = answer.correct_answer.trim().toUpperCase();
                      const correctIndex = correctLetter.charCodeAt(0) - 65;
                      const correctOptionText = answer.options[correctIndex];
                      return (
                        <div className="mb-10">
                          <strong>正確答案：</strong>
                          <div className="correct-answer-box">
                            <strong>({correctLetter})</strong> {correctOptionText}
                          </div>
                        </div>
                      );
                    })()}

                    {answer.comment && (
                      <div className="mt-sm">
                        <strong>教師評語：</strong>
                        <div className="comment-box">
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
