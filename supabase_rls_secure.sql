-- =====================================================
-- POLITIQUES RLS SÉCURISÉES POUR PresenceX
-- =====================================================

-- 1. Vérifier que RLS est activé sur les tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "users_can_create_own_profile" ON employees;
DROP POLICY IF EXISTS "anyone_can_read_employees" ON employees;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON employees;
DROP POLICY IF EXISTS "admins_can_delete_employees" ON employees;
DROP POLICY IF EXISTS "anyone_can_read_attendances" ON attendances;
DROP POLICY IF EXISTS "anyone_can_create_attendances" ON attendances;
DROP POLICY IF EXISTS "anyone_can_update_attendances" ON attendances;
DROP POLICY IF EXISTS "admins_can_delete_attendances" ON attendances;

-- 3. Politiques employees
CREATE POLICY "employees_select_own_profile"
  ON employees FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "employees_insert_own_profile"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "employees_update_own_profile"
  ON employees FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_manage_employees"
  ON employees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.email LIKE '%admin%'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.email LIKE '%admin%'
    )
  );

-- 4. Politiques attendances
CREATE POLICY "employees_view_own_attendance"
  ON attendances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.id = attendances.employee_id
    )
  );

CREATE POLICY "employees_create_own_attendance"
  ON attendances FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.id = attendances.employee_id
    )
  );

CREATE POLICY "employees_update_own_attendance"
  ON attendances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.id = attendances.employee_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.id = attendances.employee_id
    )
  );

CREATE POLICY "admins_manage_attendances"
  ON attendances FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.email LIKE '%admin%'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.email LIKE '%admin%'
    )
  );

-- 5. Optionnel : empêcher l’accès anonyme
REVOKE ALL ON employees FROM anon;
REVOKE ALL ON attendances FROM anon;
