/**
 * Nimiq Hub API singleton (browser-only).
 *
 * The Hub is the web wallet for regular browsers — it opens a popup to
 * Nimiq Safe (https://hub.nimiq-testnet.com) so users can pick an address
 * and sign messages without any browser extension.
 *
 * We always target testnet to match the rest of the app.
 */

const HUB_ENDPOINT = "https://hub.nimiq-testnet.com";
const APP_NAME = "NIM Panic";

let _hubApi: import("@nimiq/hub-api").default | null = null;

export async function getHubApi() {
  if (_hubApi) return _hubApi;
  const { default: HubApi } = await import("@nimiq/hub-api");
  _hubApi = new HubApi(HUB_ENDPOINT);
  return _hubApi;
}

export { APP_NAME, HUB_ENDPOINT };
