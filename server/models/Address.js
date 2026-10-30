import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
    userId:{type: String, required:true},
    firstName: {type:String, required:true},
    lastName: {type:String, required:true},
    // Older address records may include an email. It is no longer collected
    // separately because checkout already belongs to the authenticated user.
    email: {type:String, required:false},
    flatHouseNo: {type:String, default:''},
    landmark: {type:String, default:''},
    addressType: {type:String, enum:['Home', 'Work', 'Other'], default:'Home'},
    street: {type:String, required:true},
    city: {type:String, required:true},
    state: {type:String, required:true},
    // Keep postal codes and phone numbers as strings so leading zeroes and
    // international formats are preserved. Existing numeric BSON values remain readable.
    zipCode: {type:String, required:true},
    country: {type:String, required:true},
    phone: {type:String, required:true},
})

const Address= mongoose.models.address || mongoose.model('address', addressSchema);

export default Address;
