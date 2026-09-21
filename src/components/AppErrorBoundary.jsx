import React from "react";

export default class AppErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Application render failed:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">The application could not render</h1>
          <p className="mt-2 text-sm text-slate-600">Refresh the page and try again. If this continues, share the error below.</p>
          <pre className="mt-4 overflow-auto rounded-md bg-slate-100 p-3 text-xs text-red-700">{this.state.error.message}</pre>
        </div>
      </div>
    );
  }
}
