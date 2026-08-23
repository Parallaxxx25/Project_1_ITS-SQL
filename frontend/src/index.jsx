import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// App-wide safety net: any render/runtime error in the tree lands here instead
// of a blank white screen. Shows a recoverable message; never leaks a stack.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f8f9fa', padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ color: '#03045e', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
              เกิดข้อผิดพลาดบางอย่าง
            </h1>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
              ระบบพบข้อผิดพลาดที่ไม่คาดคิด กรุณารีเฟรชหน้าอีกครั้ง หากยังพบปัญหาให้ติดต่อผู้ดูแลระบบ
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#03045e', color: '#fff', border: 'none', borderRadius: 12,
                padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              รีเฟรชหน้า
            </button>
          </div>
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
  </React.StrictMode>
);
