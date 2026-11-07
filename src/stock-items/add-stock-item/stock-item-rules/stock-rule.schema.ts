import { type TFunction } from 'i18next';
import { z } from 'zod';

const required = (message: string) => z.string({ required_error: message }).trim().min(1, message);

const positiveNumber = (message: string) =>
  z.number({ required_error: message, invalid_type_error: message }).positive({ message });

export const createStockRuleSchema = (t: TFunction) =>
  z.object({
    locationUuid: required(t('ruleLocationRequired', 'Location is required')),
    name: required(t('ruleNameRequired', 'Rule name is required')),
    stockItemPackagingUOMUuid: required(t('quantityUnitRequired', 'Quantity unit is required')),
    quantity: positiveNumber(t('quantityThresholdPositive', 'Enter a quantity threshold greater than 0')),
    alertRole: required(t('alertRoleRequired', 'Alert role is required')),
    mailRole: required(t('mailRoleRequired', 'Mail role is required')),
    evaluationFrequency: positiveNumber(t('evaluationFrequencyPositive', 'Enter a frequency check greater than 0')),
    actionFrequency: positiveNumber(t('actionFrequencyPositive', 'Enter a notification frequency greater than 0')),
  });

type StockRuleSchema = ReturnType<typeof createStockRuleSchema>;

export type StockRuleFieldErrors = Partial<Record<keyof z.infer<StockRuleSchema>, string>>;

export const getStockRuleFieldErrors = (schema: StockRuleSchema, values: unknown): StockRuleFieldErrors => {
  const result = schema.safeParse(values);
  if (result.success) {
    return {};
  }
  return (result as z.SafeParseError<unknown>).error.issues.reduce<StockRuleFieldErrors>((errors, issue) => {
    const field = issue.path[0] as keyof StockRuleFieldErrors;
    return errors[field] ? errors : { ...errors, [field]: issue.message };
  }, {});
};
