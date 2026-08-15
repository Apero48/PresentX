-- PresenceX: rôles et comptes employés
-- À exécuter après supabase_setup.sql.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'employee';

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_role_check;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_role_check CHECK (role IN ('admin', 'employee'));

-- Marquer explicitement les comptes administrateurs existants.
UPDATE public.employees
SET role = 'admin'
WHERE lower(email) = 'admin@presencex.com'
   OR lower(email) LIKE '%admin%';

-- Les opérations sensibles de création de comptes passent par l’Edge Function
-- avec la service_role key, qui n’est jamais exposée au navigateur.
-- Les politiques RLS existantes restent en place pour préserver la compatibilité
-- avec l’installation actuelle. Une migration séparée peut remplacer la détection
-- historique par email par une fonction SQL SECURITY DEFINER.

COMMENT ON COLUMN public.employees.role IS 'Application role. Only admin accounts may create employee accounts.';
