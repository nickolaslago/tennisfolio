import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** Push/pop stack for the Tournaments tab: list → detail → edit, plus create. */
export default function TournamentsLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Tournaments' }} />
      <Stack.Screen name="new" options={{ title: 'Add tournament', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Tournament' }} />
      <Stack.Screen
        name="[id]/edit"
        options={{ title: 'Edit tournament', presentation: 'modal' }}
      />
    </Stack>
  );
}
