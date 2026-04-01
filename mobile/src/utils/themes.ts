import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    secondary: '#03dac6',
    tertiary: '#018786',
    error: '#b00020',
    background: '#ffffff',
    surface: '#f5f5f5',
    surfaceVariant: '#f0f0f0',
    onBackground: '#1a1a1a',
    onSurface: '#1a1a1a',
    outline: '#999999',
    outlineVariant: '#cccccc',
    scrim: '#000000',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#bb86fc',
    secondary: '#03dac6',
    tertiary: '#03dac6',
    error: '#cf6679',
    background: '#121212',
    surface: '#1e1e1e',
    surfaceVariant: '#2c2c2c',
    onBackground: '#ffffff',
    onSurface: '#ffffff',
    outline: '#666666',
    outlineVariant: '#444444',
    scrim: '#ffffff',
  },
};

export { lightTheme, darkTheme };
