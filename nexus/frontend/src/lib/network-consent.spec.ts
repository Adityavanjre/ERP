describe('network-consent', () => {
  let hasNetworkConsent: () => boolean;

  beforeEach(async () => {
    jest.resetModules();
    const networkConsentModule = await import('./network-consent');
    hasNetworkConsent = networkConsentModule.hasNetworkConsent;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('hasNetworkConsent', () => {
    it('should return false if sessionStorage.getItem throws', () => {
      // Mock getItem to throw
      const getItemSpy = jest.spyOn(window.sessionStorage.__proto__, 'getItem').mockImplementation(() => {
        throw new Error('Access denied');
      });

      const result = hasNetworkConsent();

      expect(result).toBe(false);
      expect(getItemSpy).toHaveBeenCalledWith('k_network_consent_granted');
    });
  });
});
