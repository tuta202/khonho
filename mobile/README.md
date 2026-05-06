# KhoNhỏ Mobile

Ứng dụng quản lý kho hàng cho Android, xây dựng với Expo + React Native.

## Yêu cầu

- Node.js 18+
- npm 9+
- Expo account (tạo tại https://expo.dev)
- EAS CLI: `npm install -g eas-cli`

## Cài đặt local

```bash
# 1. Cài dependencies
npm install --legacy-peer-deps

# 2. Tạo file .env
cp .env.example .env
# Sửa EXPO_PUBLIC_API_URL thành URL backend thực tế

# 3. Chạy dev server
npx expo start
```

## Biến môi trường

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `EXPO_PUBLIC_API_URL` | Base URL của backend API (đã bao gồm `/api/v1`) | `https://your-backend.railway.app/api/v1` |

## Build APK (Android)

### Bước 1: Đăng nhập EAS

```bash
eas login
```

### Bước 2: Cấu hình project (chỉ cần làm 1 lần)

```bash
eas build:configure
```

### Bước 3: Cập nhật API URL trong eas.json

Mở `eas.json` và thay `your-backend.railway.app` bằng URL backend thực tế trong phần `build.preview.env.EXPO_PUBLIC_API_URL`.

### Bước 4: Build APK

```bash
# Preview APK (có env URL cứng từ eas.json)
eas build --platform android --profile preview

# Production APK (dùng .env hoặc secrets trên EAS)
eas build --platform android --profile production
```

Build sẽ chạy trên cloud của Expo (~10-15 phút). Sau khi xong, EAS trả về link download file `.apk`.

### Bước 5: Cài APK lên Android

1. Download file `.apk` từ link EAS cung cấp
2. Chuyển file vào điện thoại (qua USB, Google Drive, v.v.)
3. Trên điện thoại: bật **Cài từ nguồn không xác định** trong Settings → Security
4. Mở file `.apk` và cài đặt

## Cấu trúc thư mục

```
app/
  (auth)/        # Login screen
  (app)/         # Tab screens (dashboard, products, transactions, warehouses, more)
    more/        # Sub-screens: suppliers, reports, users, change-password
components/ui/   # Shared UI components
services/        # API service layer (axios)
stores/          # Zustand state (auth)
constants/       # Colors
hooks/           # useAuthInit
utils/           # errorHandler
```

## Tech stack

- **Expo 54** + React Native 0.81.5
- **Expo Router** — file-based navigation
- **React Query** — server state & caching
- **Zustand** — auth state
- **Gluestack UI v3** + NativeWind v4
- **expo-secure-store** — JWT token storage
- **react-native-toast-message** — toast notifications
