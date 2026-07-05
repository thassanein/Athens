import { Component } from 'react'
import { track } from '../lib/telemetry.js'

// Production hardening (5B.6 item 10): a screen-level error boundary. A render
// crash on one page degrades to a recoverable card instead of a white screen;
// the failure is counted in local telemetry.
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { track('error', `${this.props.page || 'page'}: ${error?.message || 'render error'}`) }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="card pad" role="alert">
        <div className="card-h"><h3>This screen hit an error</h3></div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          The rest of the operating system is unaffected. The failure was recorded in local telemetry.
        </p>
        <div className="mono" style={{ fontSize: 12, color: 'var(--red)', background: 'var(--panel-2)', borderRadius: 8, padding: '8px 11px', marginBottom: 12, overflowX: 'auto' }}>
          {String(this.state.error?.message || this.state.error)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm" onClick={() => this.setState({ error: null })}>Try again</button>
          <button className="btn sm ghost" onClick={() => this.props.onHome?.()}>Go to Mission Control</button>
        </div>
      </div>
    )
  }
}
