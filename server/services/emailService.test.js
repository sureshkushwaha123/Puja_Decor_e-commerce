import test from 'node:test';
import assert from 'node:assert/strict';
import { sendOtpEmail } from './emailService.js';

test('Resend delivery uses server credentials and sends the code only to the requested address', async () => {
    let request;
    await sendOtpEmail({to:'customer@example.com', code:'001234'}, {
        env:{RESEND_API_KEY:'test-api-key', RESEND_FROM_EMAIL:'Puja Decor <auth@example.com>'},
        fetchImpl:async (url, options) => {
            request = {url, options};
            return {ok:true};
        },
    });

    assert.equal(request.url, 'https://api.resend.com/emails');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.headers.Authorization, 'Bearer test-api-key');
    const payload = JSON.parse(request.options.body);
    assert.equal(payload.from, 'Puja Decor <auth@example.com>');
    assert.deepEqual(payload.to, ['customer@example.com']);
    assert.match(payload.text, /001234/);
    assert.match(payload.html, /001234/);
});

test('Resend delivery fails closed when its server configuration is missing', async () => {
    let called = false;
    await assert.rejects(
        sendOtpEmail({to:'customer@example.com', code:'123456'}, {
            env:{},
            fetchImpl:async () => { called = true; return {ok:true}; },
        }),
        /not configured/
    );
    assert.equal(called, false);
});

test('Resend provider failures do not return provider response contents', async () => {
    await assert.rejects(
        sendOtpEmail({to:'customer@example.com', code:'123456'}, {
            env:{RESEND_API_KEY:'test-api-key', RESEND_FROM_EMAIL:'auth@example.com'},
            fetchImpl:async () => ({ok:false, json:async () => ({message:'sensitive provider detail'})}),
        }),
        (error) => error.message === 'OTP email delivery failed' && !error.message.includes('sensitive')
    );
});
