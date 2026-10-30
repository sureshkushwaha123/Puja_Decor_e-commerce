import mongoose from 'mongoose';

const emailOtpSchema = new mongoose.Schema({
    email: {type:String, required:true, lowercase:true, trim:true},
    purpose: {type:String, required:true, enum:['customer-signup', 'customer-login', 'staff-login']},
    codeDigest: {type:String, required:true, select:false},
    signupName: {type:String, default:undefined},
    attempts: {type:Number, default:0},
    createdAt: {type:Date, required:true},
    expiresAt: {type:Date, required:true},
}, {versionKey:false});

emailOtpSchema.index({email:1, purpose:1}, {unique:true});
// MongoDB TTL cleanup is only housekeeping; verification checks expiresAt itself.
emailOtpSchema.index({expiresAt:1}, {expireAfterSeconds:0});

const EmailOtp = mongoose.models.EmailOtp || mongoose.model('EmailOtp', emailOtpSchema);

export default EmailOtp;
