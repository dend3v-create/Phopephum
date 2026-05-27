# Cosmic Luxury UI Theme

## Theme Concept
A premium celestial-inspired UI system using deep midnight blues and antique gold accents. Designed for luxury astrology, spiritual brands, elegant editorial experiences, premium SaaS dashboards, and mystical modern interfaces.

---

# Core Palette

## Primary

| Token | HEX | Usage |
|---|---|---|
| `--navy-900` | `#03071A` | Main background |
| `--navy-800` | `#061831` | Surface background |
| `--navy-700` | `#07304F` | Elevated surface |

## Accent

| Token | HEX | Usage |
|---|---|---|
| `--gold-500` | `#C0B7A5` | Primary accent |
| `--gold-400` | `#D4C29A` | Hover state |
| `--gold-300` | `#E0C36E` | Premium CTA |

## Neutral

| Token | HEX | Usage |
|---|---|---|
| `--slate-500` | `#424D53` | Border / divider |
| `--gray-400` | `#797C79` | Secondary text |
| `--white-soft` | `#F6F4EF` | Main text |

---

# Semantic Color System

## Backgrounds

| Token | HEX |
|---|---|
| `--bg-primary` | `#03071A` |
| `--bg-secondary` | `#061831` |
| `--bg-elevated` | `#07304F` |
| `--bg-card` | `rgba(6,24,49,0.72)` |

## Text

| Token | HEX |
|---|---|
| `--text-primary` | `#F6F4EF` |
| `--text-secondary` | `#C0B7A5` |
| `--text-muted` | `#797C79` |

## Borders

| Token | HEX |
|---|---|
| `--border-soft` | `rgba(192,183,165,0.15)` |
| `--border-strong` | `rgba(212,194,154,0.32)` |

---

# Recommended Typography

## Display / Headlines
- Cinzel
- Cormorant Garamond
- Playfair Display

## UI / Body
- Inter
- Montserrat
- IBM Plex Sans Thai
- Prompt

---

# Typography Scale

| Usage | Size | Weight |
|---|---|---|
| Hero Title | 64px | 700 |
| H1 | 48px | 700 |
| H2 | 36px | 600 |
| H3 | 28px | 600 |
| Body Large | 18px | 400 |
| Body | 16px | 400 |
| Small | 14px | 400 |
| Caption | 12px | 400 |

---

# UI Surface Style

## Glassmorphism Card

```css
background: rgba(6, 24, 49, 0.72);
backdrop-filter: blur(20px);
border: 1px solid rgba(212,194,154,0.18);
border-radius: 24px;
box-shadow:
0 8px 40px rgba(0,0,0,0.45),
0 0 40px rgba(192,183,165,0.06);
```

---

# Gradient System

## Main Cosmic Gradient

```css
background: linear-gradient(
180deg,
#03071A 0%,
#061831 45%,
#07304F 100%
);
```

## Gold Aura Gradient

```css
background: radial-gradient(
circle,
rgba(224,195,110,0.24) 0%,
rgba(224,195,110,0) 70%
);
```

---

# Button Styles

## Primary Button

```css
background: linear-gradient(
135deg,
#D4C29A 0%,
#E0C36E 100%
);
color: #03071A;
border-radius: 999px;
padding: 14px 28px;
font-weight: 600;
box-shadow: 0 6px 24px rgba(224,195,110,0.24);
```

## Secondary Button

```css
background: rgba(255,255,255,0.04);
border: 1px solid rgba(212,194,154,0.22);
color: #F6F4EF;
backdrop-filter: blur(12px);
```

---

# Input Style

```css
background: rgba(255,255,255,0.03);
border: 1px solid rgba(192,183,165,0.12);
color: #F6F4EF;
border-radius: 18px;
padding: 14px 18px;
```

Focus state:

```css
border-color: #D4C29A;
box-shadow: 0 0 0 4px rgba(212,194,154,0.08);
```

---

# Navigation Style

## Top Navigation
- Transparent dark blur
- Thin gold divider line
- Active menu with glowing underline
- Floating effect with spacing

---

# Icon Style

Recommended icon style:
- Thin line icons
- Gold stroke
- Minimal geometry
- Celestial symbols
- Constellation-inspired illustrations

Suggested icon libraries:
- Lucide
- Phosphor
- Tabler Icons

---

# Animation Language

## Motion Style
- Slow fade
- Floating movement
- Soft glow pulse
- Star particle shimmer
- Smooth opacity transitions

## Recommended Timing

| Motion | Duration |
|---|---|
| Hover | 180ms |
| Modal | 320ms |
| Fade In | 600ms |
| Floating Loop | 6s |

---

# Tailwind Theme Example

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#03071A',
          800: '#061831',
          700: '#07304F'
        },
        gold: {
          500: '#C0B7A5',
          400: '#D4C29A',
          300: '#E0C36E'
        }
      },
      boxShadow: {
        glow: '0 0 40px rgba(224,195,110,0.18)'
      },
      borderRadius: {
        xl2: '24px'
      }
    }
  }
}
```

---

# Recommended UI Sections

## Landing Page
- Fullscreen cosmic hero
- Gold animated zodiac wheel
- Floating constellation particles
- Layered gradients

## Dashboard
- Glass cards
- Circular charts
- Soft illuminated data panels
- Thin dividers

## Mobile App
- Dark immersive background
- Bottom floating navigation
- Gold active states
- Rounded modal sheets

---

# Brand Keywords

- Cosmic Luxury
- Celestial Premium
- Elegant Mystery
- Spiritual Modern
- Astral Interface
- Dark Royalty

---

# Best Use Cases

Perfect for:
- Astrology platforms
- Tarot apps
- Luxury jewelry
- Spiritual coaching
- Meditation apps
- Premium AI tools
- Creator brands
- Editorial experiences

