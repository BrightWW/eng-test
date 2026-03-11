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
              className={`option ${isSelected ? 'selected' : ''} ${disabled ? 'option--disabled' : ''}`}
              onClick={() => !disabled && onChange(option)}
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
