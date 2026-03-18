// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('App starting...', {
  url: window.location.href,
  path: window.location.pathname,
  env: import.meta.env.MODE
});

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  );
  console.log('App rendered successfully');
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `<div style="color: red; padding: 20px;">
    Failed to load app: ${error.message}
  </div>`;
}