import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

// Keep this null until public project settings are configured. Never put a service-role key in the app.
export const supabaseClient: SupabaseClient | null =
  supabaseUrl && supabasePublishableKey && Platform.OS !== 'web'
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          storage: {
            getItem: SecureStore.getItemAsync,
            setItem: SecureStore.setItemAsync,
            removeItem: SecureStore.deleteItemAsync,
          },
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
