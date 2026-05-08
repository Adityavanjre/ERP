describe('network-consent', () => {
  let hasNetworkConsent: any;

  beforeEach(() => {
    jest.resetModules();
    const module = require('./network-consent');
    hasNetworkConsent = module.hasNetworkConsent;
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
