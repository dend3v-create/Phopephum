import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phopephum — ศาสตร์แห่งยามอัฐกาลและดวงชะตาพรีเมียม",
  description: "ระบบคำนวณยามอัฐกาล (โหรทายหนู) ชะตาจร และศาสตร์เลข 7 ตัว 9 ฐานโบราณ ผสานการประมวลผลดวงพยากรณ์ชีวิตระดับผู้เชี่ยวชาญ มอบพื้นที่ทางจิตวิญญาณแห่งการจัดการระดับพลังงานและจังหวะเวลาอย่างมีประสิทธิภาพ",
  keywords: ["ยามอัฐกาล", "โหรทายหนู", "เลข 7 ตัว 9 ฐาน", "ดูดวง", "Phopephum", "โหราศาสตร์ไทย", "ฤกษ์มงคล", "จัดการระดับพลังงาน"],
  authors: [{ name: "Kru Den" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="scroll-smooth">
      <body className="min-h-screen flex flex-col bg-hora-dark text-hora-text font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
