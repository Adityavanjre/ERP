/**
 * @jest-environment node
 */
describe('network-consent (node)', () => {
  it('should return true when window is undefined', async () => {
    jest.resetModules();
    const networkConsentModule = await import('./network-consent');
    expect(networkConsentModule.hasNetworkConsent()).toBe(true);
  });
});
