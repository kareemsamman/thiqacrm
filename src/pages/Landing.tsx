import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Shield, BarChart3, Users, Car, FileText, CreditCard,
  ChevronLeft, CheckCircle, Star, ArrowLeft, Zap, Clock,
  PieChart, MessageSquare, Bell, Layers
} from "lucide-react";
import thiqaLogo from "@/assets/thiqa-logo.svg";
import dashboardMockup from "@/assets/landing/dashboard-mockup.png";
import featuresMockup from "@/assets/landing/features-mockup.png";

const features = [
  { icon: Users, title: "إدارة العملاء", desc: "قاعدة بيانات متكاملة لجميع عملائك مع بحث سريع وفلاتر متقدمة" },
  { icon: Car, title: "إدارة المركبات", desc: "تتبع جميع المركبات المؤمن عليها مع تفاصيل كاملة" },
  { icon: FileText, title: "إدارة الوثائق", desc: "إنشاء وتجديد وتتبع جميع وثائق التأمين من مكان واحد" },
  { icon: CreditCard, title: "المدفوعات والديون", desc: "تتبع المدفوعات والمتأخرات وإرسال تذكيرات تلقائية" },
  { icon: BarChart3, title: "تقارير مالية", desc: "تقارير أرباح مفصلة وتسويات شركات وتحليل أداء الوكالة" },
  { icon: Shield, title: "تقارير الحوادث", desc: "إنشاء تقارير حوادث رقمية مع توقيع إلكتروني وإرسال PDF" },
  { icon: MessageSquare, title: "رسائل SMS", desc: "إرسال تذكيرات تجديد ورسائل تسويقية تلقائياً" },
  { icon: Bell, title: "تنبيهات ذكية", desc: "إشعارات فورية لانتهاء الوثائق والشيكات والمهام" },
  { icon: PieChart, title: "تسويات الشركات", desc: "إدارة حسابات شركات التأمين والوسطاء بدقة" },
  { icon: Layers, title: "حزم تأمين", desc: "إنشاء حزم تأمين شاملة (إلزامي + شامل + إضافات)" },
  { icon: Zap, title: "أداء فائق", desc: "نظام سريع مبني للتعامل مع آلاف العملاء والوثائق" },
  { icon: Clock, title: "تجديدات تلقائية", desc: "متابعة تواريخ التجديد وإرسال تذكيرات قبل الانتهاء" },
];

const stats = [
  { value: "320+", label: "وكالة تأمين" },
  { value: "50K+", label: "وثيقة تأمين" },
  { value: "99.9%", label: "وقت التشغيل" },
  { value: "65%", label: "توفير في الوقت" },
];

const testimonials = [
  { name: "أحمد خالد", role: "وكيل تأمين - حيفا", text: "ثقة غيّر طريقة إدارتي للوكالة بالكامل. كل شيء منظم وسريع." },
  { name: "سمير يوسف", role: "مدير وكالة - الناصرة", text: "النظام سهل الاستخدام والتقارير المالية وفرت علي ساعات عمل." },
  { name: "ليلى عبد الرحمن", role: "مديرة مكتب - يافا", text: "أفضل قرار اتخذناه. الدعم الفني ممتاز والتحديثات مستمرة." },
];

const faqs = [
  { q: "ما هو نظام ثقة؟", a: "نظام CRM متكامل مصمم خصيصاً لوكالات التأمين في إسرائيل، يساعدك على إدارة العملاء والوثائق والمدفوعات والتقارير من مكان واحد." },
  { q: "هل النظام يدعم اللغة العربية؟", a: "نعم، النظام مصمم بالكامل باللغة العربية مع واجهة RTL احترافية." },
  { q: "كيف يتم تسعير الاشتراك؟", a: "نقدم خطتين: Basic للوكالات الصغيرة و Pro للوكالات الكبيرة مع كامل الميزات. تواصل معنا للتفاصيل." },
  { q: "هل بياناتي آمنة؟", a: "نعم، نستخدم أحدث تقنيات التشفير والحماية مع نسخ احتياطية يومية تلقائية." },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white overflow-x-hidden" dir="rtl">
      {/* ---- Navbar ---- */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <img src={thiqaLogo} alt="Thiqa" className="h-9 w-9" />
            <span className="text-xl font-bold tracking-tight">Thiqa</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition-colors">المزايا</a>
            <a href="#stats" className="hover:text-white transition-colors">الأرقام</a>
            <a href="#testimonials" className="hover:text-white transition-colors">آراء العملاء</a>
            <a href="#faq" className="hover:text-white transition-colors">الأسئلة الشائعة</a>
          </div>
          <Button
            onClick={() => navigate("/login")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
          >
            تسجيل الدخول
          </Button>
        </div>
      </nav>

      {/* ---- Hero ---- */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/15 rounded-full blur-[120px]" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm mb-8">
            <Zap className="h-4 w-4" />
            نظام CRM الأول لوكالات التأمين
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight">
            الـ CRM الأذكى بيُنبَني
            <br />
            <span className="bg-gradient-to-l from-blue-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
              لسوكنيّات بيطوח
            </span>
            <br />
            <span className="text-white/80 text-3xl md:text-5xl">שרוצות להרוויח יותר</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
            كل الأدوات لإدارة الوكالة تحت سقف واحد — عملاء، وثائق، مدفوعات، تقارير، وتذكيرات ذكية.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <Button
              size="lg"
              onClick={() => navigate("/login")}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 h-14 text-base gap-2 shadow-lg shadow-blue-600/25"
            >
              ابدأ مجاناً
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 h-14 text-base border-white/20 text-white hover:bg-white/10 bg-transparent"
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              اكتشف المزايا
            </Button>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="relative max-w-6xl mx-auto mt-16 px-6">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-blue-900/20">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-transparent to-transparent z-10 pointer-events-none" />
            <img
              src={dashboardMockup}
              alt="Thiqa CRM Dashboard"
              className="w-full"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ---- Features Grid ---- */}
      <section id="features" className="py-20 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold">كل الأدوات لإدارة الوكالة</h2>
            <p className="mt-4 text-white/50 text-lg">تحت قורت גג אחת</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-blue-500/20 transition-all duration-300"
              >
                <div className="h-11 w-11 rounded-xl bg-blue-600/10 flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                  <f.icon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Feature Showcase ---- */}
      <section className="py-20 md:py-32 relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">כל הכלים לניהול הסוכנות<br />תחת קורת גג אחת</h2>
            <div className="space-y-5 mt-8">
              {[
                { title: "לוח בקרה אישי", desc: "תמונת מצב מלאה של העסק שלך במבט אחד" },
                { title: "ניהול לקוחות ופוליסות", desc: "כל המידע על הלקוח — רכבים, פוליסות, תשלומים" },
                { title: "דוחות כספיים מפורטים", desc: "רווחיות לפי חברה, סוכן, תקופה" },
                { title: "תזכורות חידוש אוטומטיות", desc: "SMS ומיילים אוטומטיים ללקוחות" },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="h-8 w-8 rounded-lg bg-blue-600/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-white/40">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-blue-600/5 rounded-3xl blur-2xl" />
            <img
              src={featuresMockup}
              alt="Features"
              className="relative rounded-2xl border border-white/10 shadow-xl"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ---- Stats ---- */}
      <section id="stats" className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-blue-900/10 to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-l from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  {s.value}
                </div>
                <p className="mt-2 text-white/50">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Testimonials ---- */}
      <section id="testimonials" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold">بואו תשמעו מה יש להגיד</h2>
            <p className="mt-4 text-white/50 text-lg">לסוכנים שלנו</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-white/70 leading-relaxed mb-6">"{t.text}"</p>
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-white/40">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section id="faq" className="py-20 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">כל מה שחשוב לדעת על Thiqa</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group p-5 rounded-2xl border border-white/5 bg-white/[0.02] cursor-pointer"
              >
                <summary className="flex items-center justify-between font-semibold list-none">
                  {faq.q}
                  <ChevronLeft className="h-5 w-5 text-white/40 transition-transform group-open:-rotate-90" />
                </summary>
                <p className="mt-4 text-white/50 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="py-20 md:py-32 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-600/15 rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center px-6">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            כי לסוכנות שלכם מגיע יותר
            <br />
            <span className="text-white/60">מניהול רגיל.</span>
          </h2>
          <p className="text-white/50 text-lg mb-10">
            ابدأ تجربتك المجانية لمدة 35 يوم — بدون بطاقة ائتمان.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/login")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-10 h-14 text-lg gap-2 shadow-lg shadow-blue-600/25"
          >
            ابدأ الآن مجاناً
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-6">
          <img src={thiqaLogo} alt="Thiqa" className="h-16 w-16 opacity-60" />
          <span className="text-2xl font-bold tracking-tight text-white/60">Thiqa</span>
          <p className="text-sm text-white/30">© {new Date().getFullYear()} Thiqa CRM. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
