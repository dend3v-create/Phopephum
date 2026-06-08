/**
 * HoraNuChart.tsx — SVG Circular Wheel Chart for โหรทายหนู
 *
 * Architecture:
 *   OuterRing    — 12 house sectors with zodiac + house labels
 *   DirectionRing — 8 compass direction markers
 *   TimeRing      — 12 sub-yam time ticks (7.5 min each)
 *   SectorLines   — dividers between sectors
 *   PlanetLayer   — planet numbers placed in their house sectors
 *   DignityLayer  — dignity symbols next to planet numbers
 *   CenterInfo    — current yam + direction in the center
 */

import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DignityType =
  | "kaset"       // เกษตร △ (Domicile)
  | "mahauch"     // มหาอุจจ์ ○ (Exaltation)
  | "rajachok"    // ราชาโชค ⬡
  | "mahachak"    // มหาจักร □
  | "neutral"     // กลาง ·
  | "pra"         // ประ ⋮ (Detriment)
  | "nich";       // นิจ ✳ (Fall)

export interface PlanetPlacement {
  planet: number;       // 1–7
  house: number;        // 1–12 (or 1–8 for 8-house system)
  dignity?: DignityType | null;
}

export interface SubPeriodInfo {
  num: number;          // 1–12
  startTime: string;    // "06:00"
  isCurrent: boolean;
}

export interface HoraNuChartProps {
  // Display info
  weekday: string;           // "วันจันทร์"
  yama: number;              // 1–8
  period: "day" | "night";
  yamStartTime: string;      // "06:00"
  yamEndTime: string;        // "07:30"
  currentPlanet?: number;    // 1–7 (current yam ruler)
  currentPlanetName?: string;
  currentDirection?: string; // Thai direction name
  currentDirectionAngle?: number; // 0=N, 90=E, 180=S, 270=W

  // Planet placements (from lookup chart data)
  placements: PlanetPlacement[];

  // Sub-periods for time ring
  subPeriods?: SubPeriodInfo[];
  currentSubPeriod?: number; // 1–12

  // Style
  size?: number;             // SVG size in px (default 360)
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANET_COLORS: Record<number, string> = {
  1: "#EF4444",  // อาทิตย์
  2: "#FBBF24",  // จันทร์
  3: "#F97316",  // อังคาร
  4: "#10B981",  // พุธ
  5: "#F59E0B",  // พฤหัส
  6: "#EC4899",  // ศุกร์
  7: "#8B5CF6",  // เสาร์
};

const PLANET_NAMES: Record<number, string> = {
  1: "อาทิตย์", 2: "จันทร์", 3: "อังคาร",
  4: "พุธ", 5: "พฤหัส", 6: "ศุกร์", 7: "เสาร์",
};

const THAI_NUMERALS = ["", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙", "๑๐", "๑๑", "๑๒"];

const DIGNITY_SYMBOL: Record<DignityType, string> = {
  kaset:    "△",
  mahauch:  "○",
  rajachok: "⬡",
  mahachak: "□",
  neutral:  "·",
  pra:      "⋮",
  nich:     "✳",
};

const DIGNITY_COLOR: Record<DignityType, string> = {
  kaset:    "#C6A96B",
  mahauch:  "#F59E0B",
  rajachok: "#10B981",
  mahachak: "#8B5CF6",
  neutral:  "#64748B",
  pra:      "#94A3B8",
  nich:     "#EF4444",
};

// 12 houses (fixed Taurus = house 1)
const HOUSE_NAMES: Record<number, { thai: string; short: string }> = {
  1:  { thai: "ลัคนา",  short: "ลัคนา" },
  2:  { thai: "กฎุมภะ", short: "กฎุมภะ" },
  3:  { thai: "สหัชชะ", short: "สหัชชะ" },
  4:  { thai: "พันธุ",  short: "พันธุ" },
  5:  { thai: "ปุตตะ",  short: "ปุตตะ" },
  6:  { thai: "อริ",    short: "อริ" },
  7:  { thai: "ปัตนิ",  short: "ปัตนิ" },
  8:  { thai: "มรณะ",   short: "มรณะ" },
  9:  { thai: "ธรรม",   short: "ธรรม" },
  10: { thai: "กรรม",   short: "กรรม" },
  11: { thai: "ลาภ",    short: "ลาภ" },
  12: { thai: "ศุภะ",   short: "ศุภะ" },
};

// 12 zodiac signs (Taurus=1)
const ZODIAC_NAMES: Record<number, string> = {
  1: "พฤษภ", 2: "เมถุน", 3: "กรกฎ",   4: "สิงห์",
  5: "กันย์", 6: "ตุลย์", 7: "พิจิก",  8: "ธนู",
  9: "มังกร", 10: "กุมภ์", 11: "มีน",  12: "เมษ",
};

// 8 compass directions (mapped to svgAngle: 0=top=N, 90=right=E)
const COMPASS_DIRECTIONS = [
  { thai: "เหนือ",        abbr: "น.",   angle: 0   },
  { thai: "อีสาน",        abbr: "อส.",  angle: 45  },
  { thai: "ตะวันออก",     abbr: "ตอ.",  angle: 90  },
  { thai: "อาคเนย์",      abbr: "อคน.", angle: 135 },
  { thai: "ใต้",          abbr: "ต.",   angle: 180 },
  { thai: "หรดี",         abbr: "หรด.", angle: 225 },
  { thai: "ตะวันตก",      abbr: "ตต.",  angle: 270 },
  { thai: "พายัพ",        abbr: "พย.",  angle: 315 },
];

// ─── SVG Helpers ─────────────────────────────────────────────────────────────

/** Convert polar (clockwise from top) to SVG xy */
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/** Arc path for a donut sector */
function sectorPath(
  cx: number, cy: number,
  r1: number, r2: number,
  startAngle: number, endAngle: number
): string {
  const s1 = polar(cx, cy, r1, startAngle);
  const s2 = polar(cx, cy, r2, startAngle);
  const e1 = polar(cx, cy, r1, endAngle);
  const e2 = polar(cx, cy, r2, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${s2.x.toFixed(2)} ${s2.y.toFixed(2)}`,
    `A ${r2} ${r2} 0 ${large} 1 ${e2.x.toFixed(2)} ${e2.y.toFixed(2)}`,
    `L ${e1.x.toFixed(2)} ${e1.y.toFixed(2)}`,
    `A ${r1} ${r1} 0 ${large} 0 ${s1.x.toFixed(2)} ${s1.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

/** Wedge line from r1 to r2 at angle */
function radialLine(cx: number, cy: number, r1: number, r2: number, angleDeg: number): string {
  const p1 = polar(cx, cy, r1, angleDeg);
  const p2 = polar(cx, cy, r2, angleDeg);
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HoraNuChart({
  weekday,
  yama,
  period,
  yamStartTime,
  yamEndTime,
  currentPlanet,
  currentPlanetName,
  currentDirection,
  currentDirectionAngle,
  placements,
  subPeriods,
  currentSubPeriod,
  size = 360,
  className = "",
}: HoraNuChartProps) {
  const cx = size / 2;
  const cy = size / 2;

  // Radii for each layer
  const R_OUTER      = size * 0.480;  // outer boundary
  const R_ZODIAC     = size * 0.455;  // zodiac label center
  const R_HOUSE_LABEL = size * 0.415;  // house label center
  const R_HOUSE_OUTER = size * 0.380;  // outer edge of house sectors
  const R_TIME_OUTER  = size * 0.380;  // time ring outer
  const R_TIME_INNER  = size * 0.350;  // time ring inner
  const R_PLANET      = size * 0.285;  // planet number center
  const R_CENTER      = size * 0.155;  // center circle

  // Each of 12 sectors occupies 30°
  const SECTOR_DEG = 360 / 12;
  // House 1 (Taurus) starts at the top (0°) going clockwise
  // Traditional Thai charts: house 1 at top, counter-clockwise
  // We use clockwise for simplicity; house 1 at top

  const housePlanets = new Map<number, PlanetPlacement[]>();
  for (const p of placements) {
    if (!housePlanets.has(p.house)) housePlanets.set(p.house, []);
    housePlanets.get(p.house)!.push(p);
  }

  // Center angle for each house (clockwise from top)
  // House 1 center = 0°+15° = 15°, House 2 = 45°, etc.
  function houseCenterAngle(houseNum: number): number {
    return (houseNum - 1) * SECTOR_DEG + SECTOR_DEG / 2;
  }
  function houseStartAngle(houseNum: number): number {
    return (houseNum - 1) * SECTOR_DEG;
  }

  // Current direction indicator angle (geographic: 0=N→svg top)
  const dirAngleSvg = currentDirectionAngle ?? 0; // already in svg coords (0=top)

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={`select-none ${className}`}
      aria-label={`ผังโหรทายหนู ${weekday} ยามที่ ${yama}`}
    >
      <defs>
        {/* Gold gradient for current sector */}
        <radialGradient id="goldGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C6A96B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#C6A96B" stopOpacity="0.05" />
        </radialGradient>
        {/* Dark sector fill */}
        <radialGradient id="darkGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0F172A" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#020617" stopOpacity="1" />
        </radialGradient>
        {/* Current direction glow */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {/* Center glow */}
        <filter id="centerGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ── Background circle ── */}
      <circle cx={cx} cy={cy} r={R_OUTER} fill="url(#darkGrad)" stroke="#C6A96B" strokeWidth="1" strokeOpacity="0.3" />

      {/* ── Layer 1: House sectors (12 slices) ── */}
      {Array.from({ length: 12 }, (_, i) => {
        const houseNum = i + 1;
        const start = houseStartAngle(houseNum);
        const end = start + SECTOR_DEG;
        const hasCurrentPlanet = (housePlanets.get(houseNum) ?? []).some(p => p.planet === currentPlanet);

        return (
          <g key={houseNum}>
            {/* Sector fill */}
            <path
              d={sectorPath(cx, cy, R_CENTER, R_HOUSE_OUTER, start, end)}
              fill={hasCurrentPlanet ? "url(#goldGrad)" : "transparent"}
              stroke="#C6A96B"
              strokeWidth="0.5"
              strokeOpacity="0.2"
            />
            {/* Outer arc ring (zodiac label area) */}
            <path
              d={sectorPath(cx, cy, R_HOUSE_OUTER, R_OUTER, start, end)}
              fill={houseNum % 2 === 0 ? "#0F172A" : "#091121"}
              stroke="#C6A96B"
              strokeWidth="0.4"
              strokeOpacity="0.25"
            />
          </g>
        );
      })}

      {/* ── Layer 2: Radial divider lines ── */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = i * SECTOR_DEG;
        const isCardinal = i % 3 === 0; // every 3 = 90°
        return (
          <path
            key={i}
            d={radialLine(cx, cy, R_CENTER, R_OUTER, angle)}
            stroke="#C6A96B"
            strokeWidth={isCardinal ? "0.8" : "0.4"}
            strokeOpacity={isCardinal ? "0.5" : "0.25"}
          />
        );
      })}

      {/* ── Layer 3: Time ring (12 sub-periods × 7.5 min) ── */}
      {subPeriods && subPeriods.map((sp, i) => {
        const angle = houseStartAngle(i + 1); // align with house dividers
        const tickOuter = R_TIME_OUTER;
        const tickInner = sp.isCurrent ? R_TIME_INNER - size * 0.02 : R_TIME_INNER + size * 0.01;
        const labelPos = polar(cx, cy, R_TIME_INNER - size * 0.035, angle + SECTOR_DEG / 2);

        return (
          <g key={i}>
            {/* Tick mark */}
            <path
              d={radialLine(cx, cy, tickInner, tickOuter, angle)}
              stroke={sp.isCurrent ? "#C6A96B" : "#4B6FAE"}
              strokeWidth={sp.isCurrent ? "1.5" : "0.6"}
              strokeOpacity={sp.isCurrent ? "1" : "0.5"}
            />
            {/* Time label for current */}
            {sp.isCurrent && (
              <text
                x={labelPos.x} y={labelPos.y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={size * 0.026}
                fill="#C6A96B" fontWeight="bold" opacity="0.9"
              >
                {sp.startTime}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Layer 4: Compass direction markers ── */}
      {COMPASS_DIRECTIONS.map((dir) => {
        const isCurrentDir = currentDirectionAngle !== undefined &&
          Math.abs(dir.angle - currentDirectionAngle) < 23;
        const labelPos = polar(cx, cy, R_OUTER + size * 0.015, dir.angle);
        const tickPos1 = polar(cx, cy, R_OUTER, dir.angle);
        const tickPos2 = polar(cx, cy, R_OUTER - size * 0.025, dir.angle);

        return (
          <g key={dir.angle} filter={isCurrentDir ? "url(#glow)" : undefined}>
            {/* Direction tick */}
            <path
              d={`M ${tickPos2.x.toFixed(2)} ${tickPos2.y.toFixed(2)} L ${tickPos1.x.toFixed(2)} ${tickPos1.y.toFixed(2)}`}
              stroke={isCurrentDir ? "#C6A96B" : "#4B6FAE"}
              strokeWidth={isCurrentDir ? "2" : "0.8"}
              strokeOpacity={isCurrentDir ? "1" : "0.4"}
            />
          </g>
        );
      })}

      {/* ── Layer 5: Zodiac + House labels (outer ring) ── */}
      {Array.from({ length: 12 }, (_, i) => {
        const houseNum = i + 1;
        const midAngle = houseCenterAngle(houseNum);
        const zodiacPos = polar(cx, cy, R_ZODIAC, midAngle);
        const houseLabelPos = polar(cx, cy, R_HOUSE_LABEL, midAngle);

        // Rotate text to follow the arc
        const textAngle = midAngle > 90 && midAngle < 270 ? midAngle + 180 : midAngle;

        return (
          <g key={houseNum}>
            {/* Zodiac name */}
            <text
              x={zodiacPos.x} y={zodiacPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.030}
              fill="#94A3B8"
              fontWeight="500"
              opacity="0.7"
              transform={`rotate(${midAngle}, ${zodiacPos.x}, ${zodiacPos.y})`}
            >
              {ZODIAC_NAMES[houseNum]}
            </text>
            {/* House name */}
            <text
              x={houseLabelPos.x} y={houseLabelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.028}
              fill="#C6A96B"
              fontWeight="700"
              opacity="0.85"
              transform={`rotate(${midAngle}, ${houseLabelPos.x}, ${houseLabelPos.y})`}
            >
              {HOUSE_NAMES[houseNum]?.short}
            </text>
          </g>
        );
      })}

      {/* ── Layer 6: Planet numbers ── */}
      {Array.from({ length: 12 }, (_, i) => {
        const houseNum = i + 1;
        const midAngle = houseCenterAngle(houseNum);
        const planets = housePlanets.get(houseNum) ?? [];

        return planets.map((p, pIdx) => {
          // Offset multiple planets in same house
          const offset = (pIdx - (planets.length - 1) / 2) * size * 0.045;
          const angleOffset = offset / R_PLANET * (180 / Math.PI);
          const planetPos = polar(cx, cy, R_PLANET, midAngle + angleOffset);
          const color = PLANET_COLORS[p.planet] ?? "#F8F6F1";
          const isCurrentPlanet = p.planet === currentPlanet;

          return (
            <g key={`${houseNum}-${pIdx}`}>
              {/* Glow circle for current planet */}
              {isCurrentPlanet && (
                <circle
                  cx={planetPos.x} cy={planetPos.y}
                  r={size * 0.045}
                  fill={color}
                  opacity="0.15"
                  filter="url(#glow)"
                />
              )}
              {/* Planet circle */}
              <circle
                cx={planetPos.x} cy={planetPos.y}
                r={size * 0.036}
                fill="#020617"
                stroke={color}
                strokeWidth={isCurrentPlanet ? "1.5" : "0.8"}
                strokeOpacity={isCurrentPlanet ? "1" : "0.7"}
              />
              {/* Planet number (Thai) */}
              <text
                x={planetPos.x} y={planetPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.040}
                fill={color}
                fontWeight="900"
                fontFamily="serif"
                opacity={isCurrentPlanet ? "1" : "0.85"}
              >
                {THAI_NUMERALS[p.planet]}
              </text>
              {/* Dignity symbol */}
              {p.dignity && p.dignity !== "neutral" && (
                <text
                  x={planetPos.x + size * 0.035}
                  y={planetPos.y - size * 0.025}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={size * 0.022}
                  fill={DIGNITY_COLOR[p.dignity]}
                  opacity="0.9"
                >
                  {DIGNITY_SYMBOL[p.dignity]}
                </text>
              )}
            </g>
          );
        });
      })}

      {/* ── Layer 7: Current direction pointer ── */}
      {currentDirectionAngle !== undefined && (() => {
        const tipPos  = polar(cx, cy, R_OUTER - size * 0.02, dirAngleSvg);
        const baseL   = polar(cx, cy, R_CENTER + size * 0.04, dirAngleSvg - 12);
        const baseR   = polar(cx, cy, R_CENTER + size * 0.04, dirAngleSvg + 12);
        return (
          <polygon
            points={`${tipPos.x.toFixed(2)},${tipPos.y.toFixed(2)} ${baseL.x.toFixed(2)},${baseL.y.toFixed(2)} ${baseR.x.toFixed(2)},${baseR.y.toFixed(2)}`}
            fill="#C6A96B"
            opacity="0.35"
            filter="url(#glow)"
          />
        );
      })()}

      {/* ── Center circle ── */}
      <circle cx={cx} cy={cy} r={R_CENTER} fill="#020617" stroke="#C6A96B" strokeWidth="1" strokeOpacity="0.4" />
      <circle cx={cx} cy={cy} r={R_CENTER - size * 0.01} fill="none" stroke="#C6A96B" strokeWidth="0.4" strokeOpacity="0.2" />

      {/* Center text: yama number */}
      <text x={cx} y={cy - size * 0.045} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.030} fill="#C6A96B" fontWeight="bold" opacity="0.6">
        {weekday.replace("วัน", "")}
      </text>
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.058} fill="#C6A96B" fontWeight="900" filter="url(#centerGlow)" opacity="0.9">
        ยาม {THAI_NUMERALS[yama]}
      </text>
      <text x={cx} y={cy + size * 0.05} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.026} fill="#4B6FAE" fontWeight="600" opacity="0.8">
        {period === "day" ? "กลางวัน" : "กลางคืน"}
      </text>
      {currentPlanetName && (
        <text x={cx} y={cy + size * 0.085} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.024} fill={currentPlanet ? PLANET_COLORS[currentPlanet] : "#F8F6F1"}
          fontWeight="700" opacity="0.9">
          ดาว{currentPlanetName}
        </text>
      )}
      {yamStartTime && (
        <text x={cx} y={cy + size * 0.115} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.022} fill="#64748B" opacity="0.7">
          {yamStartTime}–{yamEndTime}
        </text>
      )}
    </svg>
  );
}
