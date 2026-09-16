import { createContext, useContext, useState, useMemo } from "react";
import type { ReactNode } from "react";
import type { ISignInUserData, IKeyPair } from "@tayemno/shared";
import { setAuthToken } from "../../api/axios";

const DEV_AUTH_KEY = "tayemno_dev_auth";

const persistAuthState = (state: IAuthState) => {
  if (!import.meta.env.DEV) return;
  sessionStorage.setItem(DEV_AUTH_KEY, JSON.stringify(state));
};

const clearPersistedAuthState = () => {
  if (!import.meta.env.DEV) return;
  sessionStorage.removeItem(DEV_AUTH_KEY);
};

const rehydrateAuthState = (): IAuthState => {
  if (!import.meta.env.DEV) return { user: null, token: null, keyPair: null };

  const stored = sessionStorage.getItem(DEV_AUTH_KEY);
  if (!stored) return { user: null, token: null, keyPair: null };

  const state = JSON.parse(stored) as IAuthState;

  setAuthToken(state.token);

  return state;
};

interface IAuthState {
  user: ISignInUserData | null;
  token: string | null;
  keyPair: IKeyPair | null;
}

interface IAuthContext extends IAuthState {
  isAuthenticated: boolean;
  signIn: (token: string, user: ISignInUserData, keyPair: IKeyPair) => void;
  signOut: () => void;
}

const AuthContext = createContext<IAuthContext | null>(null);

interface IAuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: IAuthProviderProps) => {
  const [authState, setAuthState] = useState<IAuthState>(rehydrateAuthState);

  const value = useMemo<IAuthContext>(
    () => ({
      ...authState,
      isAuthenticated: !!authState.token && !!authState.keyPair,
      signIn: (token, user, keyPair) => {
        setAuthToken(token);
        setAuthState({ token, user, keyPair });
        persistAuthState({ token, user, keyPair });
      },
      signOut: () => {
        setAuthToken(null);
        setAuthState({ user: null, token: null, keyPair: null });
        clearPersistedAuthState();
      },
    }),
    [authState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): IAuthContext => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
