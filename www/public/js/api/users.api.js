/**
 * www/public/js/api/users.api.js  — Users API calls
 */
import { get, post, put, del } from './client.js';

export const listUsers = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return get(`/users/index${q ? '?' + q : ''}`);
};
export const getUser         = (id)       => get(`/users/show?id=${id}`);
export const createUser      = (data)     => post('/users/create', data);
export const updateUser      = (id, data) => put(`/users/update?id=${id}`, data);
export const deleteUser      = (id)       => del(`/users/delete?id=${id}`);
export const changePassword  = (id, data) => post(`/users/change_password?id=${id}`, data);
