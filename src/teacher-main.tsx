import React from 'react';
import { createRoot } from 'react-dom/client';
import TeacherApp from './TeacherApp';
import './styles/teacher-print.css';

createRoot(document.getElementById('teacher-root')!).render(
  <React.StrictMode>
    <TeacherApp />
  </React.StrictMode>,
);
