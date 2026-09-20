export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";

// Compatibility aliases for clients released before the SealedCash privacy
// contract was renamed. The canonical generated API uses protocol-neutral
// Privacy* operation names and /privacy paths.
export {
  getGetPrivacyStatusQueryKey as getGetZcashStatusQueryKey,
  useGetPrivacyStatus as useGetZcashStatus,
  getGetPrivacyBalanceQueryKey as getGetShieldVaultQueryKey,
  useGetPrivacyBalance as useGetShieldVault,
  getListPrivacyPreparationsQueryKey as getListShieldDepositsQueryKey,
  useListPrivacyPreparations as useListShieldDeposits,
  useCreatePrivacyPreparation as useCreateShieldDeposit,
  useCancelPrivacyPreparation as useCancelShieldDeposit,
} from "./generated/api";
