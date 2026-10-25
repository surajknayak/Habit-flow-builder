import React, { useState } from 'react';
import {
  Accessibility,
  Activity,
  Armchair,
  Award,
  Calendar,
  Clock,
  Eye,
  Flame,
  Footprints,
  Hand,
  Heart,
  Moon,
  PersonStanding,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Zap,
} from 'lucide-react';

interface IllustrationProps {
  name: string;
  category?: 'primary' | 'lavender' | 'coral' | 'sun' | 'mint';
  className?: string;
  alt?: string;
}

const CATEGORY_STYLES: Record<
  string,
  { from: string; to: string; accent: string; iconColor: string }
> = {
  primary: {
    from: '#DDF1FD',
    to: '#C4E7FC',
    accent: '#2EB8F5',
    iconColor: '#0A5C80',
  },
  lavender: {
    from: '#EDE8FF',
    to: '#DDD4FF',
    accent: '#B9A6FF',
    iconColor: '#483585',
  },
  coral: {
    from: '#FFE3DB',
    to: '#FFD0C2',
    accent: '#FF7A59',
    iconColor: '#9E3318',
  },
  sun: {
    from: '#FFF5D6',
    to: '#FFE9A6',
    accent: '#FFD24D',
    iconColor: '#7A5900',
  },
  mint: {
    from: '#DDF8EC',
    to: '#C2F2DD',
    accent: '#5EE6B0',
    iconColor: '#0E6B48',
  },
};

function getIconForSlot(name: string) {
  if (name.includes('welcome')) return PersonStanding;
  if (name.includes('today-done') || name.includes('medal')) return Award;
  if (name.includes('today')) return Sun;
  if (name.includes('workout')) return Flame;
  if (name.includes('desk')) return Armchair;
  if (name.includes('neck')) return Accessibility;
  if (name.includes('back')) return Activity;
  if (name.includes('hips') || name.includes('feet') || name.includes('ankle')) return Footprints;
  if (name.includes('hands') || name.includes('wrist')) return Hand;
  if (name.includes('eyes') || name.includes('look') || name.includes('palm') || name.includes('blink')) return Eye;
  if (name.includes('energy')) return Zap;
  if (name.includes('wind') || name.includes('breath')) return Moon;
  if (name.includes('onboarding-1')) return User;
  if (name.includes('onboarding-2')) return Activity;
  if (name.includes('onboarding-3')) return Heart;
  if (name.includes('onboarding-4')) return Calendar;
  if (name.includes('onboarding-5')) return Clock;
  if (name.includes('onboarding-6')) return Armchair;
  if (name.includes('onboarding-7')) return Sparkles;
  if (name.includes('onboarding-8')) return ShieldCheck;
  if (name.includes('posture')) return PersonStanding;
  return PersonStanding;
}

const HeroWelcomeSvg: React.FC = () => (
  <svg
    viewBox="0 0 300 220"
    className="w-full h-full animate-breathe origin-center"
    aria-hidden="true"
    preserveAspectRatio="xMidYMid meet"
  >
    <defs>
      <linearGradient id="welcomeRoomBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E6F5FD" />
        <stop offset="100%" stopColor="#F2EDFF" />
      </linearGradient>
      <linearGradient id="welcomeWindowSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2EB8F5" stopOpacity="0.38" />
        <stop offset="100%" stopColor="#DDF1FD" stopOpacity="0.85" />
      </linearGradient>
      <linearGradient id="welcomeShirt" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2EB8F5" />
        <stop offset="100%" stopColor="#5EE6B0" />
      </linearGradient>
      <radialGradient id="welcomeSunGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFD24D" stopOpacity="0.65" />
        <stop offset="100%" stopColor="#FFD24D" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Soft pastel room background */}
    <rect width="300" height="220" rx="24" fill="url(#welcomeRoomBg)" />

    {/* Floor / soft mat */}
    <path
      d="M0 182 Q150 172 300 182 L300 220 L0 220 Z"
      fill="#EDE8FF"
    />
    <ellipse cx="150" cy="204" rx="76" ry="11" fill="#B9A6FF" fillOpacity="0.35" />

    {/* Rounded window on the left with sky #2EB8F5 and sun #FFD24D */}
    <g transform="translate(34, 24)">
      <rect
        x="0"
        y="0"
        width="74"
        height="98"
        rx="37"
        fill="url(#welcomeWindowSky)"
        stroke="#FFFFFF"
        strokeWidth="5"
      />
      {/* Sun glow and sun circle */}
      <circle cx="48" cy="32" r="24" fill="url(#welcomeSunGlow)" />
      <circle cx="48" cy="32" r="12" fill="#FFD24D" />
      {/* Soft clouds / hills in window */}
      <path
        d="M6 80 Q26 68 46 78 T70 76 L70 94 L6 94 Z"
        fill="#FFFFFF"
        fillOpacity="0.65"
      />
      {/* Window pane dividers */}
      <line x1="37" y1="3" x2="37" y2="95" stroke="#FFFFFF" strokeWidth="3.5" />
      <line x1="3" y1="52" x2="71" y2="52" stroke="#FFFFFF" strokeWidth="3.5" />
      {/* Window sill */}
      <rect x="-5" y="94" width="84" height="7" rx="3.5" fill="#FFFFFF" />
    </g>

    {/* Soft sunlight beam */}
    <polygon
      points="102,45 215,185 110,185 65,98"
      fill="#FFD24D"
      fillOpacity="0.1"
    />

    {/* Potted plant on the right with mint #5EE6B0 leaves and lavender #B9A6FF pot */}
    <g transform="translate(222, 106)">
      {/* Mint leaves */}
      <path
        d="M22 48 C6 36 4 16 16 8 C26 16 28 34 22 48 Z"
        fill="#5EE6B0"
      />
      <path
        d="M26 48 C26 26 38 6 50 10 C52 24 40 40 26 48 Z"
        fill="#2EB8F5"
        fillOpacity="0.75"
      />
      <path
        d="M24 50 C36 38 52 34 58 42 C48 52 36 54 24 50 Z"
        fill="#5EE6B0"
      />
      <path
        d="M20 50 C8 44 -2 46 2 55 C10 58 16 54 20 50 Z"
        fill="#5EE6B0"
        fillOpacity="0.85"
      />
      {/* Rounded plant pot */}
      <rect x="8" y="47" width="34" height="30" rx="10" fill="#B9A6FF" />
      <rect x="5" y="45" width="40" height="7" rx="3.5" fill="#DDD4FF" />
    </g>

    {/* Friendly character stretching arms overhead */}
    <g transform="translate(150, 118)">
      {/* Soft halo behind character */}
      <circle cx="0" cy="-16" r="56" fill="#2EB8F5" fillOpacity="0.1" />

      {/* Left arm stretched overhead */}
      <path
        d="M-22 -8 C-38 -36 -32 -68 -12 -82"
        fill="none"
        stroke="#F6C6A8"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <circle cx="-12" cy="-82" r="7.5" fill="#F6C6A8" />

      {/* Right arm stretched overhead */}
      <path
        d="M22 -8 C38 -36 32 -68 12 -82"
        fill="none"
        stroke="#F6C6A8"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <circle cx="12" cy="-82" r="7.5" fill="#F6C6A8" />

      {/* Clasp / stretch sparkle between hands overhead */}
      <circle cx="0" cy="-91" r="4" fill="#FFD24D" />
      <circle cx="-22" cy="-88" r="2.5" fill="#5EE6B0" />
      <circle cx="22" cy="-88" r="2.5" fill="#2EB8F5" />

      {/* Lower body / pants (lavender #B9A6FF) */}
      <path
        d="M-22 36 L-18 82 L-4 82 L0 52 L4 82 L18 82 L22 36 Z"
        fill="#B9A6FF"
        strokeLinejoin="round"
      />

      {/* Torso / rounded shirt (sky #2EB8F5 to mint #5EE6B0) */}
      <rect
        x="-27"
        y="-16"
        width="54"
        height="58"
        rx="24"
        fill="url(#welcomeShirt)"
      />

      {/* Neck */}
      <rect x="-7" y="-26" width="14" height="14" rx="6" fill="#F6C6A8" />

      {/* Head (rounded, flat-but-soft) */}
      <circle cx="0" cy="-42" r="20" fill="#F6C6A8" />

      {/* Soft rounded hair cap */}
      <path
        d="M-20 -44 C-20 -58 20 -58 20 -44 C14 -50 -14 -50 -20 -44 Z"
        fill="#0F2A3A"
      />
      <circle cx="0" cy="-60" r="7" fill="#0F2A3A" />

      {/* No face detail beyond a small warm smile */}
      <path
        d="M-6 -39 Q0 -33 6 -39"
        fill="none"
        stroke="#0F2A3A"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </g>
  </svg>
);

export const Illustration: React.FC<IllustrationProps> = ({
  name,
  category = 'primary',
  className = 'w-full h-40',
  alt,
}) => {
  const [imgAvailable, setImgAvailable] = useState(false);
  const [triedLoad, setTriedLoad] = useState(false);

  const palette = CATEGORY_STYLES[category] || CATEGORY_STYLES.primary;
  const IconComp = getIconForSlot(name);
  const label = alt || name.replace(/[-/]/g, ' ');

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative overflow-hidden flex items-center justify-center select-none ${className}`}
      style={{
        background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
      }}
    >
      {!triedLoad && (
        <img
          src={`/media/${name}.webp`}
          alt={label}
          referrerPolicy="no-referrer"
          className={imgAvailable ? 'w-full h-full object-cover' : 'hidden'}
          onLoad={() => setImgAvailable(true)}
          onError={() => {
            setImgAvailable(false);
            setTriedLoad(true);
          }}
        />
      )}

      {!imgAvailable && name === 'hero-welcome' ? (
        <HeroWelcomeSvg />
      ) : (
        !imgAvailable && (
          <>
            <svg
              viewBox="0 0 320 200"
              className="absolute inset-0 w-full h-full"
              aria-hidden="true"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <radialGradient id={`blob-${name}`} cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stopColor={palette.accent} stopOpacity="0.38" />
                  <stop offset="100%" stopColor={palette.accent} stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="85" cy="50" r="75" fill={`url(#blob-${name})`} />
              <circle cx="245" cy="155" r="85" fill={`url(#blob-${name})`} />
              <path
                d="M110,45 C155,20 215,35 230,80 C245,125 205,170 155,172 C105,174 75,135 82,90 C88,55 95,53 110,45 Z"
                fill="#FFFFFF"
                fillOpacity="0.55"
              />
            </svg>
            <div
              className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full shadow-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.82)',
                color: palette.iconColor,
              }}
            >
              <IconComp className="w-8 h-8" strokeWidth={2.2} />
            </div>
          </>
        )
      )}
    </div>
  );
};
