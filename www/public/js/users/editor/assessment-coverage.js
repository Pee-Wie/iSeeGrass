import { listUserIdentificationHistory } from '../../api/identify.api.js';
import { SEAGRASS_SPECIES } from '../../species-data.js';

const HISTORY_LIMIT = 50;
const SUGGESTION_LIMIT = 8;
const canvas = document.getElementById('editorCanvas');
const suggestionList = document.createElement('div');

suggestionList.className = 'coverage-suggestions';
suggestionList.id = 'coverageSpeciesSuggestions';
suggestionList.setAttribute('role', 'listbox');
suggestionList.hidden = true;
document.body.append(suggestionList);

let historySpecies = [];
let historyLoadMessage = '';
let historyLoaded = false;
let activeCell = null;
let activeSuggestion = 0;
let displayedSuggestions = [];

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function getActiveCoverageCell() {
  const selection = window.getSelection();
  const node = selection?.anchorNode;
  const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  return element?.closest('[data-coverage-species-entry], [data-coverage-total]') || null;
}

function speciesCode(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.replace(/[^a-z]/gi, '').charAt(0))
    .join('')
    .toUpperCase();
}

function catalogSpecies(name) {
  const key = normalize(name);
  return SEAGRASS_SPECIES.find(species => normalize(species.scientificName) === key) || null;
}

function speciesFromHistory(records) {
  const seen = new Set();
  return records
    .map(record => {
      const scientificName = String(record.top_result || '').trim();
      if (!scientificName || /background|unknown|not identified/i.test(scientificName)) return null;
      const species = catalogSpecies(scientificName);
      return {
        scientificName: species?.scientificName || scientificName,
        commonName: species?.commonName || '',
        source: 'history',
      };
    })
    .filter(species => {
      if (!species) return false;
      const key = normalize(species.scientificName);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function loadHistory() {
  if (historyLoaded || !navigator.onLine) return;
  historyLoaded = true;
  try {
    const data = await listUserIdentificationHistory({ limit: HISTORY_LIMIT, offset: 0 });
    historySpecies = speciesFromHistory(data.records || []);
    historyLoadMessage = historySpecies.length
      ? 'Recent identification history is shown first.'
      : 'No seagrass identifications in history yet; showing the species catalog.';
  } catch (error) {
    historyLoaded = false;
    historyLoadMessage = 'Identification history is unavailable; showing the species catalog.';
    console.warn('Could not load assessment species suggestions from identification history.', error);
  }
  if (activeCell) renderSuggestions(activeCell);
}

function allSuggestions() {
  const byName = new Map();
  [...historySpecies, ...SEAGRASS_SPECIES.map(species => ({
    scientificName: species.scientificName,
    commonName: species.commonName,
    source: 'catalog',
  }))].forEach(species => {
    const key = normalize(species.scientificName);
    if (!byName.has(key)) byName.set(key, species);
  });

  return [...byName.values()].map(species => ({
    ...species,
    code: speciesCode(species.scientificName),
  }));
}

function currentEntry(cell) {
  const text = cell.innerText || cell.textContent || '';
  return text.split(/[,;\n]/).at(-1).trim();
}

function renderSuggestions(cell) {
  if (!cell?.isConnected) {
    hideSuggestions();
    return;
  }

  const entry = currentEntry(cell);
  const query = entry.replace(/\s+\d+$/, '').trim().toLocaleLowerCase();
  if (/\s+\d+$/.test(entry) || allSuggestions().some(species => normalize(species.scientificName) === normalize(entry))) {
    hideSuggestions();
    return;
  }

  const matches = allSuggestions().filter(species => {
    if (!query) return species.source === 'history' || historySpecies.length === 0;
    return species.scientificName.toLocaleLowerCase().includes(query)
      || species.commonName.toLocaleLowerCase().includes(query)
      || species.code.toLocaleLowerCase().startsWith(query);
  }).slice(0, SUGGESTION_LIMIT);

  activeCell = cell;
  activeSuggestion = 0;
  displayedSuggestions = matches;
  suggestionList.replaceChildren();

  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'coverage-suggestions__empty';
    empty.textContent = query
      ? 'No matching species. Try a code or scientific name.'
      : historyLoadMessage || 'Type a species name or code to search the catalog.';
    suggestionList.append(empty);
  } else {
    matches.forEach((species, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'coverage-suggestions__option';
      option.id = `coverageSpeciesOption${index}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(index === activeSuggestion));
      option.dataset.index = String(index);

      const code = document.createElement('strong');
      code.textContent = `${species.code} · initials`;
      const name = document.createElement('span');
      name.textContent = species.scientificName;
      const source = document.createElement('small');
      source.textContent = species.source === 'history'
        ? 'From your identification history'
        : 'Species catalog';
      option.append(code, name, source);
      option.addEventListener('mousedown', event => event.preventDefault());
      option.addEventListener('click', () => selectSuggestion(index));
      suggestionList.append(option);
    });
  }

  if (historyLoadMessage) {
    const status = document.createElement('div');
    status.className = 'coverage-suggestions__status';
    status.textContent = historyLoadMessage;
    suggestionList.append(status);
  }

  suggestionList.hidden = false;
  positionSuggestions(cell);
}

function positionSuggestions(cell) {
  if (suggestionList.hidden || !cell?.isConnected) return;
  const rect = cell.getBoundingClientRect();
  const width = Math.min(360, Math.max(220, rect.width), Math.max(180, window.innerWidth - 16));
  suggestionList.style.width = `${width}px`;
  suggestionList.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
  suggestionList.style.top = `${Math.max(8, Math.min(rect.bottom, window.innerHeight - suggestionList.offsetHeight - 8))}px`;
}

function hideSuggestions() {
  suggestionList.hidden = true;
  activeCell = null;
  displayedSuggestions = [];
}

function selectSuggestion(index) {
  const species = displayedSuggestions[index];
  if (!species || !activeCell) return;

  const cell = activeCell;
  const current = cell.innerText || cell.textContent || '';
  const delimiter = Math.max(current.lastIndexOf(','), current.lastIndexOf(';'), current.lastIndexOf('\n'));
  const prefix = delimiter < 0 ? '' : `${current.slice(0, delimiter + 1)} `;
  cell.textContent = `${prefix}${species.scientificName}`;
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  cell.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  cell.focus();
  hideSuggestions();
}

function parseSpeciesEntries(value) {
  const text = String(value || '').trim();
  if (!text) return { entries: [], error: '' };

  const entriesByName = new Map();
  let hasUncountedSpecies = false;
  for (const rawPart of text.split(/[,;\n]+/).map(part => part.trim()).filter(Boolean)) {
    const match = rawPart.match(/^(.+?)\s+(\d+)$/);
    if (!match) hasUncountedSpecies = true;
    const name = match ? match[1].trim() : rawPart;
    const count = match ? Number(match[2]) : 1;
    if (!name || !Number.isSafeInteger(count) || count < 0) {
      return { entries: [], error: `Enter a valid non-negative whole-number count for "${name}".` };
    }
    const key = normalize(name);
    const entry = entriesByName.get(key) || { name, count: 0 };
    entry.count += count;
    entriesByName.set(key, entry);
  }
  if (hasUncountedSpecies && entriesByName.size > 1) {
    return { entries: [], error: 'Add a count after each species when more than one species is present.' };
  }
  return { entries: [...entriesByName.values()], error: '' };
}

function parseTotalCover(value) {
  const text = String(value || '').trim().replace(/%$/, '').trim();
  if (!text) return { value: null, error: '' };
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) {
    return { value: null, error: 'Enter a total cover percentage from 0 to 100.' };
  }
  const total = Number(text);
  return total >= 0 && total <= 100
    ? { value: total, error: '' }
    : { value: null, error: 'Total cover must be between 0 and 100%.' };
}

export function calculateQuadratCoverage(speciesText, totalCoverText) {
  const parsedSpecies = parseSpeciesEntries(speciesText);
  const parsedCover = parseTotalCover(totalCoverText);
  if (parsedSpecies.error) return { error: parsedSpecies.error, entries: [] };
  if (parsedCover.error) return { error: parsedCover.error, entries: [] };

  const totalCount = parsedSpecies.entries.reduce((sum, entry) => sum + entry.count, 0);
  const entries = parsedSpecies.entries.map(entry => {
    const composition = totalCount ? entry.count / totalCount * 100 : 0;
    return {
      ...entry,
      composition,
      cover: parsedCover.value === null ? null : composition * parsedCover.value / 100,
    };
  });

  return {
    error: '',
    entries,
    totalCount,
    totalCover: parsedCover.value,
  };
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function setCellText(cell, value) {
  if (cell && cell.textContent !== value) cell.textContent = value;
}

function renderQuadrat(row) {
  const speciesCell = row.querySelector('[data-coverage-species-entry]');
  const totalCell = row.querySelector('[data-coverage-total]');
  const compositionCell = row.querySelector('[data-coverage-composition]');
  const coverCell = row.querySelector('[data-coverage-species-cover]');
  const speciesText = speciesCell?.innerText || speciesCell?.textContent || '';
  const totalText = totalCell?.innerText || totalCell?.textContent || '';
  const result = calculateQuadratCoverage(speciesText, totalText);

  [speciesCell, totalCell].forEach(cell => cell?.removeAttribute('aria-invalid'));
  if (result.error) {
    if (speciesCell && /name\/code|count|whole-number/i.test(result.error)) {
      speciesCell.setAttribute('aria-invalid', 'true');
    } else {
      totalCell?.setAttribute('aria-invalid', 'true');
    }
    setCellText(compositionCell, result.error);
    setCellText(coverCell, 'Fix the input above to calculate.');
    return null;
  }

  if (!result.entries.length) {
    setCellText(compositionCell, 'Enter species and counts.');
    setCellText(coverCell, 'Enter species and total cover.');
    return result;
  }

  if (result.totalCount === 0) {
    setCellText(compositionCell, 'Total count must be greater than 0.');
    setCellText(coverCell, 'No species counts to apportion.');
    speciesCell?.setAttribute('aria-invalid', 'true');
    return null;
  }

  setCellText(compositionCell, result.entries
    .map(entry => `${entry.name}: ${formatPercent(entry.composition)}`)
    .join('\n'));
  setCellText(coverCell, result.totalCover === null
      ? 'Enter total cover to calculate species cover.'
      : result.entries
        .map(entry => `${entry.name}: ${formatPercent(entry.cover)}`)
        .join('\n'));
  return result;
}

function renderTransectSummary(table) {
  const summary = table.nextElementSibling?.matches('[data-coverage-summary]')
    ? table.nextElementSibling
    : null;
  if (!summary) return;

  const rows = [...table.querySelectorAll('tbody tr')];
  const coverageResults = rows
    .map(row => renderQuadrat(row))
    .filter(result => result && result.totalCover !== null);
  if (!coverageResults.length) {
    setCellText(summary, 'Transect summary will appear when quadrat cover values are entered.');
    return;
  }

  const meanCover = coverageResults.reduce((sum, result) => sum + result.totalCover, 0) / coverageResults.length;
  const completeSpeciesRows = coverageResults.filter(result => result.entries.length && result.totalCount > 0);
  const speciesCover = new Map();
  completeSpeciesRows.forEach(result => {
    result.entries.forEach(entry => {
      const name = entry.name;
      speciesCover.set(name, (speciesCover.get(name) || 0) + entry.cover);
    });
  });

  const speciesSummary = completeSpeciesRows.length
    ? [...speciesCover.entries()]
      .map(([name, sum]) => `${name} ${formatPercent(sum / completeSpeciesRows.length)}`)
      .join(', ')
    : 'Species summary requires species counts and cover for a quadrat.';
  setCellText(summary, `Mean total cover: ${formatPercent(meanCover)} across ${coverageResults.length} quadrat(s). Species mean cover: ${speciesSummary} (n=${completeSpeciesRows.length}).`);
}

function updateCoverageTables() {
  if (!canvas) return;
  canvas.querySelectorAll('table[data-assessment-transect]').forEach(renderTransectSummary);
}

if (canvas) {
  canvas.addEventListener('input', event => {
    const cell = event.target.closest?.('[data-coverage-species-entry], [data-coverage-total]')
      || getActiveCoverageCell();
    if (cell) {
      updateCoverageTables();
      if (cell.matches('[data-coverage-species-entry]')) renderSuggestions(cell);
      else hideSuggestions();
    }
  });

  canvas.addEventListener('click', event => {
    const cell = event.target.closest?.('[data-coverage-species-entry]');
    if (cell) renderSuggestions(cell);
  });

  canvas.addEventListener('keydown', event => {
    if (!activeCell || suggestionList.hidden) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      activeSuggestion = (activeSuggestion + offset + displayedSuggestions.length) % displayedSuggestions.length;
      suggestionList.querySelectorAll('[role="option"]').forEach((option, index) => {
        option.setAttribute('aria-selected', String(index === activeSuggestion));
      });
    } else if (event.key === 'Enter' && displayedSuggestions.length) {
      event.preventDefault();
      selectSuggestion(activeSuggestion);
    } else if (event.key === 'Escape') {
      hideSuggestions();
    }
  });

  document.addEventListener('pointerdown', event => {
    if (!suggestionList.contains(event.target) && !event.target.closest?.('[data-coverage-species-entry]')) {
      hideSuggestions();
    }
  });

  window.addEventListener('resize', () => positionSuggestions(activeCell));
  window.addEventListener('scroll', () => positionSuggestions(activeCell), true);

  new MutationObserver(updateCoverageTables).observe(canvas, { childList: true, subtree: true });
  updateCoverageTables();
  loadHistory();
  window.addEventListener('online', loadHistory);
}
