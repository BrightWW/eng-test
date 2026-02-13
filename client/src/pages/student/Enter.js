import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const StudentEnter = () => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { studentEnter } = useAuth();
  const navigate = useNavigate();

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
      navigate('/student/exam');
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

        <form onSubmit={handleSubmit}>
          <label className="label">請輸入您的姓名</label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：王小明"
            disabled={loading}
            autoFocus
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
