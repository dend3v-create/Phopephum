import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hora AI — ศาสตร์แห่งยามอัฐกาลและดวงชะตาพรีเมียม",
  description: "ระบบคำนวณยามอัฐกาล (โหรทายหนู) ชะตาจร และศาสตร์เลข 7 ตัว 9 ฐานโบราณ ผสานการประมวลผลดวงพยากรณ์ชีวิตเฉพาะตัวด้วยระบบ AI อัจฉริยะและหรูหราพรีเมียมที่สุดสำหรับคุณ",
  keywords: ["ยามอัฐกาล", "โหรทายหนู", "เลข 7 ตัว 9 ฐาน", "ดูดวง", "ดูดวง AI", "Hora AI", "โหราศาสตร์ไทย", "ฤกษ์มงคล"],
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
