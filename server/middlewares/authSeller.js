import jwt from "jsonwebtoken";
import { getStaffAccount, normalizeEmail, staffTokenHasSellerAccess } from '../services/otpSecurity.js';


const authSeller = async (req, res, next) => {
    const sellerToken = req.cookies?.sellerToken;
    if (!sellerToken) {
        return res.status(401).json({success:false, message:"Not Authorized"});
    }
    try {
        const tokenDecode = jwt.verify(sellerToken, process.env.JWT_SECRET);
        const email = normalizeEmail(tokenDecode.email);
        const configuredAccount = getStaffAccount(email);
        if (!email || !configuredAccount) {
            return res.status(401).json({success:false, message:"Not Authorized"});
        }

        const tokenRoles = Array.isArray(tokenDecode.roles) ? tokenDecode.roles : [];
        const hasSellerAccess = staffTokenHasSellerAccess(configuredAccount, tokenRoles);
        if (tokenDecode.authType === 'staff' && hasSellerAccess) {
            req.staffEmail = email;
            req.staffRoles = tokenRoles;
            return next();
        }

        return res.status(401).json({success:false, message:"Not Authorized"});
    } catch {
        return res.status(401).json({success:false, message:"Not Authorized"});
    }
}

export default authSeller;
