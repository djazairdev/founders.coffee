import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  browserCampaign,
  campaignReturnPath,
  communityShareUrl,
  setActionScope,
  trackAction,
} from './client';
afterEach(() => {
  Reflect.deleteProperty(navigator, 'doNotTrack');
  Reflect.deleteProperty(navigator, 'globalPrivacyControl');
  setActionScope(undefined);
  window.history.replaceState({}, '', '/');
  vi.unstubAllGlobals();
});
describe('client attribution and reporting', () => {
  it('preserves campaign codes through a return path and replaces paid codes on shared links', () => {
    window.history.replaceState(
      {},
      '',
      '/ar/algeria?utm_source=facebook&utm_medium=paid_social&utm_campaign=v90_founders_ar_v2&fbclid=secret',
    );
    expect(campaignReturnPath('/ar/algeria/host/create')).toBe(
      '/ar/algeria/host/create?utm_source=facebook&utm_medium=paid_social&utm_campaign=v90_founders_ar_v2',
    );
    expect(campaignReturnPath('//attacker.test/path')).toBe(
      '//attacker.test/path',
    );
    expect(communityShareUrl('https://founders.coffee/ar/e/123')).toBe(
      'https://founders.coffee/ar/e/123?utm_source=community&utm_medium=share&utm_campaign=local-meetups',
    );
  });
  it('suppresses requests under either browser privacy signal', () => {
    const send = vi.fn();
    vi.stubGlobal('fetch', send);
    setActionScope({ page: 'market', locale: 'ar', market: 'DZ' });
    for (const key of ['doNotTrack', 'globalPrivacyControl']) {
      Object.defineProperty(navigator, key, {
        value: key === 'doNotTrack' ? '1' : true,
        configurable: true,
      });
      expect(browserCampaign()).toBeUndefined();
      trackAction('landing_view');
      expect(communityShareUrl('https://founders.coffee/ar/e/123')).toBe(
        'https://founders.coffee/ar/e/123',
      );
      Reflect.deleteProperty(navigator, key);
    }
    expect(send).not.toHaveBeenCalled();
  });
  it('deduplicates rapid reports, omits cookies and ignores failures', () => {
    const send = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', send);
    setActionScope({ page: 'market', locale: 'ar', market: 'DZ' });
    trackAction('landing_view');
    trackAction('landing_view');
    expect(send).toHaveBeenCalledOnce();
    const options = send.mock.calls[0][1];
    expect(options).toMatchObject({ credentials: 'omit', keepalive: true });
    expect(JSON.parse(options.body)).toEqual({
      page: 'market',
      locale: 'ar',
      market: 'DZ',
      event: 'landing_view',
      attribution: { source: 'none', medium: 'none', campaign: 'none' },
    });
  });
});
