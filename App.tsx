import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { AppNavigator } from '@/navigation/AppNavigator';
import { AppTheme } from '@/constants/theme';

const NavigationDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: AppTheme.colors.background,
    card: AppTheme.colors.surface,
    text: AppTheme.colors.text,
    border: AppTheme.colors.border,
    primary: AppTheme.colors.primary,
  },
};

export default function App() {
  return (
    <NavigationContainer theme={NavigationDarkTheme}>
      <StatusBar style="light" />
      <AppNavigator />
    </NavigationContainer>
  );
}
