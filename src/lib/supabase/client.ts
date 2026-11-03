import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

// Keep this null until public project settings are configured. Never put a service-role key in the app.
export const supabaseClient: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey && Platform.OS !== 'web'
    ? createClient(supabaseUrl, supabaseAnonKey, {
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
