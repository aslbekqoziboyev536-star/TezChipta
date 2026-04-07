import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = 'Something went wrong.';
      try {
        const parsedError = JSON.parse(this.state.error?.message || '');
        if (parsedError.error) {
          errorMessage = `Firestore Error: ${parsedError.error} (Operation: ${parsedError.operationType})`;
        }
      } catch {
        errorMessage = this.state.error?.message || 'An unexpected error occurred.';
      }

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] flex items-center justify-center p-4 transition-colors duration-300">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Application Error</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              {errorMessage}
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/20 h-auto"
              >
                Reload Application
              </Button>
              <a 
                href="/errors" 
                className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Check Error Help Center
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
