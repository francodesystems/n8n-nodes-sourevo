import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { randomUUID } from 'crypto';

type Context = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions;

export interface SourevoResponse {
	body: IDataObject;
	// X-Sourevo-Mode: live, simulated (SIM references) or test (TRACES acceptance).
	mode: string | null;
}

export interface RequestOptions {
	idempotencyKey?: string;
	itemIndex?: number;
}

export function newIdempotencyKey(): string {
	return randomUUID();
}

async function baseUrl(this: Context): Promise<string> {
	const credentials = await this.getCredentials('sourevoApi');
	const raw = ((credentials.baseUrl as string) || 'https://sourevo.com').trim();
	return `${raw.replace(/\/+$/, '')}/api/v1`;
}

// Sourevo answers every error as { error: { code, message, details } }.
export interface SourevoApiErrorBody {
	code: string;
	message: string;
	reason?: string;
	// Codes of the blocking issues when a submission is refused by the pre-submission check.
	blocking?: string[];
}

export function sourevoErrorOf(error: unknown): SourevoApiErrorBody | null {
	const e = error as {
		response?: { data?: unknown; body?: unknown };
		cause?: { response?: { data?: unknown; body?: unknown } };
		context?: { data?: unknown };
	};
	const candidates = [
		e?.context?.data,
		e?.response?.data,
		e?.response?.body,
		e?.cause?.response?.data,
		e?.cause?.response?.body,
	];
	for (const raw of candidates) {
		let data = raw;
		if (typeof data === 'string') {
			try {
				data = JSON.parse(data);
			} catch {
				continue;
			}
		}
		const inner = (data as { error?: { code?: unknown; message?: unknown; details?: unknown } })
			?.error;
		if (inner && typeof inner.code === 'string') {
			const details = (inner.details ?? {}) as { reason?: unknown; blocking?: unknown };
			const blocking = Array.isArray(details.blocking)
				? (details.blocking as Array<{ code?: unknown }>)
						.map((b) => (typeof b?.code === 'string' ? b.code : ''))
						.filter(Boolean)
				: undefined;
			return {
				code: inner.code,
				message: typeof inner.message === 'string' ? inner.message : inner.code,
				reason: typeof details.reason === 'string' ? details.reason : undefined,
				...(blocking && blocking.length ? { blocking } : {}),
			};
		}
	}
	return null;
}

export async function sourevoApiRequest(
	this: Context,
	method: IHttpRequestMethods,
	path: string,
	body: IDataObject | undefined = undefined,
	qs: IDataObject = {},
	options: RequestOptions = {},
): Promise<SourevoResponse> {
	const headers: IDataObject = {};
	if (method === 'POST' || method === 'PATCH') {
		headers['Idempotency-Key'] = options.idempotencyKey || newIdempotencyKey();
	}
	const request: IHttpRequestOptions = {
		method,
		url: `${await baseUrl.call(this)}${path}`,
		qs,
		headers,
		json: true,
		returnFullResponse: true,
	};
	if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
		request.body = body;
	}

	try {
		const response = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'sourevoApi',
			request,
		)) as { body: IDataObject; headers: Record<string, string | undefined> };
		const mode = response.headers?.['x-sourevo-mode'] ?? null;
		return { body: response.body ?? {}, mode };
	} catch (error) {
		// httpRequestWithAuthentication already throws a NodeApiError; keep it and
		// put Sourevo's own message and code in front.
		const failure =
			error instanceof NodeApiError ? error : new NodeApiError(this.getNode(), error as JsonObject);
		const api = sourevoErrorOf(error);
		if (api) {
			failure.message = api.message;
			failure.description = describeSourevoError(api);
		}
		if (options.itemIndex !== undefined) failure.context.itemIndex = options.itemIndex;
		throw failure;
	}
}

export function describeSourevoError(api: SourevoApiErrorBody): string {
	const parts = [`Sourevo error code: ${api.code}`];
	if (api.reason) parts.push(`reason: ${api.reason}`);
	if (api.blocking) parts.push(`blocking issues: ${api.blocking.join(', ')}`);
	return parts.join('; ');
}

export type PageFetcher = (cursor: string | null, limit: number) => Promise<IDataObject>;

export const MAX_PAGE_SIZE = 100;

// Sourevo list endpoints answer { data: [...], nextCursor } with nextCursor
// null on the last page. With a limit, only as many pages as needed are read.
export async function collectPages(
	fetchPage: PageFetcher,
	limit: number | null,
	maxPages = 10000,
): Promise<IDataObject[]> {
	const out: IDataObject[] = [];
	let cursor: string | null = null;
	let pages = 0;
	do {
		const remaining = limit === null ? MAX_PAGE_SIZE : Math.min(MAX_PAGE_SIZE, limit - out.length);
		const page = await fetchPage(cursor, remaining);
		const data = Array.isArray(page.data) ? (page.data as IDataObject[]) : [];
		out.push(...data);
		cursor = typeof page.nextCursor === 'string' && page.nextCursor ? page.nextCursor : null;
		pages += 1;
		if (limit !== null && out.length >= limit) break;
	} while (cursor && pages < maxPages);
	return limit === null ? out : out.slice(0, limit);
}

export async function sourevoApiRequestAllItems(
	this: Context,
	path: string,
	qs: IDataObject,
	limit: number | null,
	itemIndex?: number,
): Promise<{ items: IDataObject[]; mode: string | null }> {
	let mode: string | null = null;
	const items = await collectPages(async (cursor, pageSize) => {
		const query: IDataObject = { ...qs, limit: pageSize };
		if (cursor) query.cursor = cursor;
		const response = await sourevoApiRequest.call(this, 'GET', path, undefined, query, {
			itemIndex,
		});
		mode = response.mode;
		return response.body;
	}, limit);
	return { items, mode };
}

// "a, b c" or ["a", "b"] → ["a", "b", "c"].
export function idList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
	if (typeof value !== 'string') return [];
	return value
		.split(/[\s,;]+/)
		.map((v) => v.trim())
		.filter(Boolean);
}

// Drops empty values from an n8n collection so only what the user set is sent.
export function compact(fields: IDataObject): IDataObject {
	const out: IDataObject = {};
	for (const [key, value] of Object.entries(fields)) {
		if (value === '' || value === undefined || value === null) continue;
		out[key] = value;
	}
	return out;
}

// n8n dateTime → YYYY-MM-DD.
export function dateOnly(value: unknown): string | undefined {
	if (typeof value !== 'string' || !value) return undefined;
	const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
	return match ? match[1] : value;
}
