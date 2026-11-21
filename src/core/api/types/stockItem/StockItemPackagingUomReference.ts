/**
 * An external reference code that maps a stock source to one specific packaging UOM of a
 * stock item. Served by /ws/rest/v1/stockmanagement/stockitempackaginguomreference.
 * Mirrors the backend default representation — no other fields are documented.
 */
export interface StockItemPackagingUomReference {
  uuid: string;
  referenceCode: string;
  name?: string | null;
  description?: string | null;
  stockSourceUuid: string;
  stockSourceName: string;
  stockItemPackagingUomUuid: string;
  voided: boolean;
}

/** Payload for creating a reference. The UOM and source are immutable after creation. */
export interface StockItemPackagingUomReferenceDTO {
  stockItemPackagingUomUuid: string;
  stockSourceUuid: string;
  referenceCode: string;
  name?: string | null;
  description?: string | null;
}

/**
 * Payload for updating a reference. The backend's updatable properties are deliberately
 * only these three — the UUID, the stock source and the packaging UOM can never be sent
 * back in an update body.
 */
export interface StockItemPackagingUomReferenceUpdateDTO {
  referenceCode: string;
  name?: string | null;
  description?: string | null;
}
