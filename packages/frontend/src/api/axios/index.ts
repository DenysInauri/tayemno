import Axios from "axios";
import { API_URL } from "../../env";

export const axios = Axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
