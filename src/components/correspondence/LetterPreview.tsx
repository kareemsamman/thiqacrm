import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeHtml } from '@/lib/sanitize';
import { Skeleton } from '@/components/ui/skeleton';

interface CompanyInfo {
  company_name?: string;
  company_logo_url?: string;
  company_phone_links?: Array<{ phone: string; label?: string; link_type?: string }>;
}

interface LetterPreviewProps {
  recipientName: string;
  bodyHtml: string;
  className?: string;
}

export function LetterPreview({ recipientName, bodyHtml, className }: LetterPreviewProps) {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanyInfo() {
      try {
        // Use 'any' cast since company_info table may not be in generated types
        const { data, error } = await (supabase as any)
          .from('company_info')
          .select('company_name, company_logo_url, company_phone_links')
          .single();
        
        if (error) throw error;
        
        // Parse phone_links if it's a string
        let phoneLinks = data?.company_phone_links;
        if (phoneLinks && typeof phoneLinks === 'string') {
          try {
            phoneLinks = JSON.parse(phoneLinks);
          } catch {
            phoneLinks = [];
          }
        }
        
        setCompanyInfo({
          company_name: data?.company_name || undefined,
          company_logo_url: data?.company_logo_url || undefined,
          company_phone_links: phoneLinks as CompanyInfo['company_phone_links'],
        });
      } catch (error) {
        console.error('Error fetching company info:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCompanyInfo();
  }, []);

  if (loading) {
    return (
      <div className={className}>
        <Skeleton className="h-20 w-full mb-4" />
        <Skeleton className="h-40 w-full mb-4" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const phoneLinks = Array.isArray(companyInfo?.company_phone_links) 
    ? companyInfo.company_phone_links 
    : [];

  return (
    <div 
      className={className}
      style={{ 
        direction: 'rtl',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
      }}
    >
      {/* Header with Logo */}
      <div style={{ textAlign: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
        {companyInfo?.company_logo_url ? (
          <img 
            src={companyInfo.company_logo_url} 
            alt={companyInfo?.company_name || 'Logo'}
            style={{ maxHeight: '80px', marginBottom: '10px' }}
          />
        ) : (
          <div style={{ 
            width: '80px', 
            height: '80px', 
            backgroundColor: 'hsl(var(--primary))', 
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '24px',
            marginBottom: '10px',
          }}>
            AB
          </div>
        )}
        {recipientName && (
          <div style={{ marginTop: '16px', fontSize: '18px', fontWeight: '600' }}>
            إلى: {recipientName}
          </div>
        )}
      </div>

      {/* Body Content */}
      <div 
        style={{ 
          lineHeight: '2', 
          minHeight: '300px',
          whiteSpace: 'pre-wrap',
        }}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyHtml) }}
      />

      {/* Footer */}
      <div style={{ 
        marginTop: '40px', 
        paddingTop: '20px', 
        borderTop: '2px solid #e5e7eb',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px',
      }}>
        <p style={{ fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
          {companyInfo?.company_name || 'مكتب بشير للتأمين'}
        </p>
        {phoneLinks.length > 0 && (
          <p>
            {phoneLinks.map((p, i) => (
              <span key={i}>
                {i > 0 && ' | '}
                {p.label ? `${p.label}: ` : ''}{p.phone}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
