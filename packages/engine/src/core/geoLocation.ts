export interface Province {
  name: string;
  lat: number;
  lng: number;
  region: string;
}

// Migrate full 77-province list from phopephum/src/lib/astrology/core/geoLocation.ts
export const THAI_PROVINCES: Province[] = [
  { name: "กรุงเทพมหานคร", lat: 13.7563, lng: 100.5018, region: "กลาง" },
  { name: "เชียงใหม่", lat: 18.7904, lng: 98.9847, region: "เหนือ" },
  { name: "ขอนแก่น", lat: 16.4419, lng: 102.8359, region: "อีสาน" },
  { name: "ชลบุรี", lat: 13.3611, lng: 100.9847, region: "ตะวันออก" },
  { name: "ภูเก็ต", lat: 7.8804, lng: 98.3923, region: "ใต้" },
  // TODO: copy remaining 72 provinces from original geoLocation.ts
];

export function getProvinceCoords(provinceName: string) {
  const province = geoLocation(provinceName);
  if (!province) {
    // Default to BKK if not found, to avoid crash
    return { latitude: 13.7563, longitude: 100.5018 };
  }
  return {
    latitude: province.lat,
    longitude: province.lng,
  };
}

export function geoLocation(provinceName: string): Province | null {
  return (
    THAI_PROVINCES.find(
      (p) =>
        p.name === provinceName ||
        p.name.toLowerCase().includes(provinceName.toLowerCase())
    ) ?? null
  );
}
