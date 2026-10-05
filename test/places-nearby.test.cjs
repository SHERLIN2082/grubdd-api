const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PlacesService } = require('../dist/modules/places/places.service');

test('nearby ranks top dining places, deduplicates and respects radius and budget', async () => {
  const service = new PlacesService({ get: () => 'test-key' });
  const place = (id, rating, lat = 13) => ({
    place_id: id, name: id, rating, user_ratings_total: 200, types: ['restaurant'],
    geometry: { location: { lat, lng: 80 } },
  });
  const requests = [];
  service.callGoogleApi = async (url) => {
    const params = new URL(url).searchParams;
    requests.push(params);
    return { results: params.get('type') === 'restaurant'
      ? [place('popular', 4.2), place('small', 5), place('outside', 5, 14)]
      : [place('cafe', 4.3), place('popular', 4.2)] };
  };
  const results = await service.nearby('13', '80', '3', '0,1');
  assert.deepEqual(results.map((p) => p.place_id), ['small', 'cafe', 'popular']);
  assert.deepEqual(requests.map((p) => p.get('type')), ['restaurant', 'cafe']);
  for (const params of requests) {
    assert.equal(params.get('rankby'), 'prominence');
    assert.equal(params.get('maxprice'), '1');
    assert.equal(params.get('radius'), '3000');
  }
  requests.length = 0;
  await service.nearby('13', '80', '3', '0,1,2,3,4');
  for (const params of requests) {
    assert.equal(params.has('minprice'), false);
    assert.equal(params.has('maxprice'), false);
  }
});

test('excludes canteens, snack stalls and places without established high ratings', async () => {
  const service = new PlacesService({ get: () => 'test-key' });
  const place = (name, extra = {}) => ({
    place_id: name, name, rating: 4.5, user_ratings_total: 200,
    types: ['restaurant'], geometry: { location: { lat: 13, lng: 80 } }, ...extra,
  });
  service.callGoogleApi = async () => ({ results: [
    place('Amma Unavagam'), place('Amma Unavagam - Branch'), place('அம்மா உணவகம்'),
    place('Fresh Snacks'), place('Tea Stall'), place('Juice Corner'),
    place('Low rating', { rating: 3.9 }), place('Few reviews', { user_ratings_total: 99 }),
    place('Unrated', { rating: undefined }), place('Unknown reviews', { user_ratings_total: undefined }),
    place('Bakery only', { types: ['bakery'] }),
    place('Staylite Suites Thiruvanmiyur Chennai', { types: ['restaurant', 'lodging'] }),
    place('ELITE GAMER', { types: ['cafe'] }),
    place('Internet Cafe', { types: ['cafe'] }),
    place('Popular Cafe', { types: ['cafe'], user_ratings_total: 500 }),
    place('Good Restaurant'), place('Amma Restaurant'),
  ] });
  const result = await service.nearby('13', '80', '3', null);
  assert.deepEqual(result.map((p) => p.name), ['Popular Cafe', 'Good Restaurant', 'Amma Restaurant']);
});

test('includes food places from later pages and retries pending page tokens', async () => {
  const service = new PlacesService({ get: () => 'test-key' });
  service.waitForPage = async () => {};
  let attempts = 0;
  const place = (name) => ({ place_id: name, name, rating: 4.5,
    user_ratings_total: 200, types: ['cafe'],
    geometry: { location: { lat: 13, lng: 80 } } });
  service.callGoogleApi = async (url) => {
    const params = new URL(url).searchParams;
    if (params.get('pagetoken') === 'page-two') {
      if (++attempts === 1) return { status: 'INVALID_REQUEST' };
      return { status: 'OK', results: [place("Writer's Cafe"), place('Subway')] };
    }
    return params.get('type') === 'restaurant'
      ? { status: 'OK', results: [place('Macaw')], next_page_token: 'page-two' }
      : { status: 'OK', results: [place('Melt'), place('Fille')] };
  };
  const result = await service.nearby('13', '80', '3', null);
  assert.equal(attempts, 2);
  assert.deepEqual(new Set(result.map((p) => p.name)), new Set(['Macaw', 'Melt', 'Subway', "Writer's Cafe", 'Fille']));
});
