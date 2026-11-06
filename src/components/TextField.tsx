import type { ComponentRef, Ref } from 'react';
import { TextInput, View, useColorScheme, type TextInputProps } from 'react-native';
import { darkColors, lightColors } from '@/theme/colors';
import { AppText } from './AppText';

type TextFieldProps = Omit<TextInputProps, 'style'> & { label: string; ref?: Ref<ComponentRef<typeof TextInput>> };

export function TextField({ label, ...inputProps }: TextFieldProps) {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;

  return (
    <View>
      <AppText variant="small" weight="semibold" style={{ marginBottom: 8 }}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        className="min-h-12 rounded-tile border border-input-border bg-surface px-4 text-base dark:border-dark-input-border dark:bg-dark-surface"
        placeholderTextColor={colors.foregroundSecondary}
        style={{
          color: colors.foreground,
          fontFamily: 'HankenGrotesk_400Regular',
          // Multi-line fields (notes) get room for a few lines, starting at the top.
          ...(inputProps.multiline ? { minHeight: 112, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' as const } : null),
        }}
        {...inputProps}
      />
    </View>
  );
}
