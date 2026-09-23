import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; name?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; name?: string }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || 'App'}]`, error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          background: '#1a1a1a',
          color: '#fff',
          minHeight: '100vh',
          fontFamily: 'monospace',
          fontSize: '13px',
          overflowY: 'auto'
        }}>
          <div style={{ color: '#ff4444', fontWeight: 'bold', marginBottom: '12px', fontSize: '16px' }}>
            ⚠️ Crash in {this.props.name || 'App'}
          </div>
          <div style={{ color: '#ffcc00', marginBottom: '8px' }}>
            {this.state.error?.message}
          </div>
          <pre style={{
            background: '#111',
            padding: '12px',
            borderRadius: '8px',
            overflowX: 'auto',
            color: '#aaa',
            fontSize: '11px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {this.state.error?.stack}
          </pre>
          {this.state.errorInfo && (
            <pre style={{
              background: '#0d1a00',
              padding: '12px',
              borderRadius: '8px',
              overflowX: 'auto',
              color: '#88bb88',
              fontSize: '11px',
              marginTop: '8px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {this.state.errorInfo.componentStack}
            </pre>
          )}
          <button
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: '#3390ec',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
