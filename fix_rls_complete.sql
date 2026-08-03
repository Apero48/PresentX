-- =====================================================
-- CORRECTION COMPLÈTE DES POLITIQUES RLS
-- Pour permettre l'auto-inscription des employés
-- =====================================================

-- Désactiver temporairement RLS pour nettoyer
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendances DISABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les anciennes et nouvelles politiques si elles existent
DROP POLICY IF EXISTS "Admin can do anything on employees" ON employees;
DROP POLICY IF EXISTS "Employees can view their own profile" ON employees;
DROP POLICY IF EXISTS "Employees can update their own profile" ON employees;
DROP POLICY IF EXISTS "New users can create their profile" ON employees;
DROP POLICY IF EXISTS "users_can_create_own_profile" ON employees;
DROP POLICY IF EXISTS "anyone_can_read_employees" ON employees;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON employees;
DROP POLICY IF EXISTS "admins_can_delete_employees" ON employees;

DROP POLICY IF EXISTS "Admin can do anything on attendances" ON attendances;
DROP POLICY IF EXISTS "Employees can view their own attendances" ON attendances;
DROP POLICY IF EXISTS "Public can create attendances" ON attendances;
DROP POLICY IF EXISTS "Public can update attendances" ON attendances;
DROP POLICY IF EXISTS "anyone_can_read_attendances" ON attendances;
DROP POLICY IF EXISTS "anyone_can_create_attendances" ON attendances;
DROP POLICY IF EXISTS "anyone_can_update_attendances" ON attendances;
DROP POLICY IF EXISTS "admins_can_delete_attendances" ON attendances;

-- =====================================================
-- NOUVELLES POLITIQUES - EMPLOYEES
-- =====================================================

-- Réactiver RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 1. Permettre aux utilisateurs authentifiés de créer LEUR profil
CREATE POLICY "users_can_create_own_profile"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Tout le monde peut lire tous les profils
--    (nécessaire pour que l'admin puisse voir les employés)
CREATE POLICY "anyone_can_read_employees"
  ON employees FOR SELECT
TO authenticated
  USING (true);

-- 3. Les utilisateurs peuvent modifier LEUR propre profil
CREATE POLICY "users_can_update_own_profile"
  ON employees FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Seuls les admins peuvent supprimer des employés
CREATE POLICY "admins_can_delete_employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    -- L'utilisateur est admin SI son email contient 'admin'
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND email LIKE '%admin%'
    )
  );

-- =====================================================
-- NOUVELLES POLITIQUES - ATTENDANCES
-- =====================================================

-- Réactiver RLS
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- 1. Tout le monde peut lire toutes les attendances
--    (pour que l'admin puisse voir tout et les employés leurs données)
CREATE POLICY "anyone_can_read_attendances"
  ON attendances FOR SELECT
  TO authenticated
  USING (true);

-- 2. Tout le monde peut créer des pointages
--    (pour le scanner QR public)
CREATE POLICY "anyone_can_create_attendances"
  ON attendances FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Tout le monde peut modifier les pointages
--    (pour mettre à jour check-out, lunch, etc.)
CREATE POLICY "anyone_can_update_attendances"
  ON attendances FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Seuls les admins peuvent supprimer des pointages
CREATE POLICY "admins_can_delete_attendances"
  ON attendances FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND email LIKE '%admin%'
    )
  );

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Message de confirmation
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Politiques RLS corrigées avec succès !';
  RAISE NOTICE '✅ Les employés peuvent maintenant s''inscrire';
  RAISE NOTICE '✅ Les admins ont accès complet';
END $$;
