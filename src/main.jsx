// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Debugging for Vercel deployment
console.log('🚀 App starting...', {
  timestamp: new Date().toISOString(),
  url: window.location.href,
  path: window.location.pathname,
  origin: window.location.origin,
  userAgent: navigator.userAgent,
  environment: import.meta.env.MODE,
  isVercel: window.location.hostname.includes('vercel.app')
});

// Check if root element exists
const rootElement = document.getElementById('root');
console.log('📦 Root element:', rootElement);

if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Error: Root element not found</div>';
} else {
  try {
    console.log('🔄 Attempting to render React app...');
    
    ReactDOM.createRoot(rootElement).render(
      <App />
    );
    
    console.log('✅ App rendered successfully');
    
    // Log after render
    setTimeout(() => {
      console.log('👀 Post-render check:', {
        rootContent: rootElement.innerHTML.substring(0, 200) + '...',
        hasChildren: rootElement.children.length > 0
      });
    }, 100);
    
  } catch (error) {
    console.error('❌ Failed to render app:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Display error on screen
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

// Log any unhandled errors
window.addEventListener('error', (event) => {
  console.error('🔥 Global error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Unhandled promise rejection:', event.reason);
});