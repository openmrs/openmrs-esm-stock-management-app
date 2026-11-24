import { describe, expect, it } from 'vitest';
import {
  REFERENCE_CODE_MAX_LENGTH,
  REFERENCE_DESCRIPTION_MAX_LENGTH,
  REFERENCE_NAME_MAX_LENGTH,
  VOID_REASON_MAX_LENGTH,
  packagingUnitSchema,
  packagingUomReferenceSchema,
  voidReferenceReasonSchema,
} from './reference-validation';

describe('packagingUomReferenceSchema', () => {
  const valid = {
    stockSourceUuid: 'source-uuid',
    referenceCode: 'M221680001EP30T',
    name: 'UNHTS packaging reference',
    description: 'Code for the 30-unit pack',
  };

  it('accepts a complete reference', () => {
    expect(packagingUomReferenceSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an empty reference code', () => {
    const result = packagingUomReferenceSchema.safeParse({ ...valid, referenceCode: '   ' });
    expect(result.success).toBe(false);
    expect((result as { error?: { issues: Array<{ message: string }> } }).error?.issues[0].message).toContain(
      'required',
    );
  });

  it('rejects a missing stock source', () => {
    const result = packagingUomReferenceSchema.safeParse({ ...valid, stockSourceUuid: '' });
    expect(result.success).toBe(false);
  });

  it(`accepts a ${REFERENCE_CODE_MAX_LENGTH}-character code and rejects ${REFERENCE_CODE_MAX_LENGTH + 1}`, () => {
    const code = 'C'.repeat(REFERENCE_CODE_MAX_LENGTH);
    expect(packagingUomReferenceSchema.safeParse({ ...valid, referenceCode: code }).success).toBe(true);
    expect(packagingUomReferenceSchema.safeParse({ ...valid, referenceCode: code + 'C' }).success).toBe(false);
  });

  it(`accepts a ${REFERENCE_NAME_MAX_LENGTH}-character name and rejects ${REFERENCE_NAME_MAX_LENGTH + 1}`, () => {
    const name = 'N'.repeat(REFERENCE_NAME_MAX_LENGTH);
    expect(packagingUomReferenceSchema.safeParse({ ...valid, name }).success).toBe(true);
    expect(packagingUomReferenceSchema.safeParse({ ...valid, name: name + 'N' }).success).toBe(false);
  });

  it(
    `accepts a ${REFERENCE_DESCRIPTION_MAX_LENGTH}-character description and rejects ` +
      `${REFERENCE_DESCRIPTION_MAX_LENGTH + 1}`,
    () => {
      const description = 'D'.repeat(REFERENCE_DESCRIPTION_MAX_LENGTH);
      expect(packagingUomReferenceSchema.safeParse({ ...valid, description }).success).toBe(true);
      expect(packagingUomReferenceSchema.safeParse({ ...valid, description: description + 'D' }).success).toBe(false);
    },
  );

  it('normalises blank optional fields to null', () => {
    const result = packagingUomReferenceSchema.parse({ ...valid, name: '  ', description: '' });
    expect(result.name).toBeNull();
    expect(result.description).toBeNull();
  });
});

describe('voidReferenceReasonSchema', () => {
  it('rejects an empty reason', () => {
    expect(voidReferenceReasonSchema.safeParse({ reason: '   ' }).success).toBe(false);
  });

  it(`accepts ${VOID_REASON_MAX_LENGTH} characters and rejects ${VOID_REASON_MAX_LENGTH + 1}`, () => {
    const reason = 'R'.repeat(VOID_REASON_MAX_LENGTH);
    expect(voidReferenceReasonSchema.safeParse({ reason }).success).toBe(true);
    expect(voidReferenceReasonSchema.safeParse({ reason: reason + 'R' }).success).toBe(false);
  });
});

describe('packagingUnitSchema', () => {
  it('requires a packaging unit concept', () => {
    expect(packagingUnitSchema.safeParse({ packagingUomUuid: '', factor: 30 }).success).toBe(false);
  });

  it('requires a positive whole-number pack size', () => {
    expect(packagingUnitSchema.safeParse({ packagingUomUuid: 'uom-uuid', factor: 0 }).success).toBe(false);
    expect(packagingUnitSchema.safeParse({ packagingUomUuid: 'uom-uuid', factor: -1 }).success).toBe(false);
    expect(packagingUnitSchema.safeParse({ packagingUomUuid: 'uom-uuid', factor: 1.5 }).success).toBe(false);
    expect(packagingUnitSchema.safeParse({ packagingUomUuid: 'uom-uuid', factor: 30 }).success).toBe(true);
  });

  it('accepts a numeric string pack size', () => {
    expect(packagingUnitSchema.safeParse({ packagingUomUuid: 'uom-uuid', factor: '30' }).success).toBe(true);
  });
});
