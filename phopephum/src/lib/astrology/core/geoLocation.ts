/**
 * core/geoLocation.ts
 * ดึง lat/lng จากชื่อจังหวัดไทย — รองรับ geolocation-aware calculations
 *
 * ใช้สำหรับ:
 * - ส่ง lat/lng เข้า SunCalc (sunrise/sunset ที่แม่นยำ)
 * - ยามอัฐกาลแม่นยำตามพื้นที่เกิด
 */

import provincesData from '../datasets/provinces.json'

export interface GeoCoords {
  lat: number
  lng: number
  province: string
  region: string
}

/** Bangkok default — fallback เมื่อไม่ทราบจังหวัด */
export const DEFAULT_COORDS: GeoCoords = {
  lat:      13.7563,
  lng:      100.5018,
  province: 'กรุงเทพมหานคร',
  region:   'กลาง',
}

/**
 * ดึงพิกัดจากชื่อจังหวัด
 * @param provinceName ชื่อจังหวัดภาษาไทย (เช่น "เชียงใหม่")
 * @returns GeoCoords หรือ DEFAULT_COORDS ถ้าไม่พบ
 */
export function getProvinceCoords(provinceName: string): GeoCoords {
  const data = provincesData as Record<string, { lat: number; lng: number; region: string }>
  const province = data[provinceName]

  if (!province) {
    return { ...DEFAULT_COORDS, province: provinceName }
  }

  return {
    lat:      province.lat,
    lng:      province.lng,
    province: provinceName,
    region:   province.region,
  }
}

/**
 * คืนรายชื่อจังหวัดทั้งหมด 77 จังหวัด
 */
export function getAllProvinces(): string[] {
  return Object.keys(provincesData).filter(k => !k.startsWith('_'))
}

/**
 * คืนจังหวัดตาม region
 */
export function getProvincesByRegion(region: 'กลาง' | 'เหนือ' | 'อีสาน' | 'ใต้' | 'ตะวันออก'): string[] {
  const data = provincesData as Record<string, { lat: number; lng: number; region: string }>
  return Object.entries(data)
    .filter(([, v]) => v.region === region)
    .map(([k]) => k)
}
