import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProfitSummary {
  todayProfit: number;
  monthProfit: number;
  yearProfit: number;
  totalCompanyPaymentDue: number;
}

export function useProfitSummary() {
  const [summary, setSummary] = useState<ProfitSummary>({
    todayProfit: 0,
    monthProfit: 0,
    yearProfit: 0,
    totalCompanyPaymentDue: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

      // Fetch all active policies for the year with profit data
      const { data: policies, error } = await supabase
        .from('policies')
        .select('start_date, profit, payed_for_company')
        .is('deleted_at', null)
        .eq('cancelled', false)
        .gte('start_date', yearStart);

      if (error) throw error;

      let todayProfit = 0;
      let monthProfit = 0;
      let yearProfit = 0;
      let totalCompanyPaymentDue = 0;

      policies?.forEach((policy) => {
        const profit = Number(policy.profit) || 0;
        const companyPayment = Number(policy.payed_for_company) || 0;

        yearProfit += profit;
        totalCompanyPaymentDue += companyPayment;

        if (policy.start_date >= monthStart) {
          monthProfit += profit;
        }

        if (policy.start_date === today) {
          todayProfit += profit;
        }
      });

      setSummary({
        todayProfit,
        monthProfit,
        yearProfit,
        totalCompanyPaymentDue,
      });
    } catch (error) {
      console.error('Error fetching profit summary:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, refetch: fetchSummary };
}
