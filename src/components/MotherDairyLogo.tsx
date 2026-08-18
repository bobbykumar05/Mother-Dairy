import React from 'react';

interface MotherDairyLogoProps {
  className?: string;
  size?: number | string;
}

export const MotherDairyLogo: React.FC<MotherDairyLogoProps> = ({
  className = 'w-full h-full',
}) => {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Mother Dairy Logo"
    >
      {/* Outer shield container in signature Mother Dairy cyan-blue */}
      <path
        d="M 12 110 C 145 35 367 35 500 110 L 442 475 C 442 475 440 480 435 480 L 77 480 C 72 480 70 475 70 475 Z"
        fill="#00AEEF"
      />

      {/* Inner white outline border */}
      <path
        d="M 32 124 C 152 58 360 58 480 124 L 428 460 L 84 460 Z"
        stroke="#FFFFFF"
        strokeWidth="14"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Path definition for arched 'MOTHER' text */}
      <defs>
        <path
          id="mother-text-arc"
          d="M 45 285 C 160 170 352 170 467 285"
          fill="none"
        />
      </defs>

      {/* Arched MOTHER lettering */}
      <text
        fill="#FFFFFF"
        fontFamily="'Times New Roman', Times, 'Georgia', 'Liberation Serif', serif"
        fontWeight="900"
        fontSize="76"
        letterSpacing="3"
      >
        <textPath href="#mother-text-arc" startOffset="50%" textAnchor="middle">
          MOTHER
        </textPath>
      </text>

      {/* Straight DAIRY lettering */}
      <text
        x="256"
        y="395"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="'Times New Roman', Times, 'Georgia', 'Liberation Serif', serif"
        fontWeight="900"
        fontSize="88"
        letterSpacing="4"
      >
        DAIRY
      </text>

      {/* Registered trademark symbol (R) */}
      <circle cx="478" cy="466" r="16" stroke="#00AEEF" strokeWidth="2.5" fill="#FFFFFF" />
      <text
        x="478"
        y="471"
        textAnchor="middle"
        fill="#00AEEF"
        fontFamily="sans-serif"
        fontWeight="bold"
        fontSize="14"
      >
        R
      </text>
    </svg>
  );
};

export default MotherDairyLogo;
