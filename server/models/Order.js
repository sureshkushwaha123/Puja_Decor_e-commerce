import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    // Define the schema fields (changed userId) 
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'product' },
      quantity: { type: Number, required: true },
    },
  ],
  amount: { type: Number, required: true },
  address: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'address' },
  status: { type: String, default: "order placed" },
  paymentType: { type: String, required: true },
  isPaid: { type: Boolean, required: true, default: false },
}, { timestamps: true });

const Order = mongoose.models.order || mongoose.model('order', orderSchema);
export default Order;
