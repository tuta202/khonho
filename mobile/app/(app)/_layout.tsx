import { Redirect, Tabs } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import useAuthStore from '../../stores/authStore'
import { Colors } from '../../constants/colors'
import { ErrorBoundary } from '../../components/ui/ErrorBoundary'

export default function AppLayout() {
  const { accessToken } = useAuthStore()

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <ErrorBoundary>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.navy.DEFAULT,
        tabBarInactiveTintColor: Colors.gray[400],
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: Colors.gray[200],
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Sản phẩm',
          tabBarIcon: ({ color, size }) => <Feather name="package" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Nhập/Xuất',
          tabBarIcon: ({ color, size }) => <Feather name="repeat" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="warehouses"
        options={{
          title: 'Kho',
          tabBarIcon: ({ color, size }) => <Feather name="archive" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Khác',
          tabBarIcon: ({ color, size }) => <Feather name="more-horizontal" size={size} color={color} />,
        }}
      />
    </Tabs>
    </ErrorBoundary>
  )
}
