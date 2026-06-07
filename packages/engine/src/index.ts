// Main engine barrel export
// Pure calculation logic — no framework dependencies, no API calls, no secrets

export * from "./calculators/index.js";
export * from "./yam/index.js";
export * from "./core/index.js";
export { horoscopeEngine } from "./engine/horoscopeEngine.js";
export { calculatePhopephum } from "./engine/phopephum-v2.js";
export { calculateNineBases, r7_local } from "./engine/seven-numbers-v2.js";
export { calculateLagnaNakshatra } from "./calculators/calculateNakshatra.js";

// Re-export specific calculators for the new architecture
export { calculateSevenBase } from "./calculators/sevenBase.js";
export { calculateNineBase } from "./calculators/nineBase.js";
export { calculateTaksa } from "./calculators/taksa.js";
export { calculateAgeCycle } from "./calculators/ageCycle.js";
export { buildEmperorChart } from "./calculators/emperorChart.js";

export { 
  calculateAtthakarn as calculateAtthakarnLivingWisdom, 
  calculateRahu as calculateRahuLivingWisdom 
} from "./engine/time-engines.js";
export { STAR_NAMES } from "@phopephum/types";
export * from "./wisdomEngine.js";
export * from "./taksa-mahabhuti/index.js";
export * from "./types/horoscope.js";
export * from "./hora-thai-nu/index.js";
