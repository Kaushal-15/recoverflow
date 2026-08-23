-- Align the existing default guarded policy with the full RecoverFlow action set.
update public.merchant_policies
set permitted_action_types = '["SIMULATED_RETRY","PAYMENT_LINK_FALLBACK","REMINDER","HUMAN_ESCALATION"]'::jsonb
where name = 'Default guarded recovery policy'
  and is_active = true
  and not (permitted_action_types @> '["HUMAN_ESCALATION"]'::jsonb);
