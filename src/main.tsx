import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkAuthProvider } from './components/auth/ClerkAuthProvider.js';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkAuthProvider>
      <App />
    </ClerkAuthProvider>
  </React.StrictMode>
);
