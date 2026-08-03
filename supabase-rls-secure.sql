-- =====================================================
-- SUPABASE RLS SECURE POUR PresenceX
-- Objectif : sécuriser l’accès aux données pour un usage client professionnel
-- =====================================================

-- 1. Activer RLS sur les tables principales
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Admin can do anything on employees" ON employees;
DROP POLICY IF EXISTS "Employees can view their own profile" ON employees;
DROP POLICY IF EXISTS "Employees can update their own profile" ON employees;
DROP POLICY IF EXISTS "employees_view_own_profile" ON employees;
DROP POLICY IF EXISTS "employees_update_own_profile" ON employees;
DROP POLICY IF EXISTS "employees_insert_own_profile" ON employees;
DROP POLICY IF EXISTS "admins_manage_all_employees" ON employees;
DROP POLICY IF EXISTS "Public can create attendances" ON attendances;
DROP POLICY IF EXISTS "Public can update attendances" ON attendances;
DROP POLICY IF EXISTS "Admin can do anything on attendances" ON attendances;
DROP POLICY IF EXISTS "Employees can view their own attendances" ON attendances;
DROP POLICY IF EXISTS "employees_view_own_attendances" ON attendances;
DROP POLICY IF EXISTS "employees_insert_own_attendance" ON attendances;
DROP POLICY IF EXISTS "employees_update_own_attendance" ON attendances;
DROP POLICY IF EXISTS "admins_manage_all_attendances" ON attendances;

-- 3. Bloquer l’accès anonyme par défaut
REVOKE ALL ON employees FROM anon;
REVOKE ALL ON attendances FROM anon;
REVOKE ALL ON employees FROM public;
REVOKE ALL ON attendances FROM public;

-- 4. Politiques pour la table employees
-- Un employé peut voir et modifier uniquement son propre profil
CREATE POLICY "employees_view_own_profile"
ON employees FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "employees_update_own_profile"
ON employees FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Un employé peut créer son propre profil uniquement lors de l’inscription
CREATE POLICY "employees_insert_own_profile"
ON employees FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Un administrateur peut gérer tous les profils employés
CREATE POLICY "admins_manage_all_employees"
ON employees FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.user_id = auth.uid()
      AND e.email ILIKE '%admin%'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.user_id = auth.uid()
      AND e.email ILIKE '%admin%'
  )
);

-- 5. Politiques pour la table attendances
-- Un employé ne peut voir que ses propres pointages
CREATE POLICY "employees_view_own_attendances"
ON attendances FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- Un employé peut créer un pointage pour lui-même
CREATE POLICY "employees_insert_own_attendance"
ON attendances FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- Un employé peut mettre à jour ses propres pointages
CREATE POLICY "employees_update_own_attendance"
ON attendances FOR UPDATE
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- Un administrateur peut gérer toutes les attendances
CREATE POLICY "admins_manage_all_attendances"
ON attendances FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.user_id = auth.uid()
      AND e.email ILIKE '%admin%'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM employees e
    WHERE e.user_id = auth.uid()
      AND e.email ILIKE '%admin%'
  )
);

-- 6. Optionnel : sécuriser les accès en lecture des tables auth
-- (à utiliser si votre application gère des rôles plus avancés)

-- 7. Message de validation
DO $$
BEGIN
  RAISE NOTICE 'RLS sécurisé appliqué avec succès pour employees et attendances.';
END $$;
