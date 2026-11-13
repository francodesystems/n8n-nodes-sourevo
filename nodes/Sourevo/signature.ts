import { createHmac, timingSafeEqual } from 'crypto';

export const DEFAULT_TOLERANCE_SECONDS = 300;

export type SignatureCheck =
	| { valid: true; timestamp: number }
	| { valid: false; reason: 'missing' | 'malformed' | 'expired' | 'mismatch' };

// X-Sourevo-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>.
// The timestamp tolerance refuses replays of an old delivery.
export function verifySourevoSignature(
	secret: string,
	rawBody: string,
	header: string | undefined,
	nowSeconds: number,
	toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS,
): SignatureCheck {
	if (!header || !header.trim()) return { valid: false, reason: 'missing' };
	const parts: Record<string, string[]> = {};
	for (const piece of header.split(',')) {
		const at = piece.indexOf('=');
		if (at <= 0) continue;
		const key = piece.slice(0, at).trim();
		(parts[key] ??= []).push(piece.slice(at + 1).trim());
	}
	const t = Number(parts.t?.[0]);
	const signatures = (parts.v1 ?? []).filter((s) => /^[0-9a-f]{64}$/i.test(s));
	if (!Number.isInteger(t) || signatures.length === 0) return { valid: false, reason: 'malformed' };
	if (Math.abs(nowSeconds - t) > toleranceSeconds) return { valid: false, reason: 'expired' };
	const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest();
	const match = signatures.some((s) => {
		const given = Buffer.from(s, 'hex');
		return given.length === expected.length && timingSafeEqual(given, expected);
	});
	return match ? { valid: true, timestamp: t } : { valid: false, reason: 'mismatch' };
}
