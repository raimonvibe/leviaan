import axios from "axios";
import { API_URL } from "../config.js";

export const api = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : "/api",
  withCredentials: true,
});

export function getErrorMessage(error, fallback = "Er ging iets mis.") {
  return error.response?.data?.error || error.message || fallback;
}
