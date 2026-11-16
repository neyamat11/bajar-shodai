/* eslint-disable @typescript-eslint/no-explicit-any */
(global as any).__DEV__ = true;

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(true),
  hideAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
  getStringAsync: jest.fn().mockResolvedValue(''),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: (props: any) => React.createElement('Image', props),
  };
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  return {
    WebView: (props: any) => React.createElement('WebView', props),
  };
});

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light', setColorScheme: jest.fn(), toggleColorScheme: jest.fn() }),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: (objs: any) => objs.android || objs.default,
  },
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn().mockResolvedValue(true) },
  StyleSheet: { create: (styles: any) => styles },
  BackHandler: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    exitApp: jest.fn(),
  },
  processColor: jest.fn((c: any) => c),
  PanResponder: {
    create: jest.fn(() => ({ panHandlers: {} })),
  },
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => React.createElement('Svg', props),
    Svg: (props: any) => React.createElement('Svg', props),
    Circle: (props: any) => React.createElement('Circle', props),
    Path: (props: any) => React.createElement('Path', props),
    Rect: (props: any) => React.createElement('Rect', props),
    G: (props: any) => React.createElement('G', props),
  };
});

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => {
    const memory = new Map<string, any>();
    return {
      getString: jest.fn((k: string) => memory.get(k)),
      set: jest.fn((k: string, v: any) => memory.set(k, String(v))),
      getBoolean: jest.fn((k: string) => memory.get(k)),
      getNumber: jest.fn((k: string) => memory.get(k)),
      contains: jest.fn((k: string) => memory.has(k)),
      delete: jest.fn((k: string) => memory.delete(k)),
      remove: jest.fn((k: string) => memory.delete(k)),
      clearAll: jest.fn(() => memory.clear()),
      getAllKeys: jest.fn(() => Array.from(memory.keys())),
    };
  }),
}));
