import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import examRoutes from './routes/exams.js';
import partRoutes from './routes/parts.js';
import submissionRoutes from './routes/submissions.js';
import gradeRoutes from './routes/grades.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/upload', uploadRoutes);

// API root - 顯示所有可用端點
app.get('/api', (req, res) => {
  res.json({
    message: 'English Test System API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      students: '/api/students',
      exams: '/api/exams',
      parts: '/api/parts',
      submissions: '/api/submissions',
      grades: '/api/grades',
      upload: '/api/upload',
      health: '/api/health'
    },
    documentation: 'Access /api/health for system health check'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'English Test API is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📚 API accessible at http://10.248.226.81:${PORT}`);
  console.log(`💡 Health check: http://10.248.226.81:${PORT}/api/health`);
});
