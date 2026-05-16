import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedCornerFrame } from '@/components/scanner/AnimatedCornerFrame';
import { ScanningLine } from '@/components/scanner/ScanningLine';
import { useTheme } from '@/hooks/useTheme';

export const ScannerOverlay = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const { hudReserve, panelReserve, frameMin, frameMax } = theme.scanner;

  const verticalChrome = insets.top + hudReserve + insets.bottom + panelReserve;
  const usableHeight = Math.max(height * 0.2, height - verticalChrome);

  const byWidth = width * 0.72;
  const byUsable = usableHeight * 0.58;
  const byShortSide = Math.min(width, height) * 0.68;

  const scanFrameSize = Math.round(
    Math.max(frameMin, Math.min(frameMax, byWidth, byUsable, byShortSide)),
  );

  const frameInset = theme.spacing.sm;

  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={[styles.frameContainer, { width: scanFrameSize, height: scanFrameSize }]}>
        <AnimatedCornerFrame size={scanFrameSize} />
        <View
          style={[
            styles.clipViewport,
            {
              top: frameInset,
              left: frameInset,
              right: frameInset,
              bottom: frameInset,
              borderRadius: theme.radius.sm,
            },
          ]}
        >
          <ScanningLine size={scanFrameSize - frameInset * 2} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clipViewport: {
    position: 'absolute',
    overflow: 'hidden',
  },
});
