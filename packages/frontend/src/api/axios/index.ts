import Axios from "axios";
import { API_URL } from "../../env";

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const axios = Axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axios.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});
