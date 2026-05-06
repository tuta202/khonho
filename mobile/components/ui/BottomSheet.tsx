import { useEffect, useRef, useState, ReactNode } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StyleSheet,
  ScrollView,
  Keyboard,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Colors } from '../../constants/colors'

const SCREEN_H = Dimensions.get('window').height
const SHEET_H = SCREEN_H

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const slideY = useRef(new Animated.Value(SHEET_H)).current
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }).start()
    } else {
      Animated.timing(slideY, {
        toValue: SHEET_H,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setMounted(false))
    }
  }, [visible])

  if (!mounted) return null

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        {/* Backdrop tap to close + dismiss keyboard */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => { Keyboard.dismiss(); onClose() }}
          activeOpacity={1}
        />

        <Animated.View style={{ transform: [{ translateY: slideY }] }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View
              style={{
                backgroundColor: '#fff',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: SCREEN_H * 0.92,
              }}
            >
              {/* Handle bar */}
              <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.gray[300] }} />
              </View>

              {/* Title row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.gray[100],
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: '700', color: Colors.gray[900] }}>{title}</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={20} color={Colors.gray[500]} />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  )
}
