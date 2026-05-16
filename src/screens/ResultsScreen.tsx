import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenContainer } from '@/components/ScreenContainer';
import { SCAN_SESSION_FRAME_COUNT } from '@/constants/scanSession';
import { AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { RootStackParamList } from '@/types/navigation';
import { formatDuration } from '@/utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;

export const ResultsScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const t = theme.typography;
  const capturedFrames = route.params?.capturedFrames ?? SCAN_SESSION_FRAME_COUNT;
  const processingMs = route.params?.processingMs ?? 0;
  const extractedMarkers = route.params?.extractedMarkers ?? [];

  return (
    <ScreenContainer>
      <Text style={[t.screenTitle, { color: theme.colors.text }]}>Results</Text>
      <Text style={[t.subtitle, { color: theme.colors.textMuted, marginTop: theme.spacing.sm }]}>
        Processed marker batches are shown below.
      </Text>

      <View
        style={[
          styles.metricsCard,
          AppTheme.shadow.card,
          {
            marginTop: theme.spacing.lg,
            padding: theme.spacing.md,
            borderRadius: theme.radius.lg,
            gap: theme.spacing.md,
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <MetricItem label="Captured frames" value={`${capturedFrames}`} />
        <MetricItem label="Processing time" value={formatDuration(processingMs)} />
        <MetricItem label="Target output size" value="300x300 px" />
      </View>

      <Text style={[t.subtitle, { color: theme.colors.textMuted, marginTop: theme.spacing.lg }]}>Extracted markers</Text>
      <ScrollView contentContainerStyle={styles.markerGrid}>
        {extractedMarkers.length === 0 ? (
          <Text style={[theme.typography.body, { color: theme.colors.textMuted, marginTop: theme.spacing.sm }]}>No extracted markers available.</Text>
        ) : (
          extractedMarkers.map((marker, index) => (
            <View key={`${marker.sourceUri}-${index}`} style={styles.markerWrapper}>
              <Image
                source={{ uri: marker.dataUrl }}
                style={styles.markerImage}
                resizeMode="cover"
              />
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton label="Scan Again" onPress={() => navigation.replace('Scanner')} />
      </View>
    </ScreenContainer>
  );
};

const MetricItem = ({ label, value }: { label: string; value: string }) => {
  const theme = useTheme();

  return (
    <View style={styles.metricRow}>
      <Text style={[theme.typography.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[theme.typography.value, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  metricsCard: {
    borderWidth: 1,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markerGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  markerWrapper: {
    width: 300,
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginRight: 16,
    marginBottom: 16,
  },
  markerImage: {
    width: 300,
    height: 300,
  },
  actions: {
    marginTop: 'auto',
  },
});
