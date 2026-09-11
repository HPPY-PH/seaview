/**
 * MOCK app params — no backend.
 *
 * The real version pulls an appId and access token from Base44.
 * This returns static mock values so the app treats you as a signed-in admin.
 *
 * To restore: git checkout src/lib/app-params.js src/api/base44Client.js
 */

export const appParams = {
  appId: 'mock-app',
  token: 'mock-token',
  functionsVersion: 'mock',
  appBaseUrl: '',
};
