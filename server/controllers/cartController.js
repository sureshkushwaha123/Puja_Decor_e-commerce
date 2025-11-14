import User from "../models/User.js";

// update user cartdata: /api/cart/update



// export const updateCart = async (req, res) => {
//     try {
//         const {userId, cartItems} = req.body;
//         await User.findByIdAndUpdate(userId, {cartData: cartItems});
//         return res.json({success:true, message:"Cart updated successfully"});
//     } catch (error) {
//         console.error(error.message);
//         return res.json({success:false, message: error.message});
//     }
// }

// Updated version to update the cart using req.userId from authUser middleware

export const updateCart = async (req, res) => {
  try {
    const { cartItems } = req.body;
    if (!cartItems) {
      return res.json({ success: false, message: "cartItems missing" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,             // ✅ from authUser middleware
      { cartItems },
      { new: true }
    );

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      message: "Cart updated successfully",
      user,                   // optional: so frontend can refresh immediately
    });
  } catch (error) {
    console.error(error.message);
    return res.json({ success: false, message: error.message });
  }
};
