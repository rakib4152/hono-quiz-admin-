import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';

// Clerk Publishable Key for application app_3LavFW7A5cCB70BWweaphvP77wn
const PUBLISHABLE_KEY =
  (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined) ||
  'pk_test_YXBwLTNsYXZmdzdhNWNjYjcwYnd3ZWFwaHZwNzd3bi5jbGVyay5hY2NvdW50cy5kZXYk';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </React.StrictMode>
);
