import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[React ErrorBoundary]', error, errorInfo);
        if (window.electronAPI?.clawbot?.onError) {
            window.electronAPI.clawbot.sendCommand(`ERROR_REPORT: ${error.toString()} - ${JSON.stringify(errorInfo)}`);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    backgroundColor: '#07070f',
                    color: '#ff6060',
                    padding: '40px',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    fontFamily: 'monospace'
                }}>
                    <h1>⚠️ VECTRON CRITICAL ERROR</h1>
                    <p style={{ color: '#9090b0', marginBottom: '20px' }}>Señor, un fallo en el renderizado ha ocurrido.</p>
                    <pre style={{
                        background: '#1a1a2e',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #ff606044',
                        maxWidth: '80%',
                        overflow: 'auto'
                    }}>
                        {this.state.error && this.state.error.toString()}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            background: '#7c6af7',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        REINICIAR NÚCLEO
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
