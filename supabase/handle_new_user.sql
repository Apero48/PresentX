-- PresenceX: créer automatiquement le profil employé après une inscription Auth.
-- Ce trigger évite l’échec du formulaire lorsque la confirmation email est activée
-- et qu’aucune session authentifiée n’est encore disponible côté navigateur.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'employee';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.employees (
    full_name,
    email,
    phone,
    department,
    position,
    employee_code,
    qr_code,
    is_active,
    user_id,
    role
  )
  SELECT
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    lower(NEW.email),
    '',
    'Non défini',
    'Employé',
    'EMP' || right(replace(NEW.id::text, '-', ''), 6),
    'QR-' || NEW.id::text,
    true,
    NEW.id,
    'employee'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.employees AS existing
    WHERE existing.user_id = NEW.id
       OR lower(existing.email) = lower(NEW.email)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
