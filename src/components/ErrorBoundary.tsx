// ============================================================
// LabLink — Global React Error Boundary (WCAG Compliant)
// ============================================================

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { sanitizeErrorMessage } from '../utils/validation';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LabLink ErrorBoundary] Uncaught runtime error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('lablink_state_v2');
      localStorage.removeItem('lablink_state');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const safeMessage = sanitizeErrorMessage(
        this.state.error,
        'A component encountered an unexpected error.'
      );

      return (
        <div
          className="min-h-screen bg-slate-50 flex items-center justify-center p-6"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center text-3xl">
              ⚠️
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Application Error Encountered</h1>
              <p className="text-sm text-slate-500 mt-2">
                LabLink caught a runtime error without crashing the window.
              </p>
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-mono text-red-800 text-left overflow-auto max-h-32">
                {safeMessage}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleTryAgain}
                className="btn-secondary flex-1"
                aria-label="Try re-rendering component"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReset}
                className="btn-primary flex-1"
                aria-label="Reset application data to initial demo state"
              >
                Reset Demo State
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
