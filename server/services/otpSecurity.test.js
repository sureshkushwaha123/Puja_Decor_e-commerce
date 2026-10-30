import test from 'node:test';
import assert from 'node:assert/strict';
import {
    digestOtp,
    digestRateLimitKey,
    generateOtp,
    getStaffAccount,
    normalizeEmail,
    safeDigestEqual,
    staffTokenHasSellerAccess,
} from './otpSecurity.js';

const testSecret = 'test-only-secret';

test('OTP generation returns a six-digit numeric code, including leading zeroes', () => {
    assert.match(generateOtp(), /^\d{6}$/);
});

test('OTP digests are stable for a challenge and differ across challenge details', () => {
    const digest = digestOtp('customer@example.com', 'customer-login', '012345', testSecret);
    assert.equal(safeDigestEqual(digest, digestOtp('customer@example.com', 'customer-login', '012345', testSecret)), true);
    assert.equal(safeDigestEqual(digest, digestOtp('other@example.com', 'customer-login', '012345', testSecret)), false);
    assert.equal(safeDigestEqual(digest, digestOtp('customer@example.com', 'customer-signup', '012345', testSecret)), false);
    assert.equal(safeDigestEqual(digest, digestOtp('customer@example.com', 'customer-login', '012346', testSecret)), false);
});

test('rate-limit keys are keyed digests rather than raw email or IP values', () => {
    const key = digestRateLimitKey('email', 'customer@example.com', 123, testSecret);
    assert.match(key, /^[a-f0-9]{64}$/);
    assert.equal(key.includes('customer@example.com'), false);
    assert.equal(key, digestRateLimitKey('email', 'customer@example.com', 123, testSecret));
});

test('staff access is limited to configured seller/admin emails', () => {
    assert.deepEqual(
        getStaffAccount('PUJADECOR2025@gmail.com', {STAFF_ACCOUNTS:'pujadecor2025@gmail.com:admin'}),
        {email:'pujadecor2025@gmail.com', roles:['admin']}
    );
    assert.equal(getStaffAccount('other@example.com', {STAFF_ACCOUNTS:'pujadecor2025@gmail.com:admin'}), null);
    assert.equal(getStaffAccount('seller@example.com', {}), null);
    assert.equal(normalizeEmail('  Seller@Example.com '), 'seller@example.com');
});

test('seller authorization matches signed roles to the current staff allowlist', () => {
    assert.equal(staffTokenHasSellerAccess({roles:['admin']}, ['admin']), true);
    assert.equal(staffTokenHasSellerAccess({roles:['seller']}, ['seller']), true);
    assert.equal(staffTokenHasSellerAccess({roles:['seller']}, ['admin']), false);
    assert.equal(staffTokenHasSellerAccess(null, ['admin']), false);
});
