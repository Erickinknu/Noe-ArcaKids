import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '../theme-context';
import type { ThemeColors } from '../theme';

/**
 * Avatares ilustrados con look 3D (100% offline, SVG paramétrico con
 * gradientes radiales: fondo + sombreado de rostro + cabello).
 * IDs estables `a01`…`a24`. Los emojis legacy (1–2 caracteres) se siguen
 * renderizando como antes para no romper perfiles ya guardados.
 */

const SKINS = ['#FFE3C2', '#F6C89F', '#E8AC72', '#C68642', '#8D5524', '#5C3A21'];

const HAIR_COLORS = ['#1F2937', '#4B2E14', '#92400E', '#B45309', '#DC2626', '#6D28D9'];

const BACKGROUNDS: Array<[string, string]> = [
  ['#BFDBFE', '#1D4ED8'],
  ['#A7F3D0', '#059669'],
  ['#FDE68A', '#F59E0B'],
  ['#DDD6FE', '#7C3AED'],
  ['#FECDD3', '#E11D48'],
  ['#99F6E4', '#0D9488'],
];

const HAIR_STYLES = ['short', 'curly', 'long', 'cap', 'buzz', 'pigtails'] as const;
type HairStyle = (typeof HAIR_STYLES)[number];

export const AVATAR_IDS = Array.from({ length: 24 }, (_, i) => `a${String(i + 1).padStart(2, '0')}`);

function hashId(id: string): number {
  let h = 7;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return h;
}

interface AvatarParams {
  skin: string;
  hairColor: string;
  hairStyle: HairStyle;
  bg: [string, string];
}

export function avatarParamsFor(id: string): AvatarParams {
  const h = hashId(id);
  return {
    skin: SKINS[h % SKINS.length],
    hairColor: HAIR_COLORS[(h >> 2) % HAIR_COLORS.length],
    hairStyle: HAIR_STYLES[(h >> 4) % HAIR_STYLES.length],
    bg: BACKGROUNDS[(h >> 6) % BACKGROUNDS.length],
  };
}

export function isLegacyEmojiAvatar(id: string | undefined | null): boolean {
  if (!id) return false;
  if (/^a\d{2}$/.test(id)) return false;
  return Array.from(id).length <= 3;
}

function Hair({ style, color, uid }: { style: HairStyle; color: string; uid: string }) {
  switch (style) {
    case 'curly':
      return (
        <>
          <Circle cx={38} cy={42} r={13} fill={color} />
          <Circle cx={52} cy={32} r={14} fill={color} />
          <Circle cx={68} cy={32} r={14} fill={color} />
          <Circle cx={82} cy={42} r={13} fill={color} />
          <Path d="M32 52 Q60 22 88 52 L88 44 Q60 14 32 44 Z" fill={color} />
        </>
      );
    case 'long':
      return (
        <>
          <Path d="M30 50 Q28 95 38 100 L44 100 Q36 80 38 55 Z" fill={color} />
          <Path d="M90 50 Q92 95 82 100 L76 100 Q84 80 82 55 Z" fill={color} />
          <Path d="M30 48 Q60 14 90 48 L90 40 Q60 6 30 40 Z" fill={color} />
        </>
      );
    case 'cap':
      return (
        <>
          <Path d="M32 46 Q60 12 88 46 L88 42 Q60 8 32 42 Z" fill="#1D4ED8" />
          <Ellipse cx={88} cy={46} rx={10} ry={4} fill="#1E3A8A" />
          <Circle cx={60} cy={16} r={3.5} fill={`url(#cap-${uid})`} />
        </>
      );
    case 'buzz':
      return <Path d="M36 44 Q60 22 84 44 L84 38 Q60 16 36 38 Z" fill={color} opacity={0.85} />;
    case 'pigtails':
      return (
        <>
          <Circle cx={28} cy={58} r={9} fill={color} />
          <Circle cx={92} cy={58} r={9} fill={color} />
          <Path d="M32 46 Q60 16 88 46 L88 38 Q60 8 32 38 Z" fill={color} />
          <Circle cx={28} cy={50} r={3} fill="#F59E0B" />
          <Circle cx={92} cy={50} r={3} fill="#F59E0B" />
        </>
      );
    case 'short':
    default:
      return <Path d="M32 50 Q34 24 60 24 Q86 24 88 50 L84 44 Q78 32 60 32 Q42 32 36 44 Z" fill={color} />;
  }
}

export function Avatar3D({ id, size = 72 }: { id?: string | null; size?: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const safeId = id ?? 'a01';

  if (isLegacyEmojiAvatar(safeId)) {
    return (
      <View style={[styles.legacyWrap, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ fontSize: size * 0.52 }}>{safeId}</Text>
      </View>
    );
  }

  const p = avatarParamsFor(safeId);
  const uid = safeId.replace(/[^a-z0-9]/gi, '');
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <RadialGradient id={`bg-${uid}`} cx="35%" cy="28%" r="90%">
            <Stop offset="0%" stopColor={p.bg[0]} />
            <Stop offset="100%" stopColor={p.bg[1]} />
          </RadialGradient>
          <RadialGradient id={`sk-${uid}`} cx="38%" cy="30%" r="95%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.35} />
            <Stop offset="45%" stopColor={p.skin} stopOpacity={0} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={0.16} />
          </RadialGradient>
        </Defs>
        <Circle cx={60} cy={60} r={58} fill={`url(#bg-${uid})`} />
        <Hair style={p.hairStyle} color={p.hairColor} uid={uid} />
        {/* rostro */}
        <Circle cx={60} cy={68} r={30} fill={p.skin} />
        <Circle cx={60} cy={68} r={30} fill={`url(#sk-${uid})`} />
        {/* ojos felices */}
        <Path d="M45 64 Q49 60 53 64" stroke="#1F2937" strokeWidth={3} strokeLinecap="round" fill="none" />
        <Path d="M67 64 Q71 60 75 64" stroke="#1F2937" strokeWidth={3} strokeLinecap="round" fill="none" />
        {/* rubor */}
        <Ellipse cx={44} cy={74} rx={5} ry={3.4} fill="#F472B6" opacity={0.55} />
        <Ellipse cx={76} cy={74} rx={5} ry={3.4} fill="#F472B6" opacity={0.55} />
        {/* sonrisa */}
        <Path d="M51 76 Q60 84 69 76" stroke="#1F2937" strokeWidth={3} strokeLinecap="round" fill="none" />
        {/* cuerpo */}
        <Path d="M34 118 Q36 96 60 96 Q84 96 86 118 Z" fill={p.hairColor} opacity={0.9} />
      </Svg>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    legacyWrap: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
