import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="container pt-hero">
      <div className="card max-w-md mx-auto text-center">
        <h1 className="hero-title">
          英文測驗系統
        </h1>
        <p className="hero-subtitle">
          English Test System
        </p>
        
        <div className="entry-cards-row">
          <Link to="/student/enter" className="entry-card-link">
            <div className="entry-card-student">
              <h2 className="text-xl mb-10 color-success">
                📝 學生作答
              </h2>
              <p className="text-muted">開始進行英文測驗</p>
            </div>
          </Link>
          
          <Link to="/teacher/login" className="entry-card-link">
            <div className="entry-card-teacher">
              <h2 className="text-xl mb-10 color-secondary">
                👨‍🏫 教師登入
              </h2>
              <p className="text-muted">出題與批改測驗</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
