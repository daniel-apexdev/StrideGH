import { Redirect } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '@/components/controls';
import { Icon, type IconName } from '@/components/icons';
import { useColors } from '@/lib/appearance';
import { useWelcomed } from '@/lib/welcome';
import { fonts } from '@/theme';

/** Icon + label tab, matching the website's bottom bar. */
const NavTab = forwardRef<ComponentRef<typeof Pressable>, TabTriggerSlotProps & { label: string; icon: IconName }>(function NavTab(
  { isFocused, label, icon, onPress, ...props },
  ref,
) {
  const c = useColors();
  return (
    <Pressable
      ref={ref}
      {...props}
      onPress={(e) => {
        tap();
        onPress?.(e);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: isFocused ? c.navOn : 'transparent' }]}>
        <Icon name={icon} size={22} color={isFocused ? c.navOnFg : c.text2} />
      </View>
      <Text
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        style={[styles.label, { color: isFocused ? c.navOnFg : c.text2, fontFamily: isFocused ? fonts.bodyBold : fonts.bodySemi }]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const welcomed = useWelcomed();
  // First open on this phone: show what the app does before anything else.
  if (welcomed === 'no') return <Redirect href="/welcome" />;
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList
        style={StyleSheet.flatten([
          styles.bar,
          { backgroundColor: c.surface, borderTopColor: c.line, paddingBottom: Math.max(insets.bottom, 8) },
        ])}
      >
        <TabTrigger name="index" href="/" asChild>
          <NavTab label="Home" icon="home" />
        </TabTrigger>
        <TabTrigger name="events" href="/events" asChild>
          <NavTab label="Events" icon="calendar" />
        </TabTrigger>
        <TabTrigger name="shop" href="/shop" asChild>
          <NavTab label="Shop" icon="bag" />
        </TabTrigger>
        <TabTrigger name="saved" href="/saved" asChild>
          <NavTab label="Saved" icon="bookmark" />
        </TabTrigger>
        <TabTrigger name="account" href="/account" asChild>
          <NavTab label="Account" icon="user" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 6, paddingHorizontal: 6 },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
  iconWrap: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11 },
});
