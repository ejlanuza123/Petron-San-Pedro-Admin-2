// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { initTabFocusHandler } from './utils/tabFocusHandler';

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
);

// Initialize global tab focus handler
initTabFocusHandler();
