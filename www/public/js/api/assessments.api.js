/**
 * www/public/js/api/assessments.api.js  — Assessments API calls
 */
import { get, post, put, del } from './client.js';

export const listAssessments   = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return get(`/assessments/index${q ? '?' + q : ''}`);
};
export const getAssessment     = (id)       => get(`/assessments/show?id=${id}`);
export const createAssessment  = (data)     => post('/assessments/create', data);
export const updateAssessment  = (id, data) => put(`/assessments/update?id=${id}`, data);
export const deleteAssessment  = (id)       => del(`/assessments/delete?id=${id}`);
