import { CelestialMoon } from "~/components/theme/WisdomAtmosphere";
import { Link } from "@remix-run/react";
import { ArrowRight, BriefcaseBusiness, Heart, Leaf, Wallet, Clock3 } from "lucide-react";
import type { CalendarDayIntelligence } from "@phopephum/types";

const DOMAIN_ICONS = {
  career: BriefcaseBusiness,
  finance: Wallet,
  relationship: Heart,
  wellness: Leaf,
};

/** Presentation only: every score, message and time comes from the existing loader. */
export function DailyGuidanceOverview({ day }: { day: CalendarDayIntelligence }) {
  return (
    <section className="pp-daily" aria-label="สรุปแนวทางประจำวัน">
      <article className="pp-wisdom-hero">
        <div className="pp-orbit" aria-hidden="true"><CelestialMoon /></div>
        <p className="pp-eyebrow">{day.hasPersonalContext ? "ภาพรวมเฉพาะคุณ" : "ภาพรวมประจำวัน"}</p>
        <h2>{day.dailyTheme}</h2>
        <p className="pp-summary">{day.dailySummary}</p>
        <div className="pp-energy">
          <div className="pp-energy-label"><span>จังหวะประจำวัน</span><span>{day.overallScore}<small> / 100</small></span></div>
          <div className="pp-energy-track" role="meter" aria-label="คะแนนจังหวะประจำวัน" aria-valuenow={day.overallScore} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${day.overallScore}%` }} />
          </div>
          <p className="pp-caption">คะแนนจากระบบคำนวณ ใช้ประกอบการวางแผน</p>
        </div>
      </article>

      <Link to="/dashboard/check-yam" className="pp-timing-cta">
        <div><span className="pp-cta-title">หาฤกษ์ให้ฉัน</span><span className="pp-cta-description">เลือกกิจกรรมและวัน เพื่อค้นหาช่วงเวลาที่เหมาะสม</span></div>
        <ArrowRight size={24} aria-hidden="true" />
      </Link>

      {day.domainScores.length > 0 && (
        <div className="pp-domain-grid" aria-label="แนวทางในแต่ละด้านของชีวิต">
          {day.domainScores.map((domain) => {
            const Icon = DOMAIN_ICONS[domain.domain];
            return (
              <article className="pp-domain-card" data-domain={domain.domain} key={domain.domain}>
                <div className="pp-domain-head"><span className="pp-icon-ring" aria-hidden="true"><Icon size={22} strokeWidth={1.5} /></span><span className="pp-domain-score">{domain.score}<small> / 100</small></span></div>
                <h3>{domain.label}</h3>
                <p>{domain.verdict}</p>
              </article>
            );
          })}
        </div>
      )}

      <article className="pp-window-card">
        <span className="pp-icon-ring" aria-hidden="true"><Clock3 size={22} strokeWidth={1.5} /></span>
        <div className="pp-window-copy">
          <h3>ช่วงเวลาที่แนะนำวันนี้</h3>
          {day.goldenWindow ? (
            <>
              <p className="pp-window-time">{day.goldenWindow.startTime}–{day.goldenWindow.endTime} น.</p>
              <p>{day.goldenWindow.plainAdvice}</p>
              <Link className="pp-window-link" to={`/dashboard/calendar?date=${encodeURIComponent(day.date)}&time=${encodeURIComponent(day.goldenWindow.startTime)}`}>ดูในปฏิทิน <ArrowRight size={16} aria-hidden="true" /></Link>
            </>
          ) : <p>ยังไม่มีช่วงเวลาเด่นที่ระบบแนะนำ ลองเลือกกิจกรรมในหน้าหาฤกษ์</p>}
        </div>
      </article>
    </section>
  );
}
