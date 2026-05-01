import React from 'react';
import { XCircle, RefreshCw, AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('[ErrorBoundary] Error capturado:', error, errorInfo);
  }

  handleClose = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(7, 7, 15, 0.95)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'Inter, system-ui, sans-serif',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            width: '90%',
            maxWidth: '600px',
            backgroundColor: '#1a1a2e',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            padding: '24px',
            position: 'relative'
          }}>
            <button 
              onClick={this.handleClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ef4444'
              }}
              title="Cerrar (Intentar continuar)"
            >
              <XCircle size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <AlertCircle size={32} color="#ef4444" />
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Ups, algo ha fallado</h2>
            </div>

            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              maxHeight: '200px',
              overflowY: 'auto',
              borderLeft: '4px solid #ef4444'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', fontWeight: 500 }}>
                {this.state.error && this.state.error.toString()}
              </p>
              <pre style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#94a3b8', whiteSpace: 'pre-wrap' }}>
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={this.handleReload}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <RefreshCw size={16} /> Reiniciar Aplicación
              </button>
              <button 
                onClick={this.handleClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Ignorar y continuar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
