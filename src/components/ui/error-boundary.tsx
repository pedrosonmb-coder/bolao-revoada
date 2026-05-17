'use client'

import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : 'Erro desconhecido',
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
        <p className="text-(--color-text-primary) font-medium">Algo quebrou. Tenta de novo.</p>
        {process.env.NODE_ENV !== 'production' && (
          <pre className="text-xs text-(--color-text-secondary) text-left bg-(--color-bg-surface) p-3 rounded-lg max-w-full overflow-auto">
            {this.state.message}
          </pre>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-(--color-accent-primary) text-white rounded-xl text-sm font-medium"
        >
          Recarregar
        </button>
      </div>
    )
  }
}
