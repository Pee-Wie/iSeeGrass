/**
 * www/public/js/api/catalog.api.js  — Seagrass Catalog API calls
 */
import { get, post, put, del } from './client.js';

export const listCatalog   = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return get(`/catalog/index${q ? '?' + q : ''}`);
};
export const getCatalogEntry    = (id)       => get(`/catalog/show?id=${id}`);
export const createCatalogEntry = (data)     => post('/catalog/create', data);
export const updateCatalogEntry = (id, data) => put(`/catalog/update?id=${id}`, data);
export const deleteCatalogEntry = (id)       => del(`/catalog/delete?id=${id}`);
