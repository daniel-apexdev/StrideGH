import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip } from '@/components/controls';
import { Icon, type IconName } from '@/components/icons';
import { ProductGrid, StoreBadge, StoreLogo } from '@/components/shop';
import { ErrorState, Message, Shimmer } from '@/components/states';
import { Body, Display, Title } from '@/components/type';
import { useColors } from '@/lib/appearance';
import { siteAsset } from '@/lib/config';
import { categoryOrder, instagramLink, mapsLink, telLink, whatsappLink, type ProductCategory } from '@/lib/stores';
import { useStores } from '@/lib/use-stores';
import { brand, fonts, radius, space } from '@/theme';

export default function StoreScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, error, loading, reload } = useStores();
  const [cat, setCat] = useState<ProductCategory | null>(null);
  const store = data?.stores.find((s) => s.slug === slug);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/shop'));

  if (loading || (error && !data) || !store) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + space.lg, padding: space.gutter, gap: space.md }}>
        {loading ? (
          <Shimmer style={{ height: 240 }} />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Message
            title="Shop not found"
            body="It may have been removed."
            action={<Button label="Back to the shop" variant="outline" onPress={back} />}
          />
        )}
      </View>
    );
  }

  const cats = categoryOrder.filter((k) => store.products.some((p) => p.category === k));
  const active = cat && cats.includes(cat) ? cat : null;
  const products = store.products.filter((p) => !active || p.category === active).map((p) => ({ ...p, store }));
  const place = [store.address, store.address?.includes(store.area) ? null : store.area, store.city].filter(Boolean).join(', ');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
      <View style={[styles.cover, { backgroundColor: c.hero, height: 150 + insets.top }]}>
        {store.cover ? (
          <Image
            source={{ uri: siteAsset(store.cover.src) }}
            accessibilityLabel={store.cover.alt}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <Text accessible={false} style={[styles.coverText, { color: c.heroLine }]}>
            {store.area.split(' ')[0].toUpperCase().slice(0, 6)}
          </Text>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={[styles.back, { top: insets.top + 12 }]}>
          <Icon name="back" size={22} color={brand.night} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: space.gutter, marginTop: -42, gap: 10 }}>
        <StoreLogo store={store} size={84} ring={c.bg} />
        <Display size={38}>{store.name}</Display>
        <StoreBadge store={store} />
        <Body size={15}>{store.description}</Body>
        {store.demo ? (
          <Body size={12} color={c.text2}>
            A made-up shop to show how shop pages will look. It can’t be contacted.
          </Body>
        ) : store.verification !== 'verified' ? (
          <Body size={12} color={c.text2}>
            We’re still checking this shop’s details. Agree price and collection with the shop before paying.
          </Body>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Row icon="pin" action={{ label: 'Directions', onPress: () => WebBrowser.openBrowserAsync(mapsLink(store)) }}>
          {place}
        </Row>
        {store.hours ? <Row icon="clock">{store.hours}</Row> : null}
        <Row icon="flag">
          {[store.collection !== false && 'Collect in store', store.delivery && `Delivery: ${store.delivery}`]
            .filter(Boolean)
            .join(' · ') || 'Ask the shop'}
        </Row>
        {store.payments?.length ? <Row icon="info">{store.payments.join(' · ')}</Row> : null}
        {store.instagram ? (
          <Row icon="external" action={{ label: 'Open', onPress: () => WebBrowser.openBrowserAsync(instagramLink(store.instagram!)) }}>
            Instagram {store.instagram}
          </Row>
        ) : null}
      </View>

      {store.whatsapp || store.phone ? (
        <View style={styles.actions}>
          {store.whatsapp ? (
            <Button
              label="WhatsApp"
              onPress={() => Linking.openURL(whatsappLink(store.whatsapp!, `Hi ${store.name}! I found you on Stride GH.`))}
              style={{ flex: 1 }}
            />
          ) : null}
          {store.phone ? (
            <Button label="Call" variant="outline" onPress={() => Linking.openURL(telLink(store.phone!))} style={{ flex: 1 }} />
          ) : null}
        </View>
      ) : null}

      <View style={{ paddingHorizontal: space.gutter, paddingTop: space.xl, gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Title size={24}>PRODUCTS</Title>
          <Body size={12} color={c.text2}>
            {products.length} of {store.products.length}
          </Body>
        </View>
        {cats.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -space.gutter }}
            contentContainerStyle={{ gap: 8, paddingHorizontal: space.gutter }}
          >
            <Chip label="All" on={!active} onPress={() => setCat(null)} />
            {cats.map((k) => (
              <Chip key={k} label={k} on={active === k} onPress={() => setCat(k)} />
            ))}
          </ScrollView>
        ) : null}
        {products.length ? <ProductGrid products={products} /> : <Body color={c.text2}>This shop hasn’t listed products yet.</Body>}
      </View>
    </ScrollView>
  );
}

function Row({ icon, children, action }: { icon: IconName; children: ReactNode; action?: { label: string; onPress: () => void } }) {
  const c = useColors();
  return (
    <View style={[styles.row, { borderColor: c.line2 }]}>
      <Icon name={icon} size={18} color={c.icon} />
      <Body size={14} color={c.text} style={{ flex: 1 }}>
        {children}
      </Body>
      {action ? (
        <Pressable accessibilityRole="link" onPress={action.onPress} hitSlop={8}>
          <Body size={13} weight="bold" color={c.link}>
            {action.label}
          </Body>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { overflow: 'hidden', justifyContent: 'flex-end' },
  coverText: { position: 'absolute', right: -6, top: 10, fontFamily: fonts.displayHeavy, fontSize: 150, lineHeight: 150, opacity: 0.9 },
  back: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { marginHorizontal: space.gutter, marginTop: space.lg, borderWidth: 1, borderRadius: radius.card },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    marginTop: -1,
  },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: space.gutter, paddingTop: space.md },
});
