import { describe, expect, it } from 'vitest';
import { createStockItemDetailsSchema } from './validationSchema';

const mockT = ((key: string, defaultValue?: string) => defaultValue || key) as any;

describe('createStockItemDetailsSchema', () => {
  const base = {
    isDrug: false,
    conceptUuid: 'concept-uuid',
    hasExpiration: false,
  };

  it('requires a concept for non-drug items', () => {
    const schema = createStockItemDetailsSchema(mockT);
    const result = schema.safeParse({ ...base, conceptUuid: '' });
    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toContain('conceptUuid');
    }
  });

  it('does not require a concept for drug items', () => {
    const schema = createStockItemDetailsSchema(mockT);
    const result = schema.safeParse({
      isDrug: true,
      drugUuid: 'drug-uuid',
      dispensingUnitUuid: 'unit-uuid',
      hasExpiration: false,
    });
    expect(result.success).toBe(true);
  });

  it('allows reorder level without unit when reorder level is null or undefined', () => {
    const schema = createStockItemDetailsSchema(mockT);
    expect(schema.safeParse({ ...base, reorderLevel: null, reorderLevelUoMUuid: null }).success).toBe(true);
    expect(schema.safeParse({ ...base }).success).toBe(true);
  });

  it('allows reorder level with unit when set', () => {
    const schema = createStockItemDetailsSchema(mockT);
    const result = schema.safeParse({ ...base, reorderLevel: 10, reorderLevelUoMUuid: 'abc-123' });
    expect(result.success).toBe(true);
  });

  it('requires reorder level unit when reorder level is set (> 0)', () => {
    const schema = createStockItemDetailsSchema(mockT);
    const result = schema.safeParse({ ...base, reorderLevel: 10, reorderLevelUoMUuid: null });
    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.issues.some((issue) => issue.path.includes('reorderLevelUoMUuid'))).toBe(true);
    }
  });

  it('requires reorder level unit when reorder level is greater than 0', () => {
    const schema = createStockItemDetailsSchema(mockT);
    const result = schema.safeParse({ ...base, reorderLevel: 5, reorderLevelUoMUuid: undefined });
    expect(result.success).toBe(false);
  });

  it('requires reorder level unit when reorder level is 0', () => {
    const schema = createStockItemDetailsSchema(mockT);
    const result = schema.safeParse({ ...base, reorderLevel: 0, reorderLevelUoMUuid: null });
    expect(result.success).toBe(false);
  });

  it('treats a cleared reorder level as unset rather than 0', () => {
    const schema = createStockItemDetailsSchema(mockT);
    const result = schema.safeParse({ ...base, reorderLevel: '', reorderLevelUoMUuid: null });
    expect(result.success).toBe(true);
    expect(result.success && result.data.reorderLevel).toBeNull();
  });
});
