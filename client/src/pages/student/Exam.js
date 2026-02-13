import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import MultipleChoice from '../../components/questions/MultipleChoice';
import FillInBlank from '../../components/questions/FillInBlank';

const StudentExam = () => {
  const [exam, setExam] = useState(null);
  const [parts, setParts] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { student } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!student) {
      navigate('/student/enter');
      return;
    }

    loadExam();
  }, [student, navigate]);

  const loadExam = async () => {
    try {
      setLoading(true);
      
      // Get active exam
      const examRes = await api.get('/exams/active');
      if (!examRes.data.exam) {
        setError('目前沒有進行中的測驗');
        setLoading(false);
        return;
      }

      // Get full exam with questions
      const fullExamRes = await api.get(`/exams/${examRes.data.exam.id}/full`);
      setExam(fullExamRes.data.exam);
      setParts(fullExamRes.data.parts);

      // Create or get submission
      const subRes = await api.post('/submissions', {
        exam_id: examRes.data.exam.id,
        student_id: student.id
      });
      setSubmission(subRes.data.submission);

      // Load existing answers if any
      if (subRes.data.submission.status === 'submitted') {
        navigate('/student/result');
        return;
      }

      setLoading(false);
    } catch (err) {
      console.error('Load exam error:', err);
      setError(err.response?.data?.error || '載入測驗失敗');
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = async () => {
    if (!window.confirm('確定要交卷嗎？交卷後將無法修改答案。')) {
      return;
    }

    try {
      setSubmitting(true);

      // Save all answers
      const savePromises = Object.entries(answers).map(([questionId, answer]) =>
        api.post(`/submissions/${submission.id}/answers`, {
          question_id: parseInt(questionId),
          student_answer: answer
        })
      );

      await Promise.all(savePromises);

      // Submit the exam
      await api.post(`/submissions/${submission.id}/submit`);

      navigate('/student/result');
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.response?.data?.error || '交卷失敗，請稍後再試');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">載入測驗中...</div>;
  }

  if (error) {
    return (
      <div className="container" style={{ paddingTop: '80px' }}>
        <div className="alert alert-error">{error}</div>
        <a href="/" className="btn btn-secondary">返回首頁</a>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <div>
            <h1 style={{ fontSize: '24px' }}>{exam?.title}</h1>
            <p style={{ color: '#666', marginTop: '5px' }}>學生：{student.name}</p>
          </div>
          <button 
            onClick={handleSubmit} 
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? '交卷中...' : '交卷'}
          </button>
        </div>
      </div>

      <div className="container">
        {parts.map((part) => (
          <div key={part.id} className="part-section">
            <h2 className="part-title">{part.title}</h2>
            {part.description && (
              <p className="part-description">{part.description}</p>
            )}

            {part.questions.map((question, index) => (
              <div key={question.id} className="question">
                <div style={{ marginBottom: '15px' }}>
                  <strong>題目 {index + 1}.</strong>
                </div>
                
                {question.type === 'multiple_choice' && (
                  <MultipleChoice
                    question={question}
                    value={answers[question.id] || ''}
                    onChange={(value) => handleAnswerChange(question.id, value)}
                  />
                )}

                {(question.type === 'fill_in_blank' || question.type === 'rewrite') && (
                  <FillInBlank
                    question={question}
                    value={answers[question.id] || ''}
                    onChange={(value) => handleAnswerChange(question.id, value)}
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button 
            onClick={handleSubmit} 
            className="btn btn-primary"
            style={{ padding: '15px 40px', fontSize: '18px' }}
            disabled={submitting}
          >
            {submitting ? '交卷中...' : '確認交卷'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentExam;
