describe('network-consent', () => {
  let hasNetworkConsent: typeof import('./network-consent').hasNetworkConsent;

  beforeEach(async () => {
    jest.resetModules();
    const networkConsentModule = await import('./network-consent');
    hasNetworkConsent = networkConsentModule.hasNetworkConsent;
    // Clear out any mocked window.sessionStorage between tests
    // @ts-expect-error Type deletion is fine in tests to clean mock overrides
    delete window.sessionStorage;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('hasNetworkConsent', () => {
    it('should return false if sessionStorage is empty and cache is not set', async () => {
      const mockGetItem = jest.fn().mockReturnValue(null);
      Object.defineProperty(window, 'sessionStorage', {
        value: { getItem: mockGetItem },
        writable: true,
        configurable: true,
      });

      expect(hasNetworkConsent()).toBe(false);
      expect(mockGetItem).toHaveBeenCalledWith('k_network_consent_granted');
    });

    it('should return true if sessionStorage has granted', async () => {
      const mockGetItem = jest.fn().mockReturnValue('granted');
      Object.defineProperty(window, 'sessionStorage', {
        value: { getItem: mockGetItem },
        writable: true,
        configurable: true,
      });

      expect(hasNetworkConsent()).toBe(true);
      expect(mockGetItem).toHaveBeenCalledWith('k_network_consent_granted');
    });

    it('should return false if sessionStorage throws an error', async () => {
      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('Access denied');
        },
        configurable: true,
      });

      expect(hasNetworkConsent()).toBe(false);
    });

    it('should use consentCache if already set', async () => {
      // First call to set the cache
      const mockGetItem = jest.fn().mockReturnValue('granted');
      Object.defineProperty(window, 'sessionStorage', {
        value: { getItem: mockGetItem },
        writable: true,
        configurable: true,
      });

      expect(hasNetworkConsent()).toBe(true);
      expect(mockGetItem).toHaveBeenCalledTimes(1);

      // Change session storage, shouldn't be called because cache is true
      mockGetItem.mockReturnValue(null);
      expect(hasNetworkConsent()).toBe(true);
      expect(mockGetItem).toHaveBeenCalledTimes(1); // Still 1
    });
  });
});
