import React from 'react';

// Cute Green Alien in paper-cut sticker style
export const CuteAlien: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 52 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[2px_3px_0px_rgba(70,60,50,0.18)] ${className}`}
  >
    {/* Stitched paper border / sticker white outline */}
    <g>
      {/* UFO / Planet Saucer bottom */}
      <ellipse cx="50" cy="74" rx="34" ry="10" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="3 2" />
      <ellipse cx="50" cy="72" rx="26" ry="7" fill="#6EE7B7" stroke="#059669" strokeWidth="2" />
      <circle cx="34" cy="73" r="2.5" fill="#FEF08A" />
      <circle cx="50" cy="74" r="2.5" fill="#FEF08A" />
      <circle cx="66" cy="73" r="2.5" fill="#FEF08A" />

      {/* Alien Head */}
      <path
        d="M26 44C26 28 36 20 50 20C64 20 74 28 74 44C74 58 64 64 50 64C36 64 26 58 26 44Z"
        fill="#4ADE80"
        stroke="#16A34A"
        strokeWidth="2.5"
      />

      {/* Antenna */}
      <path d="M50 20V11" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="9" r="5" fill="#FACC15" stroke="#CA8A04" strokeWidth="2" />

      {/* Cute Big Alien Eyes */}
      <ellipse cx="40" cy="40" rx="7" ry="9" fill="#1E293B" />
      <ellipse cx="60" cy="40" rx="7" ry="9" fill="#1E293B" />
      <circle cx="42" cy="37" r="3" fill="#FFFFFF" />
      <circle cx="62" cy="37" r="3" fill="#FFFFFF" />
      <circle cx="38" cy="43" r="1.5" fill="#FFFFFF" />
      <circle cx="58" cy="43" r="1.5" fill="#FFFFFF" />

      {/* Cheeks */}
      <ellipse cx="33" cy="48" rx="4" ry="2" fill="#F472B6" opacity="0.75" />
      <ellipse cx="67" cy="48" rx="4" ry="2" fill="#F472B6" opacity="0.75" />

      {/* Happy Smile */}
      <path d="M44 50C46 54 54 54 56 50" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" />

      {/* Cute Little Alien Hands */}
      <circle cx="28" cy="56" r="3" fill="#4ADE80" stroke="#16A34A" strokeWidth="1.5" />
      <circle cx="72" cy="56" r="3" fill="#4ADE80" stroke="#16A34A" strokeWidth="1.5" />
    </g>
  </svg>
);

// Cute Astronaut in paper-cut sticker style
export const CuteAstronaut: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 52 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[2px_3px_0px_rgba(70,60,50,0.18)] ${className}`}
  >
    {/* Backpack / Jetpack */}
    <rect x="22" y="38" width="12" height="30" rx="4" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
    <rect x="66" y="38" width="12" height="30" rx="4" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />

    {/* Body / Suit */}
    <path
      d="M32 46C32 40 40 38 50 38C60 38 68 40 68 46L66 74C66 78 62 80 50 80C38 80 34 78 34 74L32 46Z"
      fill="#F8FAFC"
      stroke="#CBD5E1"
      strokeWidth="2.5"
    />

    {/* Chest control panel */}
    <rect x="42" y="52" width="16" height="12" rx="3" fill="#E0E7FF" stroke="#818CF8" strokeWidth="1.5" />
    <circle cx="46" cy="58" r="2" fill="#EF4444" />
    <circle cx="51" cy="58" r="2" fill="#10B981" />
    <circle cx="56" cy="58" r="2" fill="#3B82F6" />

    {/* Helmet */}
    <circle cx="50" cy="30" r="22" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="2.5" />
    {/* Visor */}
    <rect x="36" y="20" width="28" height="18" rx="9" fill="#0EA5E9" stroke="#0284C7" strokeWidth="2" />
    {/* Visor Glare/Reflection */}
    <path d="M40 24C44 23 48 23 52 24" stroke="#BAE6FD" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="57" cy="25" r="1.5" fill="#FFFFFF" />

    {/* Helmet Ears/Antennas */}
    <rect x="25" y="27" width="5" height="8" rx="2" fill="#CBD5E1" />
    <rect x="70" y="27" width="5" height="8" rx="2" fill="#CBD5E1" />

    {/* Legs with cute boots */}
    <rect x="38" y="78" width="9" height="12" rx="4" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
    <rect x="53" y="78" width="9" height="12" rx="4" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />

    {/* Little Red Blood Bag / Heart balloon string held by hand */}
    <path d="M72 56L78 40" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="2 2" />
    <path
      d="M78 36C78 33 80 30 83 30C86 30 88 33 88 36C88 41 83 45 83 45C83 45 78 41 78 36Z"
      fill="#EF4444"
      stroke="#B91C1C"
      strokeWidth="1.5"
    />
  </svg>
);

// Paper-cut Planet
export const PaperPlanet: React.FC<{ className?: string; size?: number; color?: string }> = ({
  className = '',
  size = 40,
  color = '#FDE68A',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 60 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[2px_2px_0px_rgba(70,60,50,0.15)] ${className}`}
  >
    {/* Planet Ring */}
    <ellipse
      cx="30"
      cy="30"
      rx="26"
      ry="7"
      transform="rotate(-20 30 30)"
      fill="none"
      stroke="#D97706"
      strokeWidth="2.5"
      strokeDasharray="4 2"
    />
    {/* Main Planet Body */}
    <circle cx="30" cy="30" r="16" fill={color} stroke="#B45309" strokeWidth="2" />
    <circle cx="25" cy="24" r="3" fill="#D97706" opacity="0.4" />
    <circle cx="34" cy="33" r="4" fill="#D97706" opacity="0.4" />
    <circle cx="28" cy="36" r="2" fill="#D97706" opacity="0.3" />
  </svg>
);

// Paper-cut Star Sticker
export const PaperStar: React.FC<{ className?: string; size?: number; color?: string }> = ({
  className = '',
  size = 20,
  color = '#FDE047',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[1px_2px_0px_rgba(70,60,50,0.15)] ${className}`}
  >
    <path
      d="M12 2L14.7 8.3L21.5 9L16.4 13.6L17.8 20.3L12 16.9L6.2 20.3L7.6 13.6L2.5 9L9.3 8.3L12 2Z"
      fill={color}
      stroke="#CA8A04"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

// Paper Rocket
export const PaperRocket: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 36 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 50 50"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[2px_2px_0px_rgba(70,60,50,0.18)] ${className}`}
  >
    {/* Fins */}
    <path d="M12 36L18 30L16 42Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
    <path d="M38 36L32 30L34 42Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
    {/* Body */}
    <path
      d="M25 8C20 18 18 28 18 36L32 36C32 28 30 18 25 8Z"
      fill="#F8FAFC"
      stroke="#94A3B8"
      strokeWidth="2"
    />
    {/* Porthole */}
    <circle cx="25" cy="22" r="5" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
    {/* Rocket nose */}
    <path d="M25 8C22 13 21 16 21 17H29C29 16 28 13 25 8Z" fill="#EF4444" />
    {/* Flame */}
    <path d="M21 37L25 45L29 37Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
  </svg>
);
