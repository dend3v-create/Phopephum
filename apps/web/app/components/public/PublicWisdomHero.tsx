import { Link, useLocation } from "@remix-run/react";
import { ArrowDown, ArrowRight, CalendarDays, Compass, HeartHandshake, Sparkles, Sun, UserRound } from "lucide-react";

interface Props { isLoggedIn: boolean }

/** Public product introduction. Decorative artwork contains no chart or forecast data. */
export function PublicWisdomHero({ isLoggedIn }: Props) {
  const location = useLocation();
  const accountTarget = isLoggedIn ? "/dashboard" : "/register";
  const dock = [
    { to: "/#main-content", label: "วันนี้", Icon: Sun },
    { to: "/#auspicious-demo", label: "ฤกษ์", Icon: Compass },
    { to: "/dashboard/calendar", label: "ปฏิทิน", Icon: CalendarDays },
    { to: "/dashboard/horoscope", label: "ดวง", Icon: Sparkles },
    { to: isLoggedIn ? "/dashboard/settings" : "/login", label: "ฉัน", Icon: UserRound },
  ];

  return (
    <>
      <section className="pp-home-hero" aria-labelledby="public-wisdom-title">
        <div className="pp-home-intro">
          <p className="pp-home-kicker">ANCIENT WISDOM × AI INTELLIGENCE</p>
          <h1 id="public-wisdom-title">ทุกคำถามของชีวิต<br /><span>มีแนวทางเสมอ</span></h1>
          <p className="pp-home-lead">วันนี้ควรทำอะไร และช่วงเวลาไหนเหมาะกับคุณ?</p>
          <p className="pp-home-description">เข้าใจตัวเอง รู้จังหวะเวลา และเปลี่ยนคำแนะนำเป็นสิ่งที่ลงมือทำได้ ผ่านภูมิปัญญาโบราณและผู้ช่วย AI ของภพภูมิ</p>
          <div className="pp-home-actions">
            <Link to={accountTarget} className="pp-home-primary">{isLoggedIn ? "เปิดวันนี้ของฉัน" : "เริ่มต้นใช้งานฟรี"}<ArrowRight size={20} aria-hidden="true" /></Link>
            <Link to="/#auspicious-demo" className="pp-home-secondary">ทดลองหาฤกษ์<ArrowDown size={18} aria-hidden="true" /></Link>
          </div>
          <p className="pp-home-note">เริ่มต้นฟรี · ไม่ต้องใช้บัตรเครดิต · คุณเลือกแนวทางของตัวเอง</p>
        </div>

        <div className="pp-home-experience">
          <article className="pp-home-message">
            <div className="pp-home-message-head"><span>ภพภูมิ · ปัญญาและกาลเวลาชีวิต</span><Sun size={18} aria-hidden="true" /></div>
            <div className="pp-home-solar" aria-hidden="true"><span className="pp-home-solar-core"><Sun size={54} strokeWidth={1} /></span><i /><i /><i /></div>
            <p className="pp-home-message-label">WISDOM FOR A BETTER YOU</p>
            <h2>รู้จังหวะชีวิต<br /><span>ก้าวต่อด้วยความเข้าใจ</span></h2>
            <p>ไม่ต้องมีคำตอบทั้งหมดในวันนี้<br />เริ่มจากสิ่งสำคัญที่คุณอยากทำ</p>
          </article>

          <div className="pp-home-paths" aria-label="เลือกสิ่งที่คุณอยากเริ่มต้น">
            <Link to="/#auspicious-demo" className="pp-home-path"><span className="pp-home-icon"><Compass size={24} strokeWidth={1.5} aria-hidden="true" /></span><h3>รู้จังหวะเวลา</h3><p>หาฤกษ์สำหรับสิ่งสำคัญ</p><ArrowRight size={17} aria-hidden="true" /></Link>
            <Link to="/dashboard/horoscope" className="pp-home-path"><span className="pp-home-icon"><Sparkles size={24} strokeWidth={1.5} aria-hidden="true" /></span><h3>เข้าใจตัวเอง</h3><p>สำรวจผังดวงของคุณ</p><ArrowRight size={17} aria-hidden="true" /></Link>
            <Link to="/dashboard/planner" className="pp-home-path"><span className="pp-home-icon"><HeartHandshake size={24} strokeWidth={1.5} aria-hidden="true" /></span><h3>วางแผนชีวิต</h3><p>ตั้งเป้าหมายและลงมือทำ</p><ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          {!isLoggedIn && <p className="pp-home-account-note">ผังดวงและแผนชีวิตใช้งานหลังเข้าสู่ระบบ</p>}
        </div>
      </section>

      <nav className="pp-home-dock" aria-label="เมนูภพภูมิบนมือถือ">
        {dock.map(({ to, label, Icon }, index) => {
          const active = index === 0 ? !location.hash || location.hash === "#main-content" : index === 1 && location.hash === "#auspicious-demo";
          return <Link key={label} to={to} className={active ? "is-current" : undefined} aria-current={active ? "location" : undefined}><Icon size={22} strokeWidth={1.5} aria-hidden="true" /><span>{label}</span></Link>;
        })}
      </nav>
    </>
  );
}
