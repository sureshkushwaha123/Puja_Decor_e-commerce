import test from 'node:test';
import assert from 'node:assert/strict';
import { locationErrorMessage, locationLookupErrorMessage, mergeDetectedAddress, requestCurrentCoordinates } from './location.js';

test('current coordinates are requested only through the geolocation action and resolve as a promise', async () => {
  let requestOptions;
  const position = { coords:{ latitude:12.9, longitude:77.6 } };
  const geolocation = {
    getCurrentPosition(resolve, _reject, options) {
      requestOptions = options;
      resolve(position);
    },
  };

  assert.equal(await requestCurrentCoordinates(geolocation), position);
  assert.deepEqual(requestOptions, { enableHighAccuracy:false, timeout:12000, maximumAge:0 });
});

test('location permission errors leave manual entry available with a clear message', async () => {
  const geolocation = { getCurrentPosition(_resolve, reject) { reject({ code:1 }); } };
  await assert.rejects(requestCurrentCoordinates(geolocation), (error) => {
    assert.match(locationErrorMessage(error), /permission was denied/i);
    assert.match(locationErrorMessage(error), /manually/i);
    return true;
  });
});

test('location lookup failures show a friendly message rather than a raw network error', () => {
  const message = locationLookupErrorMessage(404);
  assert.match(message, /enter your address manually/i);
  assert.doesNotMatch(message, /axios|404|request failed|stack/i);
  assert.match(locationLookupErrorMessage(401), /sign in again/i);
});

test('detected address fills untouched fields but preserves every manually edited field', () => {
  const manuallyEdited = new Set(['street', 'zipCode']);
  const merged = mergeDetectedAddress(
    { flatHouseNo:'', street:'My own street', city:'', state:'', zipCode:'12345', country:'' },
    { flatHouseNo:'18', street:'Mapped road', city:'Bengaluru', state:'Karnataka', zipCode:'560001', country:'India' },
    manuallyEdited,
  );

  assert.deepEqual(merged, {
    flatHouseNo:'18', street:'My own street', city:'Bengaluru', state:'Karnataka', zipCode:'12345', country:'India',
  });
});
