import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <p className="text-lg font-semibold text-gray-700 mb-2">Đã xảy ra lỗi</p>
          <p className="text-sm text-gray-400 mb-4">{this.state.error?.message}</p>
          <button
            className="btn-secondary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Thử lại
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
