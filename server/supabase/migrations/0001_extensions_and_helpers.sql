-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Helper : lit l'organization_id depuis le JWT courant
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'organization_id', '')::uuid;
$$;

-- Auth hook : injecte organization_id dans le JWT à l'authentification
-- À activer dans : Supabase Dashboard → Authentication → Hooks → Custom Access Token
CREATE OR REPLACE FUNCTION public.add_organization_to_jwt(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_id uuid;
  org_id uuid;
BEGIN
  user_id := (event->>'user_id')::uuid;
  claims := event->'claims';

  SELECT default_organization_id INTO org_id
  FROM public.users
  WHERE id = user_id;

  IF org_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{organization_id}', to_jsonb(org_id::text));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
