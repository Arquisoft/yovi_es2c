export function getErrorMessage(e: unknown): string {
    if (typeof e === 'object' && e !== null && 'message' in e) {
        const msg = (e as { message?: unknown }).message;
        if (typeof msg === 'string') return msg;
        // Avoid "[object Object]" noise from default stringification.
        if (msg === null || msg === undefined) return 'Error';
        if (typeof msg === 'number' || typeof msg === 'boolean' || typeof msg === 'bigint') return String(msg);
        try {
            return JSON.stringify(msg);
        } catch {
            return 'Error';
        }
    }

    if (typeof e === 'string') return e;
    if (e === null || e === undefined) return 'Error';
    if (typeof e === 'number' || typeof e === 'boolean' || typeof e === 'bigint') return String(e);
    try {
        return JSON.stringify(e);
    } catch {
        // Last resort: avoid "[object Object]" by returning a stable placeholder.
        return 'Error';
    }
}
