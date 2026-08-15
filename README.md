# PresenceX - Application de Gestion de Présence

Application web moderne de gestion de présence avec authentification, scanner QR, rapports IA et dashboard en temps réel.

## 🚀 Fonctionnalités

- ✅ **Authentification** - Connexion et inscription sécurisées avec Supabase
- ✅ **Dashboard Admin** - Statistiques en temps réel, graphiques et notifications
- ✅ **Gestion Employés** - CRUD complet avec profils détaillés
- ✅ **Scanner QR** - Pointage via QR code avec caméra
- ✅ **Historique** - Filtres avancés et export CSV/PDF
- ✅ **Rapports IA** - Analyse intelligente des données (mode démo)
- ✅ **Responsive** - Compatible mobile, tablette et desktop
- ✅ **PWA-ready** - Installable sur mobile

## 🛠️ Technologies

- **Frontend** : React 18, Vite, TailwindCSS
- **UI** : shadcn/ui, Framer Motion
- **Backend** : Supabase (PostgreSQL, Auth, Realtime)
- **Charts** : Recharts
- **QR** : html5-qrcode
- **State** : React Query

## 📦 Installation

```bash
# Cloner le projet
git clone <votre-repo>
cd PresenceX

# Installer les dépendances
npm install

# Configurer Supabase
# 1. Créer un projet sur https://supabase.com
# 2. Copier .env.example vers .env.local
# 3. Ajouter vos credentials Supabase

# Lancer l'application
npm run dev
```

## ⚙️ Configuration Supabase

### 1. Créer les tables

Exécutez le script `supabase_setup.sql` dans le SQL Editor de Supabase.

### 2. Configurer les politiques RLS

Exécutez le script `fix_rls_complete.sql` pour les politiques de sécurité.

### 3. Variables d'environnement

Créez un fichier `.env.local` :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_anon_key
```

### 4. Activer la création de comptes employés

Exécutez `supabase/employee_accounts.sql` dans le SQL Editor de Supabase afin d’ajouter le rôle explicite des employés et de marquer l’administrateur existant.

Déployez ensuite l’Edge Function qui utilise la clé `service_role` uniquement côté Supabase :

```bash
supabase functions deploy create-employee
```

La clé `SUPABASE_SERVICE_ROLE_KEY` doit rester configurée comme secret de l’Edge Function. Elle ne doit jamais être ajoutée à `.env.local`, au code React ou au dépôt Git. Dans le tableau Employés, un administrateur peut ensuite créer un compte en renseignant le nom, l’email et un mot de passe initial d’au moins 8 caractères. Le mot de passe doit être transmis à l’employé par un canal sécurisé.

### 5. Créer un utilisateur admin

```sql
-- Dans Supabase SQL Editor
INSERT INTO employees (full_name, email, department, position, employee_code, is_active, user_id)
VALUES (
  'Administrateur',
  'admin@presencex.com',
  'Direction',
  'Administrateur',
  'ADMIN001',
  true,
  (SELECT id FROM auth.users WHERE email = 'admin@presencex.com')
);
```

## 📱 Utilisation

### Connexion Admin
- Email : `admin@presencex.com`
- Mot de passe : celui défini lors de la création

### Inscription Employé
1. Cliquez sur "Créer un compte employé"
2. Remplissez le formulaire
3. Connectez-vous avec vos identifiants

## 📚 Documentation

- `SETUP_GUIDE.md` - Guide de configuration détaillé
- `supabase_setup.sql` - Script de création des tables
- `fix_rls_complete.sql` - Politiques de sécurité RLS

## 🎨 Design

- Design moderne avec gradients et animations
- Thème sombre/clair
- Glassmorphism et micro-interactions
- Responsive design

## 📄 Licence

MIT

## 👨‍💻 Auteur

Développé avec ❤️ pour la gestion moderne de présence
