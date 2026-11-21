import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { brand, fonts } from '@/theme';

/**
 * The Stride GH mark: a bold condensed "S" on a volt tile.
 * The app icon and splash use the same drawing (assets/images is generated from it).
 */
export function LogoMark({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Stride GH">
      <Rect x={0} y={0} width={100} height={100} rx={22} fill={brand.volt} />
      <SvgText x={50} y={82} fontSize={88} fontFamily={fonts.displayHeavy} fontWeight="800" fill={brand.night} textAnchor="middle">
        S
      </SvgText>
    </Svg>
  );
}

/** "STRIDE" with "GH" in a volt box, as on the website. */
export function Wordmark({ size = 34, color = brand.paper }: { size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} accessible accessibilityRole="header" accessibilityLabel="Stride GH">
      <Text style={{ fontFamily: fonts.displayHeavy, fontSize: size, lineHeight: size * 1.05, letterSpacing: size * 0.02, color }}>
        STRIDE
      </Text>
      <View style={{ backgroundColor: brand.volt, marginLeft: size * 0.1, paddingHorizontal: size * 0.15 }}>
        <Text style={{ fontFamily: fonts.displayHeavy, fontSize: size, lineHeight: size * 1.05, color: brand.night }}>GH</Text>
      </View>
    </View>
  );
}

/**
 * A runner drawn in four poses. Cycling through them while moving reads as running.
 * Points are [x, y] in a 60 × 64 box: head, then torso (shoulder → hip), arms and legs as joint chains.
 */
type Pose = { arms: [number, number][][]; legs: [number, number][][] };
const SHOULDER: [number, number] = [32, 18];
const HIP: [number, number] = [27, 35];

export const RUNNER_POSES: Pose[] = [
  // reach: front leg out, back leg pushing off
  {
    arms: [
      [SHOULDER, [40, 23], [47, 17]],
      [SHOULDER, [24, 25], [17, 30]],
    ],
    legs: [
      [HIP, [38, 44], [45, 57]],
      [HIP, [19, 45], [8, 47]],
    ],
  },
  // pull through
  {
    arms: [
      [SHOULDER, [37, 26], [42, 31]],
      [SHOULDER, [28, 27], [27, 34]],
    ],
    legs: [
      [HIP, [33, 47], [29, 59]],
      [HIP, [24, 44], [17, 52]],
    ],
  },
  // flight: both feet off the ground
  {
    arms: [
      [SHOULDER, [24, 25], [18, 30]],
      [SHOULDER, [40, 23], [46, 17]],
    ],
    legs: [
      [HIP, [37, 41], [45, 47]],
      [HIP, [22, 47], [13, 55]],
    ],
  },
  // pass the other way
  {
    arms: [
      [SHOULDER, [28, 27], [26, 33]],
      [SHOULDER, [37, 26], [42, 31]],
    ],
    legs: [
      [HIP, [25, 46], [21, 57]],
      [HIP, [34, 44], [36, 53]],
    ],
  },
];

export function Runner({ pose, size = 60, color = brand.volt }: { pose: number; size?: number; color?: string }) {
  const p = RUNNER_POSES[pose % RUNNER_POSES.length];
  const pts = (chain: [number, number][]) => chain.map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <Svg width={size} height={(size * 64) / 60} viewBox="0 0 60 64">
      <Circle cx={36} cy={9} r={5.5} fill={color} />
      <Line x1={SHOULDER[0]} y1={SHOULDER[1]} x2={HIP[0]} y2={HIP[1]} stroke={color} strokeWidth={5.5} strokeLinecap="round" />
      {[...p.arms, ...p.legs].map((chain, i) => (
        <Polyline key={i} points={pts(chain)} fill="none" stroke={color} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}
