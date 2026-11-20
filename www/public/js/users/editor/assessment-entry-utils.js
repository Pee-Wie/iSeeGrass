export function appendSpeciesEntryWithLocation(speciesText, locationText, scientificName, coordinates = '') {
  const selectedName = String(scientificName ?? '').trim();
  if (!selectedName) throw new TypeError('A species name is required.');

  const speciesParts = String(speciesText ?? '').replace(/\r/g, '').split(/[,;\n]/);
  speciesParts.pop();
  const previousSpecies = speciesParts.map(part => part.trim()).filter(Boolean);
  const speciesEntries = [...previousSpecies, selectedName];

  const locationEntries = String(locationText ?? '').replace(/\r\n?/g, '\n').split('\n');
  const alignedLocations = locationEntries.slice(0, previousSpecies.length);
  while (alignedLocations.length < previousSpecies.length) alignedLocations.push('');
  alignedLocations.push(String(coordinates ?? '').trim());

  return {
    speciesText: speciesEntries.join('\n'),
    locationText: alignedLocations.join('\n'),
  };
}

export function alignLocationLines(speciesText, locationText) {
  const speciesCount = String(speciesText ?? '')
    .split(/[,;\n]+/)
    .filter(part => part.trim()).length;
  const locations = String(locationText ?? '').replace(/\r\n?/g, '\n').split('\n');
  const alignedLocations = locations.slice(0, speciesCount);
  while (alignedLocations.length < speciesCount) alignedLocations.push('');
  return alignedLocations.join('\n');
}

export function formatSpeciesCoordinates(record) {
  if (record?.latitude == null || record?.longitude == null
      || String(record.latitude).trim() === '' || String(record.longitude).trim() === '') {
    return '';
  }

  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90
      || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    return '';
  }
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}
