/**
 * NIFELUX TECHNOLOGIES - RATE LIMITER
 * Simple in-memory rate limiting for serverless functions.
 * Note: In-memory storage resets between deployments/scale events.
 * For production at scale, consider Vercel KV or Upstash Redis.
 */

const requests = new Map();

const WINDOW_MS = 60 * 1000;   // 1 minute window
const CLEANUP_INTERVAL = 5 * 60 * 1000;

let lastCleanup = Date.now();

/**
 * Get client identifier from request
 */
function getClientId(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
}

/**
 * Periodically remove expired entries to prevent memory growth
 */
function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;

    for (const [key, data] of requests.entries()) {
        if (now - data.windowStart > WINDOW_MS) {
            requests.delete(key);
        }
    }
    lastCleanup = now;
}

/**
 * Check rate limit for a request.
 * @param {object} req - Request object
 * @param {number} limit - Max requests per window (default 30)
 * @returns {object} { allowed, remaining, clientId }
 */
function checkRateLimit(req, limit = 30) {
    cleanup();

    const clientId = getClientId(req);
    const now = Date.now();
    const record = requests.get(clientId);

    if (!record || now - record.windowStart > WINDOW_MS) {
        requests.set(clientId, { windowStart: now, count: 1 });
        return { allowed: true, remaining: limit - 1, clientId };
    }

    record.count += 1;

    if (record.count > limit) {
        return { allowed: false, remaining: 0, clientId };
    }

    return { allowed: true, remaining: limit - record.count, clientId };
}

/**
 * Middleware-style helper: returns true if request should be blocked.
 * Sends 429 response automatically when blocked.
 */
function rateLimit(req, res, limit = 30) {
    const result = checkRateLimit(req, limit);

    if (!result.allowed) {
        res.status(429).json({
            success: false,
            error: 'Too many requests. Please try again in a minute.'
        });
        return false; // Blocked
    }

    return true; // Allowed
}

module.exports = { checkRateLimit, rateLimit };
