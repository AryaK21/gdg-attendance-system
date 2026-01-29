/**
 * Computes SHA-256 hash of a string
 */
export async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a deterministic session code based on a secret and time window
 * This mimics TOTP behavior for offline verification.
 * @param {string} secret - A per-session secret
 * @param {number} timestamp - The current timestamp
 * @param {number} interval - Code rotation interval in milliseconds (default 10s)
 */
export async function generateSessionCode(secret, timestamp, interval = 10000) {
    const timeStep = Math.floor(timestamp / interval);
    const message = `${secret}:${timeStep}`;
    const hash = await sha256(message);
    // Extract a 6-digit number from the hash
    const code = (parseInt(hash.substring(0, 8), 16) % 900000) + 100000;
    return code.toString();
}

/**
 * Creates a cryptographic proof for offline check-in
 */
export async function generateCheckInProof(data) {
    const { sessionId, userId, timestamp, lat, lng, code } = data;
    const message = `${sessionId}:${userId}:${timestamp}:${lat}:${lng}:${code}`;
    return await sha256(message);
}
