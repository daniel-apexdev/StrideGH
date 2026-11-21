import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/controls';
import { Icon } from '@/components/icons';
import { ProductGrid, StoreBadge, StoreLogo } from '@/components/shop';
import { ErrorState, Shimmer } from '@/components/states';
import { Body, Display, Title } from '@/components/type';
import { useColors } from '@/lib/appearance';
import { allProducts, categoryOrder, type ProductCategory } from '@/lib/stores';
import { useStores } from '@/lib/use-stores';
import { brand, radius, space } from '@/theme';

export default function Shop() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { data, error, loading, refreshing, reload } = useStores();
  const [cat, setCat] = useState<ProductCategory | null>(null);

  const stores = data?.stores ?? [];
  const products = allProducts(stores);
  const present = categoryOrder.filter((k) => products.some((p) => p.category === k));
  const active = cat && present.includes(cat) ? cat : null;
  const shown = active ? products.filter((p) => p.category === active) : products;
  const onlySamples = stores.length > 0 && stores.every((s) => s.demo);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={brand.volt} />}
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: space.xxl, gap: space.xl }}
    >
      <View style={{ paddingHorizontal: space.gutter, gap: 6 }}>
        <Display size={36}>Running gear</Display>
        <Body color={c.text2}>From local shops. Ask the shop on WhatsApp, then collect or get it delivered.</Body>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: space.gutter, gap: space.md }}>
          <Shimmer style={{ height: 120 }} />
          <Shimmer style={{ height: 220 }} />
        </View>
      ) : error && !data ? (
        <View style={{ paddingHorizontal: space.gutter }}>
          <ErrorState error={error} onRetry={reload} />
        </View>
      ) : (
        <>
          {onlySamples ? (
            <View style={[styles.note, { backgroundColor: c.warnBg, marginHorizontal: space.gutter }]}>
              <Icon name="info" size={18} color={c.warnFg} />
              <Body size={14} color={c.warnFg} style={{ flex: 1 }}>
                These are sample shops to show how the shop will work. Real local shops are being added.
              </Body>
            </View>
          ) : null}

          <View style={{ gap: space.md }}>
            <Title size={24} style={{ paddingHorizontal: space.gutter }}>
              LOCAL SHOPS
            </Title>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingHorizontal: space.gutter }}
            >
              {stores.map((s) => (
                <Pressable
                  key={s.slug}
                  accessibilityRole="link"
                  accessibilityLabel={`${s.name}, ${s.area}, ${s.city}`}
                  onPress={() => router.push({ pathname: '/store/[slug]', params: { slug: s.slug } })}
                  style={({ pressed }) => [
                    styles.storeCard,
                    { backgroundColor: c.surface, borderColor: c.line, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <StoreLogo store={s} size={48} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Body size={15} weight="bold" color={c.text} numberOfLines={1}>
                        {s.name}
                      </Body>
                      <Body size={12} color={c.text2} numberOfLines={1}>
                        {s.area}, {s.city}
                      </Body>
                    </View>
                  </View>
                  <StoreBadge store={s} />
                  <Body size={12} color={c.text2}>
                    {s.products.length} products
                  </Body>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={{ gap: space.md, paddingHorizontal: space.gutter }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Title size={24}>{(active ?? 'All gear').toUpperCase()}</Title>
              <Body size={12} color={c.text2}>
                {shown.length} items
              </Body>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -space.gutter }}
              contentContainerStyle={{ gap: 8, paddingHorizontal: space.gutter }}
            >
              <Chip label="All" on={!active} onPress={() => setCat(null)} />
              {present.map((k) => (
                <Chip key={k} label={k} on={active === k} onPress={() => setCat(k)} />
              ))}
            </ScrollView>
            <ProductGrid products={shown} showStore />
          </View>

          <View style={[styles.note, { backgroundColor: c.tile, marginHorizontal: space.gutter }]}>
            <Icon name="bag" size={22} color={c.icon} />
            <View style={{ flex: 1, gap: 2 }}>
              <Body size={14} weight="bold" color={c.text}>
                Run a running shop?
              </Body>
              <Body size={13} color={c.text2}>
                Shop sign-ups open soon. For now, contact the Stride GH team.
              </Body>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.card },
  storeCard: { width: 230, gap: 10, borderWidth: 1, borderRadius: radius.card, padding: 14 },
});
