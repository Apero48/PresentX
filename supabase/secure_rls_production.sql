-- PresenceX: politiques RLS de production
-- À exécuter après les scripts de création des tables.
-- Cette migration remplace les policies permissives des scripts de test.

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- Rôle centralisé, sans dépendre d'un email contenant "admin".
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'employee';

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_role_check;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_role_check CHECK (role IN ('admin', 'employee'));

-- Bootstrap contrôlé du premier administrateur.
-- Remplacez cette adresse par celle du responsable du client avant la mise en production.
UPDATE public.employees
SET role = 'admin'
WHERE lower(email) = 'admin@presencex.com';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees AS e
    WHERE e.user_id = auth.uid()
      AND e.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Supprimer les policies historiques et permissives connues.
DO $$
DECLARE
  policy_name text;
BEGIN
  FOREACH policy_name IN ARRAY ARRAY[
    'Admin can do anything on employees',
    'Employees can view their own profile',
    'Employees can update their own profile',
    'New users can create their profile',
    'users_can_create_own_profile',
    'anyone_can_read_employees',
    'users_can_update_own_profile',
    'admins_can_delete_employees',
    'admins_manage_all_employees',
    'admins_manage_employees',
    'Admin can do anything on attendances',
    'Employees can view their own attendances',
    'Employees can create their own attendance',
    'Employees can update their own attendance',
    'Public can create attendances',
    'Public can update attendances',
    'anyone_can_read_attendances',
    'anyone_can_create_attendances',
    'anyone_can_update_attendances',
    'admins_can_delete_attendances',
    'admins_manage_all_attendances'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.employees', policy_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendances', policy_name);
  END LOOP;
END;
$$;

-- Employees : chacun voit son propre profil ; seul l’admin gère les profils.
CREATE POLICY employees_select_own_or_admin
  ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY employees_insert_admin
  ON public.employees FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY employees_update_admin
  ON public.employees FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY employees_delete_admin
  ON public.employees FOR DELETE TO authenticated
  USING (public.is_admin());

-- Pointages : un employé ne consulte et ne modifie que ses propres pointages.
CREATE POLICY attendances_select_own_or_admin
  ON public.attendances FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY attendances_insert_admin
  ON public.attendances FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY attendances_update_admin
  ON public.attendances FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY attendances_delete_admin
  ON public.attendances FOR DELETE TO authenticated
  USING (public.is_admin());

REVOKE ALL ON public.employees FROM anon;
REVOKE ALL ON public.attendances FROM anon;
