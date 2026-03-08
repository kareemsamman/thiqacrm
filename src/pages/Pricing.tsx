import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Info } from "lucide-react";
import thiqaLogo from "@/assets/thiqa-logo-full.svg";
import sectionDividerDark from "@/assets/landing/section-divider-dark.png";

const plans = [
  {
    id: "starter",
    name: "Starter",
    desc: "מתאים לסוכנים עצמאיים שמתחילים את הדרך",
    monthlyPrice: 240,
    yearlyPrice: 200,
    badge: null,
    features: [
      { text: "ניהול עד 200 לקוחות", info: true },
      { text: "הפקת פוליסות בסיסית", info: true },
      { text: "דוחות כספיים חודשיים", info: false },
      { text: "תמיכה במייל", info: false },
      { text: "ייבוא נתונים בסיסי", info: true },
      { text: "גיבוי יומי אוטומטי", info: true },
    ],
  },
  {
    id: "basic",
    name: "Basic",
    desc: "מתאים לסוכנויות ביטוח קטנות ובינוניות",
    monthlyPrice: 240,
    yearlyPrice: 200,
    badge: "פופולרי",
    features: [
      { text: "ניהול לקוחות ללא הגבלה", info: true },
      { text: "הפקת פוליסות מתקדמת", info: true },
      { text: "ניהול תביעות מלא", info: false },
      { text: "SMS ותזכורות אוטומטיות", info: true },
      { text: "דוחות כספיים מלאים", info: true },
      { text: "חתימה דיגיטלית", info: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    desc: "מתאים לסוכנויות גדולות עם צוות עובדים",
    monthlyPrice: 240,
    yearlyPrice: 200,
    badge: null,
    features: [
      { text: "כל מה שב-Basic", info: false },
      { text: "ניהול סניפים והרשאות", info: true },
      { text: "API ואינטגרציות מתקדמות", info: true },
      { text: "דוחות מותאמים אישית", info: false },
      { text: "תמיכה VIP ומנהל לקוח", info: true },
      { text: "סנכרון חברות ביטוח", info: true },
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(false);

  return (
    <div className="min-h-screen text-white overflow-x-hidden bg-[#171719]" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* ═══ Navbar ═══ */}
      <nav className="absolute top-0 inset-x-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <a href="/landing" className="flex items-center gap-2.5">
            <img src={thiqaLogo} alt="Thiqa" />
          </a>
          <div className="hidden md:flex items-center gap-10 text-[14px] text-white/70 font-medium">
            <a href="/landing#features" className="hover:text-white transition-colors">במה אנחנו שונים</a>
            <a href="/landing#demo" className="hover:text-white transition-colors">איך זה עובד</a>
            <a href="/landing#faq" className="hover:text-white transition-colors">שאלות ותשובות</a>
            <a href="/pricing" className="text-white">מחירון</a>
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

      {/* ═══ Pricing Hero ═══ */}
      <section className="pt-32 pb-20 text-center px-6">
        <p className="text-sm text-[#7ba4f7] mb-4 tracking-wide">מחירון</p>
        <h1 className="text-4xl md:text-[3.2rem] font-bold mb-4 leading-tight">
          בחרו את התוכנית המתאימה לכם
        </h1>
        <p className="text-white/40 text-base max-w-xl mx-auto">
          כל התוכניות כוללות 35 ימי ניסיון בחינם — בלי כרטיס אשראי.
        </p>
      </section>

      {/* ═══ Pricing Cards ═══ */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] flex flex-col"
            >
              {/* Header */}
              <div className="p-8 pb-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold text-[#a78bfa]">{plan.name}</h3>
                  {plan.badge && (
                    <span className="px-4 py-1.5 text-xs font-bold rounded-lg bg-white/10 text-white/80">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/40 mb-6">{plan.desc}</p>
              </div>

              {/* Price */}
              <div className="px-8 py-6 border-t border-dashed border-white/[0.06]">
                <div className="flex items-baseline gap-2 justify-end">
                  <span className="text-sm text-white/40">₪ לחודש</span>
                  <span className="text-6xl font-extrabold text-white/90 tracking-tight">
                    {yearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                </div>
              </div>

              {/* Yearly toggle */}
              <div className="px-8 py-4 border-t border-dashed border-white/[0.06] flex items-center justify-end gap-3">
                <span className="text-sm text-white/50">שנתי</span>
                <button
                  onClick={() => setYearly(!yearly)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${yearly ? "bg-[#a78bfa]" : "bg-white/10"}`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${yearly ? "right-1" : "left-1"}`}
                  />
                </button>
              </div>

              {/* CTA */}
              <div className="px-8 py-6 border-t border-dashed border-white/[0.06]">
                <button
                  onClick={() => navigate("/login")}
                  className="w-full py-3.5 rounded-full bg-white text-[#171719] font-bold text-sm hover:bg-white/90 transition-colors"
                >
                  הצטרפו למסלול {plan.name} בחינם
                </button>
              </div>

              {/* Features */}
              <div className="px-8 pt-2 pb-8 border-t border-dashed border-white/[0.06]">
                <p className="font-bold text-sm text-white/80 mb-4 text-right">מה בחבילה זו?</p>
                <ul className="space-y-3">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white/50">
                      {f.info && <Info className="h-4 w-4 text-white/20 shrink-0" />}
                      {!f.info && <span className="w-4" />}
                      <span className="flex-1 text-right">{f.text}</span>
                      <Check className="h-4 w-4 text-white/40 shrink-0" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <img src={sectionDividerDark} alt="" className="w-full h-auto block" />

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-white/[0.04] pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col divide-y divide-white/[0.06]">
            {[
              { title: "מידע", items: ["מרכז העזרה", "יצירת קשר"] },
              { title: "תנאים ומדיניות", items: ["תנאי שימוש", "מדיניות פרטיות", "נגישות"] },
              { title: "תמיכה", items: ["צ'אט תמיכה", "שאלות נפוצות", "info@thiqa.co.il"] },
            ].map((section, idx) => (
              <details key={idx} className="group py-6">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="text-lg font-bold text-white/90">{section.title}</span>
                  <span className="text-white/40 text-2xl font-light group-open:hidden">+</span>
                  <span className="text-white/40 text-2xl font-light hidden group-open:inline">−</span>
                </summary>
                <ul className="mt-4 space-y-3 text-sm text-white/40 text-right">
                  {section.items.map((item, j) => (
                    <li key={j}><a href="#" className="hover:text-white/60 transition-colors">{item}</a></li>
                  ))}
                </ul>
              </details>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-8 mb-8">
            <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
            <div className="flex-1 h-px bg-white/[0.06]" />
            <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
          </div>

          <p className="text-sm text-white/20 text-center mb-12">כל הזכויות שמורות © Thiqa {new Date().getFullYear()}</p>

          <div className="flex justify-center overflow-hidden">
            <img src={thiqaLogo} alt="Thiqa" className="w-[80%] md:w-[60%] max-w-[700px] opacity-[0.08]" />
          </div>
        </div>
      </footer>
    </div>
  );
}
