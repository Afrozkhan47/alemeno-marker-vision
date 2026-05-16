import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SCAN_SESSION_FRAME_COUNT } from '@/constants/scanSession';
import { AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const t = theme.typography;

  return (
    <ScreenContainer>
      <View style={[styles.header, { gap: theme.spacing.sm }]}>
        <Text style={[t.screenTitle, { color: theme.colors.text }]}>Marker Vision</Text>
        <Text style={[t.subtitle, { color: theme.colors.textMuted }]}>
          Android-first scanning flow for custom marker detection and extraction.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          AppTheme.shadow.card,
          {
            marginTop: theme.spacing.lg,
            padding: theme.spacing.md,
            borderRadius: theme.radius.lg,
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[t.cardTitle, { color: theme.colors.text }]}>Assignment Checklist</Text>
        <Text style={[t.body, { color: theme.colors.textMuted }]}>
          - Capture {SCAN_SESSION_FRAME_COUNT} marker frames
        </Text>
        <Text style={[t.body, { color: theme.colors.textMuted }]}>
          - Correct orientation before display
        </Text>
        <Text style={[t.body, { color: theme.colors.textMuted }]}>
          - Keep total scan-to-result latency low
        </Text>
      </View>

      <View style={styles.bottomAction}>
        <PrimaryButton label="Start Scanner" onPress={() => navigation.navigate('Scanner')} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    width: '100%',
  },
  card: {
    borderWidth: 1,
  },
  bottomAction: {
    marginTop: 'auto',
  },
});
