import test from 'node:test';
import assert from 'node:assert/strict';
import Address from '../models/Address.js';
import { addAddress, getAddress, reverseGeocodeAddress } from './addressController.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { placeOrderCOD } from './orderController.js';

const makeResponse = () => ({
  statusCode:200,
  body:null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const validAddress = {
  firstName:'  Mira ', lastName:'Shah', phone:'+91 98765 43210', flatHouseNo:'A-12', street:'Main Road',
  landmark:'Temple', city:'Jaipur', state:'Rajasthan', zipCode:'012345', country:'India', addressType:'Home',
};

test('address save validates, deduplicates by user and keeps the existing address model contract', async (t) => {
  const originalFind = Address.find;
  const originalCreate = Address.create;
  const saved = [];
  let createCount = 0;
  Address.find = async ({ userId }) => saved.filter((address) => address.userId === userId);
  Address.create = async (address) => { createCount += 1; saved.push({ _id:'address-1', ...address }); };

  try {
    await t.test('a valid address is normalized and saved without requiring an email field', async () => {
      const res = makeResponse();
      await addAddress({ userId:'customer-1', body:{ address:validAddress } }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(saved[0].userId, 'customer-1');
      assert.equal(saved[0].firstName, 'Mira');
      assert.equal(saved[0].zipCode, '012345');
      assert.equal(saved[0].phone, '+91 98765 43210');
      assert.equal('email' in saved[0], false);
      assert.equal('latitude' in saved[0], false);
      assert.equal('longitude' in saved[0], false);
    });

    await t.test('malformed addresses return a useful validation error without saving', async () => {
      const res = makeResponse();
      await addAddress({ userId:'customer-2', body:{ address:{ ...validAddress, phone:'bad' } } }, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /valid phone number/i);
      assert.equal(createCount, 1);
    });

    await t.test('duplicate delivery locations are rejected', async () => {
      const res = makeResponse();
      await addAddress({ userId:'customer-1', body:{ address:{ ...validAddress, firstName:'MIRA', street:' main   road ' } } }, res);
      assert.equal(res.statusCode, 409);
      assert.match(res.body.message, /already saved/i);
      assert.equal(createCount, 1);
    });

    await t.test('existing address records are returned unchanged for checkout', async () => {
      const oldRecord = { _id:'legacy-1', userId:'customer-1', street:'Old Street', city:'Jaipur', email:'old@example.test' };
      saved.push(oldRecord);
      const res = makeResponse();
      await getAddress({ userId:'customer-1' }, res);
      assert.equal(res.body.success, true);
      assert.equal(res.body.addresses.includes(oldRecord), true);
      assert.equal(oldRecord.email, 'old@example.test');
    });
  } finally {
    Address.find = originalFind;
    Address.create = originalCreate;
  }
});

test('reverse geocode rejects invalid coordinates and returns mapped service results', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = process.env.PHOTON_API_BASE_URL;
  process.env.PHOTON_API_BASE_URL = 'https://photon.test';
  try {
    await t.test('invalid coordinates do not call the provider', async () => {
      let called = false;
      globalThis.fetch = async () => { called = true; };
      const res = makeResponse();
      await reverseGeocodeAddress({ query:{ lat:'91', lon:'0' } }, res);
      assert.equal(res.statusCode, 400);
      assert.equal(called, false);
    });

    await t.test('valid coordinates return a suggestion', async () => {
      globalThis.fetch = async () => ({
        ok:true,
        json:async () => ({ features:[{ properties:{ street:'Market Road', city:'Jaipur', state:'Rajasthan', country:'India' } }] }),
      });
      const res = makeResponse();
      await reverseGeocodeAddress({ query:{ lat:'26.9', lon:'75.8' } }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.address.city, 'Jaipur');
    });

    await t.test('provider failures allow manual entry with a safe error', async () => {
      globalThis.fetch = async () => ({ ok:false });
      const res = makeResponse();
      await reverseGeocodeAddress({ query:{ lat:'26.9', lon:'75.8' } }, res);
      assert.equal(res.statusCode, 502);
      assert.match(res.body.message, /enter your address manually/i);
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBaseUrl === undefined) delete process.env.PHOTON_API_BASE_URL;
    else process.env.PHOTON_API_BASE_URL = originalBaseUrl;
  }
});

test('checkout order creation keeps the selected saved address reference', async () => {
  const originalProductFindById = Product.findById;
  const originalOrderCreate = Order.create;
  let createdOrder;
  Product.findById = async () => ({ offerPrice:100 });
  Order.create = async (order) => { createdOrder = order; };
  try {
    const res = makeResponse();
    await placeOrderCOD({
      userId:'customer-1',
      body:{ items:[{ product:'product-1', quantity:1 }], address:'saved-address-1' },
    }, res);

    assert.equal(res.body.success, true);
    assert.equal(createdOrder.userId, 'customer-1');
    assert.equal(createdOrder.address, 'saved-address-1');
  } finally {
    Product.findById = originalProductFindById;
    Order.create = originalOrderCreate;
  }
});
