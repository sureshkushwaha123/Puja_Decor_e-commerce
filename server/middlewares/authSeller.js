import jwt from "jsonwebtoken";
import { getStaffAccount, normalizeEmail, staffTokenHasSellerAccess } from '../services/otpSecurity.js';

export const getSellerTokenClaims = (sellerToken) => {
    if (!sellerToken) return null;
    try {
        const tokenDecode = jwt.verify(sellerToken, process.env.JWT_SECRET);
        const email = normalizeEmail(tokenDecode.email);
        const configuredAccount = getStaffAccount(email);
        if (!email || !configuredAccount) return null;

        const tokenRoles = Array.isArray(tokenDecode.roles) ? tokenDecode.roles : [];
        if (tokenDecode.authType !== 'staff' || !staffTokenHasSellerAccess(configuredAccount, tokenRoles)) return null;
        return {email, roles:tokenRoles};
    } catch {
        return null;
    }
};

const authSeller = async (req, res, next) => {
    const sellerClaims = getSellerTokenClaims(req.cookies?.sellerToken);
    if (!sellerClaims) return res.status(401).json({success:false, message:"Not Authorized"});
    req.staffEmail = sellerClaims.email;
    req.staffRoles = sellerClaims.roles;
    return next();
}

export default authSeller;
