import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/lib/appearance';
import { MONTHS, daysInMonth, dmy, isoDate, pad, splitIso, weekday } from '@/lib/dates';
import { fonts, radius, space } from '@/theme';

import { Button, tap } from './controls';
import { Icon } from './icons';
import { Body, Title } from './type';

const ROW = 44;
const VISIBLE = 5;

type Option = { label: string; disabled?: boolean };

/**
 * One spinning column, like the iPhone date wheel. Scrolls and snaps to a row; the middle row is the value.
 * Screen readers get an "adjustable" control: swipe up or down to change it.
 */
function Wheel({
  options,
  index,
  onChange,
  label,
  width,
}: {
  options: Option[];
  index: number;
  onChange: (i: number) => void;
  label: string;
  width: number | `${number}%`;
}) {
  const c = useColors();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [live, setLive] = useState(index);

  // Keep the wheel in place when the value changes from outside (e.g. 31 → 30 when the month changes).
  useEffect(() => {
    ref.current?.scrollTo({ y: index * ROW, animated: false });
  }, [index, options.length]);

  const pick = (y: number) => {
    const i = Math.max(0, Math.min(options.length - 1, Math.round(y / ROW)));
    if (i !== index) {
      tap();
      onChange(i);
    } else ref.current?.scrollTo({ y: i * ROW, animated: true });
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: options[index]?.label }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const next = e.nativeEvent.actionName === 'increment' ? index + 1 : index - 1;
        if (next >= 0 && next < options.length) onChange(next);
      }}
      style={{ width, height: ROW * VISIBLE }}
    >
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: ROW * ((VISIBLE - 1) / 2) }}
        onLayout={() => ref.current?.scrollTo({ y: index * ROW, animated: false })}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          setLive(Math.round(y / ROW));
          // The web has no momentum-end event, so settle after scrolling stops.
          if (Platform.OS === 'web') {
            if (settle.current) clearTimeout(settle.current);
            settle.current = setTimeout(() => pick(y), 140);
          }
        }}
        onMomentumScrollEnd={(e) => pick(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          // A slow drag with no fling ends without momentum.
          const v = e.nativeEvent.velocity?.y ?? 0;
          if (Platform.OS !== 'web' && Math.abs(v) < 0.05) pick(e.nativeEvent.contentOffset.y);
        }}
      >
        {options.map((o, i) => {
          const d = Math.abs(i - live);
          return (
            <Pressable key={`${o.label}-${i}`} onPress={() => onChange(i)} style={styles.row} importantForAccessibility="no">
              <Text
                maxFontSizeMultiplier={1.2}
                style={[
                  styles.item,
                  {
                    color: o.disabled ? c.text2 : c.text,
                    opacity: o.disabled ? 0.35 : d === 0 ? 1 : d === 1 ? 0.55 : 0.28,
                    fontFamily: d === 0 ? fonts.bodyBold : fonts.body,
                    textDecorationLine: o.disabled && d === 0 ? 'line-through' : 'none',
                  },
                ]}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Sheet({
  title,
  open,
  onClose,
  onDone,
  children,
  note,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  children: ReactNode;
  note?: string | null;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.scrim} />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.sheetHead}>
          <Title size={22}>{title}</Title>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel" hitSlop={10} onPress={onClose}>
            <Body weight="semi" color={c.link}>
              Cancel
            </Body>
          </Pressable>
        </View>
        <View style={styles.wheels}>
          <View pointerEvents="none" style={[styles.band, { backgroundColor: c.tile, top: ROW * ((VISIBLE - 1) / 2) }]} />
          {children}
        </View>
        <Body size={13} weight="semi" color={note ? c.danger : c.text2} style={{ textAlign: 'center', minHeight: 18 }}>
          {note ?? ' '}
        </Body>
        <Button label="Done" onPress={onDone} disabled={!!note} />
      </View>
    </Modal>
  );
}

/** A field that opens day / month / year wheels. Value is ISO (2026-12-19); it shows as 19/Dec/2026. */
export function DateField({
  value,
  onChange,
  label,
  min,
  max,
  invalid,
  placeholder = 'dd/mon/yyyy',
}: {
  value: string;
  onChange: (iso: string) => void;
  label: string;
  /** Earliest date allowed (ISO). Earlier days show crossed out. */
  min: string;
  max?: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const minP = splitIso(min)!;
  const start = splitIso(value) ?? splitIso(max && max < min ? max : min)!;
  const [y, setY] = useState(start.y);
  const [m, setM] = useState(start.m);
  const [d, setD] = useState(start.d);

  const show = () => {
    const p = splitIso(value) ?? minP;
    setY(p.y);
    setM(p.m);
    setD(p.d);
    setOpen(true);
  };

  const years = Array.from({ length: 4 }, (_, i) => minP.y + i);
  const days = daysInMonth(y, m);
  const day = Math.min(d, days);
  const picked = isoDate(y, m, day);
  const note =
    picked < min ? 'That date has passed. Pick today or later.' : max && picked > max ? `Pick a date on or before ${dmy(max)}.` : null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? `${weekday(value)} ${dmy(value)}` : 'not chosen'}`}
        accessibilityHint="Opens a date picker"
        onPress={show}
        style={[styles.field, { backgroundColor: c.surface, borderColor: invalid ? c.danger : c.line }]}
      >
        <Text style={[styles.fieldText, { color: value ? c.text : c.text2 }]}>{value ? dmy(value) : placeholder}</Text>
        <Icon name="calendar" size={20} color={c.icon} />
      </Pressable>
      <Sheet
        title={label}
        open={open}
        onClose={() => setOpen(false)}
        note={note}
        onDone={() => {
          onChange(picked);
          setOpen(false);
        }}
      >
        <Wheel
          label="Day"
          width="22%"
          index={day - 1}
          onChange={(i) => setD(i + 1)}
          options={Array.from({ length: days }, (_, i) => ({ label: pad(i + 1), disabled: isoDate(y, m, i + 1) < min }))}
        />
        <Wheel
          label="Month"
          width="30%"
          index={m - 1}
          onChange={(i) => setM(i + 1)}
          options={MONTHS.map((name, i) => ({ label: name, disabled: isoDate(y, i + 1, daysInMonth(y, i + 1)) < min }))}
        />
        <Wheel
          label="Year"
          width="30%"
          index={Math.max(0, years.indexOf(y))}
          onChange={(i) => setY(years[i])}
          options={years.map((v) => ({ label: String(v) }))}
        />
      </Sheet>
    </>
  );
}

const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const fmt12 = (h: number) => `${h % 12 === 0 ? 12 : h % 12}`;

/** Hour and minute wheels (5-minute steps). Value is "HH:MM" (24-hour); it shows as "6:30 AM". */
export function TimeField({
  value,
  onChange,
  label,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  invalid?: boolean;
}) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(6);
  const [mi, setMi] = useState(0);
  const parsed = /^(\d{2}):(\d{2})$/.exec(value);
  const text = parsed ? `${fmt12(Number(parsed[1]))}:${parsed[2]} ${Number(parsed[1]) < 12 ? 'AM' : 'PM'}` : null;

  const show = () => {
    setH(parsed ? Number(parsed[1]) : 6);
    setMi(parsed ? Math.round(Number(parsed[2]) / 5) * 5 : 0);
    setOpen(true);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text ?? 'not chosen'}`}
        accessibilityHint="Opens a time picker"
        onPress={show}
        style={[styles.field, { backgroundColor: c.surface, borderColor: invalid ? c.danger : c.line }]}
      >
        <Text style={[styles.fieldText, { color: text ? c.text : c.text2 }]}>{text ?? 'Optional'}</Text>
        <Icon name="clock" size={20} color={c.icon} />
      </Pressable>
      <Sheet
        title={label}
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => {
          onChange(`${pad(h)}:${pad(mi % 60)}`);
          setOpen(false);
        }}
      >
        <Wheel
          label="Hour"
          width="30%"
          index={h}
          onChange={setH}
          options={Array.from({ length: 24 }, (_, i) => ({ label: `${fmt12(i)} ${i < 12 ? 'AM' : 'PM'}` }))}
        />
        <Wheel
          label="Minutes"
          width="24%"
          index={MINUTES.indexOf(mi) < 0 ? 0 : MINUTES.indexOf(mi)}
          onChange={(i) => setMi(MINUTES[i])}
          options={MINUTES.map((v) => ({ label: pad(v) }))}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: space.gutter,
    gap: space.md,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wheels: { flexDirection: 'row', justifyContent: 'center', gap: 8, height: ROW * VISIBLE, overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, height: ROW, borderRadius: 12 },
  row: { height: ROW, alignItems: 'center', justifyContent: 'center' },
  item: { fontSize: 20 },
  field: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radius.button,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  fieldText: { fontFamily: fonts.body, fontSize: 16 },
});
