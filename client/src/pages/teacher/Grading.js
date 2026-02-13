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
      const initialGrades = {};
      response.data.answers.forEach(answer => {
        initialGrades[answer.id] = {
          is_correct: answer.is_correct !== null ? answer.is_correct : null,
          score: answer.score || 0,
          comment: answer.comment || ''
        };
      });
      setGrades(initialGrades);
    } catch (err) {
      console.error('Load submission detail error:', err);
      alert('載入學生答案失敗');
    }
  };

  const handleGradeChange = (answerId, field, value) => {
    setGrades(prev => ({
      ...prev,
      [answerId]: {
        ...prev[answerId],
        [field]: value
      }
    }));
  };

  const handleSaveGrade = async (answerId) => {
    try {
      const grade = grades[answerId];
      
      if (grade.is_correct === null) {
        alert('請選擇正確或錯誤');
        return;
      }

      await api.post('/grades', {
        answer_id: answerId,
        is_correct: grade.is_correct,
        score: grade.score || 0,
        comment: grade.comment || ''
      });

      alert('批改已儲存');
      loadSubmissionDetail(selectedSubmission);
    } catch (err) {
      console.error('Save grade error:', err);
      alert(err.response?.data?.error || '儲存批改失敗');
    }
  };

  const handleFinalizeGrading = async () => {
    if (!window.confirm('確定要完成批改嗎？學生將可以看到批改結果。')) {
      return;
    }

    try {
      // Check if all answers are graded
      const ungradedAnswers = submissionDetail.answers.filter(
        answer => grades[answer.id]?.is_correct === null
      );

      if (ungradedAnswers.length > 0) {
        alert(`還有 ${ungradedAnswers.length} 題未批改`);
        return;
      }

      // Save all grades first
      const savePromises = submissionDetail.answers.map(answer => 
        api.post('/grades', {
          answer_id: answer.id,
          is_correct: grades[answer.id].is_correct,
          score: grades[answer.id].score || 0,
          comment: grades[answer.id].comment || ''
        })
      );

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
            <h1 style={{ fontSize: '24px' }}>{exam?.title}</h1>
            <p style={{ color: '#666', marginTop: '5px' }}>批改測驗</p>
          </div>
          <Link to="/teacher/dashboard" className="btn btn-secondary">
            返回控制台
          </Link>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>學生提交列表</h2>
          
          {submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
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
                    style={{ 
                      backgroundColor: selectedSubmission === submission.id ? '#e8f5e9' : 'transparent'
                    }}
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
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '14px' }}
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
              <h2 style={{ fontSize: '22px' }}>
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
                key={answer.id} 
                className="question"
                style={{
                  borderLeft: grades[answer.id]?.is_correct === true 
                    ? '4px solid #4CAF50' 
                    : grades[answer.id]?.is_correct === false 
                    ? '4px solid #f44336'
                    : '4px solid #ddd'
                }}
              >
                <div style={{ marginBottom: '10px' }}>
                  <strong>題目 {index + 1}</strong>
                  <span style={{ marginLeft: '10px', color: '#666' }}>
                    ({answer.type === 'multiple_choice' ? '選擇題' : answer.type === 'fill_in_blank' ? '填空題' : '改寫句子'}, {answer.points} 分)
                  </span>
                </div>

                <div className="question-content">{answer.content}</div>

                {answer.type === 'multiple_choice' && answer.options && (
                  <div style={{ marginTop: '10px', marginBottom: '15px' }}>
                    {answer.options.map((opt, i) => (
                      <div 
                        key={i} 
                        style={{ 
                          padding: '8px', 
                          marginBottom: '5px',
                          backgroundColor: answer.student_answer === opt ? '#e8f5e9' : '#f5f5f5',
                          borderRadius: '4px'
                        }}
                      >
                        <strong>{String.fromCharCode(65 + i)})</strong> {opt}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#f0f0f0', 
                  borderRadius: '4px',
                  marginBottom: '15px'
                }}>
                  <strong>學生答案：</strong>
                  <div style={{ marginTop: '5px' }}>
                    {answer.student_answer || '未作答'}
                  </div>
                </div>

                {answer.correct_answer && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#e3f2fd', 
                    borderRadius: '4px',
                    marginBottom: '15px'
                  }}>
                    <strong>參考答案：</strong>
                    <div style={{ marginTop: '5px' }}>
                      {answer.correct_answer}
                    </div>
                  </div>
                )}

                {/* Grading Section */}
                <div style={{ 
                  padding: '15px', 
                  backgroundColor: '#fff3cd', 
                  borderRadius: '4px',
                  marginTop: '15px'
                }}>
                  <h4 style={{ marginBottom: '15px' }}>批改</h4>

                  <div style={{ marginBottom: '15px' }}>
                    <label className="label">評分結果 *</label>
                    <div className="flex flex-gap">
                      <button
                        onClick={() => handleGradeChange(answer.id, 'is_correct', true)}
                        className={grades[answer.id]?.is_correct === true ? 'btn btn-primary' : 'btn'}
                        style={{ flex: 1 }}
                      >
                        ✓ 正確
                      </button>
                      <button
                        onClick={() => handleGradeChange(answer.id, 'is_correct', false)}
                        className={grades[answer.id]?.is_correct === false ? 'btn btn-danger' : 'btn'}
                        style={{ flex: 1 }}
                      >
                        ✗ 錯誤
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label className="label">給分</label>
                    <input
                      type="number"
                      className="input"
                      value={grades[answer.id]?.score || 0}
                      onChange={(e) => handleGradeChange(answer.id, 'score', parseFloat(e.target.value) || 0)}
                      min="0"
                      max={answer.points}
                      step="0.5"
                    />
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label className="label">評語</label>
                    <textarea
                      className="textarea"
                      value={grades[answer.id]?.comment || ''}
                      onChange={(e) => handleGradeChange(answer.id, 'comment', e.target.value)}
                      placeholder="給予學生回饋（選填）"
                      rows={2}
                    />
                  </div>

                  <button
                    onClick={() => handleSaveGrade(answer.id)}
                    className="btn btn-primary"
                  >
                    儲存此題批改
                  </button>

                  {answer.graded_at && (
                    <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                      最後批改時間：{new Date(answer.graded_at).toLocaleString('zh-TW')}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              {submissionDetail.submission.status !== 'graded' && (
                <button
                  onClick={handleFinalizeGrading}
                  className="btn btn-primary"
                  style={{ padding: '15px 40px', fontSize: '18px' }}
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
