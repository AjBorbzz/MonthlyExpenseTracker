"use client";

import type { AuthResponse, Family, User } from "./types";

const TOKEN_KEY = "expense_tracker_token";
const USER_KEY = "expense_tracker_user";
const FAMILY_KEY = "expense_tracker_family";

export function saveSession(auth: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, auth.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  localStorage.setItem(FAMILY_KEY, JSON.stringify(auth.family));
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function getStoredFamily(): Family | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(FAMILY_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(FAMILY_KEY);
}
