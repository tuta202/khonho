import { Component, ReactNode, ErrorInfo } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Colors } from '../../constants/colors'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  reset = () => this.setState({ hasError: false, message: '' })

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Colors.gray[50] }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#fee2e2',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Feather name="alert-circle" size={28} color="#dc2626" />
        </View>
        <Text style={{ fontSize: 17, fontWeight: '700', color: Colors.gray[900], marginBottom: 8, textAlign: 'center' }}>
          Đã xảy ra lỗi
        </Text>
        <Text style={{ fontSize: 13, color: Colors.gray[500], textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
          {this.state.message || 'Vui lòng thử lại hoặc liên hệ hỗ trợ'}
        </Text>
        <TouchableOpacity
          onPress={this.reset}
          style={{
            backgroundColor: Colors.navy.DEFAULT,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 10,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    )
  }
}
