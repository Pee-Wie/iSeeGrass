import test from 'node:test';
import assert from 'node:assert/strict';
import * as utils from '../www/public/js/users/editor/assessment-entry-utils.js';

test('assessment entries keep one location per species line', () => {
  const first = utils.appendSpeciesEntryWithLocation(
    '',
    '',
    'Halodule uninervis',
    '14.123456, 121.123456',
  );
  const second = utils.appendSpeciesEntryWithLocation(
    `${first.speciesText}\n`,
    first.locationText,
    'Cymodocea rotundata',
    '14.654321, 121.654321',
  );

  assert.equal(second.speciesText, 'Halodule uninervis\nCymodocea rotundata');
  assert.equal(second.locationText, '14.123456, 121.123456\n14.654321, 121.654321');
});

test('assessment entries preserve previous locations and blank missing coordinates', () => {
  const result = utils.appendSpeciesEntryWithLocation(
    'Halodule uninervis 2, ',
    '14.123456, 121.123456',
    'Cymodocea rotundata',
    '',
  );
  assert.equal(result.speciesText, 'Halodule uninervis 2\nCymodocea rotundata');
  assert.equal(result.locationText, '14.123456, 121.123456\n');
  assert.equal(utils.alignLocationLines(result.speciesText, result.locationText), result.locationText);
});

test('assessment coordinates reject absent and out-of-range values', () => {
  assert.equal(utils.formatSpeciesCoordinates({ latitude: null, longitude: null }), '');
  assert.equal(utils.formatSpeciesCoordinates({ latitude: '', longitude: 10 }), '');
  assert.equal(utils.formatSpeciesCoordinates({ latitude: 91, longitude: 10 }), '');
  assert.equal(
    utils.formatSpeciesCoordinates({ latitude: 14.12345678, longitude: 121.12345678 }),
    '14.123457, 121.123457',
  );
});
