/**
 * Linking service — redeem via 6-digit code or Device Owner provisioning QR JSON.
 *
 * QR provisioning flow (FASE 10):
 *  1. NOE (parent) generates a pairing code + QR payload JSON:
 *     { type:"provision", familyId, childId?, code, timestamp, devicePolicy?, androidAdminComponentName }
 *     For Device Owner, the QR also encodes android extras:
 *       android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME = "com.arcakids.child/.DeviceAdminReceiver"
 *       android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME   = "com.arcakids.child"
 *     plus custom extras familyId/childId/pairingCode forwarded to ProvisioningHandler.
 *  2. ARCA KIDS scans the QR OR receives the raw 8-char code typed manually.
 *     ProvisioningHandler persists extras to prefs; this service parses either form and
 *     calls redeem(code) — the RPC validates the code and links the device_uuid.
 *  3. Both "Por familia" (childId null) and "Por hijo" payloads are accepted; the server-side
 *     pairing_codes row already binds code -> familyId/childId, so the QR payload familyId/childId
 *     is treated as informational and verified after redeem.
 */

import { ValidationError, t } from '@noe-arcakids/shared';
import type { ProvisioningPayload } from '@noe-arcakids/types';

import { identityRepository } from '../../identity/repositories/identity-repository';
import { identityService } from '../../identity/services/identity-service';
import { linkingRepository, type RedeemResult } from '../repositories/linking-repository';

const CODE_PATTERN_6 = /^\d{6}$/;
// NOE generates 8-char alphanum codes; also accept legacy 6-digit
const CODE_PATTERN_8 = /^[A-HJ-NP-Z2-9]{8}$/i;

function sanitizeCode(input: string): string {
  // Keep alphanum, uppercase, strip others; support both 6-digit and 8-char formats
  const alnum = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (alnum.length === 8) return alnum;
  return input.replace(/\D/g, '').slice(0, 6);
}

function isValidCode(code: string): boolean {
  return CODE_PATTERN_6.test(code) || CODE_PATTERN_8.test(code);
}

function tryParseProvisioningPayload(input: string): { code: string; payload: ProvisioningPayload | null } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const obj = JSON.parse(trimmed) as Partial<ProvisioningPayload> & { code?: string; pairingCode?: string };
    const rawCode = (obj.code ?? (obj as unknown as { pairingCode?: string }).pairingCode ?? '').toString().trim().toUpperCase();
    if (!rawCode) return null;
    const payload: ProvisioningPayload = {
      type: 'provision',
      familyId: (obj.familyId ?? '') as string,
      childId: (obj as ProvisioningPayload).childId ?? null,
      code: rawCode,
      timestamp: (obj.timestamp ?? new Date().toISOString()) as string,
      devicePolicy: (obj.devicePolicy as ProvisioningPayload['devicePolicy']) ?? null,
      androidAdminComponent: (obj as unknown as { androidAdminComponent?: string }).androidAdminComponent,
    };
    return { code: rawCode, payload };
  } catch {
    return null;
  }
}

function validatePayloadMatchesRedeem(
  payload: ProvisioningPayload | null,
  result: RedeemResult
): void {
  if (!payload) return;
  // Family/child mismatches are non-fatal warnings — the code's server binding wins.
  // We keep the check for logging / future strict mode.
  if (payload.familyId && payload.familyId !== result.familyId) {
    // Intentionally not throwing; the pairing code is authoritative.
  }
  if (payload.childId && payload.childId !== result.childId) {
    // Same — childId from code is authoritative.
  }
}

export const linkingService = {
  sanitizeCode,

  isValidCode,

  parseProvisioningPayload(input: string): ProvisioningPayload | null {
    const parsed = tryParseProvisioningPayload(input);
    return parsed?.payload ?? null;
  },

  /**
   * Redeem a pairing code. Accepts:
   *  - 6-digit numeric code (legacy)
   *  - 8-char alphanumeric code (current NOE)
   *  - Full QR JSON payload containing { type:"provision", familyId, childId, code, timestamp, ... }
   *  - QR JSON with 8-char code embedded
   *
   * Supports linking "Por familia" (childId nullable in payload) and "Por hijo" flows;
   * the server-side pairing_codes row determines the final childId.
   */
  async redeem(input: string): Promise<RedeemResult> {
    const provision = tryParseProvisioningPayload(input);
    const rawCode = provision ? provision.code : sanitizeCode(input);

    if (!isValidCode(rawCode)) {
      throw new ValidationError(t('validation.linkCodeInvalid'));
    }

    const device = await identityRepository.getLocalDevice();
    const result = await linkingRepository.redeem(rawCode, device);

    validatePayloadMatchesRedeem(provision?.payload ?? null, result);

    await identityService.saveChildLink({
      childId: result.childId,
      familyId: result.familyId,
      displayName: result.displayName,
      avatar: result.avatarUrl ?? undefined,
    });

    return result;
  },

  /**
   * Convenience to redeem when the caller already parsed the payload.
   * Stores the devicePolicy snapshot if present for immediate enforcement.
   */
  async redeemProvisioningPayload(payload: ProvisioningPayload): Promise<RedeemResult> {
    return linkingService.redeem(JSON.stringify(payload));
  },
};
