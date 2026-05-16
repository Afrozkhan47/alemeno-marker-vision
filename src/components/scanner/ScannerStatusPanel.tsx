import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SCAN_SESSION_FRAME_COUNT } from '@/constants/scanSession';
import { AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ScannerPillStatus } from '@/types/scanner';
import { formatDuration } from '@/utils/format';

type ScannerStatusPanelProps = {
  framesCaptured: number;
  cameraStatus: string;
  detectionStatus: string;
  processingLatencyMs: number;
  activePill: ScannerPillStatus;
  onToggleScan: () => void;
  isScanning: boolean;
  scanToggleDisabled: boolean;
  showProcessingLatency: boolean;
};

export const ScannerStatusPanel = ({
  framesCaptured,
  cameraStatus,
  detectionStatus,
  processingLatencyMs,
  activePill,
  onToggleScan,
  isScanning,
  scanToggleDisabled,
  showProcessingLatency,
}: ScannerStatusPanelProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const panelWidth = Math.min(
    windowWidth - theme.layout.screenPaddingH * 2,
    theme.layout.maxContentWidth,
  );

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: insets.bottom + theme.spacing.xs, alignItems: 'center' },
      ]}
    >
      <View
        style={[
          styles.panel,
          AppTheme.shadow.card,
          {
            width: panelWidth,
            borderRadius: theme.radius.md,
            borderColor: theme.overlay.border,
            backgroundColor: theme.overlay.statusPanel,
            padding: theme.spacing.sm,
            gap: theme.spacing.xs,
          },
        ]}
      >
        <View style={[styles.row, { gap: theme.spacing.xs }]}>
          <InfoItem
            label="Frames Captured"
            value={`${framesCaptured}/${SCAN_SESSION_FRAME_COUNT}`}
          />
          <InfoItem label="Camera Status" value={cameraStatus} />
        </View>

        <View style={[styles.row, { gap: theme.spacing.xs }]}>
          <InfoItem label="Detection Status" value={detectionStatus} />
          <InfoItem
            label="Processing Latency"
            value={showProcessingLatency ? formatDuration(processingLatencyMs) : '—'}
          />
        </View>

        <View style={[styles.pillRow, { gap: theme.spacing.xs, marginTop: theme.spacing.xs }]}>
          <StatusPill
            label="Searching"
            active={activePill === 'searching'}
            tint={theme.colors.primary}
          />
          <StatusPill label="Ready" active={activePill === 'ready'} tint={theme.colors.accent} />
          <StatusPill
            label="Scanning"
            active={activePill === 'scanning'}
            tint={theme.colors.danger}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            {
              marginTop: theme.spacing.xs,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.primary,
              minHeight: theme.button.minHeight,
              paddingVertical: theme.button.paddingVertical,
              paddingHorizontal: theme.button.paddingHorizontal,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: scanToggleDisabled ? 0.52 : pressed ? AppTheme.pressedOpacity : 1,
            },
          ]}
          accessibilityState={{ disabled: scanToggleDisabled }}
          disabled={scanToggleDisabled}
          onPress={onToggleScan}
        >
          <Text
            style={[theme.typography.button, styles.actionText]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.92}
          >
            {isScanning ? 'Stop Scanning' : 'Start Scanning'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const InfoItem = ({ label, value }: { label: string; value: string }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.infoItem,
        {
          minWidth: 0,
          borderRadius: theme.radius.sm,
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.sm,
          backgroundColor: theme.colors.surface,
          borderColor: theme.overlay.borderMuted,
          gap: 2,
        },
      ]}
    >
      <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]} numberOfLines={2}>
        {label}
      </Text>
      <Text
        style={[theme.typography.value, { color: theme.colors.text }]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
  );
};

const StatusPill = ({ label, active, tint }: { label: string; active: boolean; tint: string }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          flex: 1,
          minWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.xs,
          borderRadius: theme.radius.sm,
          borderWidth: 1,
          borderColor: active ? tint : theme.overlay.border,
          backgroundColor: active ? `${tint}14` : theme.colors.surface,
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.sm,
          opacity: active ? 1 : 0.5,
        },
      ]}
    >
      <View
        style={[
          styles.pillDot,
          {
            backgroundColor: tint,
            opacity: active ? 1 : 0.45,
          },
        ]}
      />
      <Text
        style={[theme.typography.caption, { color: theme.colors.text, flexShrink: 1 }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    paddingHorizontal: AppTheme.layout.screenPaddingH,
    width: '100%',
  },
  panel: {
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
  },
  infoItem: {
    flex: 1,
    borderWidth: 1,
  },
  pillRow: {
    flexDirection: 'row',
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actionText: {
    color: '#FFFFFF',
  },
});
