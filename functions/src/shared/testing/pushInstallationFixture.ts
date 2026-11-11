/**
 * Test rows for users/{uid}/pushInstallations, the only push token store.
 * Spread the result into a FakeFirestore seed.
 */
export function guestInstallation(
  uid: string,
  token: string,
  appRole: "consumer" | "host" = "consumer"
): Record<string, Record<string, unknown>> {
  return {
    [`users/${uid}/pushInstallations/${appRole}-${token}`]: {
      token,
      appRole,
      environment: "dev",
      platform: "ios",
    },
  };
}
