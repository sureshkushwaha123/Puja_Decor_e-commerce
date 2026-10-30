import Address from "../models/Address.js";
import { reverseGeocode } from "../services/reverseGeocode.js";

const requiredFields = [
  'firstName', 'lastName', 'phone', 'flatHouseNo', 'street',
  'city', 'state', 'zipCode', 'country', 'addressType',
];
const addressTextFields = [
  'firstName', 'lastName', 'flatHouseNo', 'street', 'landmark',
  'city', 'state', 'zipCode', 'country', 'addressType',
];
const allowedAddressTypes = new Set(['Home', 'Work', 'Other']);

const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

const normalizeAddress = (input) => {
  const address = {};
  for (const field of addressTextFields) {
    address[field] = typeof input[field] === 'string' ? input[field].trim().replace(/\s+/g, ' ') : '';
  }
  address.phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  return address;
};

const validationMessage = (address) => {
  const labels = {
    firstName:'your first name', lastName:'your last name', phone:'your phone number',
    flatHouseNo:'your flat or house number', street:'your area, street, or locality',
    city:'your city', state:'your state', zipCode:'your PIN or postal code', country:'your country',
    addressType:'an address type',
  };
  for (const field of requiredFields) {
    if (!address[field]) return `Please enter ${labels[field]}`;
  }

  const phoneDigits = address.phone.replace(/\D/g, '');
  if (!/^\+?[0-9\s().-]+$/.test(address.phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return 'Enter a valid phone number';
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{1,10}[A-Za-z0-9]$/.test(address.zipCode)) {
    return 'Enter a valid PIN or postal code';
  }
  if (!allowedAddressTypes.has(address.addressType)) return 'Choose Home, Work, or Other for the address type';
  if (addressTextFields.some((field) => address[field].length > (field === 'flatHouseNo' || field === 'street' ? 180 : 100))) {
    return 'Address fields are too long';
  }
  return null;
};

// add address: /api/address/add
export const addAddress = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId || !req.body?.address || typeof req.body.address !== 'object' || Array.isArray(req.body.address)) {
      return res.status(400).json({ success:false, message:'Invalid address details' });
    }

    const address = normalizeAddress(req.body.address);
    const message = validationMessage(address);
    if (message) return res.status(400).json({ success:false, message });

    // Avoid creating the same delivery location more than once for this user.
    const existingAddresses = await Address.find({ userId });
    const isDuplicate = existingAddresses.some((existing) =>
      ['flatHouseNo', 'street', 'landmark', 'city', 'state', 'zipCode', 'country']
        .every((field) => normalize(existing[field]) === normalize(address[field]))
    );
    if (isDuplicate) {
      return res.status(409).json({ success:false, message:'This shipping address is already saved' });
    }

    await Address.create({ ...address, userId });
    return res.json({ success:true, message:'Address added successfully' });
  } catch (error) {
    const isValidationError = error.name === 'ValidationError';
    return res.status(isValidationError ? 400 : 500).json({
      success:false,
      message:isValidationError ? 'Please check the address details and try again' : 'Unable to save the address. Please try again',
    });
  }
};

// get address: /api/address/get
export const getAddress = async (req, res) => {
  try {
    const addresses = await Address.find({ userId:req.userId });
    return res.json({ success:true, addresses });
  } catch {
    return res.status(500).json({ success:false, message:'Unable to load saved addresses' });
  }
};

// Reverse-geocoding is available only to an authenticated user and is called
// only after the user explicitly requests location detection in the form.
export const reverseGeocodeAddress = async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ success:false, message:'Location coordinates are invalid' });
  }

  try {
    const address = await reverseGeocode(lat, lon);
    return res.json({ success:true, address });
  } catch {
    return res.status(502).json({ success:false, message:'We could not look up this location. Please enter your address manually.' });
  }
};
