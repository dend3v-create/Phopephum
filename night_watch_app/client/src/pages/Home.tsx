/**
 * Home Page
 * 
 * Main page displaying the Night Watch Astrology app
 * Shows current watch, circular watch display, and daily watch table
 */

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import StarfieldBackground from "@/components/StarfieldBackground";
import WatchCircle from "@/components/WatchCircle";
import CurrentWatchCard from "@/components/CurrentWatchCard";
import WatchTable from "@/components/WatchTable";
import {
  getCurrentWatch,
  getDayName,
  getDayNameThai,
  getWatchesForDay,
  DailyWatch,
} from "@/lib/watchData";

export default function Home() {
  // Design note: Mystical Astrology theme with dark cosmic background,
  // gold accents, and smooth animations for celestial feel
  const [currentWatch, setCurrentWatch] = useState<DailyWatch | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(getDayName(new Date()));
  const [selectedWatch, setSelectedWatch] = useState<DailyWatch | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Update current watch every minute
  useEffect(() => {
    const updateCurrentWatch = () => {
      const watch = getCurrentWatch();
      setCurrentWatch(watch);
      setCurrentDate(new Date());
    };

    updateCurrentWatch();
    const interval = setInterval(updateCurrentWatch, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const dayWatches = getWatchesForDay(selectedDay);
  const dayNameThai = getDayNameThai(new Date(selectedDay));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-950/20">
      {/* Starfield background */}
      <StarfieldBackground />

      {/* Main content */}
      <div className="relative z-20">
        {/* Header */}
        <header className="border-b border-accent/20 bg-background/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="container py-6">
            <div className="text-center space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold text-accent">ฤกษ์ยามเดินทาง</h1>
              <p className="text-foreground/60">กลางคืน - ระบบค้นหายามที่เหมาะสมสำหรับการเดินทาง</p>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="container py-12 space-y-12">
          {/* Current Watch Section */}
          <section className="space-y-4 animate-float-up">
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-2xl font-bold text-accent">ยามปัจจุบัน</h2>
              <p className="text-sm text-foreground/60">
                {currentDate.toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
            <CurrentWatchCard watch={currentWatch} date={currentDate} />
          </section>

          {/* Tabs for different views */}
          <Tabs defaultValue="circle" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-background/50 border border-accent/20">
              <TabsTrigger value="circle" className="data-[state=active]:bg-accent/20">
                วงกลม
              </TabsTrigger>
              <TabsTrigger value="table" className="data-[state=active]:bg-accent/20">
                ตาราง
              </TabsTrigger>
            </TabsList>

            {/* Circle View */}
            <TabsContent value="circle" className="space-y-6 animate-float-up">
              <div className="bg-card/30 border border-accent/20 rounded-lg p-8">
                <WatchCircle
                  watches={dayWatches}
                  currentWatch={currentWatch}
                  onSelectWatch={setSelectedWatch}
                />
              </div>

              {/* Selected Watch Details */}
              {selectedWatch && (
                <Card className="bg-card/50 border-accent/20 p-6 animate-scale-in">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-accent">รายละเอียดยาม</h3>
                    <CurrentWatchCard watch={selectedWatch} date={currentDate} />
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Table View */}
            <TabsContent value="table" className="space-y-6 animate-float-up">
              {/* Day selector */}
              <div className="space-y-3">
                <p className="text-sm text-foreground/60 text-center">เลือกวัน</p>
                <div className="grid grid-cols-7 gap-2 max-w-2xl mx-auto">
                  {["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map(
                    (day) => {
                      const thaiDayNames = [
                        "อาทิตย์",
                        "จันทร์",
                        "อังคาร",
                        "พุธ",
                        "พฤหัสบดี",
                        "ศุกร์",
                        "เสาร์",
                      ];
                      const dayIndex = [
                        "sunday",
                        "monday",
                        "tuesday",
                        "wednesday",
                        "thursday",
                        "friday",
                        "saturday",
                      ].indexOf(day);

                      return (
                        <Button
                          key={day}
                          onClick={() => setSelectedDay(day)}
                          variant={selectedDay === day ? "default" : "outline"}
                          className={`text-sm ${
                            selectedDay === day
                              ? "bg-accent text-background"
                              : "bg-background/50 border-accent/20 text-foreground hover:bg-accent/20"
                          }`}
                        >
                          {thaiDayNames[dayIndex].substring(0, 2)}
                        </Button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Watch table */}
              <WatchTable
                watches={dayWatches}
                dayName={selectedDay}
                onSelectWatch={setSelectedWatch}
              />

              {/* Selected Watch Details */}
              {selectedWatch && (
                <Card className="bg-card/50 border-accent/20 p-6 animate-scale-in">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-accent">รายละเอียดยาม</h3>
                    <CurrentWatchCard watch={selectedWatch} date={currentDate} />
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Information Section */}
          <section className="space-y-4 border-t border-accent/20 pt-12 animate-float-up">
            <h2 className="text-2xl font-bold text-accent text-center">เกี่ยวกับยามอัฐกาล</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card/50 border-accent/20 p-6">
                <h3 className="text-lg font-semibold text-accent mb-3">ยามอัฐกาล คืออะไร</h3>
                <p className="text-foreground/80 text-sm leading-relaxed">
                  ยามอัฐกาล (กลางคืน) เป็นระบบการคำนวณเวลาที่เหมาะสมสำหรับการเดินทางในเวลากลางคืน
                  โดยอิงตามหลักศาสตร์โบราณของไทย ซึ่งแบ่งเวลากลางคืนออกเป็น 8 ยาม แต่ละยามมีชื่อและลักษณะเฉพาะ
                </p>
              </Card>

              <Card className="bg-card/50 border-accent/20 p-6">
                <h3 className="text-lg font-semibold text-accent mb-3">วิธีใช้งาน</h3>
                <p className="text-foreground/80 text-sm leading-relaxed">
                  เลือกดูยามในวันที่ต้องการ ระบบจะแสดงยามปัจจุบันและรายละเอียดของแต่ละยาม
                  รวมถึงคำทำนายและคุณภาพของยามนั้น ๆ เพื่อช่วยให้คุณเลือกเวลาเดินทางที่เหมาะสม
                </p>
              </Card>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-accent/20 bg-background/50 backdrop-blur-sm mt-12 relative z-20">
          <div className="container py-6 text-center text-sm text-foreground/60">
            <p>ฤกษ์ยามเดินทางกลางคืน © 2026</p>
            <p className="text-xs mt-2">ข้อมูลนี้อิงตามศาสตร์โบราณของไทย</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

