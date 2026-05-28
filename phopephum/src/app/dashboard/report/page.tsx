"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** รายงาน PDF ถูกยกเลิก — redirect ไปยัง /dashboard/services */
export default function ReportRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/services"); }, [router]);
  return null;
}
