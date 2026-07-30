// Reads the access token, refreshing it when expired.

import { jwtDecode } from "jwt-decode";
import { jwtPayload } from "../_types/jwt";
import axios from "axios";

export const getUser = async () => {
  if (typeof window === "undefined") return null;
  let token = localStorage.getItem("access_token");

  if (token) {
    try {
      const user = jwtDecode(token) as jwtPayload;
      const isExpired = user.exp && user.exp * 1000 < Date.now();
      if (!isExpired) return user;
    } catch {}
  }

  const { data } = await axios.post(
    `/api/user/refresh`,
    {},
    {
      withCredentials: true,
    },
  );

  if (!data.access_token) {
    localStorage.removeItem("access_token");
    return null;
  }

  token = data.access_token as string;
  localStorage.setItem("access_token", token);

  const user = jwtDecode(token) as jwtPayload;
  return user;
};
