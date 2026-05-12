-- Enums
CREATE TYPE org_member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE subscription_plan AS ENUM ('starter', 'pro', 'team');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

-- Tables
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  siren VARCHAR(9) UNIQUE,                 -- vérifié à l'inscription
  eori VARCHAR(17),                        -- numéro EORI du broker
  bureau_douane_principal VARCHAR(8),      -- code bureau de douane principal (FR…)
  inbound_email_slug VARCHAR(32) NOT NULL UNIQUE,  -- ex 'broker-7f2a' → dossiers+broker-7f2a@in.verdyct.io
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX organizations_siren ON organizations(siren) WHERE deleted_at IS NULL;
CREATE INDEX organizations_inbound_slug ON organizations(inbound_email_slug);

CREATE TABLE users (
  id UUID PRIMARY KEY,                     -- = auth.users.id (Supabase Auth)
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  default_organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE organization_members (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role org_member_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ,
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX org_members_user ON organization_members(user_id);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  plan subscription_plan NOT NULL,
  status subscription_status NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX subscriptions_org ON subscriptions(organization_id);
CREATE INDEX subscriptions_stripe ON subscriptions(stripe_subscription_id);
