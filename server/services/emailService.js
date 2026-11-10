const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export const sendOtpEmail = async ({to, code, expiresInMinutes = 10}, {
    env = process.env,
    fetchImpl = globalThis.fetch,
} = {}) => {
    const apiKey = env.RESEND_API_KEY;
    const from = env.RESEND_FROM_EMAIL || env.RESEND_FROM;
    if (!apiKey || !from) {
        throw new Error('OTP email delivery is not configured');
    }

    const response = await fetchImpl(RESEND_ENDPOINT, {
        method:'POST',
        headers: {
            Authorization:`Bearer ${apiKey}`,
            'Content-Type':'application/json',
        },
        body:JSON.stringify({
            from,
            to:[to],
            subject:'Your Puja Decor sign-in code',
            text:`Your Puja Decor verification code is ${code}. It expires in ${expiresInMinutes} minutes. If you did not request this code, you can ignore this email.`,
            html:`<p>Your Puja Decor verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>It expires in ${expiresInMinutes} minutes. If you did not request this code, you can ignore this email.</p>`,
        }),
    });

    if (!response.ok) {
        // Retain only safe diagnostics for backend logs. Never relay provider
        // response contents, which may contain recipient or sender details.
        let providerCode;
        try {
            const providerError = await response.json();
            if (typeof providerError?.name === 'string' && /^[a-z0-9_-]{1,80}$/i.test(providerError.name)) {
                providerCode = providerError.name;
            }
        } catch {
            // Some provider errors do not include a JSON body.
        }
        const error = new Error(`OTP email delivery failed (HTTP ${response.status})`);
        error.providerStatus = response.status;
        if (providerCode) error.providerCode = providerCode;
        throw error;
    }
};
