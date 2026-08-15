import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-rose-500/10 border border-rose-500/30 rounded-none clip-path-rog flex items-center justify-center">
              <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Đã xảy ra lỗi</h1>
            <p className="text-sm text-neutral-400">
              Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại hoặc tải lại trang.
            </p>
            {this.state.error && (
              <p className="text-xs text-rose-300 font-mono bg-rose-500/10 rounded-lg p-2 break-all">
                {this.state.error.message || 'Unknown error'}
              </p>
            )}
            <button
              onClick={this.handleReload}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog text-sm"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
