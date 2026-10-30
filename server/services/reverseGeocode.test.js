import test from 'node:test';
import assert from 'node:assert/strict';
import { reverseGeocode } from './reverseGeocode.js';

test('Photon reverse geocoding maps available fields and does not persist coordinates', async () => {
  let requestedUrl;
  let requestedHeaders;
  const result = await reverseGeocode(12.9, 77.6, async (url, options) => {
    requestedUrl = new URL(url);
    requestedHeaders = options.headers;
    return {
      ok:true,
      json:async () => ({
        features:[{ properties:{
          housenumber:'18', street:'Lake Road', locality:'Indiranagar', suburb:'Indiranagar', city:'Bengaluru',
          state:'Karnataka', postcode:'560001', country:'India',
        } }],
      }),
    };
  });

  assert.equal(requestedUrl.pathname, '/reverse');
  assert.equal(requestedUrl.searchParams.get('lat'), '12.9');
  assert.equal(requestedUrl.searchParams.get('lon'), '77.6');
  assert.match(requestedHeaders['User-Agent'], /PujaDecor/);
  assert.deepEqual(result, {
    flatHouseNo:'18', street:'Lake Road, Indiranagar', city:'Bengaluru', state:'Karnataka',
    zipCode:'560001', country:'India',
  });
  assert.equal('latitude' in result, false);
  assert.equal('longitude' in result, false);
});

test('Photon no-result and service failures reject so the form can continue manually', async () => {
  await assert.rejects(reverseGeocode(0, 0, async () => ({ ok:true, json:async () => ({ features:[] }) })), /No address found/);
  await assert.rejects(reverseGeocode(0, 0, async () => ({ ok:false })), /returned an error/);
});

test('Photon locality and county values fill the closest available address fields', async () => {
  const result = await reverseGeocode(26.9, 75.8, async () => ({
    ok:true,
    json:async () => ({ features:[{ properties:{ locality:'Old City', county:'Jaipur District', state:'Rajasthan', country:'India' } }] }),
  }));
  assert.equal(result.street, 'Old City');
  assert.equal(result.city, 'Jaipur District');
  assert.equal(result.state, 'Rajasthan');
  assert.equal(result.country, 'India');
});
