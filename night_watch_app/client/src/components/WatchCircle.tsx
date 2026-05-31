/**
 * WatchCircle Component
 * 
 * Displays watches in a circular layout with mystical astrology theme
 * Each watch is represented as an orb with glow effect
 */

import React, { useState } from "react";
import { DailyWatch, getWatchDetails, getTimeSlot, getWatchMeaning } from "@/lib/watchData";
import { Card } from "@/components/ui/card";

interface WatchCircleProps {
  watches: DailyWatch[];
  currentWatch?: DailyWatch | null;
  onSelectWatch?: (watch: DailyWatch) => void;
}

export default function WatchCircle({
  watches,
  currentWatch,
  onSelectWatch,
}: WatchCircleProps) {
  const [selectedWatch, setSelectedWatch] = useState<DailyWatch | null>(null);

  const handleSelectWatch = (watch: DailyWatch) => {
    setSelectedWatch(watch);
    onSelectWatch?.(watch);
  };

  // Calculate positions for 8 watches in a circle
  const radius = 200;
  const centerX = 280;
  const centerY = 280;

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* SVG for constellation lines */}
      <svg
        className="absolute inset-0 w-full h-full rounded-lg"
        viewBox="0 0 560 560"
        style={{ pointerEvents: "none" }}
      >
        {/* Draw lines between watches */}
        {watches.map((watch, index) => {
          const nextIndex = (index + 1) % watches.length;
          const angle1 = (index * 360) / watches.length - 90;
          const angle2 = (nextIndex * 360) / watches.length - 90;

          const x1 = centerX + radius * Math.cos((angle1 * Math.PI) / 180);
          const y1 = centerY + radius * Math.sin((angle1 * Math.PI) / 180);
          const x2 = centerX + radius * Math.cos((angle2 * Math.PI) / 180);
          const y2 = centerY + radius * Math.sin((angle2 * Math.PI) / 180);

          return (
            <line
              key={`line-${index}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(212, 175, 55, 0.2)"
              strokeWidth="1"
              className="animate-scale-in"
            />
          );
        })}

        {/* Center circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r="40"
          fill="rgba(212, 175, 55, 0.1)"
          stroke="rgba(212, 175, 55, 0.3)"
          strokeWidth="2"
        />
      </svg>

      {/* Watches positioned in circle */}
      <div className="relative w-full h-[560px] bg-background/30 rounded-lg border border-accent/20 overflow-hidden">
        {watches.map((watch, index) => {
          const angle = (index * 360) / watches.length - 90;
          const x = centerX + radius * Math.cos((angle * Math.PI) / 180);
          const y = centerY + radius * Math.sin((angle * Math.PI) / 180);

          const isCurrentWatch = currentWatch?.watchId === watch.watchId;
          const isSelected = selectedWatch?.watchId === watch.watchId;
          const meaning = getWatchMeaning(watch.nameId);
          const timeSlot = getTimeSlot(watch.watchId);

          // Quality colors
          let glowColor = "rgba(212, 175, 55, 0.5)"; // Default gold
          let bgColor = "bg-purple-900/50";

          if (watch.ticks === 2) {
            glowColor = "rgba(16, 185, 129, 0.6)"; // Green for excellent
            bgColor = "bg-green-900/40";
          } else if (watch.ticks === 1) {
            glowColor = "rgba(212, 175, 55, 0.6)"; // Gold for good
            bgColor = "bg-yellow-900/40";
          } else {
            glowColor = "rgba(239, 68, 68, 0.5)"; // Red for neutral
            bgColor = "bg-red-900/30";
          }

          return (
            <button
              key={`watch-${watch.watchId}`}
              onClick={() => handleSelectWatch(watch)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hover-scale ${
                isCurrentWatch ? "scale-125" : "scale-100"
              } ${isSelected ? "ring-2 ring-accent" : ""} animate-scale-in`}
              style={{
                left: `${(x / 560) * 100}%`,
                top: `${(y / 560) * 100}%`,
              }}
            >
              {/* Glow effect */}
              <div
                className={`absolute inset-0 rounded-full blur-xl opacity-60 ${
                  isCurrentWatch ? "animate-glow-pulse" : ""
                }`}
                style={{
                  boxShadow: `0 0 30px ${glowColor}`,
                  width: "80px",
                  height: "80px",
                  transform: "translate(-50%, -50%)",
                  left: "50%",
                  top: "50%",
                }}
              />

              {/* Watch orb */}
              <div
                className={`relative w-20 h-20 rounded-full flex items-center justify-center cursor-pointer border-2 border-accent/50 transition-all duration-300 hover:border-accent hover:scale-110 ${bgColor}`}
                style={{
                  boxShadow: `0 0 20px ${glowColor}, inset 0 0 20px ${glowColor}`,
                }}
              >
                {/* Watch number */}
                <div className="text-center">
                  <div className="text-xs text-accent/70">ยาม</div>
                  <div className="text-lg font-bold text-accent">{watch.watchId}</div>
                </div>

                {/* Quality indicator */}
                {watch.ticks > 0 && (
                  <div className="absolute bottom-1 right-1 flex gap-0.5">
                    {Array.from({ length: watch.ticks }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-accent"
                      />
                    ))}
                  </div>
                )}

                {/* Current indicator */}
                {isCurrentWatch && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-accent animate-pulse" />
                )}
              </div>

              {/* Tooltip on hover */}
              {(isSelected || isCurrentWatch) && (
                <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-52 bg-card border border-accent/30 rounded-lg p-3 text-sm z-50 animate-float-up shadow-lg">
                  <div className="text-accent font-semibold mb-2 text-base">{meaning?.name}</div>
                  <div className="text-foreground/80 text-xs mb-2">
                    {timeSlot?.start} - {timeSlot?.end}
                  </div>
                  <div className="text-foreground/70 text-xs">
                    {watch.ticks === 2 && "ดีมาก ✓✓"}
                    {watch.ticks === 1 && "ดี ✓"}
                    {watch.ticks === 0 && "ติดขัด"}
                  </div>
                </div>
              )}
            </button>
          );
        })}

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-accent mb-2">ยามอัฐกาล</h2>
            <p className="text-sm text-foreground/60">กลางคืน</p>
          </div>
        </div>
      </div>
    </div>
  );
}
