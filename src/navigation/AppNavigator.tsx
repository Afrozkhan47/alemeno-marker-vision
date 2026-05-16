import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AppTheme } from '@/constants/theme';
import { HomeScreen } from '@/screens/HomeScreen';
import { ResultsScreen } from '@/screens/ResultsScreen';
import { ScannerScreen } from '@/screens/ScannerScreen';
import { RootStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: AppTheme.colors.surface,
        },
        headerTintColor: AppTheme.colors.text,
        headerTitleStyle: {
          fontSize: AppTheme.typography.cardTitle.fontSize,
          fontWeight: AppTheme.typography.cardTitle.fontWeight,
        },
        contentStyle: {
          backgroundColor: AppTheme.colors.background,
        },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Marker Vision' }} />
      <Stack.Screen name="Scanner" component={ScannerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Results" component={ResultsScreen} />
    </Stack.Navigator>
  );
};
