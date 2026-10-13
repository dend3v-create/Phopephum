import { useId } from "react";

/** Decorative brand artwork only; no birth chart, astrology values or engine logic. */
export function CelestialSeal() {
  const id = useId().replace(/:/g, "");
  const glow = `wisdom-sun-${id}`;
  return (
    <svg viewBox="0 0 600 600" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={glow}><stop stopColor="#FDF8E8" /><stop offset=".22" stopColor="#F6D88C" /><stop offset=".48" stopColor="#D4AF37" stopOpacity=".6" /><stop offset="1" stopColor="#D4AF37" stopOpacity="0" /></radialGradient>
      </defs>
      <g stroke="currentColor" strokeWidth="1">
        <circle cx="300" cy="300" r="270" opacity=".4" />
        <circle cx="300" cy="300" r="249" opacity=".65" />
        <circle cx="300" cy="300" r="213" opacity=".4" strokeDasharray="2 9" />
        <circle cx="300" cy="300" r="161" opacity=".3" />
        <circle cx="300" cy="300" r="83" opacity=".5" />
        <path d="M300 30v57M570 300h-57M300 570v-57M30 300h57M109 109l41 41M491 109l-41 41M491 491l-41-41M109 491l41-41" opacity=".5" />
        <path d="M300 87v130M513 300H383M300 513V383M87 300h130" opacity=".12" />
        <path d="M149 192l96-64 172 72 30 181-151 94-151-80 4-203Z" opacity=".35" />
        <path d="M149 192l298 189M245 128l51 347M417 200L145 395" opacity=".22" />
        <circle cx="149" cy="192" r="6" /><circle cx="245" cy="128" r="4" /><circle cx="417" cy="200" r="7" /><circle cx="447" cy="381" r="5" /><circle cx="296" cy="475" r="6" /><circle cx="145" cy="395" r="4" />
      </g>
      <circle cx="300" cy="300" r="118" fill={`url(#${glow})`} opacity=".6" />
      <circle cx="300" cy="300" r="31" stroke="currentColor" strokeWidth="1.5" fill={`url(#${glow})`} />
      <path d="M300 252v14M300 334v14M252 300h14M334 300h14M266 266l10 10M324 324l10 10M266 334l10-10M324 276l10-10" stroke="currentColor" strokeWidth="1" opacity=".8" />
    </svg>
  );
}

export function WisdomAtmosphere() {
  return (
    <div className="pp-atmosphere" aria-hidden="true">
      <div className="pp-atmosphere-sky" />
      <div className="pp-atmosphere-stars" />
      <div className="pp-atmosphere-seal"><CelestialSeal /></div>
      <svg className="pp-atmosphere-horizon" viewBox="0 0 1440 320" preserveAspectRatio="none" focusable="false">
        <path d="M0 290L120 234 214 253 352 132 468 221 562 190 698 266 814 168 916 203 1072 105 1214 224 1336 196 1440 257V320H0Z" fill="currentColor" opacity=".05" />
        <path d="M0 290L120 234 214 253 352 132 468 221 562 190 698 266 814 168 916 203 1072 105 1214 224 1336 196 1440 257" stroke="currentColor" strokeWidth="1" opacity=".25" fill="none" />
        <path d="M0 310Q370 175 720 264T1440 280" stroke="currentColor" strokeWidth="1" opacity=".15" fill="none" />
      </svg>
    </div>
  );
}
