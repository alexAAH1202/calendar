import { describe, expect, it, vi } from 'vitest';
import { BridgeError, createBridge, validBridgeUrl } from './bridge';

const URL = 'https://script.google.com/macros/s/AKfycbx-abc_123/exec';
const ok = (body: unknown) => vi.fn().mockResolvedValue({ status: 200, json: async () => body } as Response);

describe('validBridgeUrl', () => {
  it('accepts only Apps Script web app addresses', () => {
    expect(validBridgeUrl(URL, false)).toBe(true);
    expect(validBridgeUrl(' ' + URL + ' ', false)).toBe(true);
    expect(validBridgeUrl('https://script.google.com/macros/s/abc/dev', false)).toBe(false);
    expect(validBridgeUrl('https://evil.example.com/macros/s/abc/exec', false)).toBe(false);
    expect(validBridgeUrl('https://script.google.com.evil.com/macros/s/abc/exec', false)).toBe(false);
    expect(validBridgeUrl('http://localhost:4175/exec', false)).toBe(false);
    expect(validBridgeUrl('http://localhost:4175/exec', true)).toBe(true);
  });
});

describe('createBridge', () => {
  it('posts plain-text JSON with the key and no cookies', async () => {
    const f = ok({ ok: true, calendars: [] });
    await createBridge({ url: URL, key: ' secret ' }, f).calendars();
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(URL);
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    expect(JSON.parse(init.body)).toEqual({ action: 'calendars', key: 'secret' });
  });

  it('never sends the key to an address that is not Apps Script', async () => {
    const f = ok({ ok: true });
    await expect(createBridge({ url: 'https://example.com/exec', key: 'k' }, f).calendars()).rejects.toMatchObject({ kind: 'notBridge' });
    expect(f).not.toHaveBeenCalled();
  });

  it('maps failures to plain kinds', async () => {
    const b = (f: typeof fetch) => createBridge({ url: URL, key: 'k' }, f);
    await expect(b(vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))).calendars()).rejects.toMatchObject({ kind: 'network' });
    // The POST is blocked but Google does answer: the deployment is not open to "Anyone".
    const blockedButUp = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ type: 'opaque' } as Response);
    await expect(b(blockedButUp).calendars()).rejects.toMatchObject({ kind: 'access' });
    expect(blockedButUp.mock.calls[1][1]).toMatchObject({ method: 'GET', mode: 'no-cors', credentials: 'omit' });
    await expect(b(ok({ ok: false, error: 'unauthorised' })).calendars()).rejects.toMatchObject({ kind: 'unauthorised' });
    await expect(b(ok({ ok: false, error: 'calendar_not_found' })).calendars()).rejects.toMatchObject({ kind: 'google' });
    const html = vi.fn().mockResolvedValue({ status: 200, json: async () => { throw new SyntaxError('<html>'); } } as unknown as Response);
    await expect(b(html).calendars()).rejects.toBeInstanceOf(BridgeError);
    await expect(b(html).calendars()).rejects.toMatchObject({ kind: 'notBridge' });
  });
});
