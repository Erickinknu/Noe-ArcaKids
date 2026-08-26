import { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface TimePickerProps {
  hours: number;
  minutes: number;
  onHoursChange: (h: number) => void;
  onMinutesChange: (m: number) => void;
}

function PickerColumn({
  items,
  selected,
  onSelect,
  label,
}: {
  items: number[];
  selected: number;
  onSelect: (val: number) => void;
  label: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
        setInitialized(true);
      }, 50);
    }
  }, []);

  const handleScroll = useCallback(
    (event: any) => {
      const y = event.nativeEvent.contentOffset.y;
      const idx = Math.round(y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      if (items[clamped] !== selected) {
        onSelect(items[clamped]);
      }
    },
    [items, selected, onSelect]
  );

  const snapOffsets = items.map((_, i) => i * ITEM_HEIGHT);

  return (
    <View style={colStyles.container}>
      <Text style={colStyles.label}>{label}</Text>
      <View style={colStyles.pickerWrapper}>
        <View style={colStyles.highlight} />
        <ScrollView
          ref={scrollRef}
          style={colStyles.scrollView}
          contentContainerStyle={colStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          snapToOffsets={snapOffsets}
          snapToAlignment="center"
          decelerationRate="fast"
          onMomentumScrollEnd={handleScroll}
        >
          <View style={{ height: ITEM_HEIGHT * 2 }} />
          {items.map((item) => (
            <View key={item} style={colStyles.item}>
              <Text
                style={[
                  colStyles.itemText,
                  item === selected && colStyles.itemTextSelected,
                ]}
              >
                {String(item).padStart(2, '0')}
              </Text>
            </View>
          ))}
          <View style={{ height: ITEM_HEIGHT * 2 }} />
        </ScrollView>
      </View>
    </View>
  );
}

export function TimePicker({ hours, minutes, onHoursChange, onMinutesChange }: TimePickerProps) {
  const hourItems = Array.from({ length: 24 }, (_, i) => i);
  const minuteItems = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <View style={styles.container}>
      <PickerColumn items={hourItems} selected={hours} onSelect={onHoursChange} label="Hora" />
      <Text style={styles.separator}>:</Text>
      <PickerColumn items={minuteItems} selected={minutes} onSelect={onMinutesChange} label="Min" />
    </View>
  );
}

// ── Compact duration picker (for daily limit) ──
interface DurationPickerProps {
  totalMinutes: number;
  onChange: (totalMinutes: number) => void;
}

export function DurationPicker({ totalMinutes, onChange }: DurationPickerProps) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <View style={styles.container}>
      <PickerColumn
        items={Array.from({ length: 13 }, (_, i) => i)}
        selected={hours}
        onSelect={(h) => onChange(h * 60 + minutes)}
        label="Horas"
      />
      <Text style={styles.separator}>:</Text>
      <PickerColumn
        items={[0, 15, 30, 45]}
        selected={minutes}
        onSelect={(m) => onChange(hours * 60 + m)}
        label="Min"
      />
    </View>
  );
}

const colStyles = StyleSheet.create({
  container: { alignItems: 'center', width: 70 },
  label: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 1 },
  pickerWrapper: { height: PICKER_HEIGHT, overflow: 'hidden', position: 'relative' },
  highlight: { position: 'absolute', top: ITEM_HEIGHT * 2, left: 0, right: 0, height: ITEM_HEIGHT, backgroundColor: colors.primaryLight, borderRadius: radius.md, zIndex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 0 },
  item: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  itemText: { fontSize: typography.fontSizes.title, color: colors.textMuted, fontWeight: typography.fontWeights.regular },
  itemTextSelected: { fontSize: typography.fontSizes.heading, color: colors.primary, fontWeight: typography.fontWeights.bold },
});

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  separator: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.textMuted, marginTop: spacing.lg },
});
