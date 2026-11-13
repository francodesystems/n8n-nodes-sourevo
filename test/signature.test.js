const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');

const { verifySourevoSignature } = require('../dist/nodes/Sourevo/signature');

const secret = 'whsec_test_secret';
const body = JSON.stringify({
	id: 'evt_1',
	type: 'dds.status_changed',
	createdAt: '2026-11-13T10:00:00.000Z',
	data: { ddsId: 'dds_1', status: 'AVAILABLE', referenceNumber: '26ESSIM0000001' },
});
const now = 1_800_000_000;

// The same algorithm Sourevo uses (src/lib/webhooks/signing.ts).
const sign = (s, b, t) => `t=${t},v1=${createHmac('sha256', s).update(`${t}.${b}`).digest('hex')}`;

test('accepts a valid signature', () => {
	assert.deepEqual(verifySourevoSignature(secret, body, sign(secret, body, now), now), {
		valid: true,
		timestamp: now,
	});
});

test('accepts a timestamp within the tolerance, in either direction', () => {
	assert.equal(
		verifySourevoSignature(secret, body, sign(secret, body, now - 299), now).valid,
		true,
	);
	assert.equal(
		verifySourevoSignature(secret, body, sign(secret, body, now + 299), now).valid,
		true,
	);
});

test('refuses a replay older than the tolerance', () => {
	const result = verifySourevoSignature(secret, body, sign(secret, body, now - 301), now);
	assert.deepEqual(result, { valid: false, reason: 'expired' });
});

test('honours a custom tolerance', () => {
	const header = sign(secret, body, now - 60);
	assert.equal(verifySourevoSignature(secret, body, header, now, 30).valid, false);
	assert.equal(verifySourevoSignature(secret, body, header, now, 120).valid, true);
});

test('refuses a tampered body', () => {
	const header = sign(secret, body, now);
	const tampered = body.replace('AVAILABLE', 'REJECTED');
	assert.deepEqual(verifySourevoSignature(secret, tampered, header, now), {
		valid: false,
		reason: 'mismatch',
	});
});

test('refuses another secret', () => {
	const header = sign('whsec_other', body, now);
	assert.equal(verifySourevoSignature(secret, body, header, now).reason, 'mismatch');
});

test('refuses a signature moved to another timestamp', () => {
	const v1 = sign(secret, body, now).split('v1=')[1];
	assert.equal(
		verifySourevoSignature(secret, body, `t=${now - 10},v1=${v1}`, now).reason,
		'mismatch',
	);
});

test('refuses missing and malformed headers', () => {
	assert.equal(verifySourevoSignature(secret, body, undefined, now).reason, 'missing');
	assert.equal(verifySourevoSignature(secret, body, '  ', now).reason, 'missing');
	assert.equal(verifySourevoSignature(secret, body, 'v1=abc', now).reason, 'malformed');
	assert.equal(verifySourevoSignature(secret, body, `t=${now}`, now).reason, 'malformed');
	assert.equal(
		verifySourevoSignature(secret, body, `t=soon,v1=${'a'.repeat(64)}`, now).reason,
		'malformed',
	);
	assert.equal(verifySourevoSignature(secret, body, `t=${now},v1=zz`, now).reason, 'malformed');
});

test('tolerates spaces and accepts any of several v1 values (secret rotation)', () => {
	const good = sign(secret, body, now).split('v1=')[1];
	const header = `t=${now}, v1=${'0'.repeat(64)}, v1=${good}`;
	assert.equal(verifySourevoSignature(secret, body, header, now).valid, true);
});
