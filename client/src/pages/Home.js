import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="container" style={{ paddingTop: '100px' }}>
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '36px', marginBottom: '20px', color: '#333' }}>
          英文測驗系統
        </h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '40px' }}>
          English Test System
        </p>
        
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <Link to="/student/enter" style={{ textDecoration: 'none', flex: 1 }}>
            <div className="card" style={{ 
              padding: '40px', 
              cursor: 'pointer',
              border: '2px solid #4CAF50',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8f5e9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <h2 style={{ fontSize: '24px', marginBottom: '10px', color: '#4CAF50' }}>
                📝 學生作答
              </h2>
              <p style={{ color: '#666' }}>開始進行英文測驗</p>
            </div>
          </Link>
          
          <Link to="/teacher/login" style={{ textDecoration: 'none', flex: 1 }}>
            <div className="card" style={{ 
              padding: '40px', 
              cursor: 'pointer',
              border: '2px solid #2196F3',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <h2 style={{ fontSize: '24px', marginBottom: '10px', color: '#2196F3' }}>
                👨‍🏫 教師登入
              </h2>
              <p style={{ color: '#666' }}>出題與批改測驗</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
