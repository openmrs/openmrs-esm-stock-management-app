export interface PrivilegeScope {
  privilege: string;
  locationUuid: string | null;
  operationType: string | null;
  partyUuid: string | null;
  isPermanent: boolean;
  activeFrom: Date | null;
  activeTo: Date | null;
}
