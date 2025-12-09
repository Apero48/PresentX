-- Correction des politiques RLS pour permettre l'auto-inscription

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Admin can do anything on employees" ON employees;
DROP POLICY IF EXISTS "Employees can view their own profile" ON employees;
DROP POLICY IF EXISTS "Employees can update their own profile" ON employees;
DROP POLICY IF EXISTS "New users can create their profile" ON employees;

-- Admin peut tout faire sur employees
CREATE POLICY "Admin can do anything on employees"
  ON employees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid() 
      AND email LIKE '%admin%'
    )
  );

-- Les employés peuvent voir leur propre profil
CREATE POLICY "Employees can view their own profile"
  ON employees FOR SELECT
  USING (user_id = auth.uid());

-- Les employés peuvent modifier leur propre profil
CREATE POLICY "Employees can update their own profile"
  ON employees FOR UPDATE
  USING (user_id = auth.uid());

-- NOUVELLE POLITIQUE : Permettre aux nouveaux utilisateurs de créer leur profil
-- Cette politique permet à n'importe quel utilisateur authentifié de créer UN profil employé
CREATE POLICY "New users can create their profile"
  ON employees FOR INSERT
  WITH CHECK (auth.uid() = user_id);
