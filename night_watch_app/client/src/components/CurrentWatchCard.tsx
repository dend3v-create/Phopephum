/**
 * CurrentWatchCard Component
 * 
 * Displays the current watch with detailed information
 * Shows the watch meaning, time, and quality assessment
 */

import React from "react";
import { DailyWatch, getWatchDetails, getDayNameThai } from "@/lib/watchData";
import { Card } from "@/components/ui/card";

interface CurrentWatchCardProps {
  watch: DailyWatch | null;
  date?: Date;
}

export default function CurrentWatchCard({ watch, date = new Date() }: CurrentWatchCardProps) {
  if (!watch) {
    return (
      <Card className="bg-card/50 border-accent/20 p-8 text-center">
        <p className="text-foreground/60">ไม่พบข้อมูลยามในเวลาปัจจุบัน</p>
      </Card>
    );
  }

  const details = getWatchDetails(watch);
  const dayName = getDayNameThai(date);

  return (
    <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border-accent/30 overflow-hidden">
      {/* Glow background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/10 to-accent/0" />
      </div>

      <div className="relative p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-sm text-accent/70 font-semibold tracking-widest">
            ยามปัจจุบัน
          </div>
          <h2 className="text-4xl font-bold text-accent">{details.meaning?.name}</h2>
          <p className="text-sm text-foreground/60">
            {dayName} - ยาม {watch.watchId}
          </p>
        </div>

        {/* Time and Quality */}
        <div className="grid grid-cols-2 gap-4">
          {/* Time */}
          <div className="bg-background/50 rounded-lg p-4 border border-accent/20">
            <div className="text-xs text-foreground/60 mb-2">เวลา</div>
            <div className="text-lg font-semibold text-accent">
              {details.timeSlot?.start} - {details.timeSlot?.end}
            </div>
          </div>

          {/* Quality */}
          <div className="bg-background/50 rounded-lg p-4 border border-accent/20">
            <div className="text-xs text-foreground/60 mb-2">คุณภาพ</div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold text-accent">
                {watch.ticks === 2 && "ดีมาก"}
                {watch.ticks === 1 && "ดี"}
                {watch.ticks === 0 && "ติดขัด"}
              </div>
              <div className="flex gap-1">
                {Array.from({ length: watch.ticks }).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-accent" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Descriptions */}
        <div className="space-y-3 border-t border-accent/20 pt-6">
          <div className="space-y-2">
            <div className="text-xs text-accent/70 font-semibold">ต้นยาม</div>
            <p className="text-sm text-foreground/80">{details.meaning?.descriptions.beginning}</p>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-accent/70 font-semibold">กลางยาม</div>
            <p className="text-sm text-foreground/80">{details.meaning?.descriptions.middle}</p>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-accent/70 font-semibold">ปลายยาม</div>
            <p className="text-sm text-foreground/80">{details.meaning?.descriptions.end}</p>
          </div>
        </div>

        {/* Quality indicator bar */}
        <div className="h-1 bg-background/50 rounded-full overflow-hidden border border-accent/20">
          <div
            className={`h-full transition-all duration-500 ${
              watch.ticks === 2
                ? "bg-gradient-to-r from-green-500 to-green-400 w-full"
                : watch.ticks === 1
                  ? "bg-gradient-to-r from-accent to-yellow-400 w-2/3"
                  : "bg-gradient-to-r from-red-500 to-red-400 w-1/3"
            }`}
          />
        </div>
      </div>
    </Card>
  );
}
