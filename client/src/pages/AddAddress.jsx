import { useEffect, useRef, useState } from 'react';
import { FiNavigation } from 'react-icons/fi';
import { assets } from '../assets/assets';
import { useAppContext } from '../context/AppContext';
import { locationErrorMessage, locationLookupErrorMessage, mergeDetectedAddress, requestCurrentCoordinates } from '../utils/location';
import toast from 'react-hot-toast';

const emptyAddress = {
  firstName:'',
  lastName:'',
  phone:'',
  flatHouseNo:'',
  street:'',
  landmark:'',
  city:'',
  state:'',
  zipCode:'',
  country:'',
  addressType:'Home',
};

const fieldClassName = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/15';

const InputField = ({ name, label, address, handleChange, required = true, ...inputProps }) => (
  <label className="block space-y-1.5 text-sm font-medium text-gray-700" htmlFor={`address-${name}`}>
    <span>{label}{required && <span className="ml-1 text-primary" aria-hidden="true">*</span>}</span>
    <input
      id={`address-${name}`}
      className={fieldClassName}
      name={name}
      value={address[name]}
      onChange={handleChange}
      required={required}
      {...inputProps}
    />
  </label>
);

const AddAddress = () => {
  const { axios, user, navigate } = useAppContext();
  const [address, setAddress] = useState(emptyAddress);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [locationError, setLocationError] = useState('');
  const manuallyEditedFields = useRef(new Set());
  const locationRequestInProgress = useRef(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    manuallyEditedFields.current.add(name);
    setAddress((previous) => ({ ...previous, [name]:value }));
  };

  const useCurrentLocation = async () => {
    if (locationRequestInProgress.current) return;
    setLocationError('');
    setLocationMessage('');
    const geolocation = window.navigator?.geolocation;
    if (!geolocation) {
      setLocationError('This browser does not support location detection. Please enter your address manually.');
      return;
    }

    locationRequestInProgress.current = true;
    setIsLocating(true);
    try {
      const position = await requestCurrentCoordinates(geolocation);
      const { latitude, longitude } = position.coords;
      const { data } = await axios.get('/api/address/reverse-geocode', {
        params:{ lat:latitude, lon:longitude },
        withCredentials:true,
      });
      if (!data.success) throw new Error(data.message || 'Location lookup failed');

      setAddress((previous) => mergeDetectedAddress(previous, data.address || {}, manuallyEditedFields.current));
      setLocationMessage('Location detected. Review the suggested details and complete any missing delivery information.');
    } catch (error) {
      if (Number.isInteger(error?.code) && [1, 2, 3].includes(error.code)) {
        setLocationError(locationErrorMessage(error));
      } else {
        setLocationError(locationLookupErrorMessage(error?.response?.status));
      }
    } finally {
      locationRequestInProgress.current = false;
      setIsLocating(false);
    }
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const cleanedAddress = Object.fromEntries(
        Object.entries(address).map(([key, value]) => [key, value.trim()])
      );
      const { data } = await axios.post('/api/address/add', { address:cleanedAddress }, { withCredentials:true });
      if (data.success) {
        toast.success(data.message);
        navigate('/cart');
      } else {
        toast.error(data.message || 'Unable to save this address');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Unable to save this address');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (user === null) navigate('/cart');
  }, [user, navigate]);

  return (
    <main className="mx-auto mt-12 max-w-6xl px-4 pb-16 sm:px-6 lg:mt-16">
      <div className="mb-7">
        <p className="text-2xl text-gray-600 sm:text-3xl">
          Add Shipping <span className="font-semibold text-primary">Address</span>
        </p>
        <p className="mt-2 text-sm text-gray-500">Add the delivery details for your order.</p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)] lg:gap-12">
        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-7">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={isLocating}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
          >
            {isLocating ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" aria-hidden="true" />
            ) : <FiNavigation aria-hidden="true" size={17} />}
            {isLocating ? 'Detecting location…' : 'Use My Current Location'}
          </button>
          {locationError && <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{locationError}</p>}
          {locationMessage && <p role="status" className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{locationMessage}</p>}

          <form onSubmit={onSubmitHandler} className="mt-7 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputField name="firstName" label="First Name" autoComplete="given-name" maxLength={80} address={address} handleChange={handleChange} />
              <InputField name="lastName" label="Last Name" autoComplete="family-name" maxLength={80} address={address} handleChange={handleChange} />
            </div>
            <InputField name="phone" label="Phone Number" type="tel" autoComplete="tel" inputMode="tel" placeholder="e.g. +91 98765 43210" maxLength={20} address={address} handleChange={handleChange} />
            <InputField name="flatHouseNo" label="Flat, House No., Building, Apartment" autoComplete="address-line1" placeholder="Flat / house number and building" maxLength={180} address={address} handleChange={handleChange} />
            <InputField name="street" label="Area, Street, Locality" autoComplete="address-line2" placeholder="Area, street, or locality" maxLength={180} address={address} handleChange={handleChange} />
            <InputField name="landmark" label="Landmark (optional)" autoComplete="off" placeholder="Nearby landmark" maxLength={100} required={false} address={address} handleChange={handleChange} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputField name="city" label="City" autoComplete="address-level2" maxLength={100} address={address} handleChange={handleChange} />
              <InputField name="state" label="State" autoComplete="address-level1" maxLength={100} address={address} handleChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputField name="zipCode" label="PIN Code" autoComplete="postal-code" inputMode="text" maxLength={12} address={address} handleChange={handleChange} />
              <InputField name="country" label="Country" autoComplete="country-name" maxLength={100} address={address} handleChange={handleChange} />
            </div>
            <label className="block space-y-1.5 text-sm font-medium text-gray-700" htmlFor="address-addressType">
              <span>Address Type<span className="ml-1 text-primary" aria-hidden="true">*</span></span>
              <select id="address-addressType" name="addressType" value={address.addressType} onChange={handleChange} required className={fieldClassName}>
                <option value="Home">Home</option>
                <option value="Work">Work</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <button
              className="mt-2 w-full rounded-md bg-primary py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-primary-dull disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? 'Saving address…' : 'Save Address'}
            </button>
          </form>
        </section>

        <img src={assets.add_address_iamge} alt="Decorative home delivery illustration" className="mx-auto hidden w-full max-w-md rounded-xl object-cover lg:block" />
      </div>
    </main>
  );
};

export default AddAddress;
