import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const TeacherExamEditor = () => {
  const [exam, setExam] = useState(null);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPart, setShowAddPart] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(null); // partId
  const { teacher } = useAuth();
  const { examId } = useParams();
  const navigate = useNavigate();

  // Form states
  const [partForm, setPartForm] = useState({ title: '', description: '' });
  const [questionForm, setQuestionForm] = useState({
    type: 'multiple_choice',
    content: '',
    options: ['', ''],
    correct_answer: '',
    points: 1
  });

  useEffect(() => {
    if (!teacher) {
      navigate('/teacher/login');
      return;
    }

    loadExam();
  }, [teacher, navigate, examId]);

  const loadExam = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/exams/${examId}/full`);
      setExam(response.data.exam);
      setParts(response.data.parts);
      setLoading(false);
    } catch (err) {
      console.error('Load exam error:', err);
      alert('載入測驗失敗');
      navigate('/teacher/dashboard');
    }
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    
    if (!partForm.title.trim()) {
      alert('請輸入段落標題');
      return;
    }

    try {
      await api.post('/parts', {
        exam_id: examId,
        title: partForm.title,
        description: partForm.description,
        order_num: parts.length + 1
      });

      alert('段落新增成功！');
      setPartForm({ title: '', description: '' });
      setShowAddPart(false);
      loadExam();
    } catch (err) {
      console.error('Add part error:', err);
      alert(err.response?.data?.error || '新增段落失敗');
    }
  };

  const handleAddQuestion = async (e, partId) => {
    e.preventDefault();

    if (!questionForm.content.trim()) {
      alert('請輸入題目內容');
      return;
    }

    if (questionForm.type === 'multiple_choice') {
      const validOptions = questionForm.options.filter(o => o.trim());
      if (validOptions.length < 2) {
        alert('選擇題至少需要 2 個選項');
        return;
      }
      if (!questionForm.correct_answer.trim()) {
        alert('請輸入正確答案');
        return;
      }
    }

    try {
      const part = parts.find(p => p.id === partId);
      const questionCount = part?.questions?.length || 0;

      await api.post(`/parts/${partId}/questions`, {
        type: questionForm.type,
        content: questionForm.content,
        options: questionForm.type === 'multiple_choice' 
          ? questionForm.options.filter(o => o.trim()) 
          : null,
        correct_answer: questionForm.correct_answer || '',
        order_num: questionCount + 1,
        points: questionForm.points
      });

      alert('題目新增成功！');
      setQuestionForm({
        type: 'multiple_choice',
        content: '',
        options: ['', ''],
        correct_answer: '',
        points: 1
      });
      setShowAddQuestion(null);
      loadExam();
    } catch (err) {
      console.error('Add question error:', err);
      alert(err.response?.data?.error || '新增題目失敗');
    }
  };

  const handleDeletePart = async (partId, partTitle) => {
    if (!window.confirm(`確定要刪除段落「${partTitle}」及其所有題目嗎？`)) {
      return;
    }

    try {
      await api.delete(`/parts/${partId}`);
      alert('段落已刪除');
      loadExam();
    } catch (err) {
      console.error('Delete part error:', err);
      alert(err.response?.data?.error || '刪除段落失敗');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('確定要刪除此題目嗎？')) {
      return;
    }

    try {
      await api.delete(`/parts/questions/${questionId}`);
      alert('題目已刪除');
      loadExam();
    } catch (err) {
      console.error('Delete question error:', err);
      alert(err.response?.data?.error || '刪除題目失敗');
    }
  };

  const addOption = () => {
    setQuestionForm(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index) => {
    setQuestionForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const updateOption = (index, value) => {
    setQuestionForm(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
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
            <p style={{ color: '#666', marginTop: '5px' }}>出題編輯</p>
          </div>
          <Link to="/teacher/dashboard" className="btn btn-secondary">
            返回控制台
          </Link>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <div className="flex-space-between mb-20">
            <h2 style={{ fontSize: '22px' }}>測驗段落與題目</h2>
            <button 
              onClick={() => setShowAddPart(!showAddPart)}
              className="btn btn-primary"
            >
              {showAddPart ? '取消' : '+ 新增段落'}
            </button>
          </div>

          {showAddPart && (
            <form onSubmit={handleAddPart} className="card" style={{ backgroundColor: '#f9f9f9' }}>
              <h3 style={{ marginBottom: '15px' }}>新增段落</h3>
              
              <label className="label">段落標題 *</label>
              <input
                type="text"
                className="input"
                value={partForm.title}
                onChange={(e) => setPartForm({ ...partForm, title: e.target.value })}
                placeholder="例如：Part A. 易混淆單字"
              />

              <label className="label">段落說明</label>
              <textarea
                className="textarea"
                value={partForm.description}
                onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
                placeholder="段落的簡短說明（選填）"
                rows={2}
              />

              <button type="submit" className="btn btn-primary">
                新增段落
              </button>
            </form>
          )}
        </div>

        {parts.map((part) => (
          <div key={part.id} className="card">
            <div className="flex-space-between mb-20">
              <div>
                <h3 style={{ fontSize: '20px', marginBottom: '5px' }}>{part.title}</h3>
                {part.description && (
                  <p style={{ color: '#666', fontSize: '14px' }}>{part.description}</p>
                )}
              </div>
              <div className="flex flex-gap">
                <button
                  onClick={() => setShowAddQuestion(showAddQuestion === part.id ? null : part.id)}
                  className="btn btn-primary"
                  style={{ fontSize: '14px' }}
                >
                  {showAddQuestion === part.id ? '取消' : '+ 新增題目'}
                </button>
                <button
                  onClick={() => handleDeletePart(part.id, part.title)}
                  className="btn btn-danger"
                  style={{ fontSize: '14px' }}
                >
                  刪除段落
                </button>
              </div>
            </div>

            {showAddQuestion === part.id && (
              <form onSubmit={(e) => handleAddQuestion(e, part.id)} className="card" style={{ backgroundColor: '#f0f0f0' }}>
                <h4 style={{ marginBottom: '15px' }}>新增題目</h4>

                <label className="label">題型 *</label>
                <select
                  className="input"
                  value={questionForm.type}
                  onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}
                >
                  <option value="multiple_choice">選擇題</option>
                  <option value="fill_in_blank">填空題</option>
                  <option value="rewrite">改寫句子</option>
                </select>

                <label className="label">題目內容 *</label>
                <textarea
                  className="textarea"
                  value={questionForm.content}
                  onChange={(e) => setQuestionForm({ ...questionForm, content: e.target.value })}
                  placeholder="輸入題目內容"
                  rows={3}
                />

                {questionForm.type === 'multiple_choice' && (
                  <>
                    <label className="label">選項</label>
                    {questionForm.options.map((option, index) => (
                      <div key={index} className="flex flex-gap mb-10" style={{ alignItems: 'center' }}>
                        <input
                          type="text"
                          className="input"
                          style={{ marginBottom: 0 }}
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`選項 ${String.fromCharCode(65 + index)}`}
                        />
                        {questionForm.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="btn btn-danger"
                            style={{ padding: '8px 12px' }}
                          >
                            刪除
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addOption} className="btn" style={{ marginBottom: '15px' }}>
                      + 新增選項
                    </button>

                    <label className="label">正確答案 *</label>
                    <input
                      type="text"
                      className="input"
                      value={questionForm.correct_answer}
                      onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                      placeholder="輸入正確答案（供參考）"
                    />
                  </>
                )}

                {(questionForm.type === 'fill_in_blank' || questionForm.type === 'rewrite') && (
                  <>
                    <label className="label">參考答案（選填）</label>
                    <textarea
                      className="textarea"
                      value={questionForm.correct_answer}
                      onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                      placeholder="輸入參考答案，供批改時參考"
                      rows={2}
                    />
                  </>
                )}

                <label className="label">配分</label>
                <input
                  type="number"
                  className="input"
                  value={questionForm.points}
                  onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                  min="1"
                />

                <button type="submit" className="btn btn-primary">
                  新增題目
                </button>
              </form>
            )}

            {part.questions && part.questions.length > 0 ? (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '15px' }}>題目列表（{part.questions.length} 題）</h4>
                {part.questions.map((question, index) => (
                  <div key={question.id} className="question">
                    <div className="flex-space-between" style={{ marginBottom: '10px' }}>
                      <strong>題目 {index + 1}</strong>
                      <div className="flex flex-gap">
                        <span className="badge badge-info">{question.type === 'multiple_choice' ? '選擇題' : question.type === 'fill_in_blank' ? '填空題' : '改寫句子'}</span>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                    <div className="question-content">{question.content}</div>
                    {question.type === 'multiple_choice' && question.options && (
                      <div style={{ marginTop: '10px' }}>
                        {question.options.map((opt, i) => (
                          <div key={i} style={{ padding: '5px 0' }}>
                            <strong>{String.fromCharCode(65 + i)})</strong> {opt}
                          </div>
                        ))}
                        {question.correct_answer && (
                          <div style={{ marginTop: '10px', color: '#4CAF50' }}>
                            <strong>參考答案：</strong>{question.correct_answer}
                          </div>
                        )}
                      </div>
                    )}
                    {question.correct_answer && question.type !== 'multiple_choice' && (
                      <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                        <strong>參考答案：</strong>{question.correct_answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                此段落尚未新增題目
              </div>
            )}
          </div>
        ))}

        {parts.length === 0 && (
          <div className="alert alert-info">
            尚未新增任何段落，請點擊「新增段落」開始出題。
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherExamEditor;
