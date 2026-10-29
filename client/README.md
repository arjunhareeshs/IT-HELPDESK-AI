# HelpDesk AI — Frontend Authentication & Dashboard Portal

This directory contains the complete client-side frontend implementation for the **AI-Powered IT Helpdesk Ticket Triage** application. It features a modern, professional authentication interface inspired by the clean, familiar design of Google Account and Gmail sign-in pages, styled using the established HelpDesk AI brand palette.

---

## 🎨 Established Brand Palette

- **Primary Purple:** `#8E1EA2`
- **Secondary Purple-Pink:** `#C654C3`
- **Accent Pink:** `#ED96D7`
- **Light Pink:** `#FFC0DE`
- **Clean White:** `#FFFFFF`

---

## 🚀 Key Features

### 1. Gmail-Inspired Login Interface (`LoginPage.jsx`)
- **Visual Design:** Centered card with rounded corners (`24px`), subtle border, soft drop-shadow, and generous whitespace.
- **Google Sign-In Simulation:** Prominent "Sign in with Google" button with the authentic multicolor G icon. Clicking opens an honest **Google Account Chooser** modal dialog to simulate single-sign-on across demo personas.
- **Form Controls:** Outlined Google-style inputs with animated floating label transitions, focus rings in brand purple (`#8E1EA2`), and clean error states.
- **Show/Hide Password:** Interactive eye/eye-slash toggle button to inspect or conceal passwords.
- **Remember Me Checkbox:** Custom-styled checkbox that safely stores non-sensitive demonstration session flags.
- **Demo Persona Quick-Fill Chips:** One-click chips to immediately test the Student, Staff, Technician, or Administrator personas.
- **Footer:** Language selector dropdown ("English (United States)") and interactive dialogs for **Help**, **Privacy**, and **Terms**.

### 2. Account Recovery (`ForgotPasswordPage.jsx`)
- Clean recovery card with email input validation.
- Simulated recovery flow that explicitly notifies the user that password recovery is simulated in this frontend demo without sending actual emails.
- "Return to Login" navigation.

### 3. Create Account (`RegisterPage.jsx`)
- Full Name, Email, Role selector, Password, and Confirm Password fields.
- Password-match validation and show/hide controls.
- "Create demo account" button that simulates instant client-side onboarding.

### 4. Client-Side Route Guard & Session Handling (`AuthContext.jsx` & `App.jsx`)
- Protected dashboard routes (`#/dashboard`, `#/tickets`, `#/triage`, `#/analytics`, `#/knowledge`).
- If an unauthenticated user opens any protected URL, the route guard automatically intercepts and redirects to `#/login` with an informative banner while preserving the `returnUrl`.
- On Sign Out, the session is cleared from storage and cleanly redirects back to the login screen.

### 5. Role-Tailored Dashboard Views (`DashboardPage.jsx`)
- **Student View (`StudentView.jsx`):** Submit support requests, track ticket status, and browse student self-service guides.
- **Staff View (`StaffView.jsx`):** Department hardware procurement, classroom multimedia assistance, and SLA status.
- **IT Technician Workbench (`TechnicianView.jsx`):** Ticket queue with Priority and Status filters, search bar, interactive one-click status update (`Open`, `In Progress`, `Resolved`), and deep **AI Auto-Triage Diagnostics** (Root Cause Analysis, AI Confidence Score, and Suggested Fix).
- **Administrator View (`AdminView.jsx`):** Real-time KPI metrics, campus-wide ticket ledger, demonstration persona directory, and AI NLP model configuration.
- **Top Navigation (`Navbar.jsx`):** Brand logo, navigation tabs, new ticket button, role pill indicator, user avatar, and Google-style account dropdown menu with **My Profile**, **Account Settings**, **Switch Role**, and **Sign Out**.

---

## 👥 Predefined Demonstration Personas

| Role | Name | Email | Department |
| :--- | :--- | :--- | :--- |
| **Student** | Alex Rivera | `alex.student@campus.edu` | School of Engineering |
| **Staff** | Sarah Jenkins | `sarah.staff@campus.edu` | College of Arts & Sciences |
| **IT Technician** | Marcus Chen | `marcus.tech@campus.edu` | Campus IT Infrastructure & Network Services |
| **Administrator** | Dr. Elena Rostova | `elena.admin@campus.edu` | Enterprise Technology & Cybersecurity |

*(Note: For demonstration sign in, any password with 4 or more characters is accepted, or click any persona quick-fill button).*

---

## ✨ Premium Entrance Animation Architecture

The split-screen authentication portal features a choreographed, GPU-accelerated entrance animation sequence adhering to modern SaaS design standards:

1. **Page Background & Ambient Glow:**
   - Smooth viewport background fade (`850ms`, `ease-out`) from transparent to `#F5F0F8` / `#EDE6F2`.
   - Subtle radial ambient glow (`rgba(198, 84, 195, 0.18)` / `rgba(142, 30, 162, 0.07)`) with soft scaling and blur.
2. **Main Login Card Floating Entrance:**
   - Floats upward from `translateY(40px) scale(0.96)` to `translateY(0) scale(1)`.
   - Smooth `900ms` duration with `100ms` delay and `cubic-bezier(0.16, 1, 0.3, 1)` easing curve.
3. **Left Panel — Branding Entrance Sequence:**
   - **Top Pill Badge:** Slides down (`280ms` delay, `550ms` duration).
   - **Interactive Logo Card:** Fades & scales from `0.85` to `1` with upward motion (`350ms` delay, `700ms` duration), seamlessly transitioning into perpetual gentle floating.
   - **HelpDesk AI Logo Icon:** Restrained bounce/rotation with purple-pink glow (`450ms` delay, `700ms` duration).
   - **Tagline & Description Sequence:** “Smarter IT Support.” (`550ms`), “Faster Resolutions.” (`680ms`), and narrative description (`810ms`) staggered by `130ms` with `16px` upward travel.
   - **Feature Badges:** Staggered entrance for "Smart Ticket Triage" (`940ms`), "Priority Detection" (`1060ms`), and "Faster Resolution" (`1180ms`).
   - **Bottom Note:** Gentle fade-in (`1280ms` delay).
4. **Right Panel — Login Form Cascading Sequence:**
   - Enters smoothly from the right (`translateX(30px)` to `0`, opacity `0` to `1`).
   - Sequenced elements:
     1. Campus IT Portal badge (`300ms`)
     2. "Welcome back" heading (`370ms`)
     3. Subtitle (`440ms`)
     4. Alert notice (`510ms`)
     5. Demo persona chips (`580ms`)
     6. Email address field (`660ms`)
     7. Password field (`740ms`)
     8. Remember me & forgot password row (`820ms`)
     9. Sign In button (`900ms`)
     10. Continue with Google button (`980ms`)
     11. Create account prompt (`1060ms`)
     12. Bottom footer links (`1140ms`)
5. **Accessibility & Interaction:**
   - Full `@media (prefers-reduced-motion: reduce)` support: disables all animations, motion, and scaling for users who prefer reduced motion.
   - High-specificity hover/active overrides preserve responsive tactile feedback across all buttons, chips, and cards.

## 🛡️ Security & Demonstration Notice

- **Frontend-Only Simulation:** All authentication, account creation, and password recovery states are purely simulated client-side.
- **Zero Real Passwords:** No passwords or secrets are collected, transmitted, or stored in code, storage, or logs.
- **Strict Isolation:** All changes reside entirely within `client/`. No backend files, databases, or root files were modified.

---

## 💻 Running Locally

```bash
cd client
npm install
npm run dev
```

The application runs on `http://localhost:5173/`.
