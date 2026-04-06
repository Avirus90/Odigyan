import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  type PropsWithChildren,
  type ReactNode,
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { firebaseAuth, firestore } from "../services/firebase/config";

export type Status =
  | "initializing"
  | "idle"
  | "logging-in"
  | "success"
  | "loginError";

type PrincipalLike = {
  toString: () => string;
  isAnonymous: () => boolean;
};

type IdentityLike = {
  uid: string;
  email?: string | null;
  getPrincipal: () => PrincipalLike;
};

export type InternetIdentityContext = {
  identity?: IdentityLike;
  user?: User;
  isAdmin: boolean;
  login: () => void;
  clear: () => void;
  loginStatus: Status;
  isInitializing: boolean;
  isLoginIdle: boolean;
  isLoggingIn: boolean;
  isLoginSuccess: boolean;
  isLoginError: boolean;
  loginError?: Error;
};

type ProviderValue = InternetIdentityContext;
const InternetIdentityReactContext = createContext<ProviderValue | undefined>(
  undefined,
);

function toIdentity(user: User): IdentityLike {
  return {
    uid: user.uid,
    email: user.email,
    getPrincipal: () => ({
      toString: () => user.uid,
      isAnonymous: () => false,
    }),
  };
}

function assertProviderPresent(
  context: ProviderValue | undefined,
): asserts context is ProviderValue {
  if (!context) {
    throw new Error(
      "InternetIdentityProvider is not present. Wrap your component tree with it.",
    );
  }
}

export const useInternetIdentity = (): InternetIdentityContext => {
  const context = useContext(InternetIdentityReactContext);
  assertProviderPresent(context);
  return context;
};

export function InternetIdentityProvider({
  children,
}: PropsWithChildren<{
  children: ReactNode;
  createOptions?: unknown;
}>) {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [identity, setIdentity] = useState<IdentityLike | undefined>(undefined);
  const [loginStatus, setStatus] = useState<Status>("initializing");
  const [loginError, setError] = useState<Error | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadAdminCheck = useCallback(async (uid: string) => {
    try {
      const cfg = await getDoc(doc(firestore, "config", "app"));
      const adminUids = (cfg.data()?.adminUids as string[] | undefined) ?? [];
      setIsAdmin(adminUids.includes(uid));
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser ?? undefined);
      setIdentity(nextUser ? toIdentity(nextUser) : undefined);
      setStatus("idle");
      if (nextUser?.uid) {
        void loadAdminCheck(nextUser.uid);
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsub();
  }, [loadAdminCheck]);

  const login = useCallback(() => {
    const provider = new GoogleAuthProvider();
    setStatus("logging-in");
    setError(undefined);

    void signInWithPopup(firebaseAuth, provider)
      .then((result) => {
        setUser(result.user);
        setIdentity(toIdentity(result.user));
        setStatus("success");
        void loadAdminCheck(result.user.uid);
      })
      .catch((err: unknown) => {
        setStatus("loginError");
        setError(err instanceof Error ? err : new Error("Login failed"));
      });
  }, [loadAdminCheck]);

  const clear = useCallback(() => {
    void signOut(firebaseAuth)
      .then(() => {
        setUser(undefined);
        setIdentity(undefined);
        setIsAdmin(false);
        setStatus("idle");
        setError(undefined);
      })
      .catch((err: unknown) => {
        setStatus("loginError");
        setError(err instanceof Error ? err : new Error("Logout failed"));
      });
  }, []);

  const value = useMemo(
    () => ({
      identity,
      user,
      isAdmin,
      login,
      clear,
      loginStatus,
      isInitializing: loginStatus === "initializing",
      isLoginIdle: loginStatus === "idle",
      isLoggingIn: loginStatus === "logging-in",
      isLoginSuccess: loginStatus === "success",
      isLoginError: loginStatus === "loginError",
      loginError,
    }),
    [identity, user, isAdmin, login, clear, loginStatus, loginError],
  );

  return createElement(InternetIdentityReactContext.Provider, { value }, children);
}
