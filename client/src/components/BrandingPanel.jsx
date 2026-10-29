import React, { useState } from 'react';

/**
 * BrandingPanel (Left Side, ~45% width)
 *
 * Requirements:
 * - Product Name: HelpDesk AI
 * - Tagline: "Smarter IT Support. Faster Resolutions."
 * - Description: "Intelligent ticket management that helps teams identify, prioritize, and resolve IT issues faster."
 * - Prominent interactive logo near center with incoming entrance animation:
 *   1. Smooth scale to 1.08–1.12x on hover
 *   2. Gentle floating animation
 *   3. Subtle icon movement/sparkle rotation
 *   4. Soft purple-pink glow around logo
 *   5. Logo text upward movement / color transition
 *   6. Smooth 250–350ms transition
 *   7. Return to original appearance on mouse leave
 *   8. Press animation on click
 *   9. Keyboard focusable and accessible
 * - Sequence Entrance Animations:
 *   - Logo card: fade & scale 0.85 -> 1 with upward motion
 *   - Tagline line 1: "Smarter IT Support."
 *   - Tagline line 2: "Faster Resolutions."
 *   - Description fade & upward motion
 *   - 3 feature badges: staggered slide-up & scale 0.97 -> 1
 *   - Supporting bottom message fade in
 */
export default function BrandingPanel() {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div className="branding-panel-container">
      {/* Soft Decorative Ambient Circles */}
      <div className="branding-ambient-glow glow-top" />
      <div className="branding-ambient-glow glow-bottom" />
      <div className="branding-grid-pattern" />

      <div className="branding-panel-inner">
        {/* Top Micro Brand Pill */}
        <div className="branding-top-badge brand-anim-top-pill">
          <span className="badge-sparkle">✨</span>
          <span className="badge-text">Next-Gen IT Triage</span>
        </div>

        {/* Center Prominent Interactive Logo */}
        <div
          className={`interactive-logo-card brand-anim-logo-card ${isHovered ? 'hovered' : ''} ${isPressed ? 'pressed' : ''}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setIsPressed(false);
          }}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          tabIndex={0}
          role="button"
          aria-label="HelpDesk AI Interactive Brand Logo"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsPressed(true);
              setTimeout(() => setIsPressed(false), 200);
            }
          }}
        >
          {/* Logo Icon with Floating & Sparkle Animations */}
          <div className="logo-icon-container">
            <div className="logo-icon-halo" />

            <svg
              width="68"
              height="68"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
              className="logo-shield-svg brand-anim-logo-icon"
            >
              <defs>
                <linearGradient id="brandLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8E1EA2" />
                  <stop offset="50%" stopColor="#C654C3" />
                  <stop offset="100%" stopColor="#ED96D7" />
                </linearGradient>

                <filter id="brandGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#8E1EA2" floodOpacity="0.35" />
                </filter>
              </defs>

              {/* Shield base */}
              <rect
                x="3"
                y="3"
                width="42"
                height="42"
                rx="14"
                fill="url(#brandLogoGrad)"
                filter="url(#brandGlowFilter)"
                className="logo-shield-base"
              />

              {/* Soundwave pulse rings */}
              <circle cx="24" cy="24" r="16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" className="logo-soundwave-ring" />
              <circle cx="24" cy="24" r="19" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" className="logo-soundwave-outer" />

              {/* Headset icon */}
              <path
                d="M15 24C15 19.03 19.03 15 24 15C28.97 15 33 19.03 33 24V29C33 30.66 31.66 32 30 32H28V24H31V23.5C31 19.91 27.87 17 24 17C20.13 17 17 19.91 17 23.5V24H20V32H18C16.34 32 15 30.66 15 29V24Z"
                fill="#FFFFFF"
                className="logo-headset-path"
              />

              {/* Mic boom */}
              <circle cx="21" cy="31" r="2" fill="#FFFFFF" />
              <path d="M21 33C21 34.1 21.9 35 23 35H27" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />

              {/* Rotating AI Sparkle */}
              <g className="logo-sparkle-spin">
                <path
                  d="M35 8L36.2 12.8L41 14L36.2 15.2L35 20L33.8 15.2L29 14L33.8 12.8L35 8Z"
                  fill="#FFC0DE"
                  className="sparkle-star"
                />
              </g>

              {/* Micro accent dot */}
              <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" opacity="0.8" />
            </svg>
          </div>

          {/* Logo Title & Animated Text */}
          <div className="logo-text-wrapper">
            <div className="logo-brand-row">
              <span className="logo-title-brand">HelpDesk</span>
              <span className="logo-title-ai">AI</span>
            </div>
            <span className="logo-title-sub">Ticket Triage Intelligence</span>
          </div>
        </div>

        {/* Product Tagline & Narrative (Sequenced Entrance) */}
        <div className="branding-narrative">
          <h2 className="branding-tagline">
            <span className="brand-anim-tagline-1">Smarter IT Support.</span>
            <span className="brand-anim-tagline-2 tagline-gradient">Faster Resolutions.</span>
          </h2>
          <p className="branding-description brand-anim-desc">
            Intelligent ticket management that helps teams identify, prioritize, and resolve IT issues faster.
          </p>
        </div>

        {/* 3 Compact Feature Labels (Staggered Entrance) */}
        <div className="branding-features-list">
          <div className="feature-pill brand-anim-badge-1">
            <span className="feature-pill-icon">⚡</span>
            <span className="feature-pill-text">Smart Ticket Triage</span>
          </div>
          <div className="feature-pill brand-anim-badge-2">
            <span className="feature-pill-icon">🎯</span>
            <span className="feature-pill-text">Priority Detection</span>
          </div>
          <div className="feature-pill brand-anim-badge-3">
            <span className="feature-pill-icon">🚀</span>
            <span className="feature-pill-text">Faster Resolution</span>
          </div>
        </div>

        {/* Bottom Supporting Message */}
        <div className="branding-bottom-message brand-anim-bottom">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E1EA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Your campus IT support, simplified.</span>
        </div>
      </div>
    </div>
  );
}
