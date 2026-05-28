"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import LiveHoraWidget from "@/components/LiveHoraWidget";

export default function YamPage() {
  return (
    <DashboardLayout pageTitle="ยามปัจจุบัน">
      <div className="space-y-4 pb-8">
        <LiveHoraWidget />
      </div>
    </DashboardLayout>
  );
}
