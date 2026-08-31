import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

const BASE_WIDTH = 375;

function useTimePickerSize() {
  const { width: screenWidth } = useWindowDimensions();
  const scale = Math.min(screenWidth / BASE_WIDTH, 1.3);
  return {
    btnSize: Math.round(40 * scale),
    valueMinWidth: Math.round(60 * scale),
    fontSize: Math.round(typography.fontSizes.heading * scale),
  };
}

interface TimeFieldProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  suffix?: string;
}

export function TimeField({ value, onChange, min = 0, max = 23, step = 1, label, suffix = '' }: TimeFieldProps) {
  const { colors } = useTheme();
  const fieldStyles = makeFieldStyles(colors);
  const { btnSize, valueMinWidth, fontSize } = useTimePickerSize();
  const increment = () => {
    const next = value + step;
    onChange(next > max ? min : next);
  };
  const decrement = () => {
    const next = value - step;
    onChange(next < min ? max : next);
  };

  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.row}>
        <Pressable style={({ pressed }) => [fieldStyles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, pressed && fieldStyles.btnPressed]} onPress={decrement}>
          <MaterialIcons name="remove" size={20} color={colors.primary} />
        </Pressable>
        <View style={[fieldStyles.valueBox, { minWidth: valueMinWidth }]}>
          <Text style={[fieldStyles.value, { fontSize }]}>{String(value).padStart(2, '0')}</Text>
          {suffix ? <Text style={fieldStyles.suffix}>{suffix}</Text> : null}
        </View>
        <Pressable style={({ pressed }) => [fieldStyles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, pressed && fieldStyles.btnPressed]} onPress={increment}>
          <MaterialIcons name="add" size={20} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

interface DurationFieldProps {
  totalMinutes: number;
  onChange: (totalMinutes: number) => void;
  label: string;
}

export function DurationField({ totalMinutes, onChange, label }: DurationFieldProps) {
  const { colors } = useTheme();
  const fieldStyles = makeFieldStyles(colors);
  const { btnSize, valueMinWidth, fontSize } = useTimePickerSize();
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.row}>
        {/* Hours */}
        <Pressable style={({ pressed }) => [fieldStyles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, pressed && fieldStyles.btnPressed]} onPress={() => onChange(Math.max(0, totalMinutes - 60))}>
          <MaterialIcons name="remove" size={20} color={colors.primary} />
        </Pressable>
        <View style={[fieldStyles.valueBox, { minWidth: valueMinWidth }]}>
          <Text style={[fieldStyles.value, { fontSize }]}>{String(hours).padStart(2, '0')}</Text>
          <Text style={fieldStyles.suffix}>h</Text>
        </View>
        <Pressable style={({ pressed }) => [fieldStyles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, pressed && fieldStyles.btnPressed]} onPress={() => onChange(Math.min(720, totalMinutes + 60))}>
          <MaterialIcons name="add" size={20} color={colors.primary} />
        </Pressable>

        <View style={{ width: spacing.md }} />

        {/* Minutes */}
        <Pressable style={({ pressed }) => [fieldStyles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, pressed && fieldStyles.btnPressed]} onPress={() => onChange(Math.max(0, totalMinutes - 15))}>
          <MaterialIcons name="remove" size={20} color={colors.primary} />
        </Pressable>
        <View style={[fieldStyles.valueBox, { minWidth: valueMinWidth }]}>
          <Text style={[fieldStyles.value, { fontSize }]}>{String(minutes).padStart(2, '0')}</Text>
          <Text style={fieldStyles.suffix}>min</Text>
        </View>
        <Pressable style={({ pressed }) => [fieldStyles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, pressed && fieldStyles.btnPressed]} onPress={() => onChange(Math.min(720, totalMinutes + 15))}>
          <MaterialIcons name="add" size={20} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

interface TimeInputProps {
  hours: number;
  minutes: number;
  onHoursChange: (h: number) => void;
  onMinutesChange: (m: number) => void;
  label: string;
}

export function TimeInput({ hours, minutes, onHoursChange, onMinutesChange, label }: TimeInputProps) {
  const { colors } = useTheme();
  const fieldStyles = makeFieldStyles(colors);
  const { btnSize, valueMinWidth, fontSize } = useTimePickerSize();

  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.row}>
        <Pressable style={({ pressed }) => [fieldStyles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, pressed && fieldStyles.btnPressed]} onPress={() => onHoursChange(hours === 0 ? 23 : hours - 1)}>
          <MaterialIcons name="remove" size={20} color={colors.primary} />
        </Pressable>
        <View style={[fieldStyles.valueBox, { minWidth: valueMinWidth }]}>
          <Text style={[fieldStyles.value, { fontSize }]}>{String(hours).padStart(2, '0')}</Text>
        </View>
        <Pressable style={({ pressed }) => [fieldStyles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, pressed && fieldStyles.btnPressed]} onPress={() => onHoursChange(hours === 23 ? 0 : hours + 1)}>
          <MaterialIcons name="add" size={20} color={colors.primary} />
        </Pressable>

        <Text style={[fieldStyles.colon, { fontSize }]}>:</Text>

        <Pressable style={({ pressed }) => [fieldStyles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, pressed && fieldStyles.btnPressed]} onPress={() => onMinutesChange(minutes === 0 ? 45 : minutes - 15)}>
          <MaterialIcons name="remove" size={20} color={colors.primary} />
        </Pressable>
        <View style={[fieldStyles.valueBox, { minWidth: valueMinWidth }]}>
          <Text style={[fieldStyles.value, { fontSize }]}>{String(minutes).padStart(2, '0')}</Text>
        </View>
        <Pressable style={({ pressed }) => [fieldStyles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, pressed && fieldStyles.btnPressed]} onPress={() => onMinutesChange(minutes === 45 ? 0 : minutes + 15)}>
          <MaterialIcons name="add" size={20} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const makeFieldStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { alignItems: 'center', gap: spacing.xs },
    label: { fontSize: typography.fontSizes.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    btn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
    btnPressed: { backgroundColor: colors.primary, opacity: 0.8 },
    valueBox: { flexDirection: 'row', alignItems: 'baseline', minWidth: 60, justifyContent: 'center' },
    value: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
    suffix: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginLeft: 2 },
    colon: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.textMuted },
  });
