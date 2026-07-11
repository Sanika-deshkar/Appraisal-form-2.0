import { api } from "./api";
import { storeUserSession } from "../auth/session";

export const login = async (email, password) => {
  const data = await api.post("/auth/login", { email, password });
  storeUserSession({ token: data.token, profile: data.profile });
  return data;
};

export const register = async (profilePayload, password) => {
  return await api.post("/auth/register", { ...profilePayload, password });
};

export const getMe = async () => {
  return await api.get("/auth/me");
};

export const updateProfile = async (payload) => {
  return await api.put("/auth/me", payload);
};

export const changePassword = async (currentPassword, newPassword) => {
  return await api.post("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
};

export const forgotPassword = async (email) => {
  return await api.post("/auth/forgot-password", {
    email,
    redirect_url: `${window.location.origin}/reset-password`,
  });
};

export const resetPassword = async (token, newPassword) => {
  return await api.post("/auth/reset-password", {
    token,
    new_password: newPassword,
  });
};

export const logout = () => {
  sessionStorage.clear();
};
