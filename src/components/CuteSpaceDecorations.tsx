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

// Paper Spaceship (ยานอวกาศสไตล์ตัดกระดาษน่ารัก)
export const PaperSpaceship: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 48,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[2px_3px_0px_rgba(70,60,50,0.18)] ${className}`}
  >
    {/* Paper Exhaust Flame */}
    <path d="M14 32L6 36L10 32L6 28Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
    <path d="M10 32L4 34L7 32L4 30Z" fill="#EF4444" />

    {/* Space Wings (Paper cutout) */}
    <path
      d="M22 16L34 26L18 30Z"
      fill="#38BDF8"
      stroke="#0284C7"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M22 48L34 38L18 34Z"
      fill="#38BDF8"
      stroke="#0284C7"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />

    {/* Main Spaceship Hull */}
    <path
      d="M14 26C14 26 22 24 38 24C48 24 58 29 60 32C58 35 48 40 38 40C22 40 14 38 14 38L16 32Z"
      fill="#FFFDF9"
      stroke="#94A3B8"
      strokeWidth="2"
    />

    {/* Stitched Seams on Hull */}
    <path
      d="M24 27C30 27 38 27 46 29"
      stroke="#CBD5E1"
      strokeWidth="1.2"
      strokeDasharray="3 2"
    />
    <path
      d="M24 37C30 37 38 37 46 35"
      stroke="#CBD5E1"
      strokeWidth="1.2"
      strokeDasharray="3 2"
    />

    {/* Glass Cockpit Dome */}
    <ellipse cx="44" cy="32" rx="7" ry="4.5" fill="#0EA5E9" stroke="#0284C7" strokeWidth="1.5" />
    <path d="M42 30C45 29 48 30 49 31" stroke="#E0F2FE" strokeWidth="1.5" strokeLinecap="round" />

    {/* Accent Stripes */}
    <rect x="22" y="30" width="3" height="4" rx="1" fill="#EF4444" />
    <rect x="27" y="30" width="3" height="4" rx="1" fill="#F59E0B" />
    <rect x="32" y="30" width="3" height="4" rx="1" fill="#10B981" />
  </svg>
);

// Paper Satellite (ดาวเทียมสำรวจอวกาศกระดาษตัด)
export const PaperSatellite: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 44,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 60 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[2px_2px_0px_rgba(70,60,50,0.16)] ${className}`}
  >
    {/* Left Solar Panel */}
    <rect x="4" y="24" width="16" height="12" rx="2" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
    <path d="M12 24V36" stroke="#0284C7" strokeWidth="1" strokeDasharray="2 1" />
    <path d="M4 30H20" stroke="#0284C7" strokeWidth="1" />

    {/* Right Solar Panel */}
    <rect x="40" y="24" width="16" height="12" rx="2" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
    <path d="M48 24V36" stroke="#0284C7" strokeWidth="1" strokeDasharray="2 1" />
    <path d="M40 30H56" stroke="#0284C7" strokeWidth="1" />

    {/* Connecting Rods */}
    <rect x="20" y="28.5" width="4" height="3" fill="#94A3B8" />
    <rect x="36" y="28.5" width="4" height="3" fill="#94A3B8" />

    {/* Main Core Cube */}
    <rect x="24" y="22" width="12" height="16" rx="3" fill="#F8FAFC" stroke="#64748B" strokeWidth="2" />
    <circle cx="30" cy="27" r="2.5" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
    <circle cx="30" cy="33" r="1.5" fill="#10B981" />

    {/* Dish Antenna */}
    <path d="M30 22V15" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M24 13C27 16 33 16 36 13" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    <circle cx="30" cy="11" r="1.5" fill="#EF4444" />
  </svg>
);

// Paper UFO (จานบินอวกาศกระดาษตัดน่ารัก)
export const PaperUFO: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 46,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 60 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[2px_3px_0px_rgba(70,60,50,0.18)] ${className}`}
  >
    {/* Soft Light Beam from underneath */}
    <polygon points="24,38 36,38 46,54 14,54" fill="#FEF08A" opacity="0.35" />

    {/* Glass Bubble Cockpit */}
    <ellipse cx="30" cy="24" rx="13" ry="11" fill="#BAE6FD" stroke="#0284C7" strokeWidth="1.8" />
    <path d="M25 18C28 16 33 16 36 18" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

    {/* Tiny Happy Pilot inside UFO */}
    <circle cx="30" cy="24" r="3.5" fill="#4ADE80" />
    <circle cx="28.5" cy="23.5" r="0.8" fill="#1E293B" />
    <circle cx="31.5" cy="23.5" r="0.8" fill="#1E293B" />

    {/* Saucer Metal Ring Body */}
    <ellipse cx="30" cy="32" rx="25" ry="7.5" fill="#FFFDF9" stroke="#94A3B8" strokeWidth="2" />
    <ellipse cx="30" cy="33.5" rx="19" ry="4.5" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 2" />

    {/* Colorful Signal Lights */}
    <circle cx="14" cy="33" r="2" fill="#F87171" stroke="#DC2626" strokeWidth="0.8" />
    <circle cx="22" cy="34.5" r="2" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
    <circle cx="30" cy="35" r="2" fill="#4ADE80" stroke="#16A34A" strokeWidth="0.8" />
    <circle cx="38" cy="34.5" r="2" fill="#38BDF8" stroke="#0284C7" strokeWidth="0.8" />
    <circle cx="46" cy="33" r="2" fill="#C084FC" stroke="#9333EA" strokeWidth="0.8" />
  </svg>
);

// Paper-cut Sun (ดวงอาทิตย์กระดาษตัด)
export const PaperSun: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 56 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[3px_3px_0px_rgba(180,83,9,0.22)] ${className}`}
  >
    {/* Cut Paper Rays */}
    <g stroke="#D97706" strokeWidth="1.5" strokeLinecap="round">
      <path d="M40 4V14" strokeDasharray="3 2" />
      <path d="M40 66V76" strokeDasharray="3 2" />
      <path d="M4 40H14" strokeDasharray="3 2" />
      <path d="M66 40H76" strokeDasharray="3 2" />
      <path d="M14.5 14.5L21.5 21.5" />
      <path d="M58.5 58.5L65.5 65.5" />
      <path d="M65.5 14.5L58.5 21.5" />
      <path d="M21.5 58.5L14.5 65.5" />
    </g>
    {/* Sun Base Circle */}
    <circle cx="40" cy="40" r="24" fill="#FBBF24" stroke="#D97706" strokeWidth="2.5" />
    {/* Inner Layer */}
    <circle cx="40" cy="40" r="18" fill="#FDE047" stroke="#F59E0B" strokeWidth="1.5" />
    {/* Paper stitch highlight */}
    <circle cx="40" cy="40" r="14" fill="none" stroke="#CA8A04" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.6" />
    {/* Cute smiling face */}
    <circle cx="34" cy="38" r="2.2" fill="#78350F" />
    <circle cx="46" cy="38" r="2.2" fill="#78350F" />
    <path d="M36 43C38 46 42 46 44 43" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="30" cy="41" r="2" fill="#F87171" opacity="0.6" />
    <circle cx="50" cy="41" r="2" fill="#F87171" opacity="0.6" />
  </svg>
);

// Paper-cut Earth (โลกและดวงจันทร์กระดาษตัด)
export const PaperEarth: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 52 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 70 70"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[2px_3px_0px_rgba(15,118,110,0.2)] ${className}`}
  >
    {/* Atmosphere Outer Ring with paper dashes */}
    <circle cx="35" cy="35" r="28" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7" />
    {/* Earth Blue Base */}
    <circle cx="35" cy="35" r="24" fill="#0EA5E9" stroke="#0284C7" strokeWidth="2" />
    {/* Green Paper Cutout Continents */}
    <path
      d="M23 23C27 21 34 23 37 27C34 31 30 33 24 31C20 30 20 25 23 23Z"
      fill="#4ADE80"
      stroke="#16A34A"
      strokeWidth="1.2"
    />
    <path
      d="M38 33C43 31 49 34 51 40C48 44 41 46 38 42C35 38 35 34 38 33Z"
      fill="#4ADE80"
      stroke="#16A34A"
      strokeWidth="1.2"
    />
    <path
      d="M22 42C26 40 31 43 30 48C26 51 22 47 22 42Z"
      fill="#4ADE80"
      stroke="#16A34A"
      strokeWidth="1"
    />
    {/* White Paper Cloud Swirls */}
    <path d="M26 27C30 26 36 28 40 27" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    <path d="M32 44C36 45 42 43 46 45" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
  </svg>
);

// Paper-cut Moon (ดวงจันทร์กระดาษตัด)
export const PaperMoon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 36 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 50 50"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[2px_2px_0px_rgba(100,116,139,0.2)] ${className}`}
  >
    {/* Moon Base */}
    <circle cx="25" cy="25" r="18" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="2" />
    {/* Paper Craters */}
    <circle cx="19" cy="20" r="4.5" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />
    <circle cx="29" cy="28" r="5.5" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />
    <circle cx="31" cy="18" r="3" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" />
    <circle cx="19" cy="31" r="2.5" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1" />
  </svg>
);

// Paper-cut Mars (ดาวอังคารกระดาษตัด)
export const PaperMars: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 42 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 50 50"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[2px_2px_0px_rgba(185,28,28,0.22)] ${className}`}
  >
    {/* Mars Base */}
    <circle cx="25" cy="25" r="18" fill="#F87171" stroke="#DC2626" strokeWidth="2" />
    {/* Layered Dust Bands & Craters */}
    <path d="M12 22C17 25 28 20 38 23" stroke="#B91C1C" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 28C20 31 31 28 37 30" stroke="#B91C1C" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    <circle cx="28" cy="18" r="3" fill="#EF4444" stroke="#B91C1C" strokeWidth="1" />
    {/* Polar ice cap */}
    <path d="M19 10C22 8 28 8 31 10" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// Paper-cut Jupiter (ดาวพฤหัสบดีกระดาษตัด)
export const PaperJupiter: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 56 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 70 70"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[3px_3px_0px_rgba(180,83,9,0.2)] ${className}`}
  >
    {/* Base Planet */}
    <circle cx="35" cy="35" r="26" fill="#FED7AA" stroke="#EA580C" strokeWidth="2.5" />
    {/* Gas Bands in Paper Layers */}
    <path d="M12 27C20 30 35 25 58 27" stroke="#F97316" strokeWidth="3" strokeLinecap="round" />
    <path d="M10 35C22 38 42 33 60 36" stroke="#C2410C" strokeWidth="4" strokeLinecap="round" />
    <path d="M13 44C25 42 45 47 57 44" stroke="#FB923C" strokeWidth="3" strokeLinecap="round" />
    {/* Great Red Spot */}
    <ellipse cx="44" cy="37" rx="5" ry="3.5" fill="#EF4444" stroke="#991B1B" strokeWidth="1.5" />
  </svg>
);

// Paper-cut Saturn (ดาวเสาร์กระดาษตัดพร้อมวงแหวน)
export const PaperSaturn: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 64 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[3px_3px_0px_rgba(180,83,9,0.2)] ${className}`}
  >
    {/* Back Ring Half */}
    <path
      d="M10 36C14 26 50 18 70 28"
      stroke="#D97706"
      strokeWidth="5"
      strokeLinecap="round"
      strokeDasharray="6 3"
      opacity="0.85"
    />
    {/* Planet Body */}
    <circle cx="40" cy="40" r="22" fill="#FEF08A" stroke="#CA8A04" strokeWidth="2.5" />
    {/* Planet Bands */}
    <path d="M22 36C28 39 42 37 58 36" stroke="#EAB308" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M20 44C30 46 45 44 59 43" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    {/* Front Ring Half */}
    <path
      d="M10 44C14 54 52 62 70 52"
      stroke="#B45309"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M14 42C18 50 50 58 66 48"
      stroke="#FDE68A"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

// Paper-cut Shooting Star / Comet (ดาวตกกระดาษตัด)
export const PaperShootingStar: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 48 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 60 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`filter drop-shadow-[2px_2px_0px_rgba(202,138,4,0.2)] ${className}`}
  >
    {/* Paper tails / streamers */}
    <path d="M12 12L36 36" stroke="#FEF08A" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 2" />
    <path d="M8 18L32 42" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
    <path d="M18 8L42 32" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
    {/* Bright Star Head */}
    <path
      d="M44 32L47 40L55 43L47 46L44 54L41 46L33 43L41 40L44 32Z"
      fill="#FACC15"
      stroke="#CA8A04"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

// Full-Page Paper-cut Solar System Celestial Background
export const SolarSystemBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none print:hidden">
      {/* Subtle Orbital Dashed Paths */}
      <svg className="absolute w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="10%" cy="15%" rx="180" ry="120" fill="none" stroke="#D1C7B7" strokeWidth="1.5" strokeDasharray="6 6" />
        <ellipse cx="90%" cy="20%" rx="240" ry="160" fill="none" stroke="#D1C7B7" strokeWidth="1.5" strokeDasharray="8 6" />
        <ellipse cx="50%" cy="85%" rx="380" ry="190" fill="none" stroke="#D1C7B7" strokeWidth="1.5" strokeDasharray="8 6" />
        <ellipse cx="85%" cy="80%" rx="200" ry="140" fill="none" stroke="#D1C7B7" strokeWidth="1.5" strokeDasharray="6 6" />
      </svg>

      {/* Top Left: Golden Paper Sun & Mercury */}
      <div className="absolute -top-4 -left-4 opacity-75 hover:opacity-100 transition-opacity transform rotate-12">
        <PaperSun size={96} />
      </div>

      {/* Top Right: Saturn with Rings */}
      <div className="absolute top-12 right-6 opacity-70 hover:opacity-100 transition-opacity transform -rotate-12">
        <PaperSaturn size={84} />
      </div>

      {/* Mid Left: Earth and Moon */}
      <div className="absolute top-1/3 -left-3 opacity-60 hover:opacity-90 transition-opacity">
        <div className="relative">
          <PaperEarth size={62} />
          <div className="absolute -top-3 -right-3">
            <PaperMoon size={28} />
          </div>
        </div>
      </div>

      {/* Mid Right: Mars */}
      <div className="absolute top-1/2 -right-2 opacity-65 hover:opacity-90 transition-opacity">
        <PaperMars size={54} />
      </div>

      {/* Bottom Left: Jupiter */}
      <div className="absolute bottom-16 left-6 opacity-60 hover:opacity-90 transition-opacity transform rotate-6">
        <PaperJupiter size={72} />
      </div>

      {/* Bottom Right: Little Alien & Paper Rocket */}
      <div className="absolute bottom-6 right-8 opacity-75 hover:opacity-100 transition-opacity flex items-center gap-2">
        <CuteAlien size={44} />
        <PaperRocket size={38} className="transform rotate-45" />
      </div>

      {/* Cruising Cute Spaceship near Upper Right */}
      <div className="absolute top-28 right-44 opacity-60 hover:opacity-90 transition-opacity transform -rotate-12">
        <PaperSpaceship size={42} />
      </div>

      {/* Orbiting Satellite near Bottom Center-Left */}
      <div className="absolute bottom-28 left-48 opacity-55 hover:opacity-85 transition-opacity transform rotate-12">
        <PaperSatellite size={38} />
      </div>

      {/* Cute Hovering UFO near Mid-Left */}
      <div className="absolute top-2/3 -left-2 opacity-65 hover:opacity-95 transition-opacity transform -rotate-6">
        <PaperUFO size={46} />
      </div>

      {/* Shooting Star Across Top Center */}
      <div className="absolute top-2 left-1/3 opacity-50">
        <PaperShootingStar size={44} />
      </div>

      {/* Twinkling Paper Stars scattered along margins */}
      <div className="absolute top-28 left-20 opacity-40">
        <PaperStar size={18} color="#FDE047" />
      </div>
      <div className="absolute top-44 right-32 opacity-40">
        <PaperStar size={22} color="#FACC15" />
      </div>
      <div className="absolute bottom-40 left-36 opacity-35">
        <PaperStar size={16} color="#FEF08A" />
      </div>
      <div className="absolute bottom-24 right-48 opacity-45">
        <PaperStar size={20} color="#FDE047" />
      </div>
      <div className="absolute top-3/4 left-12 opacity-35">
        <PaperStar size={14} color="#FBBF24" />
      </div>
      <div className="absolute top-1/4 right-16 opacity-45">
        <PaperStar size={24} color="#FDE047" />
      </div>
    </div>
  );
};

// Cute Space Bar Strip: สำหรับจัดวางในแถบว่างต่างๆ เช่น Navbar, Header Toolbar, Status Banner
export const CuteSpaceBarStrip: React.FC<{
  className?: string;
  variant?: 'minimal' | 'full' | 'compact';
}> = ({ className = '', variant = 'full' }) => {
  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 pointer-events-none select-none print:hidden ${className}`}
      >
        <PaperSpaceship size={24} className="transform -rotate-12 hover:rotate-0 transition-transform" />
        <PaperStar size={12} color="#FBBF24" />
        <PaperSaturn size={20} className="transform rotate-12" />
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div
        className={`inline-flex items-center gap-2 pointer-events-none select-none print:hidden ${className}`}
      >
        <PaperStar size={13} color="#FACC15" />
        <PaperSpaceship size={28} className="transform -rotate-6" />
        <PaperStar size={11} color="#FDE047" />
        <PaperEarth size={22} />
        <PaperStar size={14} color="#FBBF24" />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 sm:gap-3 px-3 py-1 bg-white/70 backdrop-blur-xs rounded-full border border-[#E7DFD5]/90 shadow-[1px_2px_0px_rgba(70,60,50,0.06)] pointer-events-none select-none print:hidden ${className}`}
    >
      <PaperStar size={13} color="#FDE047" />
      <PaperSpaceship size={26} className="transform -rotate-12" />
      <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
      <PaperSaturn size={24} className="transform rotate-12" />
      <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
      <PaperUFO size={24} className="transform -rotate-6" />
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
      <PaperSatellite size={22} />
      <PaperStar size={14} color="#FBBF24" />
    </div>
  );
};

// Cute Mini Space Cluster: ดักวางมุมขวาหรือข้างแถบหัวข้อ
export const CuteMiniSpaceCluster: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 bg-[#FFFDF9]/90 rounded-xl border border-[#EADFCF] shadow-[1px_2px_0px_rgba(70,60,50,0.08)] pointer-events-none select-none print:hidden ${className}`}
    >
      <PaperSpaceship size={24} className="transform -rotate-12" />
      <PaperStar size={12} color="#FACC15" />
      <PaperSaturn size={22} className="transform rotate-6" />
      <PaperStar size={10} color="#FDE047" />
      <PaperUFO size={20} />
    </div>
  );
};

