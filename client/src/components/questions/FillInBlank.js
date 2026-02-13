import React from 'react';

const FillInBlank = ({ question, value, onChange, disabled = false }) => {
  return (
    <div>
      <div className="question-content">{question.content}</div>
      
      <div>
        <label className="label">請輸入您的答案：</label>
        <textarea
          className="textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="在此輸入您的答案..."
          disabled={disabled}
          rows={3}
        />
      </div>
    </div>
  );
};

export default FillInBlank;
