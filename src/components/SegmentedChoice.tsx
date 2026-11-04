import { Pressable, View } from 'react-native';
import { AppText } from './AppText';

export type SegmentOption<T extends string> = { value: T; label: string };

/** One row of mutually exclusive options; the selected one is filled. Each segment is 48dp tall. */
export function SegmentedChoice<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  /** Names the group for screen readers, e.g. "Today". */
  label: string;
  options: readonly SegmentOption<T>[];
  /** null when nothing is chosen yet. */
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className="flex-row rounded-full border border-border bg-surface p-1 dark:border-dark-border dark:bg-dark-surface"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${option.label}`}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            className={`min-h-12 flex-1 items-center justify-center rounded-full px-2 ${
              selected ? 'bg-accent dark:bg-dark-accent' : ''
            }`}
            style={({ pressed }) => ({ opacity: disabled ? 0.6 : pressed ? 0.8 : 1 })}
          >
            <AppText tone={selected ? 'onAccent' : 'primary'} weight={selected ? 'semibold' : 'medium'} size={15}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
