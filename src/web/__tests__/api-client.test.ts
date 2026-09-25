import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGet, apiPost, ApiRequestError, setUnauthorizedHandler } from '../api-client.js';

describe('api-client', () => {
  const globalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = globalFetch;
    setUnauthorizedHandler(() => {});
  });

  it('unwraps data envelope on successful GET', async () => {
    const mockData = { id: 1, name: 'Test' };
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(
      JSON.stringify({ data: mockData }), 
      { status: 200 }
    ));

    const result = await apiGet('/test');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/test', expect.objectContaining({
      credentials: 'include'
    }));
  });

  it('throws ApiRequestError on HTTP error (e.g. 422)', async () => {
    const errorBody = {
      error: { code: 'VALIDATION_ERROR', message: 'Invalid field' }
    };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 422,
      headers: new Headers(),
      json: async () => errorBody
    } as any);

    await expect(apiGet('/test')).rejects.toThrow(ApiRequestError);

    try {
      await apiGet('/test');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiRequestError);
      expect(err.status).toBe(422);
      expect(err.isValidationError).toBe(true);
      expect(err.apiError?.code).toBe('VALIDATION_ERROR');
    }
  });

  it('calls global unauthorized handler on 401', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: async () => ({})
    } as any);

    await expect(apiGet('/protected')).rejects.toThrow(ApiRequestError);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('handles 204 No Content', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await apiPost('/test', {});
    expect(result).toBeUndefined();
  });

  it('sends CSRF token and JSON body for POST', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(
      JSON.stringify({ data: 'success' }), 
      { status: 201 }
    ));

    await apiPost('/test', { amount: 100 }, { 'X-CSRF-Token': 'abc' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/test',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'abc'
        },
        body: JSON.stringify({ amount: 100 })
      })
    );
  });
});
