import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/lib/appearance';
import { radius, space } from '@/theme';

import { Icon, type IconName } from './icons';
import { Body, Display, Label } from './type';

/** Honest placeholder for parts that are designed but not built yet. */
export function ComingSoon({ icon, stage, title, children }: { icon: IconName; stage: string; title: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.box, { backgroundColor: c.tile }]}>
      <View style={[styles.icon, { backgroundColor: c.surface }]}>
        <Icon name={icon} size={24} color={c.icon} />
      </View>
      <Label color={c.clay}>{stage.toUpperCase()}</Label>
      <Display size={28}>{title}</Display>
      <Body size={14}>{children}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: space.gutter, borderRadius: radius.card, gap: space.md, alignItems: 'flex-start' },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
