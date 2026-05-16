import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';

type ScanningLineProps = {
  size: number;
};

export const ScanningLine = ({ size }: ScanningLineProps) => {
  const theme = useTheme();
  const progress = useSharedValue(0);
  const lineHeight = 1;

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 3400,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [progress]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * Math.max(size - lineHeight, 0) }],
    opacity: 0.38 + progress.value * 0.12,
  }));

  return (
    <Animated.View
      style={[
        styles.line,
        lineStyle,
        {
          backgroundColor: `${theme.colors.accent}B3`,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    borderRadius: 2,
  },
});
