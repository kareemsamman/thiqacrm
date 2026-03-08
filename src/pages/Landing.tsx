import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, CheckCircle, Star, ArrowLeft, Play,
  Users, FileText, CreditCard, BarChart3, Bell, MessageSquare,
  Phone, Shield
} from "lucide-react";
import thiqaLogo from "@/assets/thiqa-logo.svg";
import dashboardMockup from "@/assets/landing/dashboard-mockup.png";
import featuresMockup from "@/assets/landing/features-mockup.png";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080b16] text-white overflow-x-hidden font-[Simona_Pro,sans-serif]" dir="rtl">

      {/* ═══ Navbar ═══ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#080b16]/70 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <img src={thiqaLogo} alt="Thiqa" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight opacity-90">Thiqa</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] text-white/50 font-medium">
            <a href="#features" className="hover:text-white/90 transition-colors">מה אנחנו מציעים</a>
            <a href="#demo" className="hover:text-white/90 transition-colors">דמו</a>
            <a href="#testimonials" className="hover:text-white/90 transition-colors">לקוחות</a>
            <a href="#faq" className="hover:text-white/90 transition-colors">שאלות</a>
          </div>
          <Button
            onClick={() => navigate("/login")}
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white rounded-full px-5 text-[13px] border border-white/[0.08] backdrop-blur-sm"
          >
            כניסה למערכת
          </Button>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-36 pb-10 md:pt-48 md:pb-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#2d4bc7]/[0.12] rounded-full blur-[140px]" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center px-6">
          <h1 className="text-[2.5rem] md:text-[3.8rem] lg:text-[4.5rem] font-extrabold leading-[1.1] tracking-tight">
            ה-CRM הרווחי ביותר
            <br />
            <span className="bg-gradient-to-l from-[#7ba4f7] via-[#5b7cf7] to-[#8b6cf7] bg-clip-text text-transparent">
              לסוכניות ביטוח
            </span>
            {" "}שרוצות להרוויח יותר
          </h1>
          <p className="mt-6 text-[15px] md:text-lg text-white/40 max-w-xl mx-auto leading-relaxed">
            כל הכלים לניהול הסוכנות תחת קורת גג אחת — לקוחות, פוליסות, תשלומים, דוחות, תזכורות ועוד.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <Button
              size="lg"
              onClick={() => navigate("/login")}
              className="bg-white text-[#080b16] hover:bg-white/90 rounded-full px-8 h-[52px] text-[15px] font-bold gap-2 shadow-xl shadow-white/[0.06]"
            >
              התחילו בחינם
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="rounded-full px-7 h-[52px] text-[15px] text-white/60 hover:text-white hover:bg-white/[0.06] gap-2"
              onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Play className="h-4 w-4" />
              צפו בדמו
            </Button>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="relative max-w-6xl mx-auto mt-20 px-6">
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl shadow-black/40">
            <div className="absolute inset-0 bg-gradient-to-t from-[#080b16] via-transparent to-transparent z-10 pointer-events-none" />
            <img src={dashboardMockup} alt="Thiqa CRM" className="w-full" loading="lazy" />
          </div>
        </div>
      </section>

      {/* ═══ Section 2: כל הכלים — Screenshots tilted ═══ */}
      <section id="features" className="py-24 md:py-36 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1029] via-[#0e1235] to-[#080b16] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-[2.8rem] font-bold leading-tight">
            כל הכלים לניהול הסוכנות
            <br />
            <span className="text-white/60">תחת קורת גג אחת</span>
          </h2>

          {/* Perspective mockups */}
          <div className="mt-16 relative flex justify-center">
            <div className="relative w-full max-w-5xl">
              <div className="absolute inset-0 bg-[#3355cc]/[0.08] rounded-[32px] blur-[60px]" />
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6">
                <img src={dashboardMockup} alt="" className="rounded-2xl border border-white/[0.06] shadow-2xl w-full" loading="lazy" />
                <img src={featuresMockup} alt="" className="rounded-2xl border border-white/[0.06] shadow-2xl w-full" loading="lazy" />
              </div>
            </div>
          </div>

          <Button
            size="lg"
            onClick={() => navigate("/login")}
            className="mt-12 bg-white text-[#080b16] hover:bg-white/90 rounded-full px-8 h-[52px] text-[15px] font-bold gap-2"
          >
            צפו בדמו
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ═══ Section 3: Feature breakdown with stats ═══ */}
      <section className="py-24 md:py-36 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#080b16] via-[#0b0f22] to-[#080b16] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-[2.8rem] font-bold text-center mb-20 leading-tight">
            כל הכלים לניהול הסוכנות
            <br />
            <span className="text-white/60">תחת קורת גג אחת</span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left: Dashboard image */}
            <div className="relative">
              <div className="absolute -inset-6 bg-[#2244aa]/[0.06] rounded-3xl blur-[40px]" />
              <img src={dashboardMockup} alt="" className="relative rounded-2xl border border-white/[0.06] shadow-xl w-full" loading="lazy" />
            </div>
            {/* Right: Features + stats */}
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-2">לוח בקרה אישי</h3>
                <p className="text-white/40 text-sm leading-relaxed">תמונת מצב מלאה של העסק שלך במבט אחד — לקוחות, פוליסות, תשלומים, חובות ותזכורות.</p>
              </div>
              {[
                { icon: Users, t: "ניהול לקוחות ורכבים", d: "מאגר מלא עם חיפוש מהיר, פילטרים וייצוא CSV" },
                { icon: FileText, t: "ניהול פוליסות וחבילות", d: "יצירה, חידוש ומעקב של כל סוגי הביטוח" },
                { icon: CreditCard, t: "תשלומים וחובות", d: "מעקב תשלומים, תזכורות אוטומטיות, צ'קים" },
                { icon: BarChart3, t: "דוחות כספיים מפורטים", d: "רווחיות לפי חברה, סוכן, תקופה — בלחיצה" },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-[#7ba4f7]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[15px] mb-0.5">{item.t}</h4>
                    <p className="text-sm text-white/35">{item.d}</p>
                  </div>
                </div>
              ))}

              {/* Stats inline */}
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="text-3xl font-extrabold text-[#7ba4f7]">72</div>
                  <p className="text-xs text-white/40 mt-1">פוליסות מתחדשות השבוע</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="text-3xl font-extrabold text-[#7ba4f7]">65%</div>
                  <p className="text-xs text-white/40 mt-1">חיסכון בזמן ניהול</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Section 4: "אל תחכו לחידוש, חייגו אותו" ═══ */}
      <section className="py-24 md:py-36 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1029] via-[#0e1235] to-[#080b16] pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#2d4bc7]/[0.08] rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-[2.8rem] font-bold mb-4">אל תחכו לחידוש, חייגו אותו</h2>
          <p className="text-white/40 text-base max-w-lg mx-auto mb-14">תזכורות חידוש אוטומטיות ב-SMS, ניהול תורי שיחות, ו-Click2Call ישירות מהמערכת.</p>

          <div className="relative max-w-4xl mx-auto">
            <div className="absolute -inset-8 bg-[#2244aa]/[0.05] rounded-[40px] blur-[50px]" />
            <img src={featuresMockup} alt="Mobile views" className="relative rounded-2xl border border-white/[0.06] shadow-2xl mx-auto w-full" loading="lazy" />
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            {[
              { icon: Phone, t: "Click2Call" },
              { icon: MessageSquare, t: "SMS אוטומטי" },
              { icon: Bell, t: "תזכורות חידוש" },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-sm text-white/70">
                <p.icon className="h-4 w-4 text-[#7ba4f7]" />
                {p.t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Section 5: כל מה שהסוכנות צריכה ═══ */}
      <section id="demo" className="py-24 md:py-32 relative">
        <div className="relative max-w-3xl mx-auto text-center px-6">
          <h2 className="text-3xl md:text-[2.8rem] font-bold mb-6">
            כל מה שהסוכנות צריכה,
            <br />
            <span className="text-white/60">תחת קורת גג אחת</span>
          </h2>
          <div className="flex justify-center my-10">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-[#3b5fc7]/30 to-[#7ba4f7]/20 border border-white/[0.08] flex items-center justify-center shadow-xl shadow-[#2d4bc7]/10">
              <img src={thiqaLogo} alt="Thiqa" className="h-14 w-14" />
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => navigate("/login")}
            className="bg-[#2d4bc7] hover:bg-[#3355dd] text-white rounded-full px-8 h-[52px] text-[15px] font-bold gap-2"
          >
            צפו בדמו
            <Play className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ═══ Testimonials + Stats ═══ */}
      <section id="testimonials" className="py-24 md:py-36 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1029] via-[#0e1235] to-[#080b16] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-[2.8rem] font-bold text-center mb-16">
            בואו תשמעו מה יש להגיד
            <br />
            <span className="text-white/60">לסוכנים שלנו</span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Quote */}
            <div className="space-y-6">
              <div className="text-6xl text-[#7ba4f7]/30 font-serif leading-none">"</div>
              <p className="text-xl md:text-2xl text-white/80 leading-relaxed font-light -mt-6">
                ثقة غيّر طريقة إدارتي للوكالة بالكامل. كل شيء منظم وسريع. التقارير المالية وفرت علي ساعات عمل يومياً.
              </p>
              <div>
                <p className="font-bold text-lg">أحمد خالد</p>
                <p className="text-sm text-white/40">وكيل تأمين — حيفا</p>
              </div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-5">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-4xl md:text-5xl font-extrabold text-[#7ba4f7]">320+</div>
                <p className="text-sm text-white/40 mt-2">סוכנות ביטוח</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-4xl md:text-5xl font-extrabold text-[#7ba4f7]">50K+</div>
                <p className="text-sm text-white/40 mt-2">פוליסות פעילות</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-4xl md:text-5xl font-extrabold text-[#7ba4f7]">50%</div>
                <p className="text-sm text-white/40 mt-2">חיסכון בעלויות</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <div className="text-4xl md:text-5xl font-extrabold text-[#7ba4f7]">99.9%</div>
                <p className="text-sm text-white/40 mt-2">זמן פעילות</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="py-24 md:py-36 relative">
        <div className="relative max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-[2.8rem] font-bold text-center mb-16">
            כל מה שחשוב לדעת על Thiqa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
            {[
              { q: "מה זה Thiqa?", a: "מערכת CRM מתקדמת שתוכננה במיוחד לסוכנויות ביטוח בישראל. ניהול לקוחות, פוליסות, תשלומים ודוחות — הכל במקום אחד." },
              { q: "האם התוכנה תומכת בערבית?", a: "כן, המערכת בנויה בערבית מלאה עם ממשק RTL מקצועי." },
              { q: "כמה עולה המנוי?", a: "אנחנו מציעים שתי תוכניות: Basic לסוכנויות קטנות ו-Pro לסוכנויות גדולות עם כל הפיצ'רים. דברו איתנו לפרטים." },
              { q: "האם המידע שלי מאובטח?", a: "כן, אנחנו משתמשים בטכנולוגיות הצפנה מתקדמות עם גיבויים יומיים אוטומטיים." },
              { q: "יש תמיכה טכנית?", a: "כן, צוות התמיכה שלנו זמין בטלפון ובוואטסאפ בימי עבודה. זמן תגובה ממוצע: פחות מ-30 דקות." },
              { q: "אפשר לייבא נתונים ממערכת קיימת?", a: "בהחלט. יש לנו כלי ייבוא מובנה שתומך בהעברת נתונים ממערכות WordPress ומקורות אחרים." },
            ].map((faq, i) => (
              <details
                key={i}
                className="group p-5 rounded-2xl border border-white/[0.04] bg-white/[0.015] cursor-pointer transition-colors hover:bg-white/[0.03]"
              >
                <summary className="flex items-center justify-between font-semibold text-[15px] list-none">
                  {faq.q}
                  <ChevronLeft className="h-4 w-4 text-white/30 transition-transform group-open:-rotate-90 shrink-0 mr-4" />
                </summary>
                <p className="mt-3 text-sm text-white/40 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-24 md:py-36 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#162050] via-[#0e1640] to-[#080b16] pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#2d4bc7]/[0.15] rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center px-6">
          <h2 className="text-3xl md:text-[2.8rem] font-bold mb-4 leading-tight">
            כי לסוכנות שלכם מגיע יותר
            <br />
            <span className="text-white/50">מניהול רגיל.</span>
          </h2>
          <p className="text-white/40 text-base mb-10">
            התחילו תקופת ניסיון חינם ל-35 יום — בלי כרטיס אשראי.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/login")}
            className="bg-white text-[#080b16] hover:bg-white/90 rounded-full px-10 h-[56px] text-base font-bold gap-2 shadow-xl shadow-white/[0.06]"
          >
            התחילו עכשיו בחינם
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-white/[0.04] py-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-4">
          <img src={thiqaLogo} alt="Thiqa" className="h-20 w-20 opacity-50" />
          <span className="text-3xl font-extrabold tracking-tight text-white/50">Thiqa</span>
          <p className="text-xs text-white/20 mt-2">© {new Date().getFullYear()} Thiqa CRM. כל הזכויות שמורות.</p>
        </div>
      </footer>
    </div>
  );
}
