import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { formatLocal, localDigits } from '../../domain/phone';
import { colors, fonts, radius } from '../../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

export type FieldProps = TextInputProps & { label?: string; error?: string | null; hint?: string; prefix?: string; icon?: IconName };

export function Field({ label, error, hint, prefix, icon, style, multiline, onFocus, onBlur, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? <Txt variant="label" style={styles.label}>{label}</Txt> : null}
      <View style={[styles.box, multiline && styles.multiBox, focused && styles.focused, !!error && styles.errorBox]}>
        {icon ? <Icon name={icon} size={19} color={focused ? colors.primary : colors.faint} /> : null}
        {prefix ? <Txt variant="bodyStrong" style={styles.prefix}>{prefix}</Txt> : null}
        <TextInput
          placeholderTextColor={colors.faint}
          maxFontSizeMultiplier={1.3}
          multiline={multiline}
          accessibilityLabel={rest.accessibilityLabel ?? label ?? rest.placeholder}
          {...rest}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[styles.input, multiline && styles.multi, style]}
        />
      </View>
      {error ? (
        <Animated.View entering={FadeIn.duration(160)}><Txt variant="tiny" color={colors.sale}>{error}</Txt></Animated.View>
      ) : hint ? <Txt variant="tiny">{hint}</Txt> : null}
    </View>
  );
}

/** +998 doim turadi, faqat 9 ta raqam yoziladi: "90 123 45 67". */
export function PhoneField({ value, onChange, ...rest }: Omit<FieldProps, 'value' | 'onChangeText' | 'onChange'> & { value: string; onChange: (e164: string) => void }) {
  return (
    <Field
      {...rest}
      prefix="+998"
      value={formatLocal(localDigits(value.replace(/^\+998/, '')))}
      onChangeText={(text) => {
        const d = localDigits(text);
        onChange(d ? '+998' + d : '');
      }}
      keyboardType="phone-pad"
      textContentType="telephoneNumber"
      autoComplete="tel"
      placeholder="90 123 45 67"
      maxLength={12}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { marginLeft: 2 },
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.line },
  multiBox: { alignItems: 'flex-start', paddingVertical: 10 },
  focused: { borderColor: colors.primary, backgroundColor: colors.white },
  errorBox: { borderColor: colors.sale, backgroundColor: '#FFF8F8' },
  prefix: { color: colors.ink },
  input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, paddingVertical: 12, minWidth: 0, ...Platform.select({ web: { outlineWidth: 0 }, default: {} }) },
  multi: { minHeight: 80, textAlignVertical: 'top', paddingTop: 4 },
});
