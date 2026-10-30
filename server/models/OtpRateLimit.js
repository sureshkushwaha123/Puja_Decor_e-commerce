import mongoose from 'mongoose';

const otpRateLimitSchema = new mongoose.Schema({
    key: {type:String, required:true, unique:true},
    // The controller increments this value atomically on upsert, so it must
    // not inject a conflicting default update for the same path.
    hits: {type:Number, required:true},
    expiresAt: {type:Date, required:true},
}, {versionKey:false});

otpRateLimitSchema.index({expiresAt:1}, {expireAfterSeconds:0});

const OtpRateLimit = mongoose.models.OtpRateLimit || mongoose.model('OtpRateLimit', otpRateLimitSchema);

export default OtpRateLimit;
