import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface AgentInfo {
  id: string;
  name: string;
  name_ar: string | null;
  email: string;
  phone: string | null;
  logo_url: string | null;
  plan: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  monthly_price: number | null;
}

interface AgentContextType {
  agentId: string | null;
  agent: AgentInfo | null;
  agentFeatures: Record<string, boolean>;
  loading: boolean;
  isSubscriptionActive: boolean;
  isThiqaSuperAdmin: boolean;
  hasFeature: (featureKey: string) => boolean;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

const BASIC_BLOCKED_FEATURES = [
  'sms',
  'financial_reports',
  'broker_wallet',
  'company_settlement',
  'expenses',
  'cheques',
];

export function AgentProvider({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [agentFeatures, setAgentFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const isThiqaSuperAdmin = isSuperAdmin;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAgentId(null);
      setAgent(null);
      setAgentFeatures({});
      setLoading(false);
      return;
    }

    // Super admin doesn't need agent context
    if (isThiqaSuperAdmin) {
      setLoading(false);
      return;
    }

    const fetchAgentContext = async () => {
      try {
        // 1. Get agent_id from agent_users
        const { data: agentUser } = await supabase
          .from('agent_users')
          .select('agent_id')
          .eq('user_id', user.id)
          .single();

        if (!agentUser) {
          // No agent mapping - legacy user or not assigned
          setLoading(false);
          return;
        }

        setAgentId(agentUser.agent_id);

        // 2. Get agent details
        const { data: agentData } = await supabase
          .from('agents')
          .select('*')
          .eq('id', agentUser.agent_id)
          .single();

        if (agentData) {
          setAgent(agentData as AgentInfo);
        }

        // 3. Get feature flags
        const { data: flags } = await supabase
          .from('agent_feature_flags')
          .select('feature_key, enabled')
          .eq('agent_id', agentUser.agent_id);

        const featureMap: Record<string, boolean> = {};
        if (flags) {
          flags.forEach((f: any) => {
            featureMap[f.feature_key] = f.enabled;
          });
        }
        setAgentFeatures(featureMap);
      } catch (error) {
        console.error('Error fetching agent context:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentContext();
  }, [user, authLoading, isThiqaSuperAdmin]);

  const isSubscriptionActive = isThiqaSuperAdmin || !agent || 
    (agent.subscription_status === 'active' || agent.subscription_status === 'trial') &&
    (!agent.subscription_expires_at || new Date(agent.subscription_expires_at) > new Date());

  const hasFeature = (featureKey: string): boolean => {
    // Super admin has all features
    if (isThiqaSuperAdmin) return true;
    // No agent = legacy mode, everything enabled
    if (!agent) return true;
    // Check explicit flag override first
    if (featureKey in agentFeatures) return agentFeatures[featureKey];
    // Pro plan: everything enabled by default
    if (agent.plan === 'pro') return true;
    // Basic plan: check if feature is blocked
    if (BASIC_BLOCKED_FEATURES.includes(featureKey)) return false;
    // Default: enabled
    return true;
  };

  return (
    <AgentContext.Provider value={{
      agentId,
      agent,
      agentFeatures,
      loading,
      isSubscriptionActive,
      isThiqaSuperAdmin,
      hasFeature,
    }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgentContext must be used within an AgentProvider');
  }
  return context;
}
