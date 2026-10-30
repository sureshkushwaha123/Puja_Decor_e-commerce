export const requestCurrentCoordinates = (geolocation) => new Promise((resolve, reject) => {
  geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy:false,
    timeout:12000,
    maximumAge:0,
  });
});

export const locationErrorMessage = (error) => {
  if (error?.code === 1) return 'Location permission was denied. You can enter your address manually.';
  if (error?.code === 2) return 'Your location is unavailable right now. Please enter your address manually.';
  if (error?.code === 3) return 'Location detection timed out. Please try again or enter your address manually.';
  return 'This browser could not detect your location. Please enter your address manually.';
};

export const locationLookupErrorMessage = (status) => status === 401
  ? 'Please sign in again to use location detection.'
  : 'We could not retrieve address details for this location. Please enter your address manually.';

export const mergeDetectedAddress = (current, detected, manuallyEditedFields) => {
  const fieldsToFill = ['flatHouseNo', 'street', 'city', 'state', 'zipCode', 'country'];
  const next = { ...current };
  for (const field of fieldsToFill) {
    if (!manuallyEditedFields.has(field)) {
      next[field] = typeof detected[field] === 'string' ? detected[field] : '';
    }
  }
  return next;
};
