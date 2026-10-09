import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { familyService } from '@/features/family/services/family-service';

export type DeunaOrderStatus = 'pending' | 'verified' | 'rejected';

export interface DeunaOrder {
  id: string;
  status: DeunaOrderStatus;
  createdAt: string;
}

/**
 * DEUNA (Ecuador) — estructura lista para el QR real del negocio.
 * Flujo v1 (manual): la app muestra el QR + monto, el padre paga en su app
 * DEUNA y pulsa "Ya realicé el pago". Se crea una orden `pending` que el
 * administrador verifica y activa en el panel admin.
 * Para conectar el QR real: colocar la imagen en
 * `apps/noe/assets/images/deuna-qr.png` y usarla en `deuna.tsx`.
 */
export const deunaService = {
  async reportPayment(planSlug: string, amountCents: number): Promise<DeunaOrder> {
    const client = requireSupabaseClient();
    const { family } = await familyService.getMyFamily();
    const { data, error } = await client
      .from('deuna_orders')
      .insert({
        family_id: family.id,
        plan_slug: planSlug,
        amount_cents: amountCents,
        currency: 'USD',
        status: 'pending',
      })
      .select('id,status,created_at')
      .single();
    if (error) {
      throw new DatabaseError(
        'No se pudo registrar el pago. Verifica tu conexión e intenta de nuevo.'
      );
    }
    return {
      id: String(data.id),
      status: data.status as DeunaOrderStatus,
      createdAt: String(data.created_at),
    };
  },
};

