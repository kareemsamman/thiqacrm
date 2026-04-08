import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_SYSTEM_PROMPT = `أنت "ثاقب"، المساعد الذكي لنظام ثقة لإدارة التأمين.
- تجيب باللغة العربية دائمًا بأسلوب مهني وودود
- تقدم معلومات دقيقة بناءً على البيانات المتاحة فقط
- لا تخترع أو تفترض بيانات غير موجودة في السياق
- إذا لم تجد البيانات المطلوبة، أخبر المستخدم بوضوح
- كن مختصرًا ومفيدًا
- عند عرض قوائم، استخدم التنسيق المنظم (أرقام أو نقاط)
- لا تكشف عن تفاصيل تقنية أو بنية النظام
- يمكنك مساعدة المستخدم بالاستعلام عن: العملاء، السيارات، الوثائق، المدفوعات، شركات التأمين`;

const ADMIN_EXTRA = `
- لديك صلاحية كاملة لعرض جميع البيانات المالية (أرباح، مدفوعات للشركة، عمولات)`;

const WORKER_EXTRA = `
- ليس لديك صلاحية لعرض الأرباح أو المدفوعات للشركة أو العمولات
- إذا سُئلت عن هذه المعلومات، أخبر المستخدم بأنها متاحة للمدير فقط`;

// ─── Intent classification ───
interface IntentResult {
  tables: string[];
  searchTerms: string[];
  isAggregate: boolean;
  isFinancial: boolean;
}

function classifyIntent(message: string): IntentResult {
  const msg = message.toLowerCase();
  const tables: string[] = [];
  let isAggregate = false;
  let isFinancial = false;
  const searchTerms: string[] = [];

  const nameMatch = msg.match(/["«»"](.*?)["«»"]/);
  if (nameMatch) searchTerms.push(nameMatch[1]);

  const numMatch = msg.match(/\d{5,}/g);
  if (numMatch) searchTerms.push(...numMatch);

  if (/عميل|عملاء|زبون|زبائن|اسم|هوية|رقم هوية|ملف|هاتف العميل/.test(msg)) tables.push("clients");
  if (/سيارة|سيارات|مركبة|مركبات|رقم سيارة|لوحة|رقم لوحة|موديل/.test(msg)) tables.push("cars");
  if (/وثيقة|وثائق|بوليصة|بوالص|تأمين|إلزامي|شامل|طرف ثالث|تنتهي|انتهاء|تجديد|منتهية|سارية/.test(msg)) tables.push("policies");
  if (/دفعة|دفعات|مدفوع|تحصيل|مبلغ|شيك|شيكات|فيزا|نقدي|تحويل/.test(msg)) tables.push("payments");
  if (/شركة تأمين|شركات تأمين|شركة/.test(msg)) tables.push("companies");

  if (/ربح|أرباح|عمولة|عمولات|خسارة|دفع للشركة|تسوية|مالي|إيرادات/.test(msg)) {
    isFinancial = true;
    tables.push("policies");
  }

  if (/كم|عدد|مجموع|إجمالي|إحصائيات|إحصاء|متوسط|أكثر|أقل|ملخص/.test(msg)) isAggregate = true;

  if (tables.length === 0) tables.push("clients", "policies");

  return { tables: [...new Set(tables)], searchTerms, isAggregate, isFinancial };
}

// ─── Data retrieval ───
async function fetchContextData(
  supabase: any,
  agentId: string,
  intent: IntentResult,
  isAdmin: boolean,
  branchId: string | null,
  userMessage: string
): Promise<string> {
  const parts: string[] = [];
  const limit = intent.isAggregate ? 100 : 15;

  const searchText = userMessage
    .replace(/أعطني|أريد|ابحث|عن|معلومات|بيانات|تفاصيل|عميل|سيارة|وثيقة|كم|عدد|ما|هو|هي|هل|في|من|إلى|على|لي/g, "")
    .trim();

  for (const table of intent.tables) {
    try {
      if (table === "clients") {
        let query = supabase.from("clients")
          .select("full_name, id_number, phone_number, file_number, date_joined")
          .eq("agent_id", agentId)
          .is("deleted_at", null)
          .limit(limit);
        if (branchId && !isAdmin) query = query.eq("branch_id", branchId);
        if (searchText.length > 1) {
          query = query.or(`full_name.ilike.%${searchText}%,id_number.ilike.%${searchText}%,phone_number.ilike.%${searchText}%,file_number.ilike.%${searchText}%`);
        }
        const { data } = await query;
        if (data && data.length > 0) {
          parts.push(`[عملاء - ${data.length} نتيجة]\n` +
            data.map((c: any, i: number) => `${i + 1}. ${c.full_name} | هوية: ${c.id_number || '-'} | هاتف: ${c.phone_number || '-'} | ملف: ${c.file_number || '-'}`).join('\n'));
        } else if (intent.tables.length === 1) {
          parts.push("[لم يتم العثور على عملاء مطابقين]");
        }
      }

      if (table === "cars") {
        let query = supabase.from("cars")
          .select("car_number, manufacturer_name, model, year, car_type, clients(full_name)")
          .eq("agent_id", agentId)
          .is("deleted_at", null)
          .limit(limit);
        if (searchText.length > 1) {
          query = query.or(`car_number.ilike.%${searchText}%,manufacturer_name.ilike.%${searchText}%,model.ilike.%${searchText}%`);
        }
        const { data } = await query;
        if (data && data.length > 0) {
          parts.push(`[سيارات - ${data.length} نتيجة]\n` +
            data.map((c: any, i: number) => `${i + 1}. ${c.car_number} | ${c.manufacturer_name || ''} ${c.model || ''} ${c.year || ''} | مالك: ${(c.clients as any)?.full_name || '-'}`).join('\n'));
        }
      }

      if (table === "policies") {
        const selectFields = isAdmin
          ? "policy_number, policy_type_parent, insurance_price, profit, payed_for_company, office_commission, start_date, end_date, cancelled, clients(full_name), cars(car_number), insurance_companies(name_ar)"
          : "policy_number, policy_type_parent, insurance_price, start_date, end_date, cancelled, clients(full_name), cars(car_number), insurance_companies(name_ar)";
        let query = supabase.from("policies")
          .select(selectFields)
          .eq("agent_id", agentId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (branchId && !isAdmin) query = query.eq("branch_id", branchId);
        if (/تنتهي|انتهاء|منتهية/.test(userMessage)) {
          const now = new Date();
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          query = query.lte("end_date", monthEnd.toISOString()).gte("end_date", now.toISOString()).eq("cancelled", false);
        }
        const { data } = await query;
        if (data && data.length > 0) {
          const typeLabels: Record<string, string> = {
            ELZAMI: "إلزامي", THIRD_FULL: "شامل", ROAD_SERVICE: "خدمة طريق",
            ACCIDENT_FEE_EXEMPTION: "إعفاء رسوم", HEALTH: "صحي", LIFE: "حياة",
          };
          if (intent.isAggregate) {
            const total = data.length;
            const totalPrice = data.reduce((s: number, p: any) => s + (p.insurance_price || 0), 0);
            let summary = `[ملخص الوثائق]\nإجمالي: ${total} وثيقة | مجموع الأسعار: ₪${totalPrice.toLocaleString()}`;
            if (isAdmin) {
              const totalProfit = data.reduce((s: number, p: any) => s + (p.profit || 0), 0);
              summary += ` | إجمالي الربح: ₪${totalProfit.toLocaleString()}`;
            }
            parts.push(summary);
          } else {
            parts.push(`[وثائق - ${data.length} نتيجة]\n` +
              data.slice(0, 15).map((p: any, i: number) => {
                let line = `${i + 1}. ${(p.clients as any)?.full_name || '-'} | ${typeLabels[p.policy_type_parent] || p.policy_type_parent} | ${(p.insurance_companies as any)?.name_ar || '-'} | ₪${p.insurance_price || 0} | ${p.start_date} → ${p.end_date}`;
                if (isAdmin && p.profit !== undefined) line += ` | ربح: ₪${p.profit || 0}`;
                if (p.cancelled) line += " | ❌ ملغاة";
                return line;
              }).join('\n'));
          }
        }
      }

      if (table === "payments") {
        const { data } = await supabase.from("policy_payments")
          .select("amount, payment_type, payment_date, policies(clients(full_name), policy_number)")
          .eq("agent_id", agentId)
          .order("payment_date", { ascending: false })
          .limit(limit);
        if (data && data.length > 0) {
          const typeLabels: Record<string, string> = { cash: "نقدي", cheque: "شيك", visa: "فيزا", transfer: "تحويل" };
          if (intent.isAggregate) {
            const total = data.reduce((s: number, p: any) => s + (p.amount || 0), 0);
            parts.push(`[ملخص المدفوعات]\nإجمالي: ${data.length} دفعة | المجموع: ₪${total.toLocaleString()}`);
          } else {
            parts.push(`[مدفوعات - ${data.length} نتيجة]\n` +
              data.slice(0, 15).map((p: any, i: number) =>
                `${i + 1}. ₪${p.amount} | ${typeLabels[p.payment_type] || p.payment_type} | ${p.payment_date} | ${(p.policies as any)?.clients?.full_name || '-'}`
              ).join('\n'));
          }
        }
      }

      if (table === "companies") {
        const { data } = await supabase.from("insurance_companies")
          .select("name, name_ar, active")
          .eq("agent_id", agentId)
          .limit(50);
        if (data && data.length > 0) {
          parts.push(`[شركات التأمين - ${data.length}]\n` +
            data.map((c: any, i: number) => `${i + 1}. ${c.name_ar || c.name}${c.active ? '' : ' (غير فعالة)'}`).join('\n'));
        }
      }
    } catch (e) {
      console.error(`[ai-assistant] Error fetching ${table}:`, e);
    }
  }

  return parts.length > 0 ? parts.join('\n\n') : "[لا توجد بيانات مطابقة للاستعلام]";
}

// ─── Main handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) throw new Error("AI service not configured – LOVABLE_API_KEY missing");

    // Auth
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Resolve agent
    const { data: agentUser } = await adminClient
      .from("agent_users")
      .select("agent_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!agentUser?.agent_id) throw new Error("No agent");

    const agentId = agentUser.agent_id;

    // Check feature flag
    const { data: featureFlag } = await adminClient
      .from("agent_feature_flags")
      .select("enabled")
      .eq("agent_id", agentId)
      .eq("feature_key", "ai_assistant")
      .maybeSingle();
    if (!featureFlag?.enabled) throw new Error("ميزة المساعد الذكي غير مفعّلة لهذا الحساب");

    // Load platform-level custom prompt
    const { data: promptSetting } = await adminClient
      .from("thiqa_platform_settings")
      .select("setting_value")
      .eq("setting_key", "ai_assistant_prompt")
      .maybeSingle();
    const customPrompt = promptSetting?.setting_value || null;

    // Determine role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("agent_id", agentId)
      .maybeSingle();
    const isAdmin = roleData?.role === "admin";

    // Get branch_id for workers
    const { data: profile } = await adminClient
      .from("profiles")
      .select("branch_id")
      .eq("id", user.id)
      .maybeSingle();
    const branchId = profile?.branch_id || null;

    // Parse request
    const { message, session_id } = await req.json();
    if (!message?.trim()) throw new Error("الرسالة فارغة");

    // Load or create session
    let sessionId = session_id;
    if (!sessionId) {
      const { data: newSession, error: sessionErr } = await adminClient
        .from("ai_chat_sessions")
        .insert({ agent_id: agentId, user_id: user.id, title: message.slice(0, 50) })
        .select("id")
        .single();
      if (sessionErr) throw sessionErr;
      sessionId = newSession.id;
    }

    // Load chat history (last 10 messages)
    const { data: history } = await adminClient
      .from("ai_chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(10);

    // Classify intent and fetch data
    const intent = classifyIntent(message);
    const contextData = await fetchContextData(adminClient, agentId, intent, isAdmin, branchId, message);

    // Build system prompt: default + custom agent rules + role-based
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    if (customPrompt) {
      systemPrompt += `\n\n[تعليمات إضافية من الوكيل]\n${customPrompt}`;
    }
    systemPrompt += isAdmin ? ADMIN_EXTRA : WORKER_EXTRA;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: `${message}\n\n---\n[بيانات من النظام]\n${contextData}\n[/بيانات]`,
      },
    ];

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[ai-assistant] AI Gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات. يرجى المحاولة بعد قليل." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى شحن رصيد AI في إعدادات المنصة." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error("حدث خطأ في خدمة الذكاء الاصطناعي. يرجى المحاولة لاحقاً.");
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || "عذراً، لم أتمكن من معالجة طلبك.";

    // Store messages
    await adminClient.from("ai_chat_messages").insert([
      { session_id: sessionId, role: "user", content: message },
      { session_id: sessionId, role: "assistant", content: reply, metadata: { intent: intent.tables } },
    ]);

    // Update session
    await adminClient.from("ai_chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return new Response(
      JSON.stringify({ reply, session_id: sessionId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[ai-assistant] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "حدث خطأ غير متوقع" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
