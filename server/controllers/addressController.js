import Address from "../models/Address.js";

// add address: /api/address/add
export const addAddress = async (req, res) => {
  try {
    const userId = req.userId; // ✅ now taken from JWT middleware
    const {address} = req.body;  // frontend just sends address details

    await Address.create({ ...address, userId });

    return res.json({
      success: true,
      message: "Address added successfully",
    });
  } catch (error) {
    console.error(error.message);
    return res.json({ success: false, message: error.message });
  }
};

// get address: /api/address/get
export const getAddress = async (req, res) => {
  try {
    const userId = req.userId; // ✅ also use from JWT middleware
    const addresses = await Address.find({ userId });
    return res.json({ success: true, addresses });
  } catch (error) {
    console.error(error.message);
    return res.json({ success: false, message: error.message });
  }
};
