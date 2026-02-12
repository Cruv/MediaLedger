import { create } from "zustand";

interface AuthState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  needsSetup: boolean;
  login: (token: string, username: string) => void;
  logout: () => void;
  setNeedsSetup: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("ml_token"),
  username: localStorage.getItem("ml_username"),
  isAuthenticated: !!localStorage.getItem("ml_token"),
  needsSetup: false,
  login: (token, username) => {
    localStorage.setItem("ml_token", token);
    localStorage.setItem("ml_username", username);
    set({ token, username, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem("ml_token");
    localStorage.removeItem("ml_username");
    set({ token: null, username: null, isAuthenticated: false });
  },
  setNeedsSetup: (v) => set({ needsSetup: v }),
}));
