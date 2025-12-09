# Instructions de Configuration Supabase

## 1. Créer un Projet Supabase

1. Allez sur https://supabase.com
2. Créez un compte (gratuit)
3. Cliquez sur "New Project"
4. Donnez un nom à votre projet (ex: "PresenceX")
5. Choisissez un mot de passe pour la base de données
6. Sélectionnez une région proche de vous
7. Cliquez sur "Create new project"

## 2. Récupérer les Credentials

Une fois le projet créé :
1. Dans le menu de gauche, cliquez sur "Settings" (engrenage)
2. Cliquez sur "API"
3. Copiez l'**URL du projet** (Project URL)
4. Copiez la **anon/public key** (dans la section "Project API keys")

## 3. Créer les Tables

1. Cliquez sur "SQL Editor" dans le menu de gauche
2. Cliquez sur "New query"
3. Copiez-collez le script SQL suivant :

\`\`\`sql
-- Créer la table employees
CREATE TABLE employees (
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

-- Index pour performances
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_is_active ON employees(is_active);
CREATE INDEX idx_employees_user_id ON employees(user_id);

-- Créer la table attendances
CREATE TABLE attendances (
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

-- Index pour performances
CREATE INDEX idx_attendances_employee_id ON attendances(employee_id);
CREATE INDEX idx_attendances_date ON attendances(date);
CREATE INDEX idx_attendances_status ON attendances(status);
CREATE INDEX idx_attendances_created_date ON attendances(created_date DESC);
CREATE UNIQUE INDEX idx_attendances_employee_date ON attendances(employee_id, date);

-- Activer RLS (Row Level Security)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- Politiques pour employees (admin peut tout faire)
CREATE POLICY "Admin can do anything on employees"
  ON employees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid() AND email LIKE '%admin%'
    )
  );

-- Employés peuvent voir leur profil
CREATE POLICY "Employees can view their own profile"
  ON employees FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Employees can update their own profile"
  ON employees FOR UPDATE
  USING (user_id = auth.uid());

-- Politiques pour attendances
CREATE POLICY "Admin can do anything on attendances"
  ON attendances FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid() AND email LIKE '%admin%'
    )
  );

-- Employés voient leurs pointages
CREATE POLICY "Employees can view their own attendances"
  ON attendances FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Permet à tous de créer/modifier des pointages (pour scanner public)
CREATE POLICY "Public can create attendances"
  ON attendances FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update attendances"
  ON attendances FOR UPDATE
  USING (true);
\`\`\`

4. Cliquez sur "Run" pour exécuter le script

## 4. Configurer l'Application

Créez un fichier \`.env.local\` à la racine du projet avec :

\`\`\`
VITE_SUPABASE_URL=votre_url_supabase_ici
VITE_SUPABASE_ANON_KEY=votre_anon_key_ici
\`\`\`

Remplacez les valeurs par celles copiées à l'étape 2.

## 5. Créer un Utilisateur Admin

1. Dans Supabase, allez dans "Authentication" > "Users"
2. Cliquez sur "Add user" > "Create new user"
3. Email: \`admin@presencex.com\`
4. Mot de passe: choisissez un mot de passe
5. Cochez "Auto Confirm User"
6. Cliquez sur "Create user"

7. Ensuite, allez dans "SQL Editor" et exécutez :

\`\`\`sql
-- Récupérez l'ID de l'utilisateur admin créé
-- Remplacez 'admin@presencex.com' par votre email admin
INSERT INTO employees (full_name, email, department, position, employee_code, is_active, user_id)
VALUES (
  'Administrateur',
  'admin@presencex.com',
  'Direction',
  'Administrateur Système',
  'ADMIN001',
  true,
  (SELECT id FROM auth.users WHERE email = 'admin@presencex.com')
);
\`\`\`

## 6. Redémarrer l'Application

\`\`\`bash
npm run dev
\`\`\`

Voilà ! Votre application utilise maintenant Supabase ! 🎉
