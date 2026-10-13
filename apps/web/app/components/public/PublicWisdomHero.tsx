import { Link, useLocation } from "@remix-run/react";
import { CelestialSeal } from "~/components/theme/WisdomAtmosphere";
import { ArrowDown, ArrowRight, CalendarDays, Compass, HeartHandshake, Sparkles, Sun, UserRound, LogIn, Layers } from "lucide-react";

interface Props { isLoggedIn: boolean }

/** Public product introduction. Decorative artwork contains no chart or forecast data. */
export function PublicWisdomHero({ isLoggedIn }: Props) {
  const location = useLocation();
  const scrollToTimingDemo = () => {
    document.getElementById("auspicious-demo")?.scrollIntoView({ block: "start", behavior: "instant" });
  };
  const accountTarget = isLoggedIn ? "/dashboard" : "/register";
  const dock = isLoggedIn ? [
    { to: "/dashboard", label: "วันนี้", Icon: Sun },
    { to: "/dashboard/check-yam", label: "ฤกษ์", Icon: Compass },
    { to: "/dashboard/calendar", label: "ปฏิทิน", Icon: CalendarDays },
    { to: "/dashboard/horoscope", label: "ดวง", Icon: Sparkles },
    { to: "/dashboard/settings", label: "ฉัน", Icon: UserRound },
  ] : [
    { to: "/#main-content", label: "หน้าแรก", Icon: Sun },
    { to: "/#auspicious-demo", label: "ทดลอง", Icon: Compass },
    { to: "/features", label: "ฟีเจอร์", Icon: Layers },
    { to: "/login", label: "เข้าสู่ระบบ", Icon: LogIn },
  ];
  const scrollToHome = () => {
    document.getElementById("main-content")?.scrollIntoView({ block: "start", behavior: "instant" });
  };

  return (
    <>
      <section className={`pp-home-hero ${!isLoggedIn ? "pp-home-hero--guest" : ""}`} aria-labelledby="public-wisdom-title">
        <div className="pp-home-intro">
          <p className="pp-home-kicker">ANCIENT WISDOM × AI INTELLIGENCE</p>
          <h1 id="public-wisdom-title">ทุกคำถามของชีวิต<br /><span>มีแนวทางเสมอ</span></h1>
          <p className="pp-home-lead">วันนี้ควรทำอะไร และช่วงเวลาไหนเหมาะกับคุณ?</p>
          <p className="pp-home-description">ทดลองค้นหาช่วงเวลาที่เหมาะกับสิ่งสำคัญได้ทันที แล้วเริ่มรู้จักตัวเองผ่านผังดวงและคำแนะนำเฉพาะบุคคล</p>
          <div className="pp-home-actions">
            <Link to={accountTarget} className="pp-home-primary">{isLoggedIn ? "เปิดวันนี้ของฉัน" : "สมัครฟรี"}<ArrowRight size={20} aria-hidden="true" /></Link>
            <Link to="/#auspicious-demo" onClick={scrollToTimingDemo} className="pp-home-secondary">ทดลองหาฤกษ์<ArrowDown size={18} aria-hidden="true" /></Link>
          </div>
          <p className="pp-home-note">ทดลองหาฤกษ์ได้โดยไม่ต้องสมัคร · ผังดวงส่วนตัวสำหรับสมาชิก</p>
        </div>

        <div className="pp-home-experience">
          <article className="pp-home-message">
            <div className="pp-home-message-head"><span>ภพภูมิ · ปัญญาและกาลเวลาชีวิต</span><Sun size={18} aria-hidden="true" /></div>
            <div className="pp-home-solar" aria-hidden="true"><CelestialSeal /></div>
            <p className="pp-home-message-label">WISDOM FOR A BETTER YOU</p>
            <h2>รู้จังหวะชีวิต<br /><span>ก้าวต่อด้วยความเข้าใจ</span></h2>
            <p>ไม่ต้องมีคำตอบทั้งหมดในวันนี้<br />เริ่มจากสิ่งสำคัญที่คุณอยากทำ</p>
          </article>

          <div className="pp-home-paths" aria-label="เลือกสิ่งที่คุณอยากเริ่มต้น">
            <Link to="/#auspicious-demo" onClick={scrollToTimingDemo} className="pp-home-path"><span className="pp-home-icon"><Compass size={24} strokeWidth={1.5} aria-hidden="true" /></span><h3>รู้จังหวะเวลา</h3><p>หาฤกษ์สำหรับสิ่งสำคัญ</p><ArrowRight size={17} aria-hidden="true" /></Link>
            <Link to={isLoggedIn ? "/dashboard/horoscope" : "/features"} className="pp-home-path"><span className="pp-home-icon"><Sparkles size={24} strokeWidth={1.5} aria-hidden="true" /></span><h3>เข้าใจตัวเอง</h3><p>{isLoggedIn ? "สำรวจผังดวงของคุณ" : "รู้จักเครื่องมือผังดวงส่วนตัว"}</p><ArrowRight size={17} aria-hidden="true" /></Link>
            <Link to={isLoggedIn ? "/dashboard/planner" : "/how-it-works"} className="pp-home-path"><span className="pp-home-icon"><HeartHandshake size={24} strokeWidth={1.5} aria-hidden="true" /></span><h3>วางแผนชีวิต</h3><p>{isLoggedIn ? "ตั้งเป้าหมายและลงมือทำ" : "ดูวิธีเริ่มต้นวางแผนชีวิต"}</p><ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          {!isLoggedIn && <p className="pp-home-account-note">สมัครฟรีเพื่อสร้างผังดวงและแผนชีวิตของคุณ หรือทดลองหาฤกษ์ด้านล่างได้เลย</p>}
        </div>
      </section>

      <nav className="pp-home-dock" aria-label={isLoggedIn ? "เมนูสมาชิกบนมือถือ" : "เมนูผู้เยี่ยมชมบนมือถือ"}>
        {dock.map(({ to, label, Icon }) => {
          const active = !isLoggedIn && (to === "/#main-content" ? !location.hash || location.hash === "#main-content" : to === "/#auspicious-demo" && location.hash === "#auspicious-demo");
          return <Link key={label} to={to} onClick={to === "/#auspicious-demo" ? scrollToTimingDemo : to === "/#main-content" ? scrollToHome : undefined} className={active ? "is-current" : undefined} aria-current={active ? "location" : undefined}><Icon size={22} strokeWidth={1.5} aria-hidden="true" /><span>{label}</span></Link>;
        })}
      </nav>
    </>
  );
}
