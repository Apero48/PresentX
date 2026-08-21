const PIN_HASH_KEY = 'presencex.offline.pin.hash';
const PIN_SALT_KEY = 'presencex.offline.pin.salt';
const PIN_ENABLED_KEY = 'presencex.offline.pin.enabled';
const PIN_LOCKED_KEY = 'presencex.offline.pin.locked';

const read = (key, fallback = null) => {
    try {
        const value = window.localStorage.getItem(key);
        return value ?? fallback;
    } catch {
        return fallback;
    }
};

const write = (key, value) => {
    try {
        window.localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
};

const remove = (key) => {
    try { window.localStorage.removeItem(key); } catch { /* best effort */ }
};

const toHex = (buffer) => Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const hashPin = async (pin, salt) => {
    if (!window.crypto?.subtle) throw new Error('Le navigateur ne supporte pas le verrouillage hors connexion.');
    const encoded = new TextEncoder().encode(`${salt}:${pin}`);
    return toHex(await window.crypto.subtle.digest('SHA-256', encoded));
};

export const isOfflinePinConfigured = () => read(PIN_ENABLED_KEY) === 'true';
export const isOfflinePinLocked = () => isOfflinePinConfigured() && read(PIN_LOCKED_KEY) === 'true';

export const setOfflinePin = async (pin) => {
    if (!/^\d{4,6}$/.test(pin)) throw new Error('Le PIN doit contenir 4 à 6 chiffres.');
    const salt = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const hash = await hashPin(pin, salt);
    write(PIN_SALT_KEY, salt);
    write(PIN_HASH_KEY, hash);
    write(PIN_ENABLED_KEY, 'true');
    write(PIN_LOCKED_KEY, 'false');
};

export const verifyOfflinePin = async (pin) => {
    const salt = read(PIN_SALT_KEY);
    const expected = read(PIN_HASH_KEY);
    if (!salt || !expected) return false;
    const actual = await hashPin(pin, salt);
    return actual === expected;
};

export const lockOfflineSession = () => {
    if (isOfflinePinConfigured()) write(PIN_LOCKED_KEY, 'true');
};

export const unlockOfflineSession = () => write(PIN_LOCKED_KEY, 'false');

export const clearOfflinePin = () => {
    remove(PIN_HASH_KEY);
    remove(PIN_SALT_KEY);
    remove(PIN_ENABLED_KEY);
    remove(PIN_LOCKED_KEY);
};

export const getOfflinePinStatus = () => ({
    configured: isOfflinePinConfigured(),
    locked: isOfflinePinLocked(),
});

export default {
    isOfflinePinConfigured,
    isOfflinePinLocked,
    setOfflinePin,
    verifyOfflinePin,
    lockOfflineSession,
    unlockOfflineSession,
    clearOfflinePin,
    getOfflinePinStatus,
};

// A password is intentionally never stored by this module.
export const OFFLINE_PIN_STORAGE_KEYS = [PIN_HASH_KEY, PIN_SALT_KEY, PIN_ENABLED_KEY, PIN_LOCKED_KEY];

// Keep the API explicit for future device-management UI.
export const resetOfflinePin = clearOfflinePin;

// Avoid exposing the hash through accidental serialization.
Object.freeze(OFFLINE_PIN_STORAGE_KEYS);

// This service is local-only; server authorization is still required during sync.
export const OFFLINE_AUTHENTICATION_MODE = 'local-unlock-only';

// No-op export for tree-shaking-safe imports.
export const isOfflineModeAvailable = () => typeof window !== 'undefined' && !!window.crypto?.subtle;

// End of local PIN service.

