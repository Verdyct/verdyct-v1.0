-- =============================================================================
-- 0004 — Row Level Security policies
-- Spec L2 section 6 + pattern standard pour toutes tables avec organization_id
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Activation RLS (spec L2 section 6, liste exacte)
-- ---------------------------------------------------------------------------

-- Tables tenancy (définies en 0002)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- users : RLS mais pas de organization_id — policy spéciale ci-dessous
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Tables métier (définies en 0003)
ALTER TABLE partie_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE partie_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bti_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_dossier ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbam_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbam_quarterly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_inbound_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE relances ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_funnel ENABLE ROW LEVEL SECURITY;

-- stripe_webhook_events : table interne, accessible uniquement via service_role
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Cas spéciaux (spec L2 section 6 — recopie exacte)
-- ---------------------------------------------------------------------------

-- organizations : un user ne voit que son org
CREATE POLICY "select_own_org" ON organizations
  FOR SELECT USING (id = public.current_org_id());

-- organization_members : un user voit les autres membres de son org
CREATE POLICY "select_org_members" ON organization_members
  FOR SELECT USING (organization_id = public.current_org_id());

-- users : un user voit son propre profil et les profils des autres membres de son org
CREATE POLICY "select_self_or_org_member" ON users
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (SELECT user_id FROM organization_members WHERE organization_id = public.current_org_id())
  );

-- parties : données publiques — pas de RLS
ALTER TABLE parties DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON parties TO authenticated;

-- decision_log : SELECT same-org seulement, INSERT via service_role uniquement
CREATE POLICY "select_same_org" ON decision_log
  FOR SELECT USING (organization_id = public.current_org_id());

REVOKE INSERT, UPDATE, DELETE ON decision_log FROM authenticated;
GRANT INSERT ON decision_log TO service_role;

-- ---------------------------------------------------------------------------
-- Pattern standard — toutes tables métier avec organization_id
-- SELECT + INSERT + UPDATE, pas de DELETE (soft-delete via deleted_at)
-- ---------------------------------------------------------------------------

-- subscriptions
CREATE POLICY "select_same_org" ON subscriptions
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON subscriptions
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "update_same_org" ON subscriptions
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- partie_relations
CREATE POLICY "select_same_org" ON partie_relations
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON partie_relations
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "update_same_org" ON partie_relations
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- partie_contacts
CREATE POLICY "select_same_org" ON partie_contacts
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON partie_contacts
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "update_same_org" ON partie_contacts
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- bti_records
CREATE POLICY "select_same_org" ON bti_records
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON bti_records
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "update_same_org" ON bti_records
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- dossiers
CREATE POLICY "select_same_org" ON dossiers
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON dossiers
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "update_same_org" ON dossiers
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- dossier_documents
CREATE POLICY "select_same_org" ON dossier_documents
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON dossier_documents
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "update_same_org" ON dossier_documents
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- lignes_dossier
CREATE POLICY "select_same_org" ON lignes_dossier
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON lignes_dossier
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "update_same_org" ON lignes_dossier
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- suggestions
CREATE POLICY "select_same_org" ON suggestions
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON suggestions
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "update_same_org" ON suggestions
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- cbam_data
CREATE POLICY "select_same_org" ON cbam_data
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON cbam_data
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "update_same_org" ON cbam_data
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- cbam_quarterly_reports
CREATE POLICY "select_same_org" ON cbam_quarterly_reports
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON cbam_quarterly_reports
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "update_same_org" ON cbam_quarterly_reports
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- email_inbound_addresses
CREATE POLICY "select_same_org" ON email_inbound_addresses
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON email_inbound_addresses
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "update_same_org" ON email_inbound_addresses
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- relances
CREATE POLICY "select_same_org" ON relances
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON relances
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "update_same_org" ON relances
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- notifications
CREATE POLICY "select_same_org" ON notifications
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON notifications
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "update_same_org" ON notifications
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- metric_events (organization_id nullable : les events sans org sont écrits via service_role uniquement)
CREATE POLICY "select_same_org" ON metric_events
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON metric_events
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

-- invitations (spec L3 section 6.1)
CREATE POLICY "select_same_org" ON invitations
  FOR SELECT USING (organization_id = public.current_org_id());
CREATE POLICY "insert_same_org" ON invitations
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "update_same_org" ON invitations
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- inbound_email_log : écrit par le webhook (service_role), lu par l'org concernée
CREATE POLICY "select_same_org" ON inbound_email_log
  FOR SELECT USING (organization_id = public.current_org_id());

-- onboarding_funnel : scopé au user (pas d'organization_id)
-- Lecture : self ou tout membre de l'org (pour le dashboard admin interne)
CREATE POLICY "select_same_org" ON onboarding_funnel
  FOR SELECT USING (
    user_id IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = public.current_org_id()
    )
  );
CREATE POLICY "insert_same_org" ON onboarding_funnel
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = public.current_org_id()
    )
  );
CREATE POLICY "update_same_org" ON onboarding_funnel
  FOR UPDATE USING (
    user_id IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = public.current_org_id()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = public.current_org_id()
    )
  );

-- stripe_webhook_events : aucun accès depuis authenticated (service_role uniquement)
-- Pas de policy → RLS activé + aucune policy = aucun accès pour authenticated
