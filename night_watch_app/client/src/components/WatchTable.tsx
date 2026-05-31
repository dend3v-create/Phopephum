/**
 * WatchTable Component
 * 
 * Displays watches in a table format for a specific day
 * Shows all watches with their meanings and quality indicators
 */

import React from "react";
import { DailyWatch, getWatchMeaning, getTimeSlot, getAllTimeSlots } from "@/lib/watchData";
import { Card } from "@/components/ui/card";

interface WatchTableProps {
  watches: DailyWatch[];
  dayName: string;
  onSelectWatch?: (watch: DailyWatch) => void;
}

export default function WatchTable({ watches, dayName, onSelectWatch }: WatchTableProps) {
  const timeSlots = getAllTimeSlots();

  return (
    <Card className="bg-card/50 border-accent/20 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-accent/20 bg-background/50">
              <th className="px-4 py-3 text-left text-accent font-semibold">ยาม</th>
              <th className="px-4 py-3 text-left text-accent font-semibold">เวลา</th>
              <th className="px-4 py-3 text-left text-accent font-semibold">ชื่อยาม</th>
              <th className="px-4 py-3 text-center text-accent font-semibold">คุณภาพ</th>
            </tr>
          </thead>
          <tbody>
            {watches.map((watch, index) => {
              const meaning = getWatchMeaning(watch.nameId);
              const timeSlot = timeSlots[watch.watchId - 1];
              const isEven = index % 2 === 0;

              return (
                <tr
                  key={`watch-${watch.watchId}`}
                  onClick={() => onSelectWatch?.(watch)}
                  className={`border-b border-accent/10 transition-colors duration-200 cursor-pointer hover:bg-accent/10 hover-scale ${
                    isEven ? "bg-background/20" : "bg-background/40"
                  }`}
                >
                  {/* Watch ID */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30">
                        <span className="text-accent font-semibold text-sm">{watch.watchId}</span>
                      </div>
                    </div>
                  </td>

                  {/* Time */}
                  <td className="px-4 py-3">
                    <span className="text-foreground/80">
                      {timeSlot?.start} - {timeSlot?.end}
                    </span>
                  </td>

                  {/* Watch Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-accent">{meaning?.name}</span>
                      <span className="text-foreground/60">({watch.nameId})</span>
                    </div>
                  </td>

                  {/* Quality */}
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      {watch.ticks === 2 && (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-400" />
                          <div className="w-2 h-2 rounded-full bg-green-400" />
                        </>
                      )}
                      {watch.ticks === 1 && (
                        <div className="w-2 h-2 rounded-full bg-accent" />
                      )}
                      {watch.ticks === 0 && (
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 bg-background/50 border-t border-accent/20 flex items-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-foreground/70">ดีมาก</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-foreground/70">ดี</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-foreground/70">ติดขัด</span>
        </div>
      </div>
    </Card>
  );
}
