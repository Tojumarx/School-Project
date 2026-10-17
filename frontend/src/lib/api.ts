import { supabase, BACKEND_URL } from '../supabaseClient';

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

interface Options {
    method?: 'GET' | 'POST' | 'PUT';
    body?: unknown;
}

/** Calls the backend with the signed-in user's access token. */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    let res: Response;
    try {
        res = await fetch(`${BACKEND_URL}/api${path}`, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        });
    } catch {
        throw new ApiError('Cannot reach the server. Check that the backend is running.', 0);
    }

    let payload: { message?: string | string[] } | null = null;
    try {
        payload = await res.json();
    } catch {
        /* empty body */
    }

    if (!res.ok) {
        const raw = payload?.message;
        const message = Array.isArray(raw) ? raw.join(', ') : raw || `Request failed (${res.status})`;
        throw new ApiError(message, res.status);
    }
    return payload as T;
}

/** Downloads a file from the backend with the signed-in user's access token. */
export async function downloadFile(path: string, filename: string): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(`${BACKEND_URL}/api${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new ApiError(payload?.message || `Download failed (${res.status})`, res.status);
    }
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export const errorMessage = (err: unknown): string =>
    err instanceof Error ? err.message : 'Something went wrong';
