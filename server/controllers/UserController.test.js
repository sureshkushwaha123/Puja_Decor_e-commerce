import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import EmailOtp from '../models/EmailOtp.js';
import OtpRateLimit from '../models/OtpRateLimit.js';
import authUser from '../middlewares/authUser.js';
import authSeller from '../middlewares/authSeller.js';
import {
    requestCustomerOtp,
    requestStaffOtp,
    verifyCustomerOtp,
    verifyStaffOtp,
} from './UserController.js';
import { digestOtp } from '../services/otpSecurity.js';

const clone = (value) => value == null ? value : structuredClone(value);
const asQuery = (value) => {
    const query = Promise.resolve(value);
    query.select = () => query;
    return query;
};

const makeResponse = () => ({
    statusCode:200,
    body:null,
    cookies:{},
    status(code) { this.statusCode=code; return this; },
    json(body) { this.body=body; return this; },
    cookie(name, value, options) { this.cookies[name]={value, options}; return this; },
});

const makeRequest = (body, ip='198.51.100.55') => ({body, ip, socket:{remoteAddress:ip}});

test('OTP controller workflows preserve users, enforce limits, and issue allowlisted sessions', async (t) => {
    const originalMethods = {
        userFindOne:User.findOne,
        userCreate:User.create,
        otpFindOne:EmailOtp.findOne,
        otpFindOneAndUpdate:EmailOtp.findOneAndUpdate,
        otpFindOneAndDelete:EmailOtp.findOneAndDelete,
        otpDeleteOne:EmailOtp.deleteOne,
        rateFindOneAndUpdate:OtpRateLimit.findOneAndUpdate,
        fetch:globalThis.fetch,
        jwtSecret:process.env.JWT_SECRET,
        staffAccounts:process.env.STAFF_ACCOUNTS,
        resendApiKey:process.env.RESEND_API_KEY,
        resendFromEmail:process.env.RESEND_FROM_EMAIL,
    };
    const users=[];
    const challenges=[];
    const rateLimits=new Map();
    const mailedCodes=[];
    let userCreateCount=0;
    let challengeId=0;
    process.env.JWT_SECRET='otp-controller-test-secret';
    process.env.STAFF_ACCOUNTS='staff@example.test:admin';
    process.env.RESEND_API_KEY='test-only-resend-key';
    process.env.RESEND_FROM_EMAIL='Puja Decor <auth@example.test>';

    User.findOne = (filter) => {
        const matcher=filter.email;
        const regex=matcher?.$regex ? new RegExp(matcher.$regex, matcher.$options) : null;
        return asQuery(users.find((user) => regex?.test(user.email)) || null);
    };
    User.create = async (document) => {
        userCreateCount += 1;
        const user={_id:`customer-${userCreateCount}`, cartItems:{}, ...clone(document)};
        users.push(user);
        return clone(user);
    };
    EmailOtp.findOne = (filter) => {
        const now=Date.now();
        const challenge=challenges.find((candidate) => {
            if (candidate.email !== filter.email || candidate.purpose !== filter.purpose) return false;
            if (filter.expiresAt?.$gt && candidate.expiresAt <= filter.expiresAt.$gt) return false;
            if (filter.createdAt?.$gt && candidate.createdAt <= filter.createdAt.$gt) return false;
            return candidate.expiresAt.getTime() > now;
        });
        return asQuery(clone(challenge || null));
    };
    EmailOtp.findOneAndUpdate = async (filter, update) => {
        if (filter._id) {
            const challenge=challenges.find((candidate) =>
                candidate._id === filter._id &&
                candidate.expiresAt > filter.expiresAt.$gt &&
                candidate.attempts < filter.attempts.$lt
            );
            if (!challenge) return null;
            challenge.attempts += update.$inc.attempts;
            return clone(challenge);
        }

        let challenge=challenges.find((candidate) =>
            candidate.email === filter.email && candidate.purpose === filter.purpose
        );
        if (!challenge) {
            challenge={_id:`challenge-${++challengeId}`, email:filter.email, purpose:filter.purpose, attempts:0};
            challenges.push(challenge);
        }
        Object.assign(challenge, clone(update.$set));
        if (update.$unset?.signupName) delete challenge.signupName;
        return clone(challenge);
    };
    EmailOtp.findOneAndDelete = async (filter) => {
        const index=challenges.findIndex((candidate) =>
            candidate._id === filter._id &&
            candidate.codeDigest === filter.codeDigest &&
            candidate.expiresAt > filter.expiresAt.$gt &&
            candidate.attempts < filter.attempts.$lt
        );
        if (index < 0) return null;
        return clone(challenges.splice(index,1)[0]);
    };
    EmailOtp.deleteOne = async (filter) => {
        const index=challenges.findIndex((candidate) =>
            candidate._id === filter._id &&
            (!filter.codeDigest || candidate.codeDigest === filter.codeDigest) &&
            (!filter.attempts?.$gte || candidate.attempts >= filter.attempts.$gte)
        );
        if (index >= 0) challenges.splice(index,1);
        return {deletedCount:index >= 0 ? 1 : 0};
    };
    OtpRateLimit.findOneAndUpdate = async (filter, update) => {
        let record=rateLimits.get(filter.key);
        if (!record) {
            record={key:filter.key, hits:0, ...clone(update.$setOnInsert)};
            rateLimits.set(filter.key,record);
        }
        record.hits += update.$inc.hits;
        return clone(record);
    };
    globalThis.fetch = async (_url, options) => {
        const message=JSON.parse(options.body).text;
        mailedCodes.push(message.match(/code is (\d{6})/)[1]);
        return {ok:true};
    };

    try {
        await t.test('customer signup creates a passwordless customer and consumes the code once', async () => {
            const email='new-customer@example.test';
            const requestResponse=makeResponse();
            await requestCustomerOtp(makeRequest({email, name:'New Customer', mode:'signup'}), requestResponse);
            assert.equal(requestResponse.body.success, true);
            const code=mailedCodes.at(-1);

            const verifyResponse=makeResponse();
            await verifyCustomerOtp(makeRequest({email, code, mode:'signup'}), verifyResponse);
            assert.equal(verifyResponse.body.success, true);
            assert.equal(users.length, 1);
            assert.equal(users[0].name, 'New Customer');
            assert.equal(Object.hasOwn(users[0], 'password'), false);
            assert.equal(verifyResponse.cookies.token.options.httpOnly, true);
            assert.equal(verifyResponse.cookies.token.options.path, '/api');
            assert.equal(jwt.verify(verifyResponse.cookies.token.value, process.env.JWT_SECRET).id, 'customer-1');

            const sessionRequest={cookies:{token:verifyResponse.cookies.token.value}};
            let sessionRestored=false;
            await authUser(sessionRequest, makeResponse(), () => { sessionRestored=true; });
            assert.equal(sessionRestored, true);
            assert.equal(sessionRequest.userId, 'customer-1');

            const replayResponse=makeResponse();
            await verifyCustomerOtp(makeRequest({email, code, mode:'signup'}), replayResponse);
            assert.equal(replayResponse.statusCode, 401);
            assert.equal(users.length, 1);
        });

        await t.test('customer login keeps the existing account id and cart', async () => {
            const email='existing-customer@example.test';
            users.push({_id:'existing-customer-id', name:'Existing Customer', email, cartItems:{itemA:2}});
            const requestResponse=makeResponse();
            await requestCustomerOtp(makeRequest({email, mode:'login'}), requestResponse);
            const code=mailedCodes.at(-1);

            const verifyResponse=makeResponse();
            await verifyCustomerOtp(makeRequest({email, code, mode:'login'}), verifyResponse);
            assert.equal(verifyResponse.body.success, true);
            assert.equal(jwt.verify(verifyResponse.cookies.token.value, process.env.JWT_SECRET).id, 'existing-customer-id');
            assert.deepEqual(users.find((user) => user.email === email).cartItems, {itemA:2});
            assert.equal(userCreateCount, 1);
        });

        await t.test('unknown customer login sends no OTP and returns the signup-specific response', async () => {
            const email='unregistered@example.test';
            const previousMailCount=mailedCodes.length;
            const response=makeResponse();
            await requestCustomerOtp(makeRequest({email, mode:'login'}), response);
            assert.equal(response.statusCode, 404);
            assert.equal(response.body.code, 'ACCOUNT_NOT_FOUND');
            assert.match(response.body.message, /create an account first/i);
            assert.equal(mailedCodes.length, previousMailCount);
            assert.equal(users.some((user) => user.email === email), false);
        });

        await t.test('staff login is allowlist-only and does not write customer records', async () => {
            const unknownResponse=makeResponse();
            await requestStaffOtp(makeRequest({email:'unknown@example.test'}), unknownResponse);
            assert.equal(unknownResponse.body.success, true);
            assert.equal(mailedCodes.length, 2);

            const email='staff@example.test';
            const requestResponse=makeResponse();
            await requestStaffOtp(makeRequest({email}), requestResponse);
            const code=mailedCodes.at(-1);
            const verifyResponse=makeResponse();
            await verifyStaffOtp(makeRequest({email, code}), verifyResponse);
            assert.equal(verifyResponse.body.success, true);
            assert.equal(userCreateCount, 1);
            const token=verifyResponse.cookies.sellerToken.value;
            assert.equal(verifyResponse.cookies.sellerToken.options.httpOnly, true);
            assert.equal(verifyResponse.cookies.sellerToken.options.path, '/api');
            assert.deepEqual(jwt.verify(token, process.env.JWT_SECRET).roles, ['admin']);

            const authResponse=makeResponse();
            let nextCalled=false;
            await authSeller({cookies:{sellerToken:token}}, authResponse, () => { nextCalled=true; });
            assert.equal(nextCalled, true);
        });

        await t.test('five wrong codes exhaust the challenge and the correct code cannot then be used', async () => {
            const email='attempt-limit@example.test';
            await requestCustomerOtp(makeRequest({email, name:'Attempt Test', mode:'signup'}), makeResponse());
            const correctCode=mailedCodes.at(-1);
            const wrongCode=correctCode === '000000' ? '000001' : '000000';
            for (let attempt=0; attempt<5; attempt+=1) {
                const response=makeResponse();
                await verifyCustomerOtp(makeRequest({email, code:wrongCode, mode:'signup'}), response);
                assert.equal(response.statusCode, 401);
            }
            assert.equal(challenges.some((item) => item.email === email), false);

            const lastResponse=makeResponse();
            await verifyCustomerOtp(makeRequest({email, code:correctCode, mode:'signup'}), lastResponse);
            assert.equal(lastResponse.statusCode, 401);
        });

        await t.test('expired codes are rejected and request rate limits stop excess requests', async () => {
            const expiredEmail='expired@example.test';
            challenges.push({
                _id:'expired-challenge',
                email:expiredEmail,
                purpose:'customer-login',
                codeDigest:digestOtp(expiredEmail, 'customer-login', '123456', process.env.JWT_SECRET),
                attempts:0,
                createdAt:new Date(Date.now()-1200000),
                expiresAt:new Date(Date.now()-1),
            });
            const expiredResponse=makeResponse();
            await verifyCustomerOtp(makeRequest({email:expiredEmail, code:'123456', mode:'login'}), expiredResponse);
            assert.equal(expiredResponse.statusCode, 401);

            const limitedEmail='rate-limit@example.test';
            const ip='198.51.100.77';
            for (let attempt=0; attempt<5; attempt+=1) {
                const response=makeResponse();
                await requestCustomerOtp(makeRequest({email:limitedEmail, mode:'login'},ip), response);
                assert.equal(response.statusCode, 404);
            }
            const limitedResponse=makeResponse();
            await requestCustomerOtp(makeRequest({email:limitedEmail, mode:'login'},ip), limitedResponse);
            assert.equal(limitedResponse.statusCode, 429);
        });
    } finally {
        User.findOne=originalMethods.userFindOne;
        User.create=originalMethods.userCreate;
        EmailOtp.findOne=originalMethods.otpFindOne;
        EmailOtp.findOneAndUpdate=originalMethods.otpFindOneAndUpdate;
        EmailOtp.findOneAndDelete=originalMethods.otpFindOneAndDelete;
        EmailOtp.deleteOne=originalMethods.otpDeleteOne;
        OtpRateLimit.findOneAndUpdate=originalMethods.rateFindOneAndUpdate;
        globalThis.fetch=originalMethods.fetch;
        if (originalMethods.jwtSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET=originalMethods.jwtSecret;
        if (originalMethods.staffAccounts === undefined) delete process.env.STAFF_ACCOUNTS;
        else process.env.STAFF_ACCOUNTS=originalMethods.staffAccounts;
        if (originalMethods.resendApiKey === undefined) delete process.env.RESEND_API_KEY;
        else process.env.RESEND_API_KEY=originalMethods.resendApiKey;
        if (originalMethods.resendFromEmail === undefined) delete process.env.RESEND_FROM_EMAIL;
        else process.env.RESEND_FROM_EMAIL=originalMethods.resendFromEmail;
    }
});
