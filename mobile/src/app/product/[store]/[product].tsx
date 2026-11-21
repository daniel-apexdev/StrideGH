import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, tap } from '@/components/controls';
import { Icon } from '@/components/icons';
import { AvailabilityText, ProductGrid, ProductImage, StoreBadge, StoreLogo } from '@/components/shop';
import { ErrorState, Message, Shimmer } from '@/components/states';
import { Body, Display, Label, Title } from '@/components/type';
import { useColors } from '@/lib/appearance';
import { siteAsset } from '@/lib/config';
import { askAboutProduct, checkedLabel, productPrice, telLink, whatsappLink } from '@/lib/stores';
import { useStores } from '@/lib/use-stores';
import { fonts, radius, space } from '@/theme';

export default function ProductScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ store: string; product: string }>();
  const { data, error, loading, reload } = useStores();
  const [size, setSize] = useState<string | null>(null);
  const [colour, setColour] = useState<string | null>(null);
  const store = data?.stores.find((s) => s.slug === params.store);
  const product = store?.products.find((p) => p.slug === params.product);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/shop'));

  if (loading || (error && !data) || !store || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + space.lg, padding: space.gutter, gap: space.md }}>
        {loading ? (
          <Shimmer style={{ height: 320 }} />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Message
            title="Product not found"
            body="The shop may have removed it."
            action={<Button label="Back to the shop" variant="outline" onPress={back} />}
          />
        )}
      </View>
    );
  }

  const colours = product.colours ?? [];
  const pickedColour = colours.length === 1 ? colours[0] : colour;
  const more = store.products
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4)
    .map((p) => ({ ...p, store }));
  const checked = checkedLabel(product);

  const option = (label: string, on: boolean, onPress: () => void, off = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled: off }}
      accessibilityLabel={off ? `${label}, sold out` : label}
      disabled={off}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.option, { backgroundColor: on ? c.sel : c.surface, borderColor: on ? c.sel : c.line, opacity: off ? 0.4 : 1 }]}
    >
      <Text
        style={{
          fontFamily: fonts.bodySemi,
          fontSize: 14,
          color: on ? c.onSel : c.text,
          textDecorationLine: off ? 'line-through' : 'none',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxl, gap: space.lg }}
    >
      <View style={{ paddingHorizontal: space.gutter }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Back to ${store.name}`}
          onPress={back}
          style={[styles.back, { borderColor: c.line, backgroundColor: c.surface }]}
        >
          <Icon name="back" size={20} color={c.text} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: space.gutter, gap: 10 }}>
        <ProductImage product={product} height={340} radius={16} />
        {(product.images?.length ?? 0) > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {product.images!.slice(1).map((img) => (
              <Image
                key={img.src}
                source={{ uri: siteAsset(img.src) }}
                accessibilityLabel={img.alt}
                contentFit="cover"
                style={styles.thumb}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: space.gutter, gap: 6 }}>
        <Label>{[product.brand, product.category].filter(Boolean).join(' · ').toUpperCase()}</Label>
        <Display size={34}>{product.name}</Display>
        <Text style={{ fontFamily: fonts.display, fontSize: 28, color: c.text }}>{productPrice(product)}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <AvailabilityText product={product} />
          {checked ? (
            <Body size={12} color={c.text2}>
              · {checked}
            </Body>
          ) : null}
        </View>
      </View>

      {product.description ? (
        <Body size={15} style={{ paddingHorizontal: space.gutter }}>
          {product.description}
        </Body>
      ) : null}

      {product.sizes?.length ? (
        <View style={{ paddingHorizontal: space.gutter, gap: 8 }}>
          <Body size={14} weight="bold" color={c.text}>
            Size{size ? ` · ${size}` : ''}
          </Body>
          <View style={styles.wrap}>
            {product.sizes.map((s) => option(s, size === s, () => setSize(size === s ? null : s), product.soldOutSizes?.includes(s)))}
          </View>
        </View>
      ) : null}

      {colours.length > 1 ? (
        <View style={{ paddingHorizontal: space.gutter, gap: 8 }}>
          <Body size={14} weight="bold" color={c.text}>
            Colour{colour ? ` · ${colour}` : ''}
          </Body>
          <View style={styles.wrap}>{colours.map((k) => option(k, colour === k, () => setColour(colour === k ? null : k)))}</View>
        </View>
      ) : null}

      <View style={{ paddingHorizontal: space.gutter, gap: 10 }}>
        {store.demo ? (
          <Body size={14} color={c.neuFg} style={[styles.note, { backgroundColor: c.neuBg }]}>
            This is a sample shop, so it can’t be contacted. Real shops show WhatsApp and call buttons here.
          </Body>
        ) : store.whatsapp || store.phone ? (
          <>
            {store.whatsapp ? (
              <Button
                label={`Ask ${store.name} on WhatsApp`}
                onPress={() => Linking.openURL(whatsappLink(store.whatsapp!, askAboutProduct(product, { size, colour: pickedColour })))}
              />
            ) : null}
            {store.phone ? <Button label="Call the shop" variant="outline" onPress={() => Linking.openURL(telLink(store.phone!))} /> : null}
            <Body size={12} color={c.text2}>
              You arrange payment and collection or delivery with the shop. Stride GH doesn’t take payments yet.
            </Body>
          </>
        ) : (
          <Body size={14} color={c.neuFg} style={[styles.note, { backgroundColor: c.neuBg }]}>
            Contact details for this shop are coming soon.
          </Body>
        )}
      </View>

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/store/[slug]', params: { slug: store.slug } })}
        style={({ pressed }) => [styles.storeRow, { backgroundColor: c.surface, borderColor: c.line, opacity: pressed ? 0.85 : 1 }]}
      >
        <StoreLogo store={store} size={48} />
        <View style={{ flex: 1, gap: 4 }}>
          <Body size={15} weight="bold" color={c.text}>
            {store.name}
          </Body>
          <Body size={12} color={c.text2}>
            {store.area}, {store.city}
            {store.hours ? ` · ${store.hours}` : ''}
          </Body>
          <StoreBadge store={store} />
        </View>
        <Icon name="arrow" size={18} color={c.icon} />
      </Pressable>

      {more.length ? (
        <View style={{ paddingHorizontal: space.gutter, gap: space.md }}>
          <Title size={24}>{`MORE FROM ${store.name.toUpperCase()}`}</Title>
          <ProductGrid products={more} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 80, height: 80, borderRadius: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    minWidth: 48,
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { padding: 14, borderRadius: radius.card, overflow: 'hidden' },
  storeRow: {
    marginHorizontal: space.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 14,
  },
});
