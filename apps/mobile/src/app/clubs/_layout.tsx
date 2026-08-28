import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** Push/pop stack for the Clubs tab: list → detail → edit, plus create. */
export default function ClubsLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Clubs' }} />
      <Stack.Screen name="new" options={{ title: 'Add club', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Club' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit club', presentation: 'modal' }} />
    </Stack>
  );
}
