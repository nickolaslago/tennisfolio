import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * Bottom-tab navigation skeleton for Tennisfolio: Home, Matches, Opponents,
 * Clubs, Tournaments. Built on Expo Router's file-based `Tabs` — the rationale
 * for Expo Router over bare React Navigation is documented in docs/mobile.md.
 * Each `Tabs.Screen name` maps to a route file in this directory.
 */
export default function TabLayout() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <>
      <StatusBar style="auto" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.text,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: { backgroundColor: theme.background },
          sceneStyle: { backgroundColor: theme.background },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="matches"
          options={{
            title: 'Matches',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="tennisball-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="opponents"
          options={{
            title: 'Opponents',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="clubs"
          options={{
            title: 'Clubs',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="tournaments"
          options={{
            title: 'Tournaments',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy-outline" color={color} size={size} />
            ),
          }}
        />
        {/* DAT-109 living style guide: not a real tab, `href: null` hides it
            from the tab bar while keeping the route navigable (reachable from
            Settings once that screen exists). */}
        <Tabs.Screen name="dev-style-guide" options={{ href: null, headerShown: false }} />
      </Tabs>
    </>
  );
}
