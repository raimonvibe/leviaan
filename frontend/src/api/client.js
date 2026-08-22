import axios from "axios";
import { API_URL, TOKEN_KEY } from "../config.js";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getErrorMessage(error, fallback = "Er ging iets mis.") {
  return error.response?.data?.error || error.message || fallback;
}
