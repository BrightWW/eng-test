import React from 'react';

const MultipleChoice = ({ question, value, onChange, disabled = false }) => {
  const options = question.options || [];

  return (
    <div>
      <div className="question-content">{question.content}</div>
      
      <div>
        {options.map((option, index) => {
          const optionLabel = String.fromCharCode(65 + index); // A, B, C, D...
          const isSelected = value === option;

          return (
            <div
              key={index}
              className={`option ${isSelected ? 'selected' : ''}`}
              onClick={() => !disabled && onChange(option)}
              style={{
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1
              }}
            >
              <strong>{optionLabel})</strong> {option}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MultipleChoice;
