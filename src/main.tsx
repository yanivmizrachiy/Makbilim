import React from 'react';
import { createRoot } from 'react-dom/client';
// Design tokens first: every other stylesheet only reads them.
import './styles/tokens.css';
import App from './App';
import './styles/bbb-source.css';
import './styles/page-tuning.css';
import './styles/geometry-premium.css';
import './styles/premium-layout.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Dev-only live-preview control. The DEV branch is stripped from production
// builds, so this never ships to the student page, teacher app, or PDF.
if (import.meta.env.DEV) {
  void import('./dev/DevRefreshBar').then(({ mountDevRefreshBar }) => mountDevRefreshBar());
}
