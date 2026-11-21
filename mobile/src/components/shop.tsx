import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useColors } from '@/lib/appearance';
import { siteAsset } from '@/lib/config';
import {
  availabilityLabel,
  categoryIcon,
  initials,
  onColor,
  productPrice,
  type Product,
  type ProductWithStore,
  type Store,
} from '@/lib/stores';
import { fonts } from '@/theme';

import { Body } from './type';

/** Shop logo, or its initials on the brand colour. */
export function StoreLogo({ store, size = 56, ring }: { store: Store; size?: number; ring?: string }) {
  const bg = store.brandColor ?? '#0E3B2C';
  const style = { width: size, height: size, borderRadius: size * 0.22, borderWidth: ring ? 4 : 0, borderColor: ring };
  if (store.logo) {
    return (
      <Image
        source={{ uri: siteAsset(store.logo.src) }}
        accessibilityLabel={store.logo.alt}
        contentFit="cover"
        style={[style, { backgroundColor: '#fff' }]}
      />
    );
  }
  return (
    <View accessible={false} style={[style, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontFamily: fonts.displayHeavy, fontSize: size * 0.34, color: onColor(bg) }}>{initials(store.name)}</Text>
    </View>
  );
}

/** First product photo, or a line drawing of its category on a tile. */
export function ProductImage({ product, height, radius = 12 }: { product: Product; height: number; radius?: number }) {
  const c = useColors();
  const img = product.images?.[0];
  return (
    <View
      style={{ height, borderRadius: radius, backgroundColor: c.tile, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
    >
      {img ? (
        <Image
          source={{ uri: siteAsset(img.src) }}
          accessibilityLabel={img.alt}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Svg
          width={64}
          height={64}
          viewBox="0 0 24 24"
          fill="none"
          stroke={c.icon}
          strokeWidth={1.1}
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <Path d={categoryIcon[product.category]} />
        </Svg>
      )}
    </View>
  );
}

export function AvailabilityText({ product }: { product: Product }) {
  const c = useColors();
  const a = product.availability ?? 'ask';
  const color = a === 'in_stock' ? c.okFg : a === 'low_stock' ? c.warnFg : c.text2;
  return (
    <Body size={12} weight="semi" color={color}>
      {availabilityLabel[a]}
    </Body>
  );
}

export function ProductCard({ product, showStore }: { product: ProductWithStore; showStore?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${product.name}, ${productPrice(product)}, ${availabilityLabel[product.availability ?? 'ask']}${showStore ? `, from ${product.store.name}` : ''}`}
      onPress={() => router.push({ pathname: '/product/[store]/[product]', params: { store: product.store.slug, product: product.slug } })}
      style={({ pressed }) => [{ flex: 1, gap: 6, opacity: pressed ? 0.8 : 1 }]}
    >
      <ProductImage product={product} height={150} />
      <Body size={14} weight="semi" color={c.text} numberOfLines={2}>
        {product.name}
      </Body>
      <Text style={{ fontFamily: fonts.display, fontSize: 19, color: c.text }}>{productPrice(product)}</Text>
      <AvailabilityText product={product} />
      {showStore ? (
        <Body size={12} color={c.text2} numberOfLines={1}>
          {product.store.name}
        </Body>
      ) : null}
    </Pressable>
  );
}

/** Two products per row. */
export function ProductGrid({ products, showStore }: { products: ProductWithStore[]; showStore?: boolean }) {
  const rows: ProductWithStore[][] = [];
  for (let i = 0; i < products.length; i += 2) rows.push(products.slice(i, i + 2));
  return (
    <View style={{ gap: 18 }}>
      {rows.map((row) => (
        <View key={row.map((p) => `${p.store.slug}/${p.slug}`).join('|')} style={{ flexDirection: 'row', gap: 12 }}>
          {row.map((p) => (
            <ProductCard key={p.slug} product={p} showStore={showStore} />
          ))}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

export function StoreBadge({ store }: { store: Store }) {
  const c = useColors();
  const [bg, fg, label] = store.demo
    ? [c.neuBg, c.neuFg, 'SAMPLE SHOP']
    : store.verification === 'verified'
      ? [c.okBg, c.okFg, 'Verified shop']
      : [c.neuBg, c.neuFg, 'Verification pending'];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: fg }}>{label}</Text>
    </View>
  );
}
