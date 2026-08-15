import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  info: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error) {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Uncaught error in component tree:', error, info);
    this.setState({ error, info });
  }

  componentDidMount() {
    this._windowErrorHandler = (ev: ErrorEvent) => {
      // capture global runtime errors
      // eslint-disable-next-line no-console
      console.error('Global error captured:', ev.error || ev.message, ev);
      this.setState({ error: ev.error || new Error(String(ev.message)), info: { componentStack: '' } });
    };
    this._rejHandler = (ev: PromiseRejectionEvent) => {
      // eslint-disable-next-line no-console
      console.error('Unhandled promise rejection:', ev.reason);
      const err = ev.reason instanceof Error ? ev.reason : new Error(String(ev.reason));
      this.setState({ error: err, info: { componentStack: '' } });
    };
    window.addEventListener('error', this._windowErrorHandler as EventListener);
    window.addEventListener('unhandledrejection', this._rejHandler as EventListener);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this._windowErrorHandler as EventListener);
    window.removeEventListener('unhandledrejection', this._rejHandler as EventListener);
  }

  private _windowErrorHandler?: (ev: ErrorEvent) => void;
  private _rejHandler?: (ev: PromiseRejectionEvent) => void;

  render() {
    const { error, info } = this.state;
    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
          <div className="max-w-2xl w-full bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold">An unexpected error occurred</h2>
            <p className="mt-3 text-sm text-slate-300">The application encountered an error while rendering. Details below.</p>
            <div className="mt-4 text-xs text-rose-200 whitespace-pre-wrap">
              {error?.message}
              {info?.componentStack && '\n\nComponent stack:\n'}
              {info?.componentStack}
            </div>
            <div className="mt-6 text-right">
              <button onClick={() => location.reload()} className="px-4 py-2 bg-sky-600 rounded-md">Reload</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
