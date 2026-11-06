import { type TFunction } from 'i18next';
import { z } from 'zod';

export const createStockItemReferencesSchema = (t: TFunction) => {
  const codeRequired = t('codeRequired', 'Code is required');
  const sourceRequired = t('sourceRequired', 'Source is required');

  return z.object({
    // Saved references, by UUID. Their source can't be changed, so only the code is editable.
    codes: z.record(z.string().trim().min(1, codeRequired)),
    newReference: z
      .object({
        stockSourceUuid: z.string().nullish(),
        referenceCode: z.string().trim().nullish(),
      })
      .superRefine(({ stockSourceUuid, referenceCode }, ctx) => {
        if (referenceCode && !stockSourceUuid) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: sourceRequired, path: ['stockSourceUuid'] });
        }
        if (stockSourceUuid && !referenceCode) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: codeRequired, path: ['referenceCode'] });
        }
      }),
  });
};

export type StockItemReferencesFormData = z.infer<ReturnType<typeof createStockItemReferencesSchema>>;
