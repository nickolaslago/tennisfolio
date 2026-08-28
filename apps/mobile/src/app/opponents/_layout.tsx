import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** Push/pop stack for the Opponents tab: list → detail → edit, plus create. */
export default function OpponentsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Opponents' }} />
      <Stack.Screen name="new" options={{ title: 'Add opponent', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Opponent' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit opponent', presentation: 'modal' }} />
    </Stack>
  );
}
