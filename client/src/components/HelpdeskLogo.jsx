import React from 'react';

/**
 * Animated HelpDesk AI Logo
 * Features:
 * - Rotating & pulsing AI sparkles
 * - Breathing glowing aura
 * - Iridescent text shimmer on 'AI'
 * - Support headset soundwave pulse
 * - Interactive hover enhancement
 */
export default function HelpdeskLogo({ size = 'medium', showText = true, className = '', inPill = false }) {
  const dimensions = {
    small: { icon: 26, text: '0.95rem', sub: '0.65rem' },
    medium: { icon: 34, text: '1.15rem', sub: '0.7rem' },
    large: { icon: 44, text: '1.4rem', sub: '0.8rem' }
  }[size] || { icon: 34, text: '1.15rem', sub: '0.7rem' };

  const logoContent = (
    <div
      className={`animated-helpdesk-logo ${className} ${inPill ? 'logo-in-pill' : ''}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
    >
      {/* Animated SVG Icon Container */}
      <div className="logo-svg-wrapper" style={{ position: 'relative', width: dimensions.icon, height: dimensions.icon, flexShrink: 0 }}>
        {/* Glowing pulsing aura */}
        <div className="logo-ambient-aura" />

        <svg
          width={dimensions.icon}
          height={dimensions.icon}
          viewBox="0 0 48 48"
          xmlns="http://www.w3.org/2000/svg"
          className="logo-svg-main"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <linearGradient id="animatedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8E1EA2">
                <animate attributeName="stop-color" values="#8E1EA2;#C654C3;#8E1EA2" dur="4s" repeatCount="indefinite" />
              </stop>
              <stop offset="50%" stopColor="#C654C3">
                <animate attributeName="stop-color" values="#C654C3;#ED96D7;#C654C3" dur="4s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#ED96D7">
                <animate attributeName="stop-color" values="#ED96D7;#8E1EA2;#ED96D7" dur="4s" repeatCount="indefinite" />
              </stop>
            </linearGradient>

            <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8E1EA2" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Base Rounded Shield */}
          <rect x="3" y="3" width="42" height="42" rx="14" fill="url(#animatedGrad)" filter="url(#logoGlow)" className="logo-base-shield" />

          {/* Soundwave concentric pulse rings */}
          <circle cx="24" cy="24" r="16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" className="logo-soundwave-ring" />
          <circle cx="24" cy="24" r="19" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" className="logo-soundwave-outer" />

          {/* Support Headset */}
          <path
            d="M15 24C15 19.03 19.03 15 24 15C28.97 15 33 19.03 33 24V29C33 30.66 31.66 32 30 32H28V24H31V23.5C31 19.91 27.87 17 24 17C20.13 17 17 19.91 17 23.5V24H20V32H18C16.34 32 15 30.66 15 29V24Z"
            fill="#FFFFFF"
            className="logo-headset-shape"
          />

          {/* Microphone boom */}
          <circle cx="21" cy="31" r="2" fill="#FFFFFF" />
          <path d="M21 33C21 34.1 21.9 35 23 35H27" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

          {/* Rotating AI Sparkle 1 */}
          <g className="logo-sparkle-group">
            <path
              d="M35 8L36.2 12.8L41 14L36.2 15.2L35 20L33.8 15.2L29 14L33.8 12.8L35 8Z"
              fill="#FFC0DE"
              className="logo-ai-sparkle"
            />
          </g>

          {/* Micro sparkle 2 */}
          <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" className="logo-micro-star" />
        </svg>
      </div>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: 800, fontSize: dimensions.text, color: '#1F1F1F', letterSpacing: '-0.02em', fontFamily: "'Outfit', sans-serif" }}>
              HelpDesk
            </span>
            <span className="animated-ai-text" style={{ fontSize: dimensions.text }}>
              AI
            </span>
          </div>
          {!inPill && (
            <span style={{ fontSize: dimensions.sub, color: '#777777', fontWeight: 500, letterSpacing: '0.02em' }}>
              Triage Portal
            </span>
          )}
        </div>
      )}
    </div>
  );

  return logoContent;
}
