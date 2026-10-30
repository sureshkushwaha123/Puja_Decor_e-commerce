const sellerCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',
    path: '/api',
};

//seller isAuth : /api/seller/is-auth

export const isSellerAuth = async (req, res) => {
    try {
        return res.json({success:true});

    } catch (error) {
        console.error(error.message);
        return res.json({success:false, message: error.message}); 
    }
}


// seller logout: /api/seller/logout

export const sellerLogout = async (req, res) => {
    try {
        res.clearCookie('sellerToken', sellerCookieOptions);
        return res.json({success:true, message:"logged out successfully"});
    } catch (error) {
        console.error(error.message);
        return res.json({success:false, message: error.message});
    }
}
