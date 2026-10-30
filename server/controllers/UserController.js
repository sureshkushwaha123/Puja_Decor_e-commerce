import User from "../models/User.js";
import jwt from 'jsonwebtoken';
import EmailOtp from '../models/EmailOtp.js';
import OtpRateLimit from '../models/OtpRateLimit.js';
import { sendOtpEmail } from '../services/emailService.js';
import {
    digestOtp,
    digestRateLimitKey,
    generateOtp,
    isValidEmail,
    normalizeEmail,
    OTP_MAX_ATTEMPTS,
    OTP_RATE_WINDOW_MS,
    OTP_RESEND_COOLDOWN_MS,
    OTP_TTL_MS,
    safeDigestEqual,
    getStaffAccount,
} from '../services/otpSecurity.js';

const authCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
    path: '/api',
};

const genericOtpMessage = "If the account is eligible, a verification code has been sent.";
const maxEmailOtpRequestsPerHour = 5;
const maxIpOtpRequestsPerHour = 30;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findUserByEmail = (email) => User.findOne({
    email:{$regex:`^${escapeRegex(email)}$`, $options:'i'},
});

const consumeRateLimit = async (kind, identity, maxRequests, now) => {
    const bucket = Math.floor(now.getTime() / OTP_RATE_WINDOW_MS);
    const key = digestRateLimitKey(kind, identity, bucket);
    const expiresAt = new Date((bucket + 2) * OTP_RATE_WINDOW_MS);
    let counter;

    try {
        counter = await OtpRateLimit.findOneAndUpdate(
            {key},
            {$inc:{hits:1}, $setOnInsert:{expiresAt}},
            {upsert:true, new:true, setDefaultsOnInsert:true}
        );
    } catch (error) {
        // A simultaneous first request can win the unique-key upsert race.
        if (error?.code !== 11000) throw error;
        counter = await OtpRateLimit.findOneAndUpdate({key}, {$inc:{hits:1}}, {new:true});
    }

    return Boolean(counter && counter.hits <= maxRequests);
};

const requestIsRateLimited = async (req, email, now) => {
    const ip = String(req.ip || req.socket?.remoteAddress || 'unknown');
    const emailAllowed = await consumeRateLimit('email', email, maxEmailOtpRequestsPerHour, now);
    const ipAllowed = await consumeRateLimit('ip', ip, maxIpOtpRequestsPerHour, now);
    return !emailAllowed || !ipAllowed;
};

const issueOtp = async ({email, purpose, signupName}) => {
    const now = new Date();
    const activeChallenge = await EmailOtp.findOne({
        email,
        purpose,
        createdAt:{$gt:new Date(now.getTime() - OTP_RESEND_COOLDOWN_MS)},
        expiresAt:{$gt:now},
    });
    if (activeChallenge) return;

    const code = generateOtp();
    const codeDigest = digestOtp(email, purpose, code);
    const update = {
        $set:{
            codeDigest,
            attempts:0,
            createdAt:now,
            expiresAt:new Date(now.getTime() + OTP_TTL_MS),
        },
        $unset:{signupName:1},
    };
    if (signupName) {
        update.$set.signupName = signupName;
        delete update.$unset;
    }

    const challenge = await EmailOtp.findOneAndUpdate(
        {email, purpose},
        update,
        {upsert:true, new:true, setDefaultsOnInsert:true}
    );

    try {
        await sendOtpEmail({to:email, code, expiresInMinutes:OTP_TTL_MS / 60000});
    } catch (error) {
        await EmailOtp.deleteOne({_id:challenge._id, codeDigest});
        throw error;
    }
};

const consumeOtp = async ({email, purpose, code}) => {
    const now = new Date();
    const challenge = await EmailOtp.findOne({email, purpose, expiresAt:{$gt:now}}).select('+codeDigest');
    if (!challenge || challenge.attempts >= OTP_MAX_ATTEMPTS) return null;

    const providedDigest = digestOtp(email, purpose, code);
    if (!safeDigestEqual(providedDigest, challenge.codeDigest)) {
        const updated = await EmailOtp.findOneAndUpdate(
            {_id:challenge._id, expiresAt:{$gt:now}, attempts:{$lt:OTP_MAX_ATTEMPTS}},
            {$inc:{attempts:1}},
            {new:true}
        );
        if (updated?.attempts >= OTP_MAX_ATTEMPTS) {
            await EmailOtp.deleteOne({_id:challenge._id, attempts:{$gte:OTP_MAX_ATTEMPTS}});
        }
        return null;
    }

    // A conditional delete makes verification single-use even for concurrent requests.
    return EmailOtp.findOneAndDelete({
        _id:challenge._id,
        codeDigest:challenge.codeDigest,
        expiresAt:{$gt:now},
        attempts:{$lt:OTP_MAX_ATTEMPTS},
    });
};

const setCustomerSession = (res, user) => {
    const token = jwt.sign({id:user._id.toString()}, process.env.JWT_SECRET, {expiresIn:'7d'});
    res.cookie('token', token, {
        ...authCookieOptions,
        maxAge:7 * 24 * 60 * 60 * 1000,
    });
};

const setStaffSession = (res, staffAccount) => {
    const token = jwt.sign({
        authType:'staff',
        email:staffAccount.email,
        roles:staffAccount.roles,
    }, process.env.JWT_SECRET, {expiresIn:'7d'});
    res.cookie('sellerToken', token, {
        ...authCookieOptions,
        maxAge:7 * 24 * 60 * 60 * 1000,
    });
};


// Request a customer signup or login code. Customer login only sends codes to
// registered users; signup creates the account after code verification.
export const requestCustomerOtp = async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const mode = req.body?.mode;
        const name = String(req.body?.name || '').trim().slice(0, 100);
        if (!isValidEmail(email) || !['signup', 'login'].includes(mode) || (mode === 'signup' && !name)) {
            return res.status(400).json({success:false, message:'Enter a valid email and complete the requested fields'});
        }

        const now = new Date();
        if (await requestIsRateLimited(req, email, now)) {
            return res.status(429).json({success:false, message:'Too many code requests. Please try again later.'});
        }

        const existingUser = await findUserByEmail(email);
        const isStaff = Boolean(getStaffAccount(email));
        if (mode === 'login' && !existingUser) {
            return res.status(404).json({
                success:false,
                code:'ACCOUNT_NOT_FOUND',
                message:'Account not found. Please create an account first.',
            });
        }

        if (mode === 'signup' && existingUser) {
            return res.status(409).json({success:false, code:'ACCOUNT_EXISTS', message:'An account with this email already exists. Please log in.'});
        }

        if (mode === 'signup' && isStaff) {
            return res.status(409).json({success:false, code:'STAFF_ACCOUNT', message:'This email is reserved for an authorized staff account.'});
        }

        await issueOtp({
            email,
            purpose:mode === 'signup' ? 'customer-signup' : 'customer-login',
            signupName:mode === 'signup' ? name : undefined,
        });

        return res.json({
            success:true,
            message:mode === 'signup' ? 'Verification code sent. Verify your email to create your account.' : 'Verification code sent.',
        });
    } catch (error) {
        console.error('Customer OTP request failed:', error.message);
        return res.status(503).json({success:false, message:'Email delivery is temporarily unavailable'});
    }
};

export const verifyCustomerOtp = async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const mode = req.body?.mode;
        const code = String(req.body?.code || '').trim();
        if (!isValidEmail(email) || !['signup', 'login'].includes(mode) || !/^\d{6}$/.test(code)) {
            return res.status(400).json({success:false, message:'Enter the email and six-digit code'});
        }

        const purpose = mode === 'signup' ? 'customer-signup' : 'customer-login';
        const challenge = await consumeOtp({email, purpose, code});
        if (!challenge) {
            return res.status(401).json({success:false, message:'That code is invalid or expired. Request a new one and try again.'});
        }

        let user;
        if (mode === 'signup') {
            if (await findUserByEmail(email) || getStaffAccount(email)) {
                return res.status(409).json({success:false, message:'This email can no longer be registered'});
            }
            user = await User.create({
                name:challenge.signupName,
                email,
            });
        } else {
            user = await findUserByEmail(email);
            if (!user) {
                return res.status(401).json({success:false, message:'That code is invalid or expired. Request a new one and try again.'});
            }
        }

        setCustomerSession(res, user);
        return res.json({
            success:true,
            message:mode === 'signup' ? 'Account created successfully' : 'Signed in successfully',
            user:{email:user.email, name:user.name},
        });
    } catch (error) {
        console.error('Customer OTP verification failed:', error.message);
        return res.status(500).json({success:false, message:'Unable to verify the code'});
    }
};

export const requestStaffOtp = async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        if (!isValidEmail(email)) {
            return res.status(400).json({success:false, message:'Enter a valid email address'});
        }

        const now = new Date();
        if (await requestIsRateLimited(req, email, now)) {
            return res.status(429).json({success:false, message:'Too many code requests. Please try again later.'});
        }

        if (getStaffAccount(email)) {
            await issueOtp({email, purpose:'staff-login'});
        }

        return res.json({success:true, message:genericOtpMessage});
    } catch (error) {
        console.error('Staff OTP request failed:', error.message);
        return res.status(503).json({success:false, message:'Email delivery is temporarily unavailable'});
    }
};

export const verifyStaffOtp = async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const code = String(req.body?.code || '').trim();
        if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
            return res.status(400).json({success:false, message:'Enter the email and six-digit code'});
        }

        const challenge = await consumeOtp({email, purpose:'staff-login', code});
        const staffAccount = getStaffAccount(email);
        if (!challenge || !staffAccount) {
            return res.status(401).json({success:false, message:'That code is invalid or expired. Request a new one and try again.'});
        }

        // Staff identity and authorization are pre-created by STAFF_ACCOUNTS.
        // Do not create or mutate customer/user documents during staff sign-in.
        setStaffSession(res, staffAccount);
        return res.json({success:true, message:'Signed in successfully'});
    } catch (error) {
        console.error('Staff OTP verification failed:', error.message);
        return res.status(500).json({success:false, message:'Unable to verify the code'});
    }
};


//check auth status: /api/users/is-auth

export const isAuth = async (req, res) => {
    try {
        // const {userId} = req.body;
        const user = await User.findById(req.userId).select('name email cartItems');
        return res.json({success:true, user});

    } catch (error) {
        console.error(error.message);
        return res.json({success:false, message: error.message}); 
    }
}

//logout user: /api/users/logout

export const logout = async (req, res) => {
    try {
        res.clearCookie('token', authCookieOptions);
        return res.json({success:true, message:"logged out successfully"});
    } catch (error) {
        console.error(error.message);
        return res.json({success:false, message: error.message});
    }
}
