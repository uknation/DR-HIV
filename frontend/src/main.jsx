import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application rendering exception caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#ffffff', padding: '1.5rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <div style={{ padding: '1rem', borderRadius: '9999px', backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', marginBottom: '1rem' }}>
            <svg style={{ width: '2.5rem', height: '2.5rem', color: '#f43f5e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#f8fafc' }}>Clinical Advisory Portal Recovery</h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', maxWidth: '28rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            {this.state.error?.message || 'An unexpected client error occurred. Click below to restore session.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/';
            }}
            style={{ padding: '0.625rem 1.5rem', backgroundColor: '#0d9488', color: '#ffffff', fontWeight: 'bold', fontSize: '0.875rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
          >
            Reload Clinical Portal
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
