import { useState, useRef } from "react";
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
import sectionDivider from "@/assets/landing/section-divider.png";
import sectionDividerDark from "@/assets/landing/section-divider-dark.png";
import featureProfitEngine from "@/assets/landing/feature-profit-engine.png";
import featurePaperless from "@/assets/landing/feature-paperless.png";
import featureMarketing from "@/assets/landing/feature-marketing.png";
import sliderBg from "@/assets/landing/slider-bg.png";
import gridLogoBg from "@/assets/landing/grid-logo-bg.png";

const featureTabs = [
  {
    id: "invoicing",
    label: "הפקה וחיתום",
    num: "01",
    title: "הפקת פוליסות בלחיצה אחת.",
    desc: "יצירת פוליסות חדשות, חידושים וחבילות ביטוח מותאמות — עם חישוב מחיר אוטומטי לפי כללי התמחור של כל חברת ביטוח.",
    stats: [
      { value: "3", unit: "דקות", label: "זמן ממוצע להפקת פוליסה חדשה מלאה." },
      { value: "100%", unit: "", label: "דיוק בחישוב מחירים ועמלות אוטומטי." },
    ],
  },
  {
    id: "claims",
    label: "ניהול תביעות",
    num: "02",
    title: "תביעות נסגרות מהר יותר,\nבלי ״פינג-פונג״ מיילים.",
    desc: "ניהול תביעות חכם עם עדכונים אוטומטיים ללקוח, איסוף מסמכים דיגיטלי וסנכרון מלא מול חברות הביטוח. הלקוח נשאר מעודכן, ואתם פנויים למכירה הבאה.",
    stats: [
      { value: "12", unit: "דקות", label: "הזמן הממוצע שנחסך לסוכן על פתיחת תביעה ועדכון הסטטוס מול חברות הביטוח, בזכות סנכרון נתונים אוטומטי." },
      { value: "65%", unit: "", label: "קיצור בזמן איסוף המסמכים מהלקוח. המערכת שולחת דרישות אוטומטיות ומתחילה את הקבצים ישירות בתיק התביעה ללא מגע יד אדם." },
    ],
  },
  {
    id: "marketing",
    label: "אוטומציה שיווקית",
    num: "03",
    title: "שיווק אוטומטי שעובד בשבילך.",
    desc: "שליחת SMS וקמפיינים אוטומטיים ללקוחות, תזכורות חידוש, עדכוני מבצעים ושימור לקוחות — הכל ללא מאמץ ידני.",
    stats: [
      { value: "40%", unit: "", label: "עלייה בשיעור חידוש פוליסות בזכות תזכורות אוטומטיות." },
      { value: "5K+", unit: "", label: "הודעות SMS נשלחות מדי חודש דרך המערכת." },
    ],
  },
  {
    id: "bi",
    label: "בקרה ו-BI",
    num: "04",
    title: "שליטה מלאה על הנתונים.",
    desc: "דוחות רווחיות, מעקב עמלות, ניתוח ביצועי סוכנים ומבט-על על כל הסניפים — בזמן אמת ובלחיצה אחת.",
    stats: [
      { value: "50%", unit: "", label: "חיסכון בזמן הפקת דוחות כספיים." },
      { value: "∞", unit: "", label: "דוחות מותאמים אישית ללא הגבלה." },
    ],
  },
  {
    id: "cx",
    label: "חוויית לקוח",
    num: "05",
    title: "חוויית לקוח שמוכרת בעד עצמה.",
    desc: "חתימות דיגיטליות, פורטל לקוח, תקשורת ישירה ב-WhatsApp ומעקב אחרי כל אינטראקציה — הלקוחות שלכם ירגישו את ההבדל.",
    stats: [
      { value: "95%", unit: "", label: "שביעות רצון לקוחות מהממשק הדיגיטלי." },
      { value: "24/7", unit: "", label: "גישה עצמאית ללקוח לפוליסות והמסמכים." },
    ],
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("claims");
  const [slideIdx, setSlideIdx] = useState(0);

  return (
    <div className="min-h-screen text-white overflow-x-hidden bg-[#171719]" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>

      {/* ═══ Navbar ═══ */}
      <nav className="absolute top-0 inset-x-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2.5">
            <img src={thiqaLogo} alt="Thiqa" />
          </div>
          <div className="hidden md:flex items-center gap-10 text-[14px] text-white/70 font-medium">
            <a href="#features" className="hover:text-white transition-colors">במה אנחנו שונים</a>
            <a href="#demo" className="hover:text-white transition-colors">איך זה עובד</a>
            <a href="#faq" className="hover:text-white transition-colors">שאלות ותשובות</a>
            <a href="#pricing" className="hover:text-white transition-colors">מחירון</a>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2 text-[13px] font-bold text-white/90 hover:text-white transition-colors"
            style={{
              borderRadius: '100px',
              border: '2px solid rgba(255, 255, 255, 0.40)',
              background: 'rgba(255, 255, 255, 0.10)',
            }}
          >
            קבלו 35 ימים בחינם
          </button>
        </div>
      </nav>

      {/* ═══ HERO with gradient background ═══ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Full-screen gradient background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-gradient-bg.png" 
            alt="" 
            className="w-full h-full object-cover"
          />
          {/* Darkening overlay for text readability */}
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center px-6 pt-20">
          <h1 className="text-[2.2rem] md:text-[3.2rem] lg:text-[4rem] font-extrabold leading-[1.15] tracking-tight">
            ה-CRM החכם ביותר
            <br />
            לסוכניות ביטוח שרוצות להרוויח יותר
          </h1>
          <p className="mt-6 text-[15px] md:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            פתרון קצה-לקצה לניהול פוליסות, כספים ושיווק. מהיר, מאובטח
            <br className="hidden md:block" />
            ומותאם לעבודה בקנה מידה רחב.
          </p>
          <div className="mt-10">
            <button
              onClick={() => navigate("/login")}
              className="text-[16px] font-bold text-white/90 hover:text-white transition-colors px-10 py-4"
              style={{
                borderRadius: '100px',
                border: '2px solid rgba(255, 255, 255, 0.40)',
                background: 'rgba(255, 255, 255, 0.10)',
                boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.08)',
              }}
            >
              קבלו 35 ימים בחינם
            </button>
          </div>
        </div>

        {/* Dashboard mockup — flush to bottom */}
        <div className="relative z-10 max-w-5xl mx-auto mt-16 px-6">
          <div className="relative rounded-t-xl overflow-hidden border border-white/[0.1] border-b-0 shadow-2xl shadow-black/50">
            <img src="/images/dashboard-mockup.png" alt="Thiqa CRM Dashboard" className="w-full block" loading="lazy" />
          </div>
        </div>
      </section>

      {/* ═══ Section 2: Features bar ═══ */}
      <img src={sectionDividerDark} alt="" className="w-full h-auto block" />
      <section className="py-16 md:py-20 bg-[#171719]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
            {[
              { title: "ניהול לקוחות ופוליסות", desc: "מקצה לקצה", svg: <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80" fill="white" fillOpacity="0.08"/><path d="M30 50C30 45.5817 33.5817 42 38 42C42.4183 42 46 45.5817 46 50H30ZM38 41C34.685 41 32 38.315 32 35C32 31.685 34.685 29 38 29C41.315 29 44 31.685 44 35C44 38.315 41.315 41 38 41ZM45.3628 43.2332C48.4482 44.0217 50.7679 46.7235 50.9836 50H48C48 47.3902 47.0002 45.0139 45.3628 43.2332ZM43.3401 40.9569C44.9728 39.4922 46 37.3661 46 35C46 33.5827 45.6314 32.2514 44.9849 31.0969C47.2753 31.554 49 33.5746 49 36C49 38.7625 46.7625 41 44 41C43.7763 41 43.556 40.9853 43.3401 40.9569Z" fill="white" fillOpacity="0.4"/><rect x="76" width="4" height="4" fill="white"/><rect x="76" y="76" width="4" height="4" fill="white"/><rect width="4" height="4" fill="white"/><rect y="76" width="4" height="4" fill="white"/></svg> },
              { title: "שליטה פיננסית, סליקה", desc: "וחישוב עמלות", svg: <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80" fill="white" fillOpacity="0.08"/><path d="M40.5521 30.6667H51.9998C52.7362 30.6667 53.3332 31.2636 53.3332 32V50.6667C53.3332 51.4031 52.7362 52 51.9998 52H27.9998C27.2635 52 26.6665 51.4031 26.6665 50.6667V29.3333C26.6665 28.597 27.2635 28 27.9998 28H37.8854L40.5521 30.6667ZM38.6665 36V46.6667H41.3332V36H38.6665ZM43.9998 40V46.6667H46.6665V40H43.9998ZM33.3332 42.6667V46.6667H35.9998V42.6667H33.3332Z" fill="white" fillOpacity="0.4"/><rect x="76" width="4" height="4" fill="white"/><rect x="76" y="76" width="4" height="4" fill="white"/><rect width="4" height="4" fill="white"/><rect y="76" width="4" height="4" fill="white"/></svg> },
              { title: "אוטומציית שיווק, SMS", desc: "וחתימות דיגיטליות", svg: <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80" fill="white" fillOpacity="0.08"/><path d="M33.0002 27.334C36.1298 27.334 38.6668 29.871 38.6668 33.0007V38.6673H33.0002C29.8705 38.6673 27.3335 36.1303 27.3335 33.0007C27.3335 29.871 29.8705 27.334 33.0002 27.334ZM33.0002 41.334H38.6668V47.0007C38.6668 50.1303 36.1298 52.6673 33.0002 52.6673C29.8705 52.6673 27.3335 50.1303 27.3335 47.0007C27.3335 43.8711 29.8705 41.334 33.0002 41.334ZM41.3335 41.334H47.0002C50.1298 41.334 52.6668 43.8711 52.6668 47.0007C52.6668 50.1303 50.1298 52.6673 47.0002 52.6673C43.8706 52.6673 41.3335 50.1303 41.3335 47.0007V41.334ZM48.0108 37.4267L47.6615 38.2276C47.4059 38.8139 46.5944 38.8139 46.3387 38.2276L45.9895 37.4267C45.367 35.9985 44.2455 34.8614 42.8462 34.2394L41.7699 33.761C41.188 33.5024 41.188 32.6561 41.7699 32.3974L42.7859 31.9457C44.2212 31.3077 45.3628 30.1286 45.9747 28.6519L46.3334 27.7864C46.5834 27.1832 47.417 27.1832 47.6668 27.7864L48.0255 28.6519C48.6375 30.1286 49.7791 31.3077 51.2144 31.9457L52.2303 32.3974C52.8123 32.6561 52.8123 33.5024 52.2303 33.761L51.1543 34.2394C49.7548 34.8614 48.6335 35.9985 48.0108 37.4267Z" fill="white" fillOpacity="0.4"/><rect x="76" width="4" height="4" fill="white"/><rect x="76" y="76" width="4" height="4" fill="white"/><rect width="4" height="4" fill="white"/><rect y="76" width="4" height="4" fill="white"/></svg> },
              { title: "בקרה רב-סניפית", desc: "ודוחות רווח בזמן אמת", svg: <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80" fill="white" fillOpacity="0.08"/><path d="M40.5521 30.6667H51.9998C52.7362 30.6667 53.3332 31.2636 53.3332 32V50.6667C53.3332 51.4031 52.7362 52 51.9998 52H27.9998C27.2635 52 26.6665 51.4031 26.6665 50.6667V29.3333C26.6665 28.597 27.2635 28 27.9998 28H37.8854L40.5521 30.6667ZM38.6665 36V46.6667H41.3332V36H38.6665ZM43.9998 40V46.6667H46.6665V40H43.9998ZM33.3332 42.6667V46.6667H35.9998V42.6667H33.3332Z" fill="white" fillOpacity="0.4"/><rect x="76" width="4" height="4" fill="white"/><rect x="76" y="76" width="4" height="4" fill="white"/><rect width="4" height="4" fill="white"/><rect y="76" width="4" height="4" fill="white"/></svg> },
            ].map((item, i) => (
              <div key={i} className="text-center flex flex-col items-center gap-3">
                {item.svg}
                <div>
                  <p className="text-[14px] font-semibold text-white/90">{item.title}</p>
                  <p className="text-[13px] text-white/40">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <img src={sectionDividerDark} alt="" className="w-full h-auto block" />

      <section id="features" className="py-24 md:py-36 relative">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-white/40 mb-4 tracking-wide">הבית הדיגיטלי של הסוכנות שלך</p>
          <h2 className="text-3xl md:text-[2.8rem] font-bold leading-tight mb-4">
            כל הכלים לניהול הסוכנות תחת קורת גג אחת
          </h2>
          <p className="text-white/40 text-sm max-w-xl mx-auto mb-16">
            תשתית טכנולוגית מתקדמת שחוסכת לך זמן, מונעת טעויות ומגדילה את הרווחיות.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
            {[
              {
                img: featureProfitEngine,
                title: "מנוע חישוב רווחים אוטומטי.",
                desc: "ניהול תזרימי צ׳קים, סליקת אשראי והתחשבנות מול ברוקרים וחברות ביטוח בדיוק של 100%. בלי אובדן עמלות ובלי חישובים ידניים.",
              },
              {
                img: featurePaperless,
                title: "אפס ניירת, מקסימום מהירות.",
                desc: "שליחת פוליסות לחתימה דיגיטלית ב-SMS, ניהול מסמכים מאובטח בענן ומעקב מלא אחרי מחזור חיי הפוליסה — הכל מהדסקטופ או מהנייד.",
              },
              {
                img: featureMarketing,
                title: "הופכים נתונים למכירות.",
                desc: "מערכת שיווק מובנית לשליחת קמפיינים ב-SMS ובמייל. תזכורות אוטומטיות לחידושים, עדכונים על מבצעים ושימור לקוחות בצורה אקטיבית.",
              },
            ].map((card, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden text-center">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={card.img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-6 pt-5">
                  <h3 className="text-lg font-bold mb-2">{card.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate("/login")}
            className="px-10 py-4 text-[15px] font-bold text-white hover:text-white transition-colors"
            style={{
              borderRadius: '100px',
              border: '2px solid rgba(255, 255, 255, 0.40)',
              background: 'rgba(255, 255, 255, 0.10)',
            }}
          >
            קבלו 35 ימים בחינם
          </button>
        </div>
      </section>

      <img src={sectionDividerDark} alt="" className="w-full h-auto block" />

      <section id="demo" className="py-24 md:py-36 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-sm text-[#7ba4f7] mb-4 tracking-wide">?למה דווקא Thiqa</p>
            <h2 className="text-3xl md:text-[2.8rem] font-bold leading-tight mb-4">
              כל הכלים לניהול הסוכנות תחת קורת גג אחת
            </h2>
            <p className="text-white/40 text-sm max-w-xl mx-auto">
              תשתית טכנולוגית מתקדמת שחוסכת לך זמן, מונעת טעויות ומגדילה את הרווחיות.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto border border-white/[0.06] rounded-xl mb-0">
            {featureTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[140px] px-4 py-4 text-center border-l border-white/[0.06] first:border-l-0 transition-colors ${
                  activeTab === tab.id
                    ? "bg-white/[0.06] text-white"
                    : "text-white/40 hover:text-white/60 hover:bg-white/[0.02]"
                }`}
              >
                <span className="text-xs text-white/30 block mb-1">{tab.num}</span>
                <span className="text-sm font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {featureTabs.filter(t => t.id === activeTab).map(tab => (
            <div key={tab.id} className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-white/[0.06] border-t-0 rounded-b-xl overflow-hidden">
              {/* Right (RTL): Content */}
              <div className="p-8 lg:p-12 flex flex-col justify-center order-1 lg:order-none">
                <h3 className="text-2xl md:text-3xl font-bold mb-4 leading-tight whitespace-pre-line">{tab.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-8">{tab.desc}</p>

                <div className="grid grid-cols-2 gap-6">
                  {tab.stats.map((stat, j) => (
                    <div key={j}>
                      <div className="text-3xl font-extrabold text-white/90">
                        {stat.value}<span className="text-lg font-medium text-white/50 mr-1">{stat.unit}</span>
                      </div>
                      <p className="text-xs text-white/30 mt-2 leading-relaxed">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white/80 hover:text-white transition-colors bg-white/[0.04] border border-white/[0.08] rounded-lg"
                  >
                    התחילו ניסיון עכשיו
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {/* Left (RTL): Image */}
              <div className="bg-gradient-to-br from-[#4a6cc7]/30 to-[#7ba4f7]/10 min-h-[300px] lg:min-h-[400px] flex items-center justify-center order-2 lg:order-none">
                <img src={featuresMockup} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <img src={sectionDividerDark} alt="" className="w-full h-auto block" />

      {/* ═══ Section 5: Slider ═══ */}
      <section className="relative py-24 md:py-36 overflow-hidden">
        {/* Gradient background */}
        <img src={sliderBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10">
          <h2 className="text-3xl md:text-[2.8rem] font-bold text-center mb-16">
            אל תחכו לחידוש. תייצרו אותו
          </h2>

          {/* Slider */}
          {(() => {
            const slides = [
              {
                title: "ניהול מסמכים מאובטח בענן",
                desc: "כל המסמכים, הפוליסות והקבלות — מאורגנים בענן עם גישה מיידית מהדסקטופ או מהנייד.",
                cta: "התחילו ניסיון עכשיו",
              },
              {
                title: "שקט נפשי ושימור לקוחות",
                desc: "אל תתנו ללקוח להרגיש לבד ברגע האמת. המערכת מנהלת עבורכם את איסוף המסמכים, מעדכנת את הלקוח בסטטוס התביעה באופן אוטומטי, ומוודאת ששום דרישה מחברת הביטוח לא מתפספסת. אתם נותנים שירות VIP, בזמן שהאוטומציה עושה את העבודה השחורה.",
                cta: "התחילו ניסיון עכשיו",
              },
              {
                title: "דוחות כספיים בלחיצה",
                desc: "דוחות רווח, תשלומים ויתרות — הכל אוטומטי ומעודכן בזמן אמת, עם ייצוא מיידי.",
                cta: "התחילו ניסיון עכשיו",
              },
            ];

            const goNext = () => setSlideIdx((p) => (p + 1) % slides.length);
            const goPrev = () => setSlideIdx((p) => (p - 1 + slides.length) % slides.length);

            return (
              <>
                <div className="relative flex items-stretch w-full">
                  {/* Previous slide peek — bleeds off left edge */}
                  <div className="hidden lg:flex flex-shrink-0 w-[14%] opacity-60 transition-all duration-500">
                    <div className="rounded-2xl overflow-hidden bg-white/[0.12] border border-white/[0.08] p-6 flex items-center justify-center w-full cursor-pointer" onClick={goPrev}>
                      <h3 className="text-base font-bold text-center text-white/70">{slides[(slideIdx - 1 + slides.length) % slides.length].title}</h3>
                    </div>
                  </div>

                  {/* Active slide — takes remaining center space */}
                  <div className="flex-1 transition-all duration-500 mx-3 lg:mx-5">
                    <div className="rounded-2xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/[0.08] flex flex-col h-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 flex-1">
                        {/* Image side */}
                        <div className="flex items-center justify-center p-6 md:p-10 order-2 md:order-1">
                          <img src={featuresMockup} alt="" className="max-h-[300px] object-contain rounded-lg" loading="lazy" />
                        </div>
                        {/* Content side */}
                        <div className="p-8 md:p-12 flex flex-col justify-center order-1 md:order-2">
                          <h3 className="text-xl md:text-2xl font-bold mb-4">{slides[slideIdx].title}</h3>
                          <p className="text-sm text-white/50 leading-relaxed mb-8">{slides[slideIdx].desc}</p>
                          <button
                            onClick={() => navigate("/login")}
                            className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white/70 hover:text-white transition-colors bg-white/[0.06] border border-white/[0.1] rounded-lg w-fit"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            {slides[slideIdx].cta}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Next slide peek — bleeds off right edge */}
                  <div className="hidden lg:flex flex-shrink-0 w-[14%] opacity-60 transition-all duration-500">
                    <div className="rounded-2xl overflow-hidden bg-white/[0.12] border border-white/[0.08] p-6 flex items-center justify-center w-full cursor-pointer" onClick={goNext}>
                      <h3 className="text-base font-bold text-center text-white/70">{slides[(slideIdx + 1) % slides.length].title}</h3>
                    </div>
                  </div>
                </div>

                {/* Navigation arrows */}
                <div className="flex justify-center gap-3 mt-10">
                  <button onClick={goPrev} className="h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <ChevronLeft className="h-5 w-5 rotate-180" />
                  </button>
                  <button onClick={goNext} className="h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </section>

      <img src={sectionDividerDark} alt="" className="w-full h-auto block" />

      {/* ═══ Section 5: Grid Logo ═══ */}
      <section className="relative py-24 md:py-36 overflow-hidden bg-[#171719]">
        <div className="relative z-10 text-center px-6">
          <p className="text-sm text-white/40 mb-4 tracking-wide">פתרון מקיף ופשוט</p>
          <h2 className="text-3xl md:text-[2.8rem] font-bold leading-tight mb-10">
            כל מה שהסוכנות צריכה, תחת קורת גג אחת
          </h2>
        </div>

        {/* Grid logo background */}
        <div className="relative w-full max-w-5xl mx-auto">
          <img src={gridLogoBg} alt="" className="w-full h-auto" loading="lazy" />
        </div>

        <div className="relative z-10 text-center px-6 mt-10">
          <p className="text-sm text-white/40 max-w-xl mx-auto mb-8 leading-relaxed">
            שליחת פוליסות לחתימה דיגיטלית ב-SMS, ניהול מסמכים מאובטח בענן
            <br />
            ומעקב מלא אחרי מחזור חיי הפוליסה — הכל מהדסקטופ או מהנייד.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="px-8 py-3 text-[14px] font-bold text-white/90 hover:text-white transition-colors"
            style={{
              borderRadius: '100px',
              border: '2px solid rgba(255, 255, 255, 0.40)',
              background: 'rgba(255, 255, 255, 0.10)',
            }}
          >
            קבלו 35 ימים בחינם
          </button>
        </div>
      </section>

      <img src={sectionDividerDark} alt="" className="w-full h-auto block" />

      {/* ═══ Testimonials + Stats ═══ */}
      <section id="testimonials" className="py-24 md:py-36 relative">
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

      <img src={sectionDividerDark} alt="" className="w-full h-auto block" />

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

      <img src={sectionDividerDark} alt="" className="w-full h-auto block" />

      {/* ═══ CTA ═══ */}
      <section className="py-24 md:py-36 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/[0.03] rounded-full blur-[120px]" />
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
