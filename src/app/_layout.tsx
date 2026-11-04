import { HankenGrotesk_400Regular } from '@expo-google-fonts/hanken-grotesk/400Regular';
import { HankenGrotesk_500Medium } from '@expo-google-fonts/hanken-grotesk/500Medium';
import { HankenGrotesk_600SemiBold } from '@expo-google-fonts/hanken-grotesk/600SemiBold';
import { HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk/700Bold';
import { useFonts } from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../../global.css';
import { startAuthListener, useAuthStore } from '@/features/auth/auth-store';
import { startReminderSync } from '@/services/reminder-scheduler';
import { darkColors, lightColors } from '@/theme/colors';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = scheme === 'dark' ? darkColors : lightColors;

  const signedIn = useAuthStore((state) => state.session !== null);
  const returnTo = useAuthStore((state) => state.returnTo);
  const segments = useSegments();

  useEffect(() => startAuthListener(), []);
  useEffect(() => startReminderSync(), []);

  // Signing in removes the protected sign-in screen, which resets history to the tabs.
  // Wait until that has happened (we're no longer on sign-in), then reopen where the user was.
  const leftSignIn = segments[0] !== 'sign-in';
  useEffect(() => {
    if (!signedIn || !returnTo || !leftSignIn) return;
    useAuthStore.setState({ returnTo: null });
    router.push(returnTo);
  }, [signedIn, returnTo, leftSignIn]);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="interest/[slug]" />
        <Stack.Screen name="attempt/[id]" />
        {/* Signing in sends the user back to the tabs automatically. */}
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Screen name="+not-found" options={{ headerShown: true, title: 'Not found' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
