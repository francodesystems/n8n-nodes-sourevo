const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
	collectPages,
	idList,
	compact,
	dateOnly,
	sourevoErrorOf,
} = require('../dist/nodes/Sourevo/GenericFunctions');

// A fake Sourevo list endpoint: ordered rows, { data, nextCursor } pages,
// nextCursor null on the last one, at most 100 per page.
function fakeEndpoint(total) {
	const rows = Array.from({ length: total }, (_, i) => ({ id: `id${String(i).padStart(4, '0')}` }));
	const calls = [];
	const fetchPage = async (cursor, limit) => {
		calls.push({ cursor, limit });
		assert.ok(limit >= 1 && limit <= 100, `limit ${limit} out of range`);
		const start = cursor ? rows.findIndex((r) => r.id === cursor) + 1 : 0;
		const data = rows.slice(start, start + limit);
		const more = start + limit < rows.length;
		return { data, nextCursor: more ? data[data.length - 1].id : null };
	};
	return { rows, calls, fetchPage };
}

test('Return All follows nextCursor until it is null', async () => {
	const api = fakeEndpoint(250);
	const out = await collectPages(api.fetchPage, null);
	assert.equal(out.length, 250);
	assert.deepEqual(out, api.rows);
	assert.deepEqual(
		api.calls.map((c) => c.limit),
		[100, 100, 100],
	);
	assert.equal(api.calls[0].cursor, null);
	assert.equal(api.calls[1].cursor, 'id0099');
});

test('a limit reads only the pages it needs and asks only for what is left', async () => {
	const api = fakeEndpoint(250);
	const out = await collectPages(api.fetchPage, 130);
	assert.equal(out.length, 130);
	assert.deepEqual(
		api.calls.map((c) => c.limit),
		[100, 30],
	);
});

test('a small limit is one request', async () => {
	const api = fakeEndpoint(250);
	const out = await collectPages(api.fetchPage, 5);
	assert.equal(out.length, 5);
	assert.equal(api.calls.length, 1);
	assert.equal(api.calls[0].limit, 5);
});

test('empty and single-page lists', async () => {
	assert.deepEqual(await collectPages(fakeEndpoint(0).fetchPage, null), []);
	const api = fakeEndpoint(7);
	assert.equal((await collectPages(api.fetchPage, 50)).length, 7);
	assert.equal(api.calls.length, 1);
});

test('stops at maxPages even if the server keeps sending a cursor', async () => {
	let n = 0;
	const out = await collectPages(
		async () => ({ data: [{ id: String(n++) }], nextCursor: 'again' }),
		null,
		3,
	);
	assert.equal(out.length, 3);
});

test('idList accepts arrays and comma, space or semicolon separated text', () => {
	assert.deepEqual(idList('a, b  c;d'), ['a', 'b', 'c', 'd']);
	assert.deepEqual(idList(['a', ' b ', '']), ['a', 'b']);
	assert.deepEqual(idList(''), []);
	assert.deepEqual(idList(undefined), []);
});

test('compact drops empty values but keeps false and 0', () => {
	assert.deepEqual(compact({ a: '', b: undefined, c: null, d: false, e: 0, f: 'x' }), {
		d: false,
		e: 0,
		f: 'x',
	});
});

test('dateOnly keeps the calendar date of an n8n dateTime', () => {
	assert.equal(dateOnly('2026-03-01T00:00:00.000+01:00'), '2026-03-01');
	assert.equal(dateOnly('2026-03-01'), '2026-03-01');
	assert.equal(dateOnly(''), undefined);
});

test('sourevoErrorOf reads { error: { code, message, details } } from object or string bodies', () => {
	const body = {
		error: { code: 'unprocessable', message: 'Blocked', details: { reason: 'check_blocking' } },
	};
	assert.deepEqual(sourevoErrorOf({ response: { data: body } }), {
		code: 'unprocessable',
		message: 'Blocked',
		reason: 'check_blocking',
	});
	assert.deepEqual(
		sourevoErrorOf({ cause: { response: { body: JSON.stringify(body) } } }).code,
		'unprocessable',
	);
	assert.equal(sourevoErrorOf({ response: { data: '<html>' } }), null);
	assert.equal(sourevoErrorOf(new Error('socket hang up')), null);
});

test('sourevoErrorOf reads the body n8n keeps in NodeApiError.context.data, with blocking codes', () => {
	const { describeSourevoError } = require('../dist/nodes/Sourevo/GenericFunctions');
	const data = {
		error: {
			code: 'unprocessable',
			message: 'The pre-submission check has blocking issues.',
			details: {
				reason: 'pre_submission_blocked',
				blocking: [{ code: 'BATCH_NO_PLOT' }, { code: 'NO_RISK_ASSESSMENT' }],
			},
		},
	};
	const api = sourevoErrorOf({ context: { data } });
	assert.deepEqual(api.blocking, ['BATCH_NO_PLOT', 'NO_RISK_ASSESSMENT']);
	assert.equal(
		describeSourevoError(api),
		'Sourevo error code: unprocessable; reason: pre_submission_blocked; blocking issues: BATCH_NO_PLOT, NO_RISK_ASSESSMENT',
	);
});
