import { Pressable, StyleSheet, Text } from 'react-native';

import { AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export const PrimaryButton = ({ label, onPress, disabled = false }: PrimaryButtonProps) => {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radius.md,
          minHeight: theme.button.minHeight,
          paddingVertical: theme.button.paddingVertical,
          paddingHorizontal: theme.button.paddingHorizontal,
        },
        (pressed || disabled) && { opacity: AppTheme.pressedOpacity },
      ]}
    >
      <Text style={[styles.label, theme.typography.button]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
