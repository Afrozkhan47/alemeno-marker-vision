import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type ScannerHUDProps = {
  fps: number;
};

export const ScannerHUD = ({ fps }: ScannerHUDProps) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View
      pointerEvents="none"
      style={[styles.wrapper, { paddingTop: insets.top + theme.spacing.xs }]}
    >
      <View
        style={[
          styles.row,
          {
            gap: theme.spacing.xs,
            maxWidth: theme.layout.maxContentWidth,
            width: '100%',
            alignSelf: 'center',
          },
        ]}
      >
        <View
          style={[
            styles.panel,
            {
              borderRadius: theme.radius.sm,
              borderColor: theme.overlay.border,
              backgroundColor: theme.overlay.hudPanel,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              flexShrink: 0,
            },
          ]}
        >
          <View style={[styles.liveWrap, { gap: theme.spacing.xs }]}>
            <View style={[styles.liveDot, { backgroundColor: theme.colors.danger }]} />
            <Text
              style={[theme.typography.caption, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              LIVE
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.centerPanel,
            {
              minWidth: 0,
              borderRadius: theme.radius.sm,
              borderColor: theme.overlay.border,
              backgroundColor: theme.overlay.hudPanel,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
            },
          ]}
        >
          <Text
            style={[theme.typography.caption, { color: theme.colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Marker Scanner
          </Text>
        </View>

        <View
          style={[
            styles.panel,
            {
              flexShrink: 0,
              maxWidth: '36%',
              borderRadius: theme.radius.sm,
              borderColor: theme.overlay.border,
              backgroundColor: theme.overlay.hudPanel,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
            },
          ]}
        >
          <Text
            style={[theme.typography.caption, { color: theme.colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {fps > 0 ? 'Rear Camera' : 'Detection Ready'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: AppTheme.layout.screenPaddingH,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  panel: {
    borderWidth: 1,
  },
  centerPanel: {
    flex: 1,
    borderWidth: 1,
  },
  liveWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
