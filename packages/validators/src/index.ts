import { z } from "zod";

export const HoroscopeInputSchema = z.object({
  birthDate: z.string().min(1, "กรุณากรอกวันเกิด"),
  birthTime: z.string().optional(),
  birthPlace: z.string().optional(),
});

export const AIReportRequestSchema = z.object({
  reportType: z.enum([
    "life_overview",
    "career",
    "relationship",
    "health",
    "wealth",
    "daily_insight",
    "annual_forecast",
  ]),
});

export const RegisterSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  displayName: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type HoroscopeInputData = z.infer<typeof HoroscopeInputSchema>;
export type RegisterData = z.infer<typeof RegisterSchema>;
export type LoginData = z.infer<typeof LoginSchema>;
