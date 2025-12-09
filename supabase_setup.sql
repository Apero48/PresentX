-- =====================================================
-- SCRIPT DE CRÉATION DES TABLES SUPABASE
-- Pour PresenceX - Application de Gestion de Présence
-- =====================================================

-- 1. Table des employés
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  department TEXT NOT NULL,
  position TEXT,
  employee_code TEXT UNIQUE,
  qr_code TEXT UNIQUE,
  start_time TEXT DEFAULT '09:00',
  is_active BOOLEAN DEFAULT true,
  profile_picture TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_code ON employees(employee_code);

-- 2. Table des pointages
CREATE TABLE IF NOT EXISTS attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  date DATE NOT NULL,
  check_in TIME NOT NULL,
  check_out TIME,
  lunch_start TIME,
  lunch_end TIME,
  status TEXT CHECK (status IN ('present', 'late', 'absent', 'partial')) DEFAULT 'present',
  hours_worked NUMERIC,
  interventions JSONB DEFAULT '[]'::jsonb,
  notes TEXT
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_attendances_employee_id ON attendances(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(date);
CREATE INDEX IF NOT EXISTS idx_attendances_status ON attendances(status);
CREATE INDEX IF NOT EXISTS idx_attendances_created_date ON attendances(created_date DESC);

-- Contrainte unique : un seul pointage par employé par jour
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendances_employee_date 
  ON attendances(employee_id, date);

-- =====================================================
-- SÉCURITÉ - ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Activer RLS sur attendances
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLITIQUES DE SÉCURITÉ - EMPLOYEES
-- =====================================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Admin can do anything on employees" ON employees;
DROP POLICY IF EXISTS "Employees can view their own profile" ON employees;
DROP POLICY IF EXISTS "Employees can update their own profile" ON employees;

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

-- =====================================================
-- POLITIQUES DE SÉCURITÉ - ATTENDANCES
-- =====================================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Admin can do anything on attendances" ON attendances;
DROP POLICY IF EXISTS "Employees can view their own attendances" ON attendances;
DROP POLICY IF EXISTS "Public can create attendances" ON attendances;
DROP POLICY IF EXISTS "Public can update attendances" ON attendances;

-- Admin peut tout faire sur attendances
CREATE POLICY "Admin can do anything on attendances"
  ON attendances FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid() 
      AND email LIKE '%admin%'
    )
  );

-- Les employés peuvent voir leurs propres pointages
CREATE POLICY "Employees can view their own attendances"
  ON attendances FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Permet à tous de créer des pointages (pour le scanner QR public)
CREATE POLICY "Public can create attendances"
  ON attendances FOR INSERT
  WITH CHECK (true);

-- Permet à tous de modifier les pointages (pour les actions du scanner)
CREATE POLICY "Public can update attendances"
  ON attendances FOR UPDATE
  USING (true);

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================

-- Afficher un message de succès
DO $$ 
BEGIN 
  RAISE NOTICE 'Tables créées avec succès !';
  RAISE NOTICE 'Prochaine étape : créer un utilisateur admin';
END $$;
