import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const TeacherDashboard = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDesc, setNewExamDesc] = useState('');
  const { teacher, teacherLogout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!teacher) {
      navigate('/teacher/login');
      return;
    }

    loadExams();
  }, [teacher, navigate]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const response = await api.get('/exams');
      setExams(response.data.exams);
      setLoading(false);
    } catch (err) {
      console.error('Load exams error:', err);
      setError(err.response?.data?.error || '載入測驗列表失敗');
      setLoading(false);
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    
    if (!newExamTitle.trim()) {
      alert('請輸入測驗標題');
      return;
    }

    try {
      const response = await api.post('/exams', {
        title: newExamTitle,
        description: newExamDesc
      });

      alert('測驗建立成功！');
      setShowCreateForm(false);
      setNewExamTitle('');
      setNewExamDesc('');
      loadExams();
      
      // Navigate to exam editor
      navigate(`/teacher/exam/${response.data.exam.id}`);
    } catch (err) {
      console.error('Create exam error:', err);
      alert(err.response?.data?.error || '建立測驗失敗');
    }
  };

  const handleActivateExam = async (examId, currentStatus) => {
    try {
      if (currentStatus) {
        // Deactivate
        await api.put(`/exams/${examId}`, { is_active: false });
      } else {
        // Activate (and deactivate others)
        await api.post(`/exams/${examId}/activate`);
      }
      loadExams();
    } catch (err) {
      console.error('Activate exam error:', err);
      alert(err.response?.data?.error || '更新測驗狀態失敗');
    }
  };

  const handleDeleteExam = async (examId, examTitle) => {
    const confirmed = window.confirm(
      `⚠️ 警告：您即將刪除測驗「${examTitle}」\n\n` +
      `此操作將永久刪除：\n` +
      `• 測驗的所有題目和段落\n` +
      `• 所有學生的提交記錄\n` +
      `• 所有批改結果和評語\n\n` +
      `❗ 此操作無法復原！\n\n` +
      `確定要繼續嗎？`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/exams/${examId}`);
      alert('✅ 測驗已成功刪除');
      loadExams();
    } catch (err) {
      console.error('Delete exam error:', err);
      alert('❌ ' + (err.response?.data?.error || '刪除測驗失敗'));
    }
  };

  const handleLogout = () => {
    teacherLogout();
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
            <h1 className="text-xl">教師控制台</h1>
            <p className="text-muted mt-sm">歡迎，{teacher.username}</p>
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

        <div className="card">
          <div className="flex-space-between mb-20">
            <h2 className="text-xl">測驗管理</h2>
            <div className="flex flex-gap">
              <Link to="/teacher/upload" className="btn btn-secondary">
                📄 上傳 Word 檔
              </Link>
              <button 
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="btn btn-primary"
              >
                {showCreateForm ? '取消' : '+ 建立新測驗'}
              </button>
            </div>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateExam} className="card card-muted">
              <h3 className="mb-10">建立新測驗</h3>
              
              <label className="label">測驗標題 *</label>
              <input
                type="text"
                className="input"
                value={newExamTitle}
                onChange={(e) => setNewExamTitle(e.target.value)}
                placeholder="例如：英文測驗範例"
              />

              <label className="label">測驗說明</label>
              <textarea
                className="textarea"
                value={newExamDesc}
                onChange={(e) => setNewExamDesc(e.target.value)}
                placeholder="測驗的簡短說明（選填）"
                rows={3}
              />

              <button type="submit" className="btn btn-primary">
                建立測驗
              </button>
            </form>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg mb-20">測驗列表</h3>
          
          {exams.length === 0 ? (
            <div className="empty-state">
              尚未建立任何測驗
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>測驗名稱</th>
                  <th>建立時間</th>
                  <th>狀態</th>
                  <th>學生交卷狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id}>
                    <td>
                      <strong>{exam.title}</strong>
                      {exam.description && (
                        <div className="text-sm text-muted mt-sm">
                          {exam.description}
                        </div>
                      )}
                    </td>
                    <td>{new Date(exam.created_at).toLocaleDateString('zh-TW')}</td>
                    <td>
                      {exam.is_active ? (
                        <span className="badge badge-success">進行中</span>
                      ) : (
                        <span className="badge">未啟用</span>
                      )}
                    </td>
                    <td>
                      {exam.submission_stats ? (
                        <div className="text-sm">
                          <div>
                            <strong className="color-success">
                              已交卷：{exam.submission_stats.submitted}
                            </strong>
                          </div>
                          <div className="text-muted mt-sm">
                            作答中：{exam.submission_stats.in_progress} | 
                            已批改：{exam.submission_stats.graded}
                          </div>
                        </div>
                      ) : (
                        <span className="color-muted">無資料</span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-gap">
                        <Link to={`/teacher/exam/${exam.id}`} className="btn btn-secondary btn-sm">
                          編輯題目
                        </Link>
                        <Link to={`/teacher/exam/${exam.id}/grading`} className="btn btn-primary btn-sm">
                          批改
                        </Link>
                        <button
                          onClick={() => handleActivateExam(exam.id, exam.is_active)}
                          className={exam.is_active ? "btn btn-sm" : "btn btn-primary btn-sm"}
                        >
                          {exam.is_active ? '停用' : '啟用'}
                        </button>
                        
                        {/* 視覺分隔線 - 區分常規操作和危險操作 */}
                        <div className="action-divider"></div>
                        
                        {/* 刪除測驗按鈕 - 加強標示 */}
                        <button
                          onClick={() => handleDeleteExam(exam.id, exam.title)}
                          className="btn btn-danger btn-sm btn-icon"
                          title="永久刪除此測驗及所有相關資料"
                        >
                          <span role="img" aria-label="delete">🗑️</span>
                          刪除測驗
                        </button>
                      </div>
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

export default TeacherDashboard;
