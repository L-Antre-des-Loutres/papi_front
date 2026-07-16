import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
    /** Shown as the fallback title; defaults to a generic message. */
    label?: string;
    children: ReactNode;
}

interface ErrorBoundaryState {
    error: Error | null;
}

/**
 * Catches render errors from its subtree and shows an inline fallback instead
 * of letting the whole app unmount to a white page.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info.componentStack);
    }

    render() {
        if (this.state.error) {
            return (
                <div className={styles.fallback} role="alert">
                    <p className={styles.title}>{this.props.label ?? 'Something went wrong in this section.'}</p>
                    <p className={styles.detail}>{this.state.error.message}</p>
                    <button
                        type="button"
                        className="btn btn-sm btn-cancel"
                        onClick={() => this.setState({ error: null })}
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
