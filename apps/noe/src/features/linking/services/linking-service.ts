/**
 * Linking service — parent side: generate pairing codes + Device Owner QR payloads.
 *
 * Two modes:
 *  - "Por hijo"  → code bound to a specific child (familyId + childId). QR JSON includes childId.
 *  - "Por familia" → code still bound to a child row (DB constraint) but QR JSON omits childId
 *    to signal Device Owner provisioning is family-scoped. The child can be reassigned after linking.
 *
 * QR provisioning JSON (scanned by ARCA KIDS or typed manually):
 *  {
 *    type: "provision",
 *    familyId: string,
 *    childId?: string | null,
 *    code: string,            // 8-char alphanumeric
 *    timestamp: string,        // ISO
 *    devicePolicy?: {...},     // optional snapshot
 *    androidAdminComponent: "com.arcakids.child/.DeviceAdminReceiver"
 *  }
 * Plus Android managed provisioning extras when provisioned as Device Owner:
 *  android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME = "com.arcakids.child/com.arcakids.child.DeviceAdminReceiver"
 *  android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME   = "com.arcakids.child"
 *  android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE = { familyId, childId?, pairingCode }
 */

import type { PairingCode } from '../repositories/linking-repository';
import { linkingRepository } from '../repositories/linking-repository';
import type { ProvisioningPayload } from '@noe-arcakids/types';

export type LinkingMode = 'family' | 'child';

export const DEVICE_ADMIN_COMPONENT = 'com.arcakids.child/com.arcakids.child.DeviceAdminReceiver';
export const DEVICE_ADMIN_PACKAGE = 'com.arcakids.child';
export const DEVICE_ADMIN_COMPONENT_SHORT = 'com.arcakids.child/.DeviceAdminReceiver';

export function buildProvisioningPayload(args: {
  familyId: string;
  childId?: string | null;
  code: string;
  devicePolicy?: ProvisioningPayload['devicePolicy'];
}): ProvisioningPayload {
  return {
    type: 'provision',
    familyId: args.familyId,
    childId: args.childId ?? null,
    code: args.code,
    timestamp: new Date().toISOString(),
    devicePolicy: args.devicePolicy ?? null,
    provisioningExtras: {
      deviceAdminComponentName: DEVICE_ADMIN_COMPONENT,
      familyId: args.familyId,
      childId: args.childId ?? undefined,
      pairingCode: args.code,
    },
  };
}

/**
 * Mirrors the Android managed provisioning bundle. Used to document / generate
 * the QR for Device Owner provisioning (NFC / QR).
 */
export function buildAndroidProvisioningExtras(payload: ProvisioningPayload): Record<string, string> {
  return {
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME': DEVICE_ADMIN_COMPONENT,
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME': DEVICE_ADMIN_PACKAGE,
    familyId: payload.familyId,
    childId: payload.childId ?? '',
    pairingCode: payload.code,
    code: payload.code,
    provisioningPayload: JSON.stringify(payload),
  };
}

export const linkingService = {
  createPairingCode(familyId: string, childId: string): Promise<PairingCode> {
    return linkingRepository.createPairingCode(familyId, childId);
  },

  /**
   * Generate a full provisioning payload (QR JSON) in either mode.
   * For "family" mode, childId may be null — the code is still generated against a concrete child row
   * (first child in family) to satisfy DB constraint, but the QR payload omits it.
   */
  async createProvisioningPayload(args: {
    familyId: string;
    childId: string | null;
    mode: LinkingMode;
    devicePolicy?: ProvisioningPayload['devicePolicy'];
  }): Promise<{ code: PairingCode; payload: ProvisioningPayload }> {
    if (!args.childId) {
      throw new Error('A child is required to generate the pairing code (pick one for family provisioning).');
    }
    const code = await linkingRepository.createPairingCode(args.familyId, args.childId);
    const payload = buildProvisioningPayload({
      familyId: args.familyId,
      childId: args.mode === 'child' ? args.childId : null,
      code: code.code,
      devicePolicy: args.devicePolicy,
    });
    // Ensure provisioning extras are present
    payload.androidAdminComponent = DEVICE_ADMIN_COMPONENT_SHORT;
    return { code, payload };
  },

  buildProvisioningPayload,
  buildAndroidProvisioningExtras,
};
