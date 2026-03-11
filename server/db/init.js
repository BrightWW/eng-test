import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'test.db');
const schemaPath = join(__dirname, 'schema.sql');

// Remove existing database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('📦 Removed existing database');
}

// Initialize SQL.js
const SQL = await initSqlJs();
const db = new SQL.Database();

// Helper function to save database
function saveDatabase() {
  const data = db.export();
  fs.writeFileSync(dbPath, data);
}

// Wrapper to match better-sqlite3 API
const dbWrapper = {
  prepare: (sql) => {
    return {
      run: (...params) => {
        db.run(sql, params);
        const result = db.exec('SELECT last_insert_rowid() as id');
        return {
          lastInsertRowid: result[0]?.values[0]?.[0] || 0
        };
      }
    };
  },
  exec: (sql) => {
    db.exec(sql);
  }
};

// Read and execute schema
const schema = fs.readFileSync(schemaPath, 'utf8');
dbWrapper.exec(schema);
console.log('✅ Database schema created');

// Insert default teacher account
const password = 'teacher123';
const passwordHash = bcrypt.hashSync(password, 10);

const insertTeacher = dbWrapper.prepare(`
  INSERT INTO teachers (username, password_hash) VALUES (?, ?)
`);

insertTeacher.run('teacher', passwordHash);
console.log('👤 Default teacher account created');
console.log('   Username: teacher');
console.log('   Password: teacher123');

// Create a sample exam with questions
const insertExam = dbWrapper.prepare(`
  INSERT INTO exams (title, description, is_active, created_by)
  VALUES (?, ?, ?, ?)
`);

const examResult = insertExam.run(
  '英文測驗範例',
  '包含易混淆單字、被動語氣、句子改寫等題型',
  1,
  1
);
const examId = examResult.lastInsertRowid;

console.log('📝 Sample exam created');

// Part A: 易混淆單字
const insertPart = dbWrapper.prepare(`
  INSERT INTO parts (exam_id, title, description, order_num)
  VALUES (?, ?, ?, ?)
`);

const partAResult = insertPart.run(
  examId,
  'Part A. 易混淆單字',
  'Choose the correct answer for each sentence.',
  1
);
const partAId = partAResult.lastInsertRowid;

// Part B: 被動語氣
const partBResult = insertPart.run(
  examId,
  'Part B. 被動語氣',
  'Choose the correct answer for each sentence.',
  2
);
const partBId = partBResult.lastInsertRowid;

// Part C: 改寫句子
const partCResult = insertPart.run(
  examId,
  'Part C. 主動/被動語態轉換',
  'Rewrite the following sentences in passive voice (if active) or active voice (if passive).',
  3
);
const partCId = partCResult.lastInsertRowid;

// Part D: 合併句子
const partDResult = insertPart.run(
  examId,
  'Part D. 合併句子 Sentence Combining',
  'Rewrite each sentence by inserting the relative clause in the correct position.',
  4
);
const partDId = partDResult.lastInsertRowid;

// Part E: 短文回答
const partEResult = insertPart.run(
  examId,
  'Part E. 短文回答',
  'Answer the following questions in 2-3 sentences.',
  5
);
const partEId = partEResult.lastInsertRowid;

// Insert questions
const insertQuestion = dbWrapper.prepare(`
  INSERT INTO questions (part_id, type, content, options, correct_answer, order_num)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Part A Questions
const partAQuestions = [
  {
    content: "The company's new policy will be ________ starting next month.",
    options: JSON.stringify(['affective', 'effective']),
    correct: 'effective'
  },
  {
    content: "Please ________ the meeting minutes to all department heads by Friday.",
    options: JSON.stringify(['distribute', 'contribute']),
    correct: 'distribute'
  },
  {
    content: "Due to the bad weather, the flight departure has been ________ until tomorrow.",
    options: JSON.stringify(['delayed', 'relayed']),
    correct: 'delayed'
  },
  {
    content: "All employees must ________ to the company's dress code policy.",
    options: JSON.stringify(['adapt', 'adopt', 'adhere']),
    correct: 'adhere'
  },
  {
    content: "The manager will ________ the new safety procedures during the staff meeting.",
    options: JSON.stringify(['complement', 'compliment', 'implement']),
    correct: 'implement'
  }
];

partAQuestions.forEach((q, index) => {
  insertQuestion.run(partAId, 'multiple_choice', q.content, q.options, q.correct, index + 1);
});

// Part B Questions (passive voice)
const partBQuestions = [
  {
    content: "The new museum __________ by the mayor next month.",
    options: JSON.stringify(['opens', 'will be opened', 'is opening', 'has opened']),
    correct: 'will be opened'
  },
  {
    content: "I can't find my wallet. I think it __________.",
    options: JSON.stringify(['was stolen', 'has stolen', 'is stealing', 'steals']),
    correct: 'was stolen'
  },
  {
    content: "The company __________ employees every year to expand the business.",
    options: JSON.stringify(['is hired', 'hires', 'was hiring', 'has been hired']),
    correct: 'hires'
  },
  {
    content: "While the building __________, several safety issues were discovered.",
    options: JSON.stringify(['was being constructed', 'constructed', 'is constructing', 'constructs']),
    correct: 'was being constructed'
  },
  {
    content: "Coffee __________ in many countries around the world.",
    options: JSON.stringify(['grows', 'is grown', 'is growing', 'has grown']),
    correct: 'is grown'
  }
];

partBQuestions.forEach((q, index) => {
  insertQuestion.run(partBId, 'multiple_choice', q.content, q.options, q.correct, index + 1);
});

// Part C Questions (rewrite sentences)
const partCQuestions = [
  {
    content: "Someone has already repaired the broken computer.",
    correct: "The broken computer has already been repaired."
  },
  {
    content: "The ancient pyramid was built by the Egyptians thousands of years ago.",
    correct: "The Egyptians built the ancient pyramid thousands of years ago."
  },
  {
    content: "The police are investigating the mysterious case right now.",
    correct: "The mysterious case is being investigated by the police right now."
  }
];

partCQuestions.forEach((q, index) => {
  insertQuestion.run(partCId, 'rewrite', q.content, null, q.correct, index + 1);
});

// Part D Questions (sentence combining)
const partDQuestions = [
  {
    content: "The book is on the table. (you asked me to buy)",
    correct: "The book which/that you asked me to buy is on the table."
  },
  {
    content: "I want to thank the person. (he found my wallet)",
    correct: "I want to thank the person who found my wallet."
  },
  {
    content: "The building was destroyed in the fire. (it was built in 1905)",
    correct: "The building which/that was built in 1905 was destroyed in the fire."
  }
];

partDQuestions.forEach((q, index) => {
  insertQuestion.run(partDId, 'fill_in_blank', q.content, null, q.correct, index + 1);
});

// Part E Questions (short answer)
const partEQuestions = [
  {
    content: "What are the main differences between active and passive voice?",
    correct: "Active voice shows the subject performing the action, while passive voice shows the subject receiving the action."
  },
  {
    content: "Why is it important to use a variety of sentence structures in writing?",
    correct: "It makes writing more interesting, helps convey different ideas with precision, and improves readability for the reader."
  }
];

partEQuestions.forEach((q, index) => {
  insertQuestion.run(partEId, 'short_answer', q.content, null, q.correct, index + 1);
});

console.log('✅ Sample questions created');
console.log('\n🎉 Database initialization complete!');
console.log('\nYou can now start the server with: npm run dev\n');

saveDatabase();
console.log('💾 Database saved to disk');
