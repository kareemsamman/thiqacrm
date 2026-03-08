/**
 * Shared helper to fetch agent branding (company name, logo, etc.)
 * from the site_settings table. Used by all HTML-generating edge functions.
 */

export interface AgentBranding {
  companyName: string;
  companyNameEn: string;
  logoUrl: string | null;
  siteDescription: string;
}

const DEFAULT_BRANDING: AgentBranding = {
  companyName: 'وكالة التأمين',
  companyNameEn: 'Insurance Agency',
  logoUrl: null,
  siteDescription: '',
};

/**
 * Fetch branding for a given agent from site_settings.
 * Falls back to defaults if no settings found.
 */
export async function getAgentBranding(
  supabase: any,
  agentId: string | null
): Promise<AgentBranding> {
  if (!agentId) return DEFAULT_BRANDING;

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('site_title, site_description, logo_url')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (error || !data) return DEFAULT_BRANDING;

    return {
      companyName: data.site_title || DEFAULT_BRANDING.companyName,
      companyNameEn: '', // Agents can add English name later if needed
      logoUrl: data.logo_url || null,
      siteDescription: data.site_description || '',
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

/**
 * Resolve agent_id from an authenticated user via agent_users table.
 */
export async function resolveAgentId(
  supabase: any,
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('agent_users')
      .select('agent_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data.agent_id;
  } catch {
    return null;
  }
}

/**
 * Build the logo HTML for invoice/receipt headers.
 * If logo_url exists, renders an <img>. Otherwise renders company name as text.
 */
export function buildLogoHtml(branding: AgentBranding): string {
  if (branding.logoUrl) {
    return `<img src="${branding.logoUrl}" alt="${branding.companyName}" style="max-height:60px;object-fit:contain;margin:0 auto 8px auto;display:block;" />`;
  }
  return '';
}

/**
 * Build footer brand HTML using dynamic branding.
 */
export function buildFooterBrandHtml(branding: AgentBranding): string {
  const parts = [`<div class="footer-brand-ar">${branding.companyName}</div>`];
  if (branding.companyNameEn) {
    parts.push(`<div class="footer-brand-en">${branding.companyNameEn}</div>`);
  }
  return `<div class="footer-brand">${parts.join('\n')}</div>`;
}
