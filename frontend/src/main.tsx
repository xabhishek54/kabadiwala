import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import './data/local/syncOutbox';
import { API_BASE_URL } from './data/remote/apiClient';

const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const request = input instanceof Request ? input : null;
  const url = typeof input === 'string' ? input : request?.url || input.toString();
  const token = window.localStorage.getItem('kabadiwala_access_token');
  if (!token || !url.startsWith(API_BASE_URL)) return nativeFetch(input, init);
  const headers = new Headers(init.headers || request?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return nativeFetch(input, { ...init, headers });
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
