# 🚀 Configuration Supabase - Guide Complet

## ✅ Étape 1 : Fichier de Configuration (FAIT)

Le fichier `.env.local` a été créé avec vos credentials :
- URL: `https://uhxqgrhdmxfkftdquaht.supabase.co`
- Anon Key: Configurée ✅

## 📋 Étape 2 : Créer les Tables (À FAIRE - 2 minutes)

### Instructions :

1. **Allez sur votre dashboard Supabase** : https://supabase.com/dashboard/project/uhxqgrhdmxfkftdquaht

2. **Cliquez sur "SQL Editor"** dans le menu de gauche

3. **Cliquez sur "New query"** (bouton en haut à droite)

4. **Copiez-collez tout le contenu du fichier** `supabase_setup.sql` qui se trouve à la racine de votre projet

5. **Cliquez sur "Run"** (ou appuyez sur Ctrl+Enter / Cmd+Enter)

6. **Vérifiez** qu'il n'y a pas d'erreur (vous devriez voir "Success. No rows returned")

✅ Les tables `employees` et `attendances` sont maintenant créées !

---

## 👤 Étape 3 : Créer un Utilisateur Admin (2 options)

### Option A : Via l'Interface Supabase (Plus Simple)

1. Dans votre dashboard, allez sur **"Authentication"** > **"Users"**
2. Cliquez sur **"Add user"** puis **"Create new user"**
3. Remplissez :
   - **Email** : `admin@presencex.com`
   - **Password** : Choisissez un mot de passe sécurisé (notez-le !)
4. ✅ Cochez **"Auto Confirm User"**
5. Cliquez sur **"Create user"**
6. **Notez l'ID de l'utilisateur** qui s'affiche (commence par un UUID)

### Option B : Via SQL (Plus Rapide)

Dans le **SQL Editor**, exécutez ce script (remplacez le mot de passe) :

\`\`\`sql
-- Créer l'utilisateur admin
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@presencex.com',
  crypt('VotreMotDePasse123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  ''
)
RETURNING id;
\`\`\`

---

## 🔗 Étape 4 : Lier l'Admin à la Table Employees

Une fois l'utilisateur créé, **exécutez ce script SQL** (remplacez l'UUID par celui de votre utilisateur admin) :

\`\`\`sql
-- Créer l'enregistrement employé pour l'admin
INSERT INTO employees (
  full_name, 
  email, 
  department, 
  position, 
  employee_code, 
  is_active, 
  user_id
)
VALUES (
  'Administrateur Système',
  'admin@presencex.com',
  'Direction',
  'Administrateur',
  'ADMIN001',
  true,
  (SELECT id FROM auth.users WHERE email = 'admin@presencex.com')
);
\`\`\`

✅ Votre admin est maintenant configuré !

---

## 🎯 Étape 5 : Tester l'Application

1. **Redémarrez le serveur de développement** :
   \`\`\`bash
   # Arrêtez le serveur actuel (Ctrl+C si en cours)
   npm run dev
   \`\`\`

2. **Ouvrez** http://localhost:5173

3. **Connectez-vous** avec :
   - Email: `admin@presencex.com`
   - Mot de passe: celui que vous avez choisi

4. **Testez les fonctionnalités** :
   - ✅ Voir le dashboard
   - ✅ Créer un employé
   - ✅ Scanner un QR code
   - ✅ Consulter l'historique

---

## 🎉 Résumé de Configuration

| Élément | Statut | Détails |
|---------|--------|---------|
| Credentials Supabase | ✅ Configuré | `.env.local` créé |
| Tables DB | ⏳ À faire | Exécuter `supabase_setup.sql` |
| Utilisateur Admin | ⏳ À faire | Créer via Auth > Users |
| Lien Employee | ⏳ À faire | Script SQL fourni |
| Test Application | ⏳ À faire | Se connecter et tester |

---

## 🐛 Dépannage Rapide

### Erreur "Invalid login credentials"
➡️ Vérifiez que :
- L'utilisateur existe dans Auth > Users
- Le mot de passe est correct
- L'utilisateur est confirmé (email_confirmed_at n'est pas null)

### Erreur "relation does not exist"
➡️ Vous n'avez pas encore exécuté le script SQL de création des tables

### L'application ne démarre pas
➡️ Vérifiez que le fichier `.env.local` existe et contient les bonnes credentials

### Rien ne s'affiche dans le dashboard
➡️ Vérifiez que l'enregistrement employee existe pour votre admin avec le bon user_id

---

## 📞 Besoin d'Aide ?

Si vous rencontrez un problème, dites-moi à quelle étape vous êtes bloqué et je vous aiderai !
