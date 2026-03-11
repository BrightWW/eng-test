import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const TeacherLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { teacherLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('請輸入帳號和密碼');
      return;
    }

    try {
      setLoading(true);
      await teacherLogin(username, password);
      navigate('/teacher/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || '登入失敗，請檢查帳號密碼');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container pt-page">
      <div className="card max-w-sm mx-auto">
        <h1 className="page-title">
          教師登入
        </h1>
        
        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <label className="label">帳號</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="請輸入帳號"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="label">密碼</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full" 
            disabled={loading}
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <div className="hint-box">
          <strong>預設帳號：</strong>
          <div className="mt-sm">帳號：teacher</div>
          <div>密碼：teacher123</div>
        </div>

        <div className="mt-20 text-center">
          <a href="/" className="link-back">
            ← 返回首頁
          </a>
        </div>
      </div>
    </div>
  );
};

export default TeacherLogin;
