import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Date conversion: d-m-Y to YYYY-MM-DD
function convertDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const match = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

// Policy type parent mapping
function mapPolicyTypeParent(wpType: string | null | undefined): string | null {
  if (!wpType) return null;
  const mapping: Record<string, string> = {
    'ELZAMI': 'ELZAMI',
    'THIRD_FULL': 'THIRD_FULL',
    'ROAD_SERVICE': 'ROAD_SERVICE',
    'ACCIDENT_FEE_EXEMPTION': 'ACCIDENT_FEE_EXEMPTION',
    'HEALTH': 'HEALTH',
    'LIFE': 'LIFE',
    'PROPERTY': 'PROPERTY',
    'TRAVEL': 'TRAVEL',
    'BUSINESS': 'BUSINESS',
    'OTHER': 'OTHER',
  };
  return mapping[wpType.toUpperCase()] || null;
}

// Policy type child mapping
function mapPolicyTypeChild(wpType: string | null | undefined): string | null {
  if (!wpType) return null;
  const mapping: Record<string, string> = {
    'THIRD': 'THIRD',
    'FULL': 'FULL',
  };
  return mapping[wpType.toUpperCase()] || null;
}

// Car type mapping from Arabic to enum
function mapCarType(wpType: string | null | undefined): string {
  if (!wpType) return 'car';
  const mapping: Record<string, string> = {
    'car': 'car',
    'cargo': 'cargo',
    'small': 'small',
    'taxi': 'taxi',
    'tjeradown4': 'tjeradown4',
    'tjeraup4': 'tjeraup4',
    'سيارة': 'car',
    'شاحنة': 'cargo',
    'صغيرة': 'small',
    'تكسي': 'taxi',
    'تجارية تحت 4 طن': 'tjeradown4',
    'تجارية فوق 4 طن': 'tjeraup4',
  };
  return mapping[wpType.toLowerCase()] || 'car';
}

// Payment type mapping
function mapPaymentType(wpType: string | null | undefined): string {
  if (!wpType) return 'cash';
  const mapping: Record<string, string> = {
    'cash': 'cash',
    'كاش': 'cash',
    'cheque': 'cheque',
    'check': 'cheque',
    'شيك': 'cheque',
    'visa': 'visa',
    'فيزا': 'visa',
    'transfer': 'transfer',
    'حوالة': 'transfer',
    'bank_transfer': 'transfer',
  };
  return mapping[wpType.toLowerCase()] || 'cash';
}

// Map parent term name to category
function mapCategoryFromParentTerm(termName: string | null | undefined): string | null {
  if (!termName) return null;
  const mapping: Record<string, string> = {
    'الزامي': 'ELZAMI',
    'ثالث/شامل': 'THIRD_FULL',
    'خدمات الطريق': 'ROAD_SERVICE',
    'اعفاء رسوم حادث': 'ACCIDENT_FEE_EXEMPTION',
  };
  return mapping[termName] || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, data, entityType, batch } = await req.json();

    // Action: Clear all data
    if (action === 'clear') {
      console.log('Clearing all data...');
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

    // Action: Get existing mappings (for reference during batch imports)
    if (action === 'getMappings') {
      const [companiesRes, brokersRes, clientsRes, carsRes, policiesRes] = await Promise.all([
        supabase.from('insurance_companies').select('id, name'),
        supabase.from('brokers').select('id, name'),
        supabase.from('clients').select('id, id_number').is('deleted_at', null),
        supabase.from('cars').select('id, car_number').is('deleted_at', null),
        supabase.from('policies').select('id, legacy_wp_id').is('deleted_at', null),
      ]);

      const mappings = {
        companies: Object.fromEntries((companiesRes.data || []).map(c => [c.name.toLowerCase(), c.id])),
        brokers: Object.fromEntries((brokersRes.data || []).map(b => [b.name.toLowerCase(), b.id])),
        clients: Object.fromEntries((clientsRes.data || []).map(c => [c.id_number, c.id])),
        cars: Object.fromEntries((carsRes.data || []).map(c => [c.car_number, c.id])),
        policies: Object.fromEntries((policiesRes.data || []).filter(p => p.legacy_wp_id).map(p => [p.legacy_wp_id, p.id])),
      };

      return new Response(JSON.stringify({ success: true, mappings }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Action: Import a batch of a specific entity type
    if (action === 'importBatch') {
      const stats = { inserted: 0, updated: 0, errors: [] as string[] };
      const newMappings: Record<string, string> = {};
      const mappings = data.mappings || {};

      if (entityType === 'companies') {
        for (const company of batch || []) {
          try {
            const { data: existing } = await supabase
              .from('insurance_companies')
              .select('id')
              .ilike('name', company.name)
              .maybeSingle();

            const companyData = {
              name: company.name,
              name_ar: company.name,
              active: true,
              category_parent: company.category_parent,
            };

            if (existing) {
              await supabase.from('insurance_companies').update(companyData).eq('id', existing.id);
              newMappings[company.name.toLowerCase()] = existing.id;
              stats.updated++;
            } else {
              const { data: inserted, error } = await supabase
                .from('insurance_companies')
                .insert(companyData)
                .select('id')
                .single();
              if (inserted) {
                newMappings[company.name.toLowerCase()] = inserted.id;
                stats.inserted++;
              } else if (error) {
                stats.errors.push(`Company ${company.name}: ${error.message}`);
              }
            }
          } catch (e: any) {
            stats.errors.push(`Company ${company.name}: ${e.message}`);
          }
        }
      }

      if (entityType === 'brokers') {
        for (const broker of batch || []) {
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
              await supabase.from('brokers').update(brokerData).eq('id', existing.id);
              newMappings[broker.name.toLowerCase()] = existing.id;
              stats.updated++;
            } else {
              const { data: inserted, error } = await supabase
                .from('brokers')
                .insert(brokerData)
                .select('id')
                .single();
              if (inserted) {
                newMappings[broker.name.toLowerCase()] = inserted.id;
                stats.inserted++;
              } else if (error) {
                stats.errors.push(`Broker ${broker.name}: ${error.message}`);
              }
            }
          } catch (e: any) {
            stats.errors.push(`Broker ${broker.name}: ${e.message}`);
          }
        }
      }

      if (entityType === 'clients') {
        for (const client of batch || []) {
          try {
            if (!client.id_number) {
              stats.errors.push(`Client missing id_number: ${client.full_name}`);
              continue;
            }

            const { data: existing } = await supabase
              .from('clients')
              .select('id')
              .eq('id_number', client.id_number)
              .is('deleted_at', null)
              .maybeSingle();

            const brokerId = client.broker_name ? mappings.brokers?.[client.broker_name.toLowerCase()] : null;

            const clientData = {
              full_name: client.full_name || 'غير معروف',
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
              await supabase.from('clients').update(clientData).eq('id', existing.id);
              newMappings[client.id_number] = existing.id;
              stats.updated++;
            } else {
              const { data: inserted, error } = await supabase
                .from('clients')
                .insert(clientData)
                .select('id')
                .single();
              if (inserted) {
                newMappings[client.id_number] = inserted.id;
                stats.inserted++;
              } else if (error) {
                stats.errors.push(`Client ${client.id_number}: ${error.message}`);
              }
            }
          } catch (e: any) {
            stats.errors.push(`Client ${client.id_number}: ${e.message}`);
          }
        }
      }

      if (entityType === 'cars') {
        for (const car of batch || []) {
          try {
            const clientId = car.client_id_number ? mappings.clients?.[car.client_id_number] : null;
            if (!clientId) {
              stats.errors.push(`Car ${car.car_number}: Client not found: ${car.client_id_number}`);
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
              car_type: mapCarType(car.car_type),
              license_type: car.license_type || null,
              last_license: convertDate(car.last_license),
              license_expiry: convertDate(car.license_finish),
            };

            if (existing) {
              await supabase.from('cars').update(carData).eq('id', existing.id);
              newMappings[car.car_number] = existing.id;
              stats.updated++;
            } else {
              const { data: inserted, error } = await supabase
                .from('cars')
                .insert(carData)
                .select('id')
                .single();
              if (inserted) {
                newMappings[car.car_number] = inserted.id;
                stats.inserted++;
              } else if (error) {
                stats.errors.push(`Car ${car.car_number}: ${error.message}`);
              }
            }
          } catch (e: any) {
            stats.errors.push(`Car ${car.car_number}: ${e.message}`);
          }
        }
      }

      if (entityType === 'policies') {
        for (const policy of batch || []) {
          try {
            const clientIdNumber = policy.client_id_number;
            if (!clientIdNumber) {
              stats.errors.push(`Policy ${policy.legacy_wp_id}: No client id_number`);
              continue;
            }

            const clientId = mappings.clients?.[clientIdNumber];
            if (!clientId) {
              stats.errors.push(`Policy ${policy.legacy_wp_id}: Client not found: ${clientIdNumber}`);
              continue;
            }

            const carId = policy.car_number ? mappings.cars?.[policy.car_number] : null;
            const companyId = policy.company_name ? mappings.companies?.[policy.company_name.toLowerCase()] : null;
            const brokerId = policy.broker_name ? mappings.brokers?.[policy.broker_name.toLowerCase()] : null;

            const policyTypeParent = mapPolicyTypeParent(policy.policy_type_parent);
            if (!policyTypeParent) {
              stats.errors.push(`Policy ${policy.legacy_wp_id}: Invalid policy type: ${policy.policy_type_parent}`);
              continue;
            }

            const { data: existing } = await supabase
              .from('policies')
              .select('id')
              .eq('legacy_wp_id', policy.legacy_wp_id)
              .is('deleted_at', null)
              .maybeSingle();

            const policyData = {
              legacy_wp_id: policy.legacy_wp_id,
              policy_number: policy.policy_number_hint || null,
              client_id: clientId,
              car_id: carId,
              company_id: companyId,
              broker_id: brokerId,
              policy_type_parent: policyTypeParent,
              policy_type_child: mapPolicyTypeChild(policy.policy_type_child),
              start_date: convertDate(policy.start_date) || new Date().toISOString().split('T')[0],
              end_date: convertDate(policy.end_date) || new Date().toISOString().split('T')[0],
              insurance_price: parseFloat(policy.insurance_price) || 0,
              profit: parseFloat(policy.profit) || 0,
              payed_for_company: parseFloat(policy.payed_for_company) || 0,
              is_under_24: policy.is_under_24 === true,
              cancelled: policy.cancelled === true,
              transferred: policy.transferred === true,
              transferred_car_number: policy.transferred_car_number || null,
              notes: policy.notes || null,
              calc_status: policy.calc_status || 'done',
            };

            if (existing) {
              await supabase.from('policies').update(policyData).eq('id', existing.id);
              newMappings[policy.legacy_wp_id] = existing.id;
              stats.updated++;
            } else {
              const { data: inserted, error } = await supabase
                .from('policies')
                .insert(policyData)
                .select('id')
                .single();
              if (inserted) {
                newMappings[policy.legacy_wp_id] = inserted.id;
                stats.inserted++;
              } else if (error) {
                stats.errors.push(`Policy ${policy.legacy_wp_id}: ${error.message}`);
              }
            }
          } catch (e: any) {
            stats.errors.push(`Policy ${policy.legacy_wp_id}: ${e.message}`);
          }
        }
      }

      if (entityType === 'payments') {
        for (const payment of batch || []) {
          try {
            const policyId = payment.policy_legacy_wp_id ? mappings.policies?.[payment.policy_legacy_wp_id] : null;
            if (!policyId) {
              continue; // Skip if policy not found
            }

            const paymentDate = convertDate(payment.date);
            if (!paymentDate) continue;

            const amount = parseFloat(payment.amount) || 0;
            if (amount <= 0) continue;

            const { data: existingPayment } = await supabase
              .from('policy_payments')
              .select('id')
              .eq('policy_id', policyId)
              .eq('payment_date', paymentDate)
              .eq('amount', amount)
              .maybeSingle();

            if (!existingPayment) {
              const { error } = await supabase
                .from('policy_payments')
                .insert({
                  policy_id: policyId,
                  payment_type: mapPaymentType(payment.payment_type) as any,
                  amount: amount,
                  payment_date: paymentDate,
                  cheque_number: payment.check_number || null,
                  cheque_image_url: payment.check_image_url || null,
                  refused: payment.refused_status === 'refused',
                });
              if (error) {
                stats.errors.push(`Payment: ${error.message}`);
              } else {
                stats.inserted++;
              }
            } else {
              stats.updated++;
            }
          } catch (e: any) {
            stats.errors.push(`Payment: ${e.message}`);
          }
        }
      }

      if (entityType === 'media') {
        for (const media of batch || []) {
          try {
            const policyId = media.policy_legacy_wp_id ? mappings.policies?.[media.policy_legacy_wp_id] : null;
            if (!policyId || !media.url) continue;

            const { data: existingMedia } = await supabase
              .from('media_files')
              .select('id')
              .eq('cdn_url', media.url)
              .maybeSingle();

            if (!existingMedia) {
              const fileName = media.url.split('/').pop() || 'file';
              const mimeType = media.url.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

              await supabase
                .from('media_files')
                .insert({
                  cdn_url: media.url,
                  storage_path: media.url,
                  original_name: fileName,
                  mime_type: mimeType,
                  size: 0,
                  entity_type: 'policy',
                  entity_id: policyId,
                });
              stats.inserted++;
            } else {
              stats.updated++;
            }
          } catch (e: any) {
            stats.errors.push(`Media: ${e.message}`);
          }
        }
      }

      if (entityType === 'outsideCheques') {
        for (const cheque of batch || []) {
          try {
            const { data: existing } = await supabase
              .from('outside_cheques')
              .select('id')
              .eq('name', cheque.name)
              .eq('amount', parseFloat(cheque.amount) || 0)
              .maybeSingle();

            const chequeData = {
              name: cheque.name || 'غير معروف',
              amount: parseFloat(cheque.amount) || 0,
              cheque_number: cheque.cheque_number || null,
              cheque_date: convertDate(cheque.cheque_date),
              cheque_image_url: cheque.cheque_image_url || null,
              notes: cheque.notes || null,
              refused: cheque.refused === true,
              used: cheque.used === true,
            };

            if (existing) {
              await supabase.from('outside_cheques').update(chequeData).eq('id', existing.id);
              stats.updated++;
            } else {
              const { error } = await supabase.from('outside_cheques').insert(chequeData);
              if (error) {
                stats.errors.push(`Cheque ${cheque.name}: ${error.message}`);
              } else {
                stats.inserted++;
              }
            }
          } catch (e: any) {
            stats.errors.push(`Cheque: ${e.message}`);
          }
        }
      }

      return new Response(JSON.stringify({ success: true, stats, newMappings }), {
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
