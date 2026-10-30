import crypto from 'node:crypto';

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RATE_WINDOW_MS = 60 * 60 * 1000;

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export const isValidEmail = (email) =>
    email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const generateOtp = () =>
    crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');

export const digestOtp = (email, purpose, code, secret = process.env.JWT_SECRET) => {
    if (!secret) throw new Error('JWT_SECRET is not configured');
    return crypto.createHmac('sha256', secret)
        .update(`pujadecor-otp\0${email}\0${purpose}\0${code}`)
        .digest('hex');
};

export const safeDigestEqual = (left, right) => {
    const leftBuffer = Buffer.from(String(left || ''), 'hex');
    const rightBuffer = Buffer.from(String(right || ''), 'hex');
    return leftBuffer.length === rightBuffer.length &&
        leftBuffer.length > 0 &&
        crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const digestRateLimitKey = (kind, identity, bucket, secret = process.env.JWT_SECRET) => {
    if (!secret) throw new Error('JWT_SECRET is not configured');
    return crypto.createHmac('sha256', secret)
        .update(`pujadecor-otp-rate\0${kind}\0${identity}\0${bucket}`)
        .digest('hex');
};

export const getStaffAccount = (email, env = process.env) => {
    const normalizedEmail = normalizeEmail(email);
    const configured = String(env.STAFF_ACCOUNTS || '').split(',').map((item) => item.trim()).filter(Boolean);
    const accounts = configured.map((item) => {
        const separator = item.lastIndexOf(':');
        if (separator < 0) return null;
        const accountEmail = normalizeEmail(item.slice(0, separator));
        const role = item.slice(separator + 1).trim().toLowerCase();
        if (!isValidEmail(accountEmail) || !['seller', 'admin'].includes(role)) return null;
        return {email:accountEmail, roles:[role]};
    }).filter(Boolean);

    return accounts.find((account) => account.email === normalizedEmail) || null;
};

export const staffTokenHasSellerAccess = (staffAccount, tokenRoles) =>
    Array.isArray(tokenRoles) && Boolean(staffAccount?.roles?.some((role) =>
        (role === 'admin' || role === 'seller') && tokenRoles.includes(role)
    ));
