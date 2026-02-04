
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("Account Portal: Initializing Application...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Account Portal Error: Root element not found.");
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
