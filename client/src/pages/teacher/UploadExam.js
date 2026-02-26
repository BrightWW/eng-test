import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const UploadExam = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { teacher } = useAuth();
  const navigate = useNavigate();

  if (!teacher) {
    navigate('/teacher/login');
    return null;
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      if (!fileName.endsWith('.docx') && !fileName.endsWith('.txt')) {
        setError('請上傳 .docx 或 .txt 格式的檔案');
        return;
      }
      setFile(selectedFile);
      setError('');
      setPreview(null);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setError('請先選擇檔案');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload/word/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setPreview(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Preview error:', err);
      setError(err.response?.data?.error || '預覽失敗');
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('請先選擇檔案');
      return;
    }

    if (!title.trim()) {
      setError('請輸入測驗標題');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);

      const response = await api.post('/upload/word', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert(`測驗建立成功！\n${response.data.summary.map(p => `${p.title}: ${p.questionCount} 題`).join('\n')}`);
      navigate(`/teacher/exam/${response.data.examId}`);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || '上傳失敗');
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <div>
            <h1 style={{ fontSize: '24px' }}>上傳檔案建立測驗</h1>
            <p style={{ color: '#666', marginTop: '5px' }}>支援 .docx 及 .txt 格式</p>
          </div>
          <Link to="/teacher/dashboard" className="btn btn-secondary">
            返回控制台
          </Link>
        </div>
      </div>

      <div className="container">
        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        <div className="card">
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>步驟 1：選擇檔案</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <input
              type="file"
              accept=".docx,.txt"
              onChange={handleFileChange}
              style={{ marginBottom: '10px' }}
            />
            {file && (
              <div style={{ color: '#666' }}>
                已選擇：{file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <button 
            onClick={handlePreview} 
            className="btn btn-secondary"
            disabled={!file || loading}
          >
            {loading ? '解析中...' : '預覽解析結果'}
          </button>
        </div>

        {preview && (
          <div className="card">
            <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>步驟 2：確認解析結果</h2>
            
            {preview.parsed.parts.length === 0 ? (
              <div className="alert alert-error">
                無法從文件中解析出題目。請確認文件格式是否正確。
                <details style={{ marginTop: '10px' }}>
                  <summary>查看原始文字</summary>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', marginTop: '10px' }}>
                    {preview.rawText}
                  </pre>
                </details>
              </div>
            ) : (
              <>
                <div className="alert alert-success mb-20">
                  成功解析 {preview.parsed.parts.length} 個段落，
                  共 {preview.parsed.parts.reduce((sum, p) => sum + p.questions.length, 0)} 題
                </div>

                {preview.parsed.parts.map((part, partIndex) => (
                  <div key={partIndex} className="card" style={{ backgroundColor: '#f9f9f9' }}>
                    <h3 style={{ marginBottom: '15px' }}>{part.title}</h3>
                    {part.description && (
                      <p style={{ color: '#666', marginBottom: '15px' }}>{part.description}</p>
                    )}
                    
                    <div style={{ fontSize: '14px' }}>
                      <strong>題目數量：</strong>{part.questions.length} 題
                    </div>

                    <details style={{ marginTop: '10px' }}>
                      <summary style={{ cursor: 'pointer', color: '#2196F3' }}>
                        展開查看題目
                      </summary>
                      <div style={{ marginTop: '10px' }}>
                        {part.questions.map((q, qIndex) => (
                          <div key={qIndex} style={{ 
                            padding: '10px', 
                            backgroundColor: 'white', 
                            marginBottom: '10px',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                          }}>
                            <div style={{ marginBottom: '5px' }}>
                              <strong>Q{qIndex + 1}.</strong> 
                              <span className="badge badge-info" style={{ marginLeft: '10px' }}>
                                {q.type === 'multiple_choice' ? '選擇題' : q.type === 'fill_in_blank' ? '填空題' : '改寫題'}
                              </span>
                            </div>
                            <div>{q.content}</div>
                            {q.options && q.options.length > 0 && (
                              <div style={{ marginTop: '5px', paddingLeft: '20px' }}>
                                {q.options.map((opt, i) => (
                                  <div key={i}>{String.fromCharCode(65 + i)}) {opt}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {preview && preview.parsed.parts.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>步驟 3：建立測驗</h2>
            
            <label className="label">測驗標題 *</label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：TOEIC 模擬測驗 - 2026/02"
            />

            <button 
              onClick={handleUpload} 
              className="btn btn-primary"
              disabled={loading || !title.trim()}
              style={{ marginTop: '10px' }}
            >
              {loading ? '建立中...' : '確認建立測驗'}
            </button>
          </div>
        )}

        <div className="card">
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Word 文件格式說明</h2>
          <div style={{ lineHeight: '1.8' }}>
            <p>系統會自動解析以下格式：</p>
            <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
              <li><strong>段落標題：</strong>以 "Part A", "Part B" 等開頭</li>
              <li><strong>題號：</strong>以數字加句點或括號開頭，如 "1." 或 "1)"</li>
              <li><strong>選項：</strong>以 A), B), C), D) 或 (A), (B) 等格式</li>
              <li><strong>改寫題：</strong>在 Part 標題或說明中包含 "rewrite"</li>
              <li><strong>合併句子：</strong>在 Part 標題中包含 "combining" 或 "合併"</li>
            </ul>
            <p style={{ marginTop: '15px' }}>
              <strong>提示：</strong>您可以參考專案中的 <code>0206_toeic_test.docx</code> 作為範本。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadExam;
