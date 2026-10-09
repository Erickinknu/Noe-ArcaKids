-- send-push trigger-only: el trigger envia unicamente notification_id.
-- El destinatario se resuelve en la Edge Function con service_role.
-- El secreto viaja en x-push-secret leido de Vault; nunca en el cuerpo.
-- verify_jwt se mantiene en true: se adjunta la anon key (publica) como Bearer.
-- Idempotencia: notifications.pushed_at (claim atomico en la funcion).

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS pushed_at timestamptz;

CREATE OR REPLACE FUNCTION public.notify_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_secret text;
begin
  begin
    select decrypted_secret into v_secret
      from vault.decrypted_secrets where name = 'push_admin_secret' limit 1;
    if v_secret is null or v_secret = '' then
      return new;
    end if;
    perform net.http_post(
      url := 'https://jvxeiexsmnoorhhphjld.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'sb_publishable_nLIbVgO3KoaNBRX6gYJmLA_QJiVAuJJ',
        'Authorization', 'Bearer sb_publishable_nLIbVgO3KoaNBRX6gYJmLA_QJiVAuJJ',
        'x-push-secret', v_secret
      ),
      body := jsonb_build_object('notification_id', new.id)
    );
  exception when others then
    -- El push nunca debe romper el insert de la notificacion.
    return new;
  end;
  return new;
end;
$function$;
