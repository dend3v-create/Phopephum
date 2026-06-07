export type BuddhistDateParts = {
  day: number;
  month: number;
  yearBE: number;
};

export function ceYearToBE(yearCE: number): number {
  return yearCE + 543;
}

export function beYearToCE(yearBE: number): number {
  return yearBE - 543;
}

export function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function buddhistPartsToISODate(parts: BuddhistDateParts): string | null {
  const yearCE = beYearToCE(parts.yearBE);
  if (!Number.isInteger(parts.day) || !Number.isInteger(parts.month) || !Number.isInteger(yearCE)) {
    return null;
  }

  const date = new Date(Date.UTC(yearCE, parts.month - 1, parts.day));
  const isValid =
    date.getUTCFullYear() === yearCE &&
    date.getUTCMonth() === parts.month - 1 &&
    date.getUTCDate() === parts.day;

  if (!isValid) return null;
  return `${yearCE}-${padDatePart(parts.month)}-${padDatePart(parts.day)}`;
}

export function isoDateToBuddhistParts(isoDate?: string | null): BuddhistDateParts | null {
  if (!isoDate) return null;
  const [yearText, monthText, dayText] = isoDate.split("-");
  const yearCE = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!yearCE || !month || !day) return null;
  return { day, month, yearBE: ceYearToBE(yearCE) };
}

export function currentBuddhistParts(date = new Date()): BuddhistDateParts {
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    yearBE: ceYearToBE(date.getFullYear()),
  };
}

export function isoDateToBangkokDate(isoDate: string, time = "12:00"): Date {
  const safeTime = time || "12:00";
  return new Date(`${isoDate}T${safeTime}:00+07:00`);
}
