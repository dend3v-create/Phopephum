import { calcTaksaNatal_V3, calcTaksaTransit_V3 } from "../taksa-mahabhuti/taksa-calculator.js";
import { StarNumber } from "../taksa-mahabhuti/taksa-mahabhuti.types.js";

/**
 * Taksa Calculator (v3.1)
 * Integrated with 9-slot V3 logic.
 */
export function calculateTaksa(
  birthStar: StarNumber,
  birthDate: Date,
  checkDate: Date
) {
  const natal = calcTaksaNatal_V3(birthStar);
  const transit = calcTaksaTransit_V3(birthStar, birthDate, checkDate);
  
  return {
    natal: Object.values(natal.map),
    transit: Object.values(transit.map),
    ageYang: transit.ageYang
  };
}
