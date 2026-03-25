// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const isDev = import.meta.env.DEV;

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element not found');
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Error: Root element not found</div>';
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      <App />
    );

  } catch (error) {
    console.error('Failed to render app:', error);
    rootElement.innerHTML = `
      <div style="
        color: #ED1C24; 
        padding: 40px; 
        font-family: system-ui, -apple-system, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        text-align: center;
      ">
        <h2 style="color: #0033A0;">❌ Application Error</h2>
        <p style="margin: 20px 0; color: #666;">${error.message}</p>
        <pre style="
          background: #f5f5f5; 
          padding: 15px; 
          border-radius: 8px;
          text-align: left;
          overflow: auto;
          font-size: 12px;
        ">${error.stack}</pre>
        <button onclick="window.location.reload()" style="
          background: #0033A0;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          margin-top: 20px;
          cursor: pointer;
        ">Refresh Page</button>
      </div>
    `;
  }
}

if (isDev) {
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });
}