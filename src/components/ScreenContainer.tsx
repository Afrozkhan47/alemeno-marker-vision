import { PropsWithChildren } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

type ScreenContainerProps = PropsWithChildren<{
  padded?: boolean;
}>;

export const ScreenContainer = ({ children, padded = true }: ScreenContainerProps) => {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.content,
          { backgroundColor: theme.colors.background },
          padded && {
            width: '100%',
            maxWidth: theme.layout.maxContentWidth,
            alignSelf: 'center',
            paddingHorizontal: theme.layout.screenPaddingH,
            paddingVertical: theme.layout.screenPaddingV,
          },
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
