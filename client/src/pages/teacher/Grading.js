import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const TeacherGrading = () => {
  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionDetail, setSubmissionDetail] = useState(null);
  const [grades, setGrades] = useState({}); // answerId -> {is_correct, score, comment}
  const [loading, setLoading] = useState(true);
  const { teacher } = useAuth();
  const { examId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!teacher) {
      navigate('/teacher/login');
      return;
    }

    loadData();
  }, [teacher, navigate, examId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load exam info
      const examRes = await api.get(`/exams/${examId}/full`);
      setExam(examRes.data.exam);

      // Load submissions
      const submissionsRes = await api.get(`/submissions/exam/${examId}`);
      setSubmissions(submissionsRes.data.submissions);

      setLoading(false);
    } catch (err) {
      console.error('Load data error:', err);
      alert('載入資料失敗');
      navigate('/teacher/dashboard');
    }
  };

  const loadSubmissionDetail = async (submissionId) => {
    try {
      const response = await api.get(`/submissions/${submissionId}/detail`);
      setSubmissionDetail(response.data);
      setSelectedSubmission(submissionId);

      // Initialize grades state with existing grades
      // Use question_id as key to support unanswered questions
      const initialGrades = {};
      response.data.answers.forEach(answer => {
        // Convert 0/1 to boolean for is_correct
        let isCorrect = null;
        if (answer.is_correct === 1 || answer.is_correct === true) {
          isCorrect = true;
        } else if (answer.is_correct === 0 || answer.is_correct === false) {
          isCorrect = false;
        }

        const isUnanswered = !answer.student_answer || answer.student_answer.trim() === '';
        let autoMarkedUnanswered = false;
        let autoGradedMultipleChoice = false;

        // If not yet graded, check for auto-grading conditions
        if (isCorrect === null) {
          // Auto-grade multiple choice questions with correct_answer
          if (answer.type === 'multiple_choice' && answer.correct_answer && answer.options) {
            const studentAnswer = (answer.student_answer || '').trim();
            const correctAnswerLetter = answer.correct_answer.trim().toUpperCase();
            
            // Convert letter (A, B, C, D) to option index and get the option text
            const letterIndex = correctAnswerLetter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
            const correctOptionText = answer.options[letterIndex];
            
            // Compare student answer with the correct option text
            if (correctOptionText) {
              isCorrect = studentAnswer === correctOptionText;
              autoGradedMultipleChoice = true;
            }
          } 
          // Auto-mark unanswered questions as incorrect
          else if (isUnanswered) {
            isCorrect = false;
            autoMarkedUnanswered = true;
          }
        }

        initialGrades[answer.question_id] = {
          answer_id: answer.id,
          is_correct: isCorrect,
          comment: answer.comment || '',
          auto_marked: autoMarkedUnanswered && !answer.graded_at, // Flag for auto-marked unanswered
          auto_graded_mc: autoGradedMultipleChoice && !answer.graded_at // Flag for auto-graded multiple choice
        };
      });
      setGrades(initialGrades);
    } catch (err) {
      console.error('Load submission detail error:', err);
      alert('載入學生答案失敗');
    }
  };

  const handleGradeChange = (questionId, field, value) => {
    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
        // Remove auto flags when teacher manually changes is_correct
        ...(field === 'is_correct' && { auto_marked: false, auto_graded_mc: false })
      }
    }));
  };

  const handleSaveGrade = async (questionId) => {
    try {
      const grade = grades[questionId];
      
      if (grade.is_correct === null || grade.is_correct === undefined) {
        alert('請選擇正確或錯誤');
        return;
      }

      let answerId = grade.answer_id;
      
      // If no answer exists (unanswered question), create one first
      if (!answerId) {
        const answerRes = await api.post(`/submissions/${selectedSubmission}/answers`, {
          question_id: questionId,
          student_answer: null
        });
        answerId = answerRes.data.answer.id;
      }

      // Save the grade (no score needed)
      await api.post('/grades', {
        answer_id: answerId,
        is_correct: grade.is_correct,
        comment: grade.comment || ''
      });

      alert('✅ 批改已儲存');
      
      // 只更新當前題目的狀態，避免覆蓋其他未儲存的修改
      setGrades(prev => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          answer_id: answerId,
          graded_at: new Date().toISOString()
        }
      }));
    } catch (err) {
      console.error('Save grade error:', err);
      alert('❌ ' + (err.response?.data?.error || '儲存批改失敗'));
    }
  };

  const handleFinalizeGrading = async () => {
    if (!window.confirm('確定要完成批改嗎？學生將可以看到批改結果。')) {
      return;
    }

    try {
      // Check if all questions are graded
      const ungradedQuestions = submissionDetail.answers.filter(
        answer => grades[answer.question_id]?.is_correct === null
      );

      if (ungradedQuestions.length > 0) {
        alert(`還有 ${ungradedQuestions.length} 題未批改`);
        return;
      }

      // Save all grades first, creating answer records for unanswered questions
      const savePromises = submissionDetail.answers.map(async (answer) => {
        const grade = grades[answer.question_id];
        let answerId = grade.answer_id;
        
        // Create answer record if it doesn't exist (unanswered question)
        if (!answerId) {
          const answerRes = await api.post(`/submissions/${selectedSubmission}/answers`, {
            question_id: answer.question_id,
            student_answer: null
          });
          answerId = answerRes.data.answer.id;
        }
        
        // Save the grade
        return api.post('/grades', {
          answer_id: answerId,
          is_correct: grade.is_correct,
          comment: grade.comment || ''
        });
      });

      await Promise.all(savePromises);

      // Finalize grading
      await api.post(`/grades/submission/${selectedSubmission}/finalize`);

      alert('批改完成！');
      setSelectedSubmission(null);
      setSubmissionDetail(null);
      loadData();
    } catch (err) {
      console.error('Finalize grading error:', err);
      alert(err.response?.data?.error || '完成批改失敗');
    }
  };

  if (loading) {
    return <div className="loading">載入中...</div>;
  }

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <div>
            <h1 className="text-xl">{exam?.title}</h1>
            <p className="text-muted mt-sm">批改測驗</p>
          </div>
          <Link to="/teacher/dashboard" className="btn btn-secondary">
            返回控制台
          </Link>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <h2 className="text-xl mb-20">學生提交列表</h2>
          
          {submissions.length === 0 ? (
            <div className="empty-state">
              目前沒有學生提交
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>學生姓名</th>
                  <th>提交時間</th>
                  <th>狀態</th>
                  <th>總分</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr 
                    key={submission.id}
                    className={selectedSubmission === submission.id ? 'row--selected' : ''}
                  >
                    <td><strong>{submission.student_name}</strong></td>
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
                      <button
                        onClick={() => loadSubmissionDetail(submission.id)}
                        className="btn btn-primary btn-sm"
                      >
                        {submission.status === 'graded' ? '查看' : '批改'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {submissionDetail && (
          <div className="card">
            <div className="flex-space-between mb-20">
              <h2 className="text-xl">
                {submissionDetail.submission.student_name} 的答案
              </h2>
              <div className="flex flex-gap">
                {submissionDetail.submission.status !== 'graded' && (
                  <button
                    onClick={handleFinalizeGrading}
                    className="btn btn-primary"
                  >
                    完成批改
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedSubmission(null);
                    setSubmissionDetail(null);
                  }}
                  className="btn"
                >
                  關閉
                </button>
              </div>
            </div>

            {submissionDetail.answers.map((answer, index) => (
              <div 
                key={answer.question_id} 
                className={`question ${grades[answer.question_id]?.is_correct === true ? 'question--correct' : grades[answer.question_id]?.is_correct === false ? 'question--incorrect' : 'question--pending'}`}
              >
                <div className="mb-10">
                  <strong>題目 {index + 1}</strong>
                  <span className="ml-sm text-muted">
                    ({answer.type === 'multiple_choice' ? '選擇題' : answer.type === 'fill_in_blank' ? '填空題' : answer.type === 'short_answer' ? '簡答題' : '改寫句子'}, {answer.points} 分)
                  </span>
                </div>

                <div className="question-content">{answer.content}</div>

                {answer.type === 'multiple_choice' && answer.options && (
                  <div className="mt-10 mb-15">
                    {answer.options.map((opt, i) => (
                      <div 
                        key={i} 
                        className={`grading-option ${answer.student_answer === opt ? 'grading-option--selected' : ''}`}
                      >
                        <strong>{String.fromCharCode(65 + i)})</strong> {opt}
                      </div>
                    ))}
                  </div>
                )}

                <div className={`student-answer-box ${(!answer.student_answer || answer.student_answer.trim() === '') ? 'student-answer-box--unanswered' : ''}`}>
                  <strong>學生答案：</strong>
                  {(!answer.student_answer || answer.student_answer.trim() === '') && (
                    <span className="text-muted unanswered-label">
                      (未作答)
                    </span>
                  )}
                  <div className="mt-sm">
                    {answer.student_answer || '未作答'}
                  </div>
                </div>

                {answer.correct_answer && (
                  <div className="ref-answer-display">
                    <strong>參考答案：</strong>
                    <div className="mt-sm">
                      {answer.correct_answer}
                    </div>
                  </div>
                )}

                {/* Grading Section */}
                <div className="grading-section">
                  <h4 className="mb-10">批改</h4>

                  {/* 自動判定提示 */}
                  {grades[answer.question_id]?.auto_marked && (
                    <div className="auto-mark-notice">
                      <span className="font-bold">ℹ️ 自動判定：</span> 
                      此題因學生未作答已自動標記為錯誤，如需修改請點選上方按鈕。
                    </div>
                  )}

                  {/* 選擇題自動批改提示 */}
                  {grades[answer.question_id]?.auto_graded_mc && (
                    <div className={`auto-grade-notice ${grades[answer.question_id]?.is_correct ? 'auto-grade-notice--correct' : 'auto-grade-notice--incorrect'}`}>
                      <span className="font-bold">
                        {grades[answer.question_id]?.is_correct ? '✓ 自動批改：' : '✗ 自動批改：'}
                      </span> 
                      此選擇題已根據參考答案自動批改為{grades[answer.question_id]?.is_correct ? '正確' : '錯誤'}，如需修改請點選下方按鈕。
                    </div>
                  )}

                  {/* 評分結果按鈕 */}
                  <div className="mb-10">
                    <label className="label">評分結果 *</label>
                    <div className="flex flex-gap">
                      <button
                        onClick={() => handleGradeChange(answer.question_id, 'is_correct', true)}
                        className={`btn flex-1 ${grades[answer.question_id]?.is_correct === true ? 'btn-grade-correct-active' : 'btn-grade-correct-inactive'}`}
                      >
                        ✓ 正確
                      </button>
                      <button
                        onClick={() => handleGradeChange(answer.question_id, 'is_correct', false)}
                        className={`btn flex-1 ${grades[answer.question_id]?.is_correct === false ? 'btn-grade-incorrect-active' : 'btn-grade-incorrect-inactive'}`}
                      >
                        ✗ 錯誤
                      </button>
                    </div>
                  </div>

                  {/* 評語（選填） */}
                  <div className="mb-10">
                    <label className="label">評語（選填）</label>
                    <textarea
                      className="textarea"
                      value={grades[answer.question_id]?.comment || ''}
                      onChange={(e) => handleGradeChange(answer.question_id, 'comment', e.target.value)}
                      placeholder="給予學生回饋（選填）"
                      rows={2}
                    />
                  </div>

                  <button
                    onClick={() => handleSaveGrade(answer.question_id)}
                    className="btn btn-primary"
                  >
                    儲存此題批改
                  </button>

                  {answer.graded_at && (
                    <div className="mt-sm text-sm text-muted">
                      最後批改時間：{new Date(answer.graded_at).toLocaleString('zh-TW')}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="text-center mt-30">
              {submissionDetail.submission.status !== 'graded' && (
                <button
                  onClick={handleFinalizeGrading}
                  className="btn btn-primary btn-lg"
                >
                  完成批改並發布結果
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherGrading;
