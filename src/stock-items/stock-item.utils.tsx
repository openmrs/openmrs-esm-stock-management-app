import { launchWorkspace2 } from '@openmrs/esm-framework';
import { type StockItemDTO } from '../core/api/types/stockItem/StockItem';

export const launchAddOrEditStockItemWorkspace = (stockItem?: StockItemDTO) => {
  launchWorkspace2('stock-item-form-workspace', { stockItem });
};

/** A stock item's name: the drug's name, or the concept's name for a non-drug item. */
export const getStockItemName = (stockItem?: Pick<StockItemDTO, 'drugName' | 'conceptName'> | null) =>
  stockItem?.drugName || stockItem?.conceptName || '';
