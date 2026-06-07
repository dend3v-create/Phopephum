/**
 * HoraNuChart.tsx
 * ผังโหรทายหนู — SVG Wheel: 12 ราศี + 8 ทิศ + ดาวประจำยาม
 *
 * Ring structure (outer → inner):
 *  [8-direction markers] r=225
 *  [zodiac ring]         r=165–205
 *  [house ring]          r=122–165
 *  [planet/dignity ring] r=75–122
 *  [center]              r=75
 */

import type { HoraNuChartData } from "@phopephum/engine";
import {
  HORA_NU_SIGNS,
  HORA_NU_PLANETS,
  PLANET_STATUS_SYMBOL,
  PLANET_STATUS_COLOR,
  COMPASS_8,
} from "@phopephum/engine";

// ─── SVG Math helpers ─────────────────────────────────────────────────────────

const CX = 230, CY = 230;

/** Convert angle (0=top/N, clockwise) to SVG (x,y) at radius r */
function polar(r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

function n(v: number, d = 2): number {
  return Math.round(v * 10 ** d) / 10 ** d;
}

/**
 * SVG path for a donut segment.
 * Angles in "top=0, clockwise" convention.
 */
function donutSlice(
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const [ox1, oy1] = polar(outerR, startAngle);
  const [ox2, oy2] = polar(outerR, endAngle);
  const [ix1, iy1] = polar(innerR, endAngle);
  const [ix2, iy2] = polar(innerR, startAngle);
  const span = ((endAngle - startAngle) + 360) % 360;
  const large = span > 180 ? 1 : 0;
  return [
    `M ${n(ox1)} ${n(oy1)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${n(ox2)} ${n(oy2)}`,
    `L ${n(ix1)} ${n(iy1)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${n(ix2)} ${n(iy2)}`,
    "Z",
  ].join(" ");
}

/** Center (x,y) and text rotation for upright text in any ring segment */
function textPlacement(r: number, angleDeg: number) {
  const [x, y] = polar(r, angleDeg);
  // Flip text in the bottom half so it stays readable
  const rot = angleDeg > 90 && angleDeg <= 270 ? angleDeg + 180 : angleDeg;
  return { x: n(x), y: n(y), rot: n(rot) };
}

// ─── Zodiac ring data ─────────────────────────────────────────────────────────
// House h (0-indexed, Taurus=0) sits at center angle h×30° (top=0°, CW)
const HOUSE_ANGLES = HORA_NU_SIGNS.map((_, i) => ({
  center:    i * 30,
  start:     i * 30 - 15,
  end:       i * 30 + 15,
}));

// Element colors for ring tinting
const ELEMENT_FILL: Record<string, string> = {
  ดิน:  "rgba(198,169,107,0.10)",
  ลม:   "rgba(75,111,174,0.10)",
  น้ำ:  "rgba(56,189,248,0.10)",
  ไฟ:   "rgba(249,115,22,0.10)",
};
const ELEMENT_STROKE: Record<string, string> = {
  ดิน:  "rgba(198,169,107,0.30)",
  ลม:   "rgba(75,111,174,0.30)",
  น้ำ:  "rgba(56,189,248,0.30)",
  ไฟ:   "rgba(249,115,22,0.30)",
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface HoraNuChartProps {
  data: HoraNuChartData;
  size?: number; // pixel size of the rendered SVG (default 460)
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function HoraNuChart({ data, size = 460 }: HoraNuChartProps) {
  const currentHouseIdx = data.currentPrimaryHouse - 1; // 0-based
  const currentAngle    = HOUSE_ANGLES[currentHouseIdx]?.center ?? 0;
  const planetColor     = data.currentPlanetColor;

  return (
    <svg
      viewBox="0 0 460 460"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
    >
      <defs>
        {/* Current yam glow */}
        <filter id="yamGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Soft outer glow for center */}
        <filter id="centerGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Radial gradient for center */}
        <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={planetColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor="#020617"      stopOpacity="1" />
        </radialGradient>
        {/* Current yam segment gradient */}
        <radialGradient id="yamGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={planetColor} stopOpacity="0.30" />
          <stop offset="100%" stopColor={planetColor} stopOpacity="0.05" />
        </radialGradient>
      </defs>

      {/* ── 1. Background ─────────────────────────────────────────────────── */}
      <circle cx={CX} cy={CY} r={228} fill="#020617" />
      <circle cx={CX} cy={CY} r={228} fill="none" stroke="rgba(198,169,107,0.15)" strokeWidth="1" />

      {/* Subtle constellation dots */}
      {CONSTELLATION_DOTS.map((d, i) => (
        <circle key={i} cx={d[0]} cy={d[1]} r={d[2]} fill="rgba(248,246,241,0.25)" />
      ))}

      {/* ── 2. Zodiac Ring (r 165–205) ────────────────────────────────────── */}
      {HORA_NU_SIGNS.map((sign, i) => {
        const { start, end, center } = HOUSE_ANGLES[i]!;
        const isActive = i === currentHouseIdx;
        const fill   = isActive ? "url(#yamGrad)" : ELEMENT_FILL[sign.element] ?? "rgba(255,255,255,0.04)";
        const stroke = isActive ? planetColor      : ELEMENT_STROKE[sign.element] ?? "rgba(198,169,107,0.2)";

        return (
          <g key={i}>
            {/* Zodiac segment background */}
            <path
              d={donutSlice(165, 205, start, end)}
              fill={fill}
              stroke={stroke}
              strokeWidth={isActive ? 1.5 : 0.8}
              filter={isActive ? "url(#yamGlow)" : undefined}
            />
            {/* House number (small, inside outer ring) */}
            <TextArc r={185} angle={center} fontSize={7} fill="rgba(198,169,107,0.55)" fontFamily="monospace">
              {String(sign.house)}
            </TextArc>
            {/* Zodiac name */}
            <TextArc r={198} angle={center} fontSize={9} fill={isActive ? planetColor : "#F8F6F1"} fontWeight={isActive ? "bold" : "normal"}>
              {sign.nameThai}
            </TextArc>
            {/* Element symbol dot at outer edge */}
            {(() => {
              const [dx, dy] = polar(208, center);
              return <circle cx={n(dx)} cy={n(dy)} r={2.5} fill={ELEMENT_STROKE[sign.element] ?? "#64748B"} />;
            })()}
          </g>
        );
      })}

      {/* Zodiac ring border circles */}
      <circle cx={CX} cy={CY} r={205} fill="none" stroke="rgba(198,169,107,0.25)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r={165} fill="none" stroke="rgba(198,169,107,0.20)" strokeWidth="0.8" />

      {/* ── 3. House Ring (r 122–165) ─────────────────────────────────────── */}
      {HORA_NU_SIGNS.map((sign, i) => {
        const { start, end, center } = HOUSE_ANGLES[i]!;
        const isActive = i === currentHouseIdx;
        const lordColor = HORA_NU_PLANETS[sign.lord]?.color ?? "#94A3B8";

        return (
          <g key={i}>
            <path
              d={donutSlice(122, 165, start, end)}
              fill={isActive ? `${planetColor}18` : "rgba(10,20,40,0.5)"}
              stroke={isActive ? `${planetColor}50` : "rgba(198,169,107,0.12)"}
              strokeWidth="0.8"
            />
            {/* House name */}
            <TextArc r={152} angle={center} fontSize={8.5} fill={isActive ? planetColor : "#94A3B8"} fontWeight={isActive ? "bold" : "normal"}>
              {sign.nameThai === "พฤษภ" ? "ลัคนา" : (HORA_NU_SIGNS[i] ? getHouseName(sign.house) : "")}
            </TextArc>
            {/* Lord planet symbol */}
            {(() => {
              const tp = textPlacement(132, center);
              return (
                <text
                  x={tp.x} y={tp.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${tp.rot}, ${tp.x}, ${tp.y})`}
                  fontSize={10}
                  fill={isActive ? planetColor : lordColor}
                  opacity={0.85}
                >
                  {HORA_NU_PLANETS[sign.lord]?.symbol ?? "?"}
                </text>
              );
            })()}
          </g>
        );
      })}

      <circle cx={CX} cy={CY} r={122} fill="none" stroke="rgba(198,169,107,0.18)" strokeWidth="0.8" />

      {/* ── 4. Planet Dignity Ring (r 75–122) ─────────────────────────────── */}
      {HORA_NU_SIGNS.map((sign, i) => {
        const { start, end, center } = HOUSE_ANGLES[i]!;
        const isActive     = i === currentHouseIdx;
        const isSecondary  = data.houseChart[i]?.isSecondaryKaset ?? false;
        const entry        = data.houseChart[i];
        if (!entry) return null;

        const statusSym   = entry.lordStatusSymbol;
        const statusColor = entry.lordStatusColor;
        const lordColor   = HORA_NU_PLANETS[sign.lord]?.color ?? "#94A3B8";

        return (
          <g key={i}>
            <path
              d={donutSlice(75, 122, start, end)}
              fill={isActive ? `${planetColor}20` : isSecondary ? `${lordColor}12` : "rgba(5,10,25,0.7)"}
              stroke={isActive ? `${planetColor}60` : isSecondary ? `${lordColor}40` : "rgba(198,169,107,0.10)"}
              strokeWidth={isActive ? 1.2 : 0.6}
            />
            {/* Status symbol */}
            {statusSym && statusSym !== "·" && (() => {
              const tp = textPlacement(98, center);
              return (
                <text
                  x={tp.x} y={tp.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${tp.rot}, ${tp.x}, ${tp.y})`}
                  fontSize={12}
                  fill={isActive ? statusColor : `${statusColor}88`}
                >
                  {statusSym}
                </text>
              );
            })()}
            {/* Mini house number */}
            {(() => {
              const tp = textPlacement(83, center);
              return (
                <text
                  x={tp.x} y={tp.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${tp.rot}, ${tp.x}, ${tp.y})`}
                  fontSize={7}
                  fill={isActive ? `${planetColor}cc` : "rgba(100,116,139,0.7)"}
                  fontFamily="monospace"
                >
                  {sign.house}
                </text>
              );
            })()}
          </g>
        );
      })}

      <circle cx={CX} cy={CY} r={75} fill="none" stroke="rgba(198,169,107,0.20)" strokeWidth="0.8" />

      {/* ── 5. Radial Dividing Lines ──────────────────────────────────────── */}
      {HORA_NU_SIGNS.map((_, i) => {
        const lineAngle = i * 30 - 15;
        const [x1, y1] = polar(165, lineAngle);
        const [x2, y2] = polar(205, lineAngle);
        const [x3, y3] = polar(75,  lineAngle);
        const [x4, y4] = polar(165, lineAngle);
        return (
          <g key={i}>
            <line x1={n(x1)} y1={n(y1)} x2={n(x2)} y2={n(y2)}
              stroke="rgba(198,169,107,0.20)" strokeWidth="0.6" />
            <line x1={n(x3)} y1={n(y3)} x2={n(x4)} y2={n(y4)}
              stroke="rgba(198,169,107,0.12)" strokeWidth="0.5" />
          </g>
        );
      })}

      {/* ── 6. Center Circle (r 75) ───────────────────────────────────────── */}
      <circle cx={CX} cy={CY} r={75} fill="url(#centerGrad)" />
      <circle cx={CX} cy={CY} r={75} fill="none"
        stroke={planetColor} strokeWidth="1.5" opacity="0.5"
        filter="url(#centerGlow)" />

      {/* Large planet symbol */}
      <text
        x={CX} y={CY - 22}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={30}
        fill={planetColor}
        filter="url(#centerGlow)"
        style={{ fontFamily: "serif" }}
      >
        {data.currentPlanetSymbol}
      </text>

      {/* Planet name */}
      <text
        x={CX} y={CY + 5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fill="#F8F6F1"
        fontWeight="bold"
      >
        {`ดาว${data.currentPlanetName}`}
      </text>

      {/* Status */}
      <text
        x={CX} y={CY + 21}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={9}
        fill={data.currentStatusColor}
      >
        {data.currentStatusSymbol} {data.currentStatusLabel}
      </text>

      {/* Yam number */}
      <text
        x={CX} y={CY + 37}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={9}
        fill="rgba(198,169,107,0.7)"
        fontFamily="monospace"
      >
        {`ยามที่ ${data.yamNumber} · ย่อย ${data.subYamNumber}`}
      </text>

      {/* ── 7. Current Yam Pointer (arrow on outer ring) ─────────────────── */}
      <CurrentYamPointer angle={currentAngle} r={210} color={planetColor} />

      {/* ── 8. Direction Markers (outside zodiac ring) ────────────────────── */}
      {COMPASS_8.map((dir) => {
        const isActiveDir = Math.abs(((dir.svgAngle - data.currentDirectionAngle) + 360) % 360) < 1;
        const [x, y] = polar(222, dir.svgAngle);
        return (
          <text
            key={dir.abbr}
            x={n(x)} y={n(y)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={isActiveDir ? 9 : 7.5}
            fontWeight={isActiveDir ? "bold" : "normal"}
            fill={isActiveDir ? planetColor : "rgba(148,163,184,0.55)"}
            filter={isActiveDir ? "url(#centerGlow)" : undefined}
          >
            {dir.abbr}
          </text>
        );
      })}

      {/* Active direction arrow */}
      <DirectionArrow angle={data.currentDirectionAngle} color={planetColor} />

      {/* ── 9. Phase indicator (small arc at very top) ────────────────────── */}
      <text
        x={CX} y={17}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={8}
        fill="rgba(198,169,107,0.50)"
      >
        {data.phase === "day" ? "☀ กลางวัน" : "☾ กลางคืน"}
      </text>

      {/* ── 10. Outer decorative ring ─────────────────────────────────────── */}
      <circle cx={CX} cy={CY} r={228} fill="none"
        stroke="rgba(198,169,107,0.10)" strokeWidth="3" />
    </svg>
  );
}

// ─── Helper: get short house name from sign index ────────────────────────────
const HOUSE_SHORT: Record<number, string> = {
  1: "ลัคนา", 2: "กฎุมภะ", 3: "ภาตุ", 4: "พันธุ", 5: "ปุตตะ", 6: "อริ",
  7: "ปัตนิ", 8: "มรณะ",   9: "ธรรม", 10:"กรรม",  11:"ลาภ",   12:"ศุภะ",
};
function getHouseName(houseNum: number): string {
  return HOUSE_SHORT[houseNum] ?? String(houseNum);
}

// ─── Sub-component: arc text (upright inside ring) ───────────────────────────
function TextArc({
  r, angle, fontSize, fill, fontWeight = "normal", fontFamily, children,
}: {
  r: number; angle: number; fontSize: number; fill: string;
  fontWeight?: string; fontFamily?: string; children: React.ReactNode;
}) {
  const tp = textPlacement(r, angle);
  return (
    <text
      x={tp.x} y={tp.y}
      textAnchor="middle"
      dominantBaseline="middle"
      transform={`rotate(${tp.rot}, ${tp.x}, ${tp.y})`}
      fontSize={fontSize}
      fill={fill}
      fontWeight={fontWeight}
      fontFamily={fontFamily}
    >
      {children}
    </text>
  );
}

// ─── Sub-component: pointer triangle at current yam sector ───────────────────
function CurrentYamPointer({ angle, r, color }: { angle: number; r: number; color: string }) {
  const [px, py] = polar(r, angle);
  const [l1x, l1y] = polar(r - 6, angle - 5);
  const [l2x, l2y] = polar(r - 6, angle + 5);
  return (
    <polygon
      points={`${n(px)},${n(py)} ${n(l1x)},${n(l1y)} ${n(l2x)},${n(l2y)}`}
      fill={color}
      opacity={0.85}
    />
  );
}

// ─── Sub-component: direction indicator (dashed line from outer ring) ─────────
function DirectionArrow({ angle, color }: { angle: number; color: string }) {
  const [x1, y1] = polar(205, angle);
  const [x2, y2] = polar(215, angle);
  return (
    <line
      x1={n(x1)} y1={n(y1)} x2={n(x2)} y2={n(y2)}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      opacity={0.7}
    />
  );
}

// ─── Decorative constellation dots ───────────────────────────────────────────
// [x, y, radius] - scattered around the background
const CONSTELLATION_DOTS: [number, number, number][] = [
  [38, 90, 1.2], [52, 78, 0.8], [45, 105, 1], [30, 118, 0.7], [60, 62, 1.4],
  [410, 80, 1.2],[395, 65, 0.8],[420, 100, 1],[430, 72, 0.7],[400, 115, 1.4],
  [40, 370, 1],[50, 388, 1.3],[30, 395, 0.8],[60, 405, 0.9],[35, 420, 1.1],
  [415, 360, 1.2],[405, 378, 0.8],[425, 395, 1],[420, 418, 0.7],[440, 388, 1],
  [115, 24, 0.9],[148, 18, 1.1],[180, 22, 0.8],[210, 14, 1.2],
  [280, 14, 0.9],[320, 20, 1],[360, 16, 1.2],[395, 28, 0.8],
  [115, 438, 1],[148, 445, 0.8],[180, 442, 1.1],[210, 448, 0.9],
  [280, 448, 1],[320, 444, 0.8],[360, 442, 1.2],[395, 436, 1],
];
