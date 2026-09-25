import { isIP } from 'node:net';

type ForwardedFor = string | string[] | undefined;

function normalizeIp(value: string | undefined) {
  if (!value || isIP(value) === 0) return undefined;
  return value.toLowerCase().replace(/^::ffff:/, '');
}

export function getClientIp(
  socketIp: string | undefined,
  forwardedFor: ForwardedFor,
  trustProxy: boolean,
  trustedProxyIps: readonly string[],
) {
  const remoteIp = normalizeIp(socketIp);
  if (!remoteIp) return socketIp || 'unknown';

  const trustedIps = new Set(
    trustedProxyIps
      .map(value => normalizeIp(value.trim()))
      .filter((value): value is string => value !== undefined),
  );
  if (!trustProxy || !trustedIps.has(remoteIp)) return remoteIp;

  const header = Array.isArray(forwardedFor) ? forwardedFor.join(',') : forwardedFor;
  if (!header) return remoteIp;

  const forwardedIps = header.split(',').map(value => normalizeIp(value.trim()));
  if (forwardedIps.some(value => value === undefined)) return remoteIp;

  let currentIp = remoteIp;
  for (let index = forwardedIps.length - 1; index >= 0; index -= 1) {
    if (!trustedIps.has(currentIp)) return currentIp;
    const previousIp = forwardedIps[index];
    if (!previousIp) return remoteIp;
    currentIp = previousIp;
  }
  return currentIp;
}
