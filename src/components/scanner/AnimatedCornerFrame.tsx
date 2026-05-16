import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

type AnimatedCornerFrameProps = {
  size: number;
};

/** Static reticle corners; no motion (keeps scanner UI consistent with rest of app). */
export const AnimatedCornerFrame = ({ size }: AnimatedCornerFrameProps) => {
  const theme = useTheme();

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      <View
        style={[
          styles.borderBase,
          { borderColor: theme.colors.border, borderRadius: theme.radius.md },
        ]}
      />
      <Corner position="topLeft" color={theme.colors.primary} radius={theme.radius.sm} />
      <Corner position="topRight" color={theme.colors.primary} radius={theme.radius.sm} />
      <Corner position="bottomLeft" color={theme.colors.primary} radius={theme.radius.sm} />
      <Corner position="bottomRight" color={theme.colors.primary} radius={theme.radius.sm} />
    </View>
  );
};

const Corner = ({
  position,
  color,
  radius,
}: {
  position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  color: string;
  radius: number;
}) => {
  const isTop = position.includes('top');
  const isLeft = position.includes('Left');

  return (
    <View
      style={[
        styles.corner,
        { borderRadius: radius },
        isTop ? styles.top : styles.bottom,
        isLeft ? styles.left : styles.right,
        {
          borderTopColor: isTop ? color : 'transparent',
          borderLeftColor: isLeft ? color : 'transparent',
          borderRightColor: !isLeft ? color : 'transparent',
          borderBottomColor: !isTop ? color : 'transparent',
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  borderBase: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderWidth: 2,
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
  left: {
    left: 0,
  },
  right: {
    right: 0,
  },
});
