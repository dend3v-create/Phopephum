import type { SevenNumbers } from "@phopephum/types";
import { calculateBase } from "./calculateBase.js";

export function calculateSevenNumbers(birthDate: string): SevenNumbers {
  const [year, month, day] = birthDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];

  const d = calculateBase(day);
  const m = calculateBase(month);
  const y = calculateBase(
    String(year)
      .split("")
      .reduce((a, b) => a + Number(b), 0)
  );

  const soul = calculateBase(d + m);
  const destiny = calculateBase(d + m + y);
  const power = calculateBase(destiny);
  const karmic = calculateBase(m + y);
  const mission = calculateBase(d + y);
  const crown = calculateBase(soul + destiny);

  return {
    base: [d, m, y, soul, destiny, power, karmic],
    soul,
    destiny,
    power,
    karmic,
    mission,
    crown,
  };
}
