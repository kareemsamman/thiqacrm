import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportStats {
  insuranceCompanies: { inserted: number; updated: number; errors: string[] };
  pricingRules: { inserted: number; updated: number; errors: string[] };
  brokers: { inserted: number; updated: number; errors: string[] };
  clients: { inserted: number; updated: number; errors: string[] };
  cars: { inserted: number; updated: number; errors: string[] };
  policies: { inserted: number; updated: number; errors: string[] };
  payments: { inserted: number; updated: number; errors: string[] };
  outsideCheques: { inserted: number; updated: number; errors: string[] };
  invoices: { inserted: number; updated: number; errors: string[] };
  mediaFiles: { inserted: number; updated: number; errors: string[] };
  carAccidents: { inserted: number; updated: number; errors: string[] };
}

// Date conversion: d-m-Y to YYYY-MM-DD
function convertDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  // Check if already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Convert d-m-Y to YYYY-MM-DD
  const match = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

// Policy type parent mapping
function mapPolicyTypeParent(wpType: string): string | null {
  const mapping: Record<string, string> = {
    'ELZAMI': 'ELZAMI',
    'THIRD_FULL': 'THIRD_FULL',
    'ROAD_SERVICE': 'ROAD_SERVICE',
    'ACCIDENT_FEE_EXEMPTION': 'ACCIDENT_FEE_EXEMPTION',
  };
  return mapping[wpType?.toUpperCase()] || null;
}

// Policy type child mapping
function mapPolicyTypeChild(wpType: string): string | null {
  const mapping: Record<string, string> = {
    'THIRD': 'THIRD',
    'FULL': 'FULL',
  };
  return mapping[wpType?.toUpperCase()] || null;
}

// Car type mapping
function mapCarType(wpType: string): string {
  const mapping: Record<string, string> = {
    'car': 'car',
    'motorcycle': 'motorcycle',
    'truck': 'truck',
    'bus': 'bus',
    'trailer': 'trailer',
    'tractor': 'tractor',
    'special': 'special',
  };
  return mapping[wpType?.toLowerCase()] || 'car';
}

// Payment type mapping
function mapPaymentType(wpType: string): string {
  const mapping: Record<string, string> = {
    'cash': 'cash',
    'cheque': 'cheque',
    'bank_transfer': 'bank_transfer',
    'credit_card': 'credit_card',
  };
  return mapping[wpType?.toLowerCase()] || 'cash';
}

// Rule type mapping
function mapRuleType(wpType: string): string | null {
  const mapping: Record<string, string> = {
    'THIRD_PRICE': 'THIRD_PRICE',
    'FULL_PERCENT': 'FULL_PERCENT',
    'MIN_PRICE': 'MIN_PRICE',
    'DISCOUNT': 'DISCOUNT',
    'ROAD_SERVICE_BASE': 'ROAD_SERVICE_BASE',
    'ROAD_SERVICE_PRICE': 'ROAD_SERVICE_PRICE',
    'ROAD_SERVICE_EXTRA_OLD_CAR': 'ROAD_SERVICE_EXTRA_OLD_CAR',
  };
  return mapping[wpType?.toUpperCase()] || null;
}

// Age band mapping
function mapAgeBand(wpBand: string): string {
  const mapping: Record<string, string> = {
    'UNDER_24': 'UNDER_24',
    'OVER_24': 'OVER_24',
    'ANY': 'ANY',
  };
  return mapping[wpBand?.toUpperCase()] || 'ANY';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, data, clearBeforeImport } = await req.json();

    if (action === 'preview') {
      // Return counts of each entity in the JSON
      const counts = {
        insuranceCompanies: data.insurance_companies?.length || 0,
        pricingRules: data.pricing_rules?.length || 0,
        brokers: data.brokers?.length || 0,
        clients: data.clients?.length || 0,
        cars: data.cars?.length || 0,
        policies: data.policies?.length || 0,
        payments: data.policy_payments?.length || 0,
        outsideCheques: data.outside_cheques?.length || 0,
        invoices: data.invoices?.length || 0,
        mediaFiles: data.media_files?.length || 0,
        carAccidents: data.car_accidents?.length || 0,
      };
      return new Response(JSON.stringify({ success: true, counts }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'clear') {
      // Clear all data except insurance_companies, pricing_rules, branches, profiles, user_roles
      console.log('Clearing all data...');
      
      // Delete in correct order (respecting foreign keys)
      await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('policy_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('customer_signatures').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('car_accidents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('media_files').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('policies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('outside_cheques').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('cars').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('brokers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      return new Response(JSON.stringify({ success: true, message: 'All data cleared' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'import') {
      const stats: ImportStats = {
        insuranceCompanies: { inserted: 0, updated: 0, errors: [] },
        pricingRules: { inserted: 0, updated: 0, errors: [] },
        brokers: { inserted: 0, updated: 0, errors: [] },
        clients: { inserted: 0, updated: 0, errors: [] },
        cars: { inserted: 0, updated: 0, errors: [] },
        policies: { inserted: 0, updated: 0, errors: [] },
        payments: { inserted: 0, updated: 0, errors: [] },
        outsideCheques: { inserted: 0, updated: 0, errors: [] },
        invoices: { inserted: 0, updated: 0, errors: [] },
        mediaFiles: { inserted: 0, updated: 0, errors: [] },
        carAccidents: { inserted: 0, updated: 0, errors: [] },
      };

      // Maps for tracking legacy IDs to new UUIDs
      const companyMap = new Map<string, string>(); // wp_name -> uuid
      const brokerMap = new Map<string, string>(); // wp_name -> uuid
      const clientMap = new Map<string, string>(); // wp_id_number -> uuid
      const carMap = new Map<string, string>(); // wp_car_number -> uuid
      const policyMap = new Map<number, string>(); // wp_id -> uuid

      // Clear data if requested
      if (clearBeforeImport) {
        console.log('Clearing data before import...');
        await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('policy_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('customer_signatures').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('car_accidents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('media_files').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('policies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('outside_cheques').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('cars').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('brokers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      // 1. Import Insurance Companies
      console.log('Importing insurance companies...');
      for (const company of data.insurance_companies || []) {
        try {
          const { data: existing } = await supabase
            .from('insurance_companies')
            .select('id')
            .ilike('name', company.name)
            .maybeSingle();

          const companyData = {
            name: company.name,
            name_ar: company.name_ar || null,
            active: company.active !== false,
            category_parent: mapPolicyTypeParent(company.category_parent) || null,
          };

          if (existing) {
            await supabase
              .from('insurance_companies')
              .update(companyData)
              .eq('id', existing.id);
            companyMap.set(company.name.toLowerCase(), existing.id);
            stats.insuranceCompanies.updated++;
          } else {
            const { data: inserted } = await supabase
              .from('insurance_companies')
              .insert(companyData)
              .select('id')
              .single();
            if (inserted) {
              companyMap.set(company.name.toLowerCase(), inserted.id);
              stats.insuranceCompanies.inserted++;
            }
          }
        } catch (e: any) {
          stats.insuranceCompanies.errors.push(`Company ${company.name}: ${e.message}`);
        }
      }

      // 2. Import Pricing Rules
      console.log('Importing pricing rules...');
      for (const rule of data.pricing_rules || []) {
        try {
          const companyId = companyMap.get(rule.company_name?.toLowerCase());
          if (!companyId) {
            stats.pricingRules.errors.push(`Rule: Company not found: ${rule.company_name}`);
            continue;
          }

          const ruleType = mapRuleType(rule.rule_type);
          if (!ruleType) {
            stats.pricingRules.errors.push(`Rule: Invalid rule type: ${rule.rule_type}`);
            continue;
          }

          const policyTypeParent = mapPolicyTypeParent(rule.policy_type_parent);
          if (!policyTypeParent) {
            stats.pricingRules.errors.push(`Rule: Invalid policy type: ${rule.policy_type_parent}`);
            continue;
          }

          const ageBand = mapAgeBand(rule.age_band || 'ANY');
          const carType = mapCarType(rule.car_type || 'car');

          const { data: existing } = await supabase
            .from('pricing_rules')
            .select('id')
            .eq('company_id', companyId)
            .eq('rule_type', ruleType)
            .eq('age_band', ageBand)
            .eq('car_type', carType)
            .eq('policy_type_parent', policyTypeParent)
            .maybeSingle();

          const ruleData = {
            company_id: companyId,
            rule_type: ruleType,
            policy_type_parent: policyTypeParent,
            age_band: ageBand,
            car_type: carType,
            value: parseFloat(rule.value) || 0,
            effective_from: convertDate(rule.effective_from),
            effective_to: convertDate(rule.effective_to),
            notes: rule.notes || null,
          };

          if (existing) {
            await supabase
              .from('pricing_rules')
              .update(ruleData)
              .eq('id', existing.id);
            stats.pricingRules.updated++;
          } else {
            await supabase
              .from('pricing_rules')
              .insert(ruleData);
            stats.pricingRules.inserted++;
          }
        } catch (e: any) {
          stats.pricingRules.errors.push(`Rule: ${e.message}`);
        }
      }

      // 3. Import Brokers
      console.log('Importing brokers...');
      for (const broker of data.brokers || []) {
        try {
          const { data: existing } = await supabase
            .from('brokers')
            .select('id')
            .ilike('name', broker.name)
            .maybeSingle();

          const brokerData = {
            name: broker.name,
            phone: broker.phone || null,
            image_url: broker.image_url || null,
            notes: broker.notes || null,
          };

          if (existing) {
            await supabase
              .from('brokers')
              .update(brokerData)
              .eq('id', existing.id);
            brokerMap.set(broker.name.toLowerCase(), existing.id);
            stats.brokers.updated++;
          } else {
            const { data: inserted } = await supabase
              .from('brokers')
              .insert(brokerData)
              .select('id')
              .single();
            if (inserted) {
              brokerMap.set(broker.name.toLowerCase(), inserted.id);
              stats.brokers.inserted++;
            }
          }
        } catch (e: any) {
          stats.brokers.errors.push(`Broker ${broker.name}: ${e.message}`);
        }
      }

      // 4. Import Clients
      console.log('Importing clients...');
      for (const client of data.clients || []) {
        try {
          const { data: existing } = await supabase
            .from('clients')
            .select('id')
            .eq('id_number', client.id_number)
            .is('deleted_at', null)
            .maybeSingle();

          const brokerId = client.broker_name ? brokerMap.get(client.broker_name.toLowerCase()) : null;

          const clientData = {
            full_name: client.full_name,
            id_number: client.id_number,
            phone_number: client.phone_number || null,
            file_number: client.file_number || null,
            date_joined: convertDate(client.date_joined),
            image_url: client.image_url || null,
            signature_url: client.signature_url || null,
            notes: client.notes || null,
            less_than_24: client.less_than_24 === true,
            broker_id: brokerId,
          };

          if (existing) {
            await supabase
              .from('clients')
              .update(clientData)
              .eq('id', existing.id);
            clientMap.set(client.id_number, existing.id);
            stats.clients.updated++;
          } else {
            const { data: inserted } = await supabase
              .from('clients')
              .insert(clientData)
              .select('id')
              .single();
            if (inserted) {
              clientMap.set(client.id_number, inserted.id);
              stats.clients.inserted++;
            }
          }
        } catch (e: any) {
          stats.clients.errors.push(`Client ${client.id_number}: ${e.message}`);
        }
      }

      // 5. Import Cars
      console.log('Importing cars...');
      for (const car of data.cars || []) {
        try {
          const clientId = clientMap.get(car.client_id_number);
          if (!clientId) {
            stats.cars.errors.push(`Car ${car.car_number}: Client not found: ${car.client_id_number}`);
            continue;
          }

          const { data: existing } = await supabase
            .from('cars')
            .select('id')
            .eq('car_number', car.car_number)
            .is('deleted_at', null)
            .maybeSingle();

          const carData = {
            car_number: car.car_number,
            client_id: clientId,
            manufacturer_name: car.manufacturer_name || null,
            model: car.model || null,
            model_number: car.model_number || null,
            year: car.year ? parseInt(car.year) : null,
            color: car.color || null,
            car_value: car.car_value ? parseFloat(car.car_value) : null,
            car_type: mapCarType(car.car_type || 'car'),
            license_type: car.license_type || null,
            last_license: convertDate(car.last_license),
            license_expiry: convertDate(car.license_expiry),
          };

          if (existing) {
            await supabase
              .from('cars')
              .update(carData)
              .eq('id', existing.id);
            carMap.set(car.car_number, existing.id);
            stats.cars.updated++;
          } else {
            const { data: inserted } = await supabase
              .from('cars')
              .insert(carData)
              .select('id')
              .single();
            if (inserted) {
              carMap.set(car.car_number, inserted.id);
              stats.cars.inserted++;
            }
          }
        } catch (e: any) {
          stats.cars.errors.push(`Car ${car.car_number}: ${e.message}`);
        }
      }

      // 6. Import Policies
      console.log('Importing policies...');
      for (const policy of data.policies || []) {
        try {
          const clientId = clientMap.get(policy.client_id_number);
          if (!clientId) {
            stats.policies.errors.push(`Policy ${policy.wp_id}: Client not found: ${policy.client_id_number}`);
            continue;
          }

          const carId = policy.car_number ? carMap.get(policy.car_number) : null;
          const companyId = policy.company_name ? companyMap.get(policy.company_name.toLowerCase()) : null;
          const brokerId = policy.broker_name ? brokerMap.get(policy.broker_name.toLowerCase()) : null;

          const { data: existing } = await supabase
            .from('policies')
            .select('id')
            .eq('legacy_wp_id', policy.wp_id)
            .is('deleted_at', null)
            .maybeSingle();

          const policyData = {
            legacy_wp_id: policy.wp_id,
            client_id: clientId,
            car_id: carId,
            company_id: companyId,
            broker_id: brokerId,
            policy_number: policy.policy_number || null,
            policy_type_parent: mapPolicyTypeParent(policy.policy_type_parent),
            policy_type_child: mapPolicyTypeChild(policy.policy_type_child),
            start_date: convertDate(policy.start_date),
            end_date: convertDate(policy.end_date),
            insurance_price: parseFloat(policy.insurance_price) || 0,
            profit: parseFloat(policy.profit) || 0,
            payed_for_company: parseFloat(policy.payed_for_company) || 0,
            is_under_24: policy.is_under_24 === true,
            cancelled: policy.cancelled === true,
            transferred: policy.transferred === true,
            transferred_car_number: policy.transferred_car_number || null,
            notes: policy.notes || null,
          };

          if (existing) {
            await supabase
              .from('policies')
              .update(policyData)
              .eq('id', existing.id);
            policyMap.set(policy.wp_id, existing.id);
            stats.policies.updated++;
          } else {
            const { data: inserted } = await supabase
              .from('policies')
              .insert(policyData)
              .select('id')
              .single();
            if (inserted) {
              policyMap.set(policy.wp_id, inserted.id);
              stats.policies.inserted++;
            }
          }
        } catch (e: any) {
          stats.policies.errors.push(`Policy ${policy.wp_id}: ${e.message}`);
        }
      }

      // 7. Import Policy Payments
      console.log('Importing payments...');
      for (const payment of data.policy_payments || []) {
        try {
          const policyId = policyMap.get(payment.policy_wp_id);
          if (!policyId) {
            stats.payments.errors.push(`Payment: Policy not found: ${payment.policy_wp_id}`);
            continue;
          }

          const paymentDate = convertDate(payment.payment_date) || new Date().toISOString().split('T')[0];

          // Match by policy_id + cheque_number + payment_date + amount
          let existing = null;
          if (payment.cheque_number) {
            const { data } = await supabase
              .from('policy_payments')
              .select('id')
              .eq('policy_id', policyId)
              .eq('cheque_number', payment.cheque_number)
              .eq('payment_date', paymentDate)
              .eq('amount', parseFloat(payment.amount) || 0)
              .maybeSingle();
            existing = data;
          }

          const paymentData = {
            policy_id: policyId,
            amount: parseFloat(payment.amount) || 0,
            payment_type: mapPaymentType(payment.payment_type || 'cash'),
            payment_date: paymentDate,
            cheque_number: payment.cheque_number || null,
            cheque_image_url: payment.cheque_image_url || null,
            cheque_status: payment.cheque_status || 'pending',
            refused: payment.refused === true,
            notes: payment.notes || null,
          };

          if (existing) {
            await supabase
              .from('policy_payments')
              .update(paymentData)
              .eq('id', existing.id);
            stats.payments.updated++;
          } else {
            await supabase
              .from('policy_payments')
              .insert(paymentData);
            stats.payments.inserted++;
          }
        } catch (e: any) {
          stats.payments.errors.push(`Payment: ${e.message}`);
        }
      }

      // 8. Import Outside Cheques
      console.log('Importing outside cheques...');
      for (const cheque of data.outside_cheques || []) {
        try {
          const chequeData = {
            name: cheque.name,
            amount: parseFloat(cheque.amount) || 0,
            cheque_number: cheque.cheque_number || null,
            cheque_date: convertDate(cheque.cheque_date),
            cheque_image_url: cheque.cheque_image_url || null,
            used: cheque.used === true,
            refused: cheque.refused === true,
            notes: cheque.notes || null,
          };

          // Match by cheque_number if exists
          let existing = null;
          if (cheque.cheque_number) {
            const { data } = await supabase
              .from('outside_cheques')
              .select('id')
              .eq('cheque_number', cheque.cheque_number)
              .maybeSingle();
            existing = data;
          }

          if (existing) {
            await supabase
              .from('outside_cheques')
              .update(chequeData)
              .eq('id', existing.id);
            stats.outsideCheques.updated++;
          } else {
            await supabase
              .from('outside_cheques')
              .insert(chequeData);
            stats.outsideCheques.inserted++;
          }
        } catch (e: any) {
          stats.outsideCheques.errors.push(`Cheque: ${e.message}`);
        }
      }

      // 9. Import Invoices
      console.log('Importing invoices...');
      for (const invoice of data.invoices || []) {
        try {
          const policyId = policyMap.get(invoice.policy_wp_id);
          if (!policyId) {
            stats.invoices.errors.push(`Invoice: Policy not found: ${invoice.policy_wp_id}`);
            continue;
          }

          // Match by invoice_number
          const { data: existing } = await supabase
            .from('invoices')
            .select('id')
            .eq('invoice_number', invoice.invoice_number)
            .maybeSingle();

          const invoiceData = {
            policy_id: policyId,
            invoice_number: invoice.invoice_number,
            language: invoice.language || 'ar',
            pdf_url: invoice.pdf_url || null,
            status: invoice.status || 'pending',
            metadata_json: invoice.metadata_json || null,
          };

          if (existing) {
            await supabase
              .from('invoices')
              .update(invoiceData)
              .eq('id', existing.id);
            stats.invoices.updated++;
          } else {
            await supabase
              .from('invoices')
              .insert(invoiceData);
            stats.invoices.inserted++;
          }
        } catch (e: any) {
          stats.invoices.errors.push(`Invoice: ${e.message}`);
        }
      }

      // 10. Import Media Files
      console.log('Importing media files...');
      for (const media of data.media_files || []) {
        try {
          // Match by cdn_url
          const { data: existing } = await supabase
            .from('media_files')
            .select('id')
            .eq('cdn_url', media.cdn_url)
            .maybeSingle();

          // Resolve entity_id from legacy references
          let entityId = null;
          if (media.entity_type === 'policy' && media.policy_wp_id) {
            entityId = policyMap.get(media.policy_wp_id);
          } else if (media.entity_type === 'car' && media.car_number) {
            entityId = carMap.get(media.car_number);
          } else if (media.entity_type === 'client' && media.client_id_number) {
            entityId = clientMap.get(media.client_id_number);
          }

          const mediaData = {
            cdn_url: media.cdn_url,
            storage_path: media.storage_path || media.cdn_url,
            original_name: media.original_name || 'imported_file',
            mime_type: media.mime_type || 'application/octet-stream',
            size: media.size || 0,
            entity_type: media.entity_type || null,
            entity_id: entityId,
          };

          if (existing) {
            await supabase
              .from('media_files')
              .update(mediaData)
              .eq('id', existing.id);
            stats.mediaFiles.updated++;
          } else {
            await supabase
              .from('media_files')
              .insert(mediaData);
            stats.mediaFiles.inserted++;
          }
        } catch (e: any) {
          stats.mediaFiles.errors.push(`Media: ${e.message}`);
        }
      }

      // 11. Import Car Accidents
      console.log('Importing car accidents...');
      for (const accident of data.car_accidents || []) {
        try {
          const carId = carMap.get(accident.car_number);
          if (!carId) {
            stats.carAccidents.errors.push(`Accident: Car not found: ${accident.car_number}`);
            continue;
          }

          const accidentDate = convertDate(accident.accident_date);

          // Match by car_id + accident_name + accident_date
          const { data: existing } = await supabase
            .from('car_accidents')
            .select('id')
            .eq('car_id', carId)
            .eq('accident_name', accident.accident_name)
            .eq('accident_date', accidentDate || '1900-01-01')
            .maybeSingle();

          const accidentData = {
            car_id: carId,
            accident_name: accident.accident_name,
            accident_date: accidentDate,
            notes: accident.notes || null,
          };

          if (existing) {
            await supabase
              .from('car_accidents')
              .update(accidentData)
              .eq('id', existing.id);
            stats.carAccidents.updated++;
          } else {
            await supabase
              .from('car_accidents')
              .insert(accidentData);
            stats.carAccidents.inserted++;
          }
        } catch (e: any) {
          stats.carAccidents.errors.push(`Accident: ${e.message}`);
        }
      }

      console.log('Import complete!', stats);

      return new Response(JSON.stringify({ success: true, stats }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
