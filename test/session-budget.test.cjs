const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SessionsService } = require('../dist/modules/sessions/sessions.service');

function setup() {
  let saved;
  let searchArgs;
  const sessions = {
    existsBy: async () => false,
    create: (value) => ({ ...value, id: '1', status: 'LOBBY' }),
    save: async (value) => (saved = value),
    findOne: async () => saved,
  };
  const participants = {
    create: (value) => value, save: async (value) => value,
    countBy: async () => 4,
  };
  const places = { nearby: async (...args) => { searchArgs = args; return []; } };
  const service = new SessionsService(sessions, participants, {}, {}, {}, {}, places,
    { emitToSession() {} });
  return { service, saved: () => saved, search: () => searchArgs };
}

const settings = {
  location: { latitude: 13, longitude: 80, address: 'Test location' },
  radiusKm: 3, matchRule: 'ALL',
};

test('500 per person is saved without restricting search price categories', async () => {
  const fixture = setup();
  await fixture.service.create('host', { ...settings, budgetPerPerson: 500, priceLevel: [1] });
  assert.equal(fixture.saved().budgetPerPerson, 500);
  assert.equal(fixture.saved().priceFilter, null);
  await fixture.service.start('1', 'host');
  assert.deepEqual(fixture.search(), ['13', '80', '3', null]);
});

test('unlimited budget and legacy price categories remain supported', async () => {
  const fixture = setup();
  await fixture.service.create('host', { ...settings, budgetPerPerson: null });
  assert.equal(fixture.saved().budgetPerPerson, null);
  assert.equal(fixture.saved().priceFilter, null);
  await fixture.service.create('host', { ...settings, priceLevel: [1, 2] });
  assert.equal(fixture.saved().priceFilter, '1,2');
});

test('rejects invalid per-person budgets', async () => {
  for (const budget of [0, -500, 10.5, '500', 10000000]) {
    await assert.rejects(setup().service.create('host', {
      ...settings, budgetPerPerson: budget,
    }), /budgetPerPerson/);
  }
});
