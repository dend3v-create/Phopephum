/**
 * HoraNuChart.tsx — SVG Circular Wheel Chart for ยามพรายกระซิบ
 *
 * Blueprint spec: 800×800 viewBox, CCW zodiac layout (Taurus at 315°),
 * chained-folding planet walk algorithm (inclusive counting),
 * time ring (12 sub-yam × 7.5 min), Astral Imperial Flow theme.
 */

import React, { useMemo } from "react";

// ─── Props Interface ──────────────────────────────────────────────────────────

export interface HoraNuChartProps {
  weekday: string;
  period: "day" | "night";
  yama: number;
  yamStartTime: string;       // "HH:MM"
  currentPlanet: number;      // 1–7 (ruling planet of current main yam)
  currentSubYam?: number;     // 1–12 (current sub-period, 0=none)
  size?: number;              // display size in px (default 500)
  className?: string;
  // Optional overrides for 112-chart system
  customPlanetWalks?: Array<{ id: number | string; walks: number }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CX = 400;
const CY = 400;

const R_OUTER  = 340;  // zodiac ring outer edge
const R_MIDDLE = 290;  // zodiac ring inner / house ring outer
const R_INNER  = 220;  // house ring inner
const R_CENTER = 110;  // inner center circle
const R_TIME   = 356;  // time tick ring (just outside R_OUTER)

// Zodiac signs (CCW order, index 0 = Taurus)
const ZODIAC_SIGNS = [
  { nameThai: "พฤษภ", symbol: "♉", element: "ดิน", lord: 6 },
  { nameThai: "เมถุน", symbol: "♊", element: "ลม",  lord: 4 },
  { nameThai: "กรกฎ",  symbol: "♋", element: "น้ำ", lord: 2 },
  { nameThai: "สิงห์",  symbol: "♌", element: "ไฟ",  lord: 1 },
  { nameThai: "กันย์",  symbol: "♍", element: "ดิน", lord: 4 },
  { nameThai: "ตุลย์",  symbol: "♎", element: "ลม",  lord: 6 },
  { nameThai: "พิจิก",  symbol: "♏", element: "น้ำ", lord: 3 },
  { nameThai: "ธนู",   symbol: "♐", element: "ไฟ",  lord: 5 },
  { nameThai: "มังกร", symbol: "♑", element: "ดิน", lord: 7 },
  { nameThai: "กุมภ์",  symbol: "♒", element: "ลม",  lord: 7 },
  { nameThai: "มีน",   symbol: "♓", element: "น้ำ", lord: 5 },
  { nameThai: "เมษ",   symbol: "♈", element: "ไฟ",  lord: 3 },
] as const;

// Element fill colors
const ELEMENT_COLORS: Record<string, string> = {
  "ดิน": "rgba(107,142,107,0.12)",
  "ลม":  "rgba(142,142,107,0.10)",
  "น้ำ": "rgba(107,123,142,0.12)",
  "ไฟ":  "rgba(142,107,107,0.12)",
};

// Planet walk data for chained-folding algorithm
const DEFAULT_PLANET_WALKS = [
  { id: 1,    walks: 5, thaiNum: "๑",  color: "#EF4444" },
  { id: 2,    walks: 3, thaiNum: "๒",  color: "#FBBF24" },
  { id: 3,    walks: 1, thaiNum: "๓",  color: "#F97316" },
  { id: 4,    walks: 6, thaiNum: "๔",  color: "#10B981" },
  { id: 5,    walks: 4, thaiNum: "๕",  color: "#F59E0B" },
  { id: 6,    walks: 4, thaiNum: "๖",  color: "#EC4899" },
  { id: 7,    walks: 6, thaiNum: "๗",  color: "#8B5CF6" },
  { id: 8,    walks: 1, thaiNum: "๘",  color: "#94A3B8" },
  { id: "ลั", walks: 3, thaiNum: "ลั", color: "#C6A96B" },
  { id: 9,    walks: 5, thaiNum: "๙",  color: "#6366F1" },
  { id: 0,    walks: 7, thaiNum: "๐",  color: "#475569" },
] as const;

type PlanetWalkItem = {
  id: number | string;
  walks: number;
  thaiNum: string;
  color: string;
};

// House names (index 0 = house 1 = ลัคนา)
const HOUSE_NAMES = [
  "ลัคนา", "กฎุมภะ", "ภาตุ", "พันธุ", "ปุตตะ", "อริ",
  "ปัตนิ", "มรณะ",  "ธรรม", "กรรม",  "ลาภ",   "ศุภะ",
];

// Dignity symbols and colors
const DIGNITY = {
  KASET:      { symbol: "△", color: "#C6A96B" },
  MAHA_UCH:   { symbol: "○", color: "#F59E0B" },
  RACHA_CHOK: { symbol: "⬡", color: "#10B981" },
  MAHA_CHAK:  { symbol: "□", color: "#8B5CF6" },
  PRA:        { symbol: "⋮", color: "#94A3B8" },
  NEECH:      { symbol: "✳", color: "#EF4444" },
};

// ─── Geometry Helpers ─────────────────────────────────────────────────────────

/** Convert polar angle (0=top, CW increasing) to SVG x,y */
function polarXY(r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

/**
 * Return start/end/center angles for a zodiac index (0=Taurus).
 * Layout is CCW: Taurus sector spans 285°–315° (center 300°).
 */
function zodiacAngles(idx: number): { start: number; end: number; center: number } {
  const end    = 315 - idx * 30;
  const start  = 315 - (idx + 1) * 30;
  const center = 315 - (idx + 0.5) * 30;
  return { start, end, center };
}

/** Normalize angle to 0–360 */
function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * SVG path for an annular sector (ring segment) between r1 and r2,
 * sweeping CW from startDeg to endDeg (both normalized).
 */
function sectorPath(r1: number, r2: number, startDeg: number, endDeg: number): string {
  const s = norm(startDeg);
  const e = norm(endDeg);
  const p1 = polarXY(r2, s);
  const p2 = polarXY(r2, e);
  const p3 = polarXY(r1, e);
  const p4 = polarXY(r1, s);
  return `M ${p1.x.toFixed(2)},${p1.y.toFixed(2)} A ${r2},${r2} 0 0 1 ${p2.x.toFixed(2)},${p2.y.toFixed(2)} L ${p3.x.toFixed(2)},${p3.y.toFixed(2)} A ${r1},${r1} 0 0 0 ${p4.x.toFixed(2)},${p4.y.toFixed(2)} Z`;
}

/** SVG path for a radial line */
function radialLine(r1: number, r2: number, angleDeg: number): string {
  const p1 = polarXY(r1, angleDeg);
  const p2 = polarXY(r2, angleDeg);
  return `M ${p1.x.toFixed(2)},${p1.y.toFixed(2)} L ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
}

// ─── Chained Folding Algorithm ────────────────────────────────────────────────

interface PlacedPlanet extends PlanetWalkItem {
  zodiacIdx: number;
}

function chainedFolding(planetWalks: readonly PlanetWalkItem[]): PlacedPlanet[] {
  const result: PlacedPlanet[] = [];
  let pos = 0;
  for (const pw of planetWalks) {
    pos = (pos + pw.walks - 1) % 12;
    result.push({ ...pw, zodiacIdx: pos });
  }
  return result;
}

// ─── Time Ring Helpers ────────────────────────────────────────────────────────

/**
 * For a given lagna zodiac index, lord of lagna determines the floating start house.
 * Sub-yam i (1-indexed) is at: (lagnaLordZodiacIdx + i - 1) % 12
 */
function timeRingZodiacIdx(subYam: number, startZodiacIdx: number): number {
  return (startZodiacIdx + subYam - 1) % 12;
}

/** Parse "HH:MM" to minutes-from-midnight */
function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Format minutes-from-midnight as "HH:MM" */
function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HoraNuChart({
  weekday,
  period,
  yama,
  yamStartTime,
  currentPlanet,
  currentSubYam = 0,
  size = 500,
  className = "",
  customPlanetWalks,
}: HoraNuChartProps) {
  // Build planet walks array (allow customization)
  const planetWalks = useMemo<PlanetWalkItem[]>(() => {
    if (!customPlanetWalks) return DEFAULT_PLANET_WALKS as unknown as PlanetWalkItem[];
    return DEFAULT_PLANET_WALKS.map((pw) => {
      const override = customPlanetWalks.find((c) => c.id === pw.id);
      return override ? { ...pw, walks: override.walks } : { ...pw };
    });
  }, [customPlanetWalks]);

  // Run chained folding
  const placedPlanets = useMemo(() => chainedFolding(planetWalks), [planetWalks]);

  // Find ลัคนา placement (id="ลั")
  const lagnaPlaced = useMemo(
    () => placedPlanets.find((p) => p.id === "ลั"),
    [placedPlanets]
  );
  const lagnaZodiacIdx = lagnaPlaced?.zodiacIdx ?? 0; // should always be 0 (Taurus)

  // Lord of ลัคนา zodiac (Taurus, idx=0) → lord=6 (Venus)
  const lagnaLord = ZODIAC_SIGNS[lagnaZodiacIdx].lord; // 6

  // Find where the lagna lord (planet 6) landed
  const lagnaLordPlaced = useMemo(
    () => placedPlanets.find((p) => p.id === lagnaLord),
    [placedPlanets, lagnaLord]
  );
  const lagnaLordZodiacIdx = lagnaLordPlaced?.zodiacIdx ?? 5; // Libra (house 6)

  // Time ring: sub-yam start zodiac index = lagnaLordZodiacIdx
  // sub-yam 1 → lagnaLordZodiacIdx, sub-yam 2 → +1, ...
  const startZodiacForTimeRing = lagnaLordZodiacIdx;

  // Group planets by zodiac sector
  const planetsByZodiac = useMemo(() => {
    const map = new Map<number, PlacedPlanet[]>();
    for (const p of placedPlanets) {
      if (!map.has(p.zodiacIdx)) map.set(p.zodiacIdx, []);
      map.get(p.zodiacIdx)!.push(p);
    }
    return map;
  }, [placedPlanets]);

  // Current ruling planet color
  const currentPlanetData = planetWalks.find((pw) => pw.id === currentPlanet);
  const currentPlanetColor = currentPlanetData?.color ?? "#C6A96B";

  // Sectors where current planet has lord role
  const currentPlanetRuledSectors = useMemo(() => {
    return ZODIAC_SIGNS.reduce<number[]>((acc, sign, idx) => {
      if (sign.lord === currentPlanet) acc.push(idx);
      return acc;
    }, []);
  }, [currentPlanet]);

  // Scale factor for responsive rendering
  const scale = size / 800;

  // Sub-yam time labels (7.5 min per sub-period)
  const subYamTimes = useMemo(() => {
    const startMin = parseTime(yamStartTime);
    return Array.from({ length: 12 }, (_, i) => formatTime(startMin + i * 7.5));
  }, [yamStartTime]);

  return (
    <svg
      viewBox="0 0 800 800"
      width={size}
      height={size}
      className={`select-none ${className}`}
      style={{ display: "block" }}
      aria-label={`ผังยามพรายกระซิบ ${weekday} ยามที่ ${yama}`}
    >
      <defs>
        {/* Gold glow filter */}
        <filter id="hn-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Subtle glow filter */}
        <filter id="hn-glow-sm" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Lagna gold glow */}
        <filter id="hn-lagna-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Radial gradient for background */}
        <radialGradient id="hn-bg-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0C1A2E" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
        {/* Current planet sector highlight */}
        <radialGradient id="hn-planet-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={currentPlanetColor} stopOpacity="0.20" />
          <stop offset="100%" stopColor={currentPlanetColor} stopOpacity="0.03" />
        </radialGradient>
        {/* Lagna sector highlight */}
        <radialGradient id="hn-lagna-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C6A96B" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#C6A96B" stopOpacity="0.04" />
        </radialGradient>
        {/* Time ring arc clip */}
        <clipPath id="hn-clip-outer">
          <circle cx={CX} cy={CY} r={R_TIME} />
        </clipPath>
      </defs>

      {/* ─── Layer 0: Background ─────────────────────────────────────────── */}
      <circle cx={CX} cy={CY} r={R_TIME + 20} fill="#020617" />
      <circle
        cx={CX}
        cy={CY}
        r={R_OUTER}
        fill="url(#hn-bg-grad)"
        stroke="rgba(198,169,107,0.35)"
        strokeWidth="1.2"
      />

      {/* ─── Layer 1: Outer Zodiac Ring Sectors (R_MIDDLE → R_OUTER) ─────── */}
      {ZODIAC_SIGNS.map((sign, idx) => {
        const { start, end } = zodiacAngles(idx);
        const center = 315 - (idx + 0.5) * 30;
        const isRuledByCurrent = currentPlanetRuledSectors.includes(idx);
        const isLagna = idx === lagnaZodiacIdx;

        return (
          <g key={`zodiac-sector-${idx}`}>
            {/* Element-tinted sector fill */}
            <path
              d={sectorPath(R_MIDDLE, R_OUTER, start, end)}
              fill={ELEMENT_COLORS[sign.element] ?? "rgba(107,107,107,0.08)"}
              stroke="rgba(198,169,107,0.28)"
              strokeWidth="0.8"
            />
            {/* Current planet ruler highlight */}
            {isRuledByCurrent && (
              <path
                d={sectorPath(R_MIDDLE, R_OUTER, start, end)}
                fill="url(#hn-planet-glow)"
                filter="url(#hn-glow-sm)"
              />
            )}
            {/* Lagna sector special highlight */}
            {isLagna && (
              <path
                d={sectorPath(R_MIDDLE, R_OUTER, start, end)}
                fill="url(#hn-lagna-fill)"
                filter="url(#hn-lagna-glow)"
              />
            )}
            {/* Zodiac symbol */}
            <text
              x={polarXY((R_MIDDLE + R_OUTER) / 2 + 10, center).x}
              y={polarXY((R_MIDDLE + R_OUTER) / 2 + 10, center).y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="18"
              fill={isRuledByCurrent ? currentPlanetColor : "#D9CDB7"}
              opacity={isRuledByCurrent ? 1 : 0.75}
              transform={`rotate(${norm(center)}, ${polarXY((R_MIDDLE + R_OUTER) / 2 + 10, center).x}, ${polarXY((R_MIDDLE + R_OUTER) / 2 + 10, center).y})`}
            >
              {sign.symbol}
            </text>
            {/* Zodiac Thai name */}
            <text
              x={polarXY((R_MIDDLE + R_OUTER) / 2 - 10, center).x}
              y={polarXY((R_MIDDLE + R_OUTER) / 2 - 10, center).y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="14"
              fill={isRuledByCurrent ? currentPlanetColor : "#D9CDB7"}
              opacity={isRuledByCurrent ? 1 : 0.65}
              transform={`rotate(${norm(center)}, ${polarXY((R_MIDDLE + R_OUTER) / 2 - 10, center).x}, ${polarXY((R_MIDDLE + R_OUTER) / 2 - 10, center).y})`}
            >
              {sign.nameThai}
            </text>
          </g>
        );
      })}

      {/* ─── Layer 2: Dividing lines (R_CENTER → R_OUTER) ────────────────── */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = norm(315 - i * 30);
        const isCardinal = i % 3 === 0;
        return (
          <path
            key={`div-line-${i}`}
            d={radialLine(R_CENTER, R_OUTER, angle)}
            stroke="rgba(198,169,107,0.30)"
            strokeWidth={isCardinal ? "1.0" : "0.5"}
            strokeOpacity={isCardinal ? 0.55 : 0.28}
          />
        );
      })}

      {/* ─── Layer 3: House Ring Sectors (R_INNER → R_MIDDLE) ────────────── */}
      {ZODIAC_SIGNS.map((_, idx) => {
        const { start, end, center } = zodiacAngles(idx);
        const houseIdx = idx; // house 1 = zodiacIdx 0
        const houseName = HOUSE_NAMES[houseIdx];
        const isLagna = idx === lagnaZodiacIdx;

        return (
          <g key={`house-sector-${idx}`}>
            <path
              d={sectorPath(R_INNER, R_MIDDLE, start, end)}
              fill={isLagna ? "rgba(198,169,107,0.08)" : "rgba(10,22,44,0.60)"}
              stroke="rgba(198,169,107,0.22)"
              strokeWidth="0.6"
            />
            {/* House number (Thai) */}
            <text
              x={polarXY((R_INNER + R_MIDDLE) / 2 + 8, center).x}
              y={polarXY((R_INNER + R_MIDDLE) / 2 + 8, center).y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="13"
              fill="#8A9DB8"
              opacity="0.80"
              transform={`rotate(${norm(center)}, ${polarXY((R_INNER + R_MIDDLE) / 2 + 8, center).x}, ${polarXY((R_INNER + R_MIDDLE) / 2 + 8, center).y})`}
            >
              {houseIdx + 1}
            </text>
            {/* House name */}
            <text
              x={polarXY((R_INNER + R_MIDDLE) / 2 - 9, center).x}
              y={polarXY((R_INNER + R_MIDDLE) / 2 - 9, center).y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fill={isLagna ? "#C6A96B" : "#8A9DB8"}
              opacity={isLagna ? 1 : 0.70}
              fontWeight={isLagna ? "700" : "400"}
              transform={`rotate(${norm(center)}, ${polarXY((R_INNER + R_MIDDLE) / 2 - 9, center).x}, ${polarXY((R_INNER + R_MIDDLE) / 2 - 9, center).y})`}
            >
              {houseName}
            </text>
          </g>
        );
      })}

      {/* ─── Layer 4a: Current Planet highlight on house ring ─────────────── */}
      {currentPlanetRuledSectors.map((idx) => {
        const { start, end } = zodiacAngles(idx);
        return (
          <path
            key={`cp-house-highlight-${idx}`}
            d={sectorPath(R_INNER, R_MIDDLE, start, end)}
            fill={`${currentPlanetColor}18`}
            stroke={currentPlanetColor}
            strokeWidth="1.0"
            strokeOpacity="0.45"
            filter="url(#hn-glow-sm)"
          />
        );
      })}

      {/* ─── Layer 4b: Inner orbit ring (R_CENTER → R_INNER) ─────────────── */}
      <circle
        cx={CX}
        cy={CY}
        r={R_INNER}
        fill="none"
        stroke="rgba(198,169,107,0.18)"
        strokeWidth="0.6"
      />

      {/* ─── Layer 5: Floating Planets in House Ring area ────────────────── */}
      {Array.from(planetsByZodiac.entries()).map(([zodiacIdx, planets]) => {
        const { center } = zodiacAngles(zodiacIdx);
        const planetR = (R_CENTER + R_MIDDLE) / 2; // midpoint of full inner area

        return planets.map((planet, pIdx) => {
          // Stack multiple planets vertically by offsetting along the radial
          const totalPlanets = planets.length;
          const stackOffset = (pIdx - (totalPlanets - 1) / 2) * 22;
          const adjustedR = planetR + stackOffset;
          const pos = polarXY(adjustedR, center);
          const isLagna = planet.id === "ลั";
          const isCurrentPlanet = planet.id === currentPlanet;

          return (
            <g key={`planet-${planet.id}-${zodiacIdx}-${pIdx}`}>
              {/* Lagna special gold circle */}
              {isLagna && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="22"
                  fill="rgba(198,169,107,0.18)"
                  stroke="#C6A96B"
                  strokeWidth="1.5"
                  filter="url(#hn-lagna-glow)"
                />
              )}
              {/* Current planet glow */}
              {isCurrentPlanet && !isLagna && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="20"
                  fill={`${planet.color}22`}
                  filter="url(#hn-glow)"
                />
              )}
              {/* Planet background circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="16"
                fill="#020617"
                stroke={isLagna ? "#C6A96B" : planet.color}
                strokeWidth={isCurrentPlanet || isLagna ? "1.6" : "0.8"}
                strokeOpacity={isCurrentPlanet || isLagna ? 1 : 0.65}
              />
              {/* Planet Thai numeral */}
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={isLagna ? "13" : "15"}
                fill={isLagna ? "#C6A96B" : planet.color}
                fontWeight="900"
                fontFamily="serif"
                opacity={isCurrentPlanet || isLagna ? 1 : 0.82}
                filter={isCurrentPlanet || isLagna ? "url(#hn-glow-sm)" : undefined}
              >
                {planet.thaiNum}
              </text>
            </g>
          );
        });
      })}

      {/* ─── Layer 6: ลัคนา marker (dedicated, if not already rendered) ───── */}
      {/* ลัคนา is guaranteed to land at zodiacIdx=0 by algorithm — already in Layer 5 */}

      {/* ─── Layer 7: Time Ring (12 sub-yam ticks outside R_OUTER) ──────────
          Each tick corresponds to a sub-yam period (7.5 min).
          The sub-yams follow zodiac sectors starting from lagnaLordZodiacIdx.
      ─────────────────────────────────────────────────────────────────────── */}
      {Array.from({ length: 12 }, (_, i) => {
        const subYamNum = i + 1; // 1-indexed
        const zodiacIdx = timeRingZodiacIdx(subYamNum, startZodiacForTimeRing);
        const { start, end, center } = zodiacAngles(zodiacIdx);
        const isCurrent = currentSubYam === subYamNum;
        const tickAngle = norm(start);
        const tickOuter = R_TIME + 10;
        const tickInner = R_OUTER;
        const labelPos = polarXY(R_TIME + 24, center);

        return (
          <g key={`time-ring-${i}`}>
            {/* Current sub-yam arc highlight */}
            {isCurrent && (
              <path
                d={sectorPath(R_OUTER, R_TIME + 12, start, end)}
                fill="rgba(198,169,107,0.18)"
                stroke="#C6A96B"
                strokeWidth="1.2"
                strokeOpacity="0.7"
                filter="url(#hn-glow-sm)"
              />
            )}
            {/* Tick mark */}
            <path
              d={radialLine(tickInner, tickOuter, tickAngle)}
              stroke={isCurrent ? "#C6A96B" : "rgba(75,111,174,0.55)"}
              strokeWidth={isCurrent ? "2.0" : "0.8"}
            />
            {/* Sub-yam number */}
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={isCurrent ? "13" : "11"}
              fill={isCurrent ? "#C6A96B" : "rgba(138,157,184,0.70)"}
              fontWeight={isCurrent ? "700" : "400"}
            >
              {subYamNum}
            </text>
            {/* Time label for current sub-yam */}
            {isCurrent && (
              <text
                x={polarXY(R_TIME + 42, center).x}
                y={polarXY(R_TIME + 42, center).y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill="#C6A96B"
                opacity="0.85"
              >
                {subYamTimes[i]}
              </text>
            )}
          </g>
        );
      })}

      {/* ─── Layer 8: Planet walk-count numbers (just outside R_OUTER) ──────
          Small Arabic step-count numbers near each zodiac sector boundary
          showing the walk count for each planet in sequence.
      ─────────────────────────────────────────────────────────────────────── */}
      {placedPlanets.map((planet, i) => {
        const { center } = zodiacAngles(planet.zodiacIdx);
        // Offset slightly so multiple labels in same sector don't overlap
        const sameZodiacBefore = placedPlanets
          .slice(0, i)
          .filter((p) => p.zodiacIdx === planet.zodiacIdx).length;
        const angleDelta = (sameZodiacBefore - 0.5) * 8;
        const labelR = R_OUTER + 16;
        const pos = polarXY(labelR, center + angleDelta);

        return (
          <text
            key={`walk-count-${i}`}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fill={planet.color}
            opacity="0.55"
          >
            {planet.walks}
          </text>
        );
      })}

      {/* ─── Layer 9: Direction indicator (current yama compass direction) ── */}
      {/* The current yama planet determines compass direction */}
      {(() => {
        // Map planet id to direction angle (traditional Thai associations)
        const PLANET_DIRECTION: Record<number, number> = {
          1: 90,   // อาทิตย์ → ตะวันออก (E)
          2: 315,  // จันทร์  → พายัพ (NW)
          3: 270,  // อังคาร  → ตะวันตก (W)
          4: 0,    // พุธ    → เหนือ (N)
          5: 45,   // พฤหัส  → อีสาน (NE)
          6: 135,  // ศุกร์   → อาคเนย์ (SE)
          7: 225,  // เสาร์   → หรดี (SW)
        };
        const dirAngle = PLANET_DIRECTION[currentPlanet] ?? 0;
        const tipPos  = polarXY(R_OUTER - 18, dirAngle);
        const baseL   = polarXY(R_CENTER + 40, norm(dirAngle - 10));
        const baseR   = polarXY(R_CENTER + 40, norm(dirAngle + 10));
        return (
          <polygon
            points={`${tipPos.x.toFixed(2)},${tipPos.y.toFixed(2)} ${baseL.x.toFixed(2)},${baseL.y.toFixed(2)} ${baseR.x.toFixed(2)},${baseR.y.toFixed(2)}`}
            fill="#C6A96B"
            opacity="0.30"
            filter="url(#hn-glow)"
          />
        );
      })()}

      {/* ─── Center Circle ────────────────────────────────────────────────── */}
      <circle
        cx={CX}
        cy={CY}
        r={R_CENTER}
        fill="#020617"
        stroke="#C6A96B"
        strokeWidth="1.4"
        strokeOpacity="0.5"
      />
      <circle
        cx={CX}
        cy={CY}
        r={R_CENTER - 8}
        fill="none"
        stroke="#C6A96B"
        strokeWidth="0.4"
        strokeOpacity="0.20"
      />

      {/* ─── Layer 10: Center Labels ──────────────────────────────────────── */}
      {/* Weekday short */}
      <text
        x={CX}
        y={CY - 44}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="13"
        fill="#C6A96B"
        fontWeight="400"
        opacity="0.65"
      >
        {weekday.replace("วัน", "")}
      </text>
      {/* Yama number (large) */}
      <text
        x={CX}
        y={CY - 14}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="28"
        fill="#C6A96B"
        fontWeight="900"
        filter="url(#hn-glow)"
        opacity="0.92"
      >
        ยาม {yama}
      </text>
      {/* Period */}
      <text
        x={CX}
        y={CY + 18}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="13"
        fill="#4B6FAE"
        fontWeight="600"
        opacity="0.85"
      >
        {period === "day" ? "กลางวัน" : "กลางคืน"}
      </text>
      {/* Current planet symbol */}
      {currentPlanet && (
        <text
          x={CX}
          y={CY + 44}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="22"
          fill={currentPlanetColor}
          fontWeight="900"
          fontFamily="serif"
          filter="url(#hn-glow-sm)"
          opacity="0.95"
        >
          {planetWalks.find((pw) => pw.id === currentPlanet)?.thaiNum ?? ""}
        </text>
      )}
      {/* Yam start time */}
      <text
        x={CX}
        y={CY + 70}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fill="#64748B"
        opacity="0.75"
      >
        {yamStartTime}
      </text>

      {/* ─── Outer border ring ────────────────────────────────────────────── */}
      <circle
        cx={CX}
        cy={CY}
        r={R_TIME + 55}
        fill="none"
        stroke="rgba(198,169,107,0.12)"
        strokeWidth="1"
      />
    </svg>
  );
}

export default HoraNuChart;
