import jwt from "jsonwebtoken";


const authUser = async (req, res, next) => {

    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({success:false, code:"AUTH_REQUIRED", message:"Please sign in to continue"});
    }

    try {
        const tokenDecode=jwt.verify(token, process.env.JWT_SECRET);
        if (tokenDecode.id) {
            // req.body.userId=tokenDecode.id;
            req.userId = tokenDecode.id;
        }else{
            return res.status(401).json({success:false, code:"AUTH_INVALID", message:"Please sign in again"});
        }
        next();
    } catch (error) {
        return res.status(401).json({success:false, code:"AUTH_INVALID", message:"Your sign-in has expired. Please sign in again."});
    }
}

export default authUser
