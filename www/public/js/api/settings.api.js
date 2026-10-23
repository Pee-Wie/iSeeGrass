/**
 * www/public/js/api/settings.api.js — Platform Settings API
 *
 * getEngineTrack()              → GET  /api/settings/engine
 * setEngineTrack(track)         → POST /api/settings/engine  (admin only)
 *
 * Both return { engine_track: string }
 */

import { get, post } from './client.js';

/**
 * Fetch the currently active CNN taxonomy engine track.
 * @returns {Promise<{ engine_track: string }>}
 */
export const getEngineTrack = () => get('/settings/engine');

/**
 * Update the active engine track (admin only).
 * @param {'original'|'improved_original'|'6_species_proto'} track
 * @returns {Promise<{ engine_track: string }>}
 */
export const setEngineTrack = (track) => post('/settings/engine', { engine_track: track });
