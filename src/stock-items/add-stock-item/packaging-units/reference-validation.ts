import { z } from 'zod';

/**
 * Client-side limits for stock item packaging UOM references. The backend remains the
 * final authority — these only prevent requests that cannot succeed:
 * - the code column is VARCHAR(255), but the server must still be able to append its
 *   " (voided N)" suffix when freeing the code, so 235 is the longest saveable code;
 * - void_reason is refused above 250 characters with a 400 by the resource.
 */
export const REFERENCE_CODE_MAX_LENGTH = 235;
export const REFERENCE_NAME_MAX_LENGTH = 255;
export const REFERENCE_DESCRIPTION_MAX_LENGTH = 1024;
export const VOID_REASON_MAX_LENGTH = 250;

export const packagingUomReferenceSchema = z.object({
  stockSourceUuid: z.string().min(1, 'Stock source is required'),
  referenceCode: z
    .string()
    .trim()
    .min(1, 'Stock reference code is required')
    .max(REFERENCE_CODE_MAX_LENGTH, 'Stock reference code may contain at most 235 characters'),
  name: z
    .string()
    .trim()
    .max(REFERENCE_NAME_MAX_LENGTH, 'Name may contain at most 255 characters')
    .nullish()
    .transform((value) => (value ? value : null)),
  description: z
    .string()
    .trim()
    .max(REFERENCE_DESCRIPTION_MAX_LENGTH, 'Description may contain at most 1024 characters')
    .nullish()
    .transform((value) => (value ? value : null)),
});

export type PackagingUomReferenceFormData = z.infer<typeof packagingUomReferenceSchema>;

export const voidReferenceReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'A reason is required')
    .max(VOID_REASON_MAX_LENGTH, 'Reason may contain at most 250 characters'),
});

export type VoidReferenceReasonFormData = z.infer<typeof voidReferenceReasonSchema>;

/** Client-side packaging unit fields, mirroring the backend UOM create/update contract. */
export const packagingUnitSchema = z.object({
  packagingUomUuid: z.string().min(1, 'Packaging unit is required'),
  factor: z.coerce
    .number({ invalid_type_error: 'Pack size is required' })
    .int('Pack size must be a whole number')
    .positive('Pack size must be greater than zero'),
});

export type PackagingUnitFormData = z.infer<typeof packagingUnitSchema>;
