
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

interface LoadingContextType {
  isLoading: boolean;
  apiFetch: (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<Response>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(
  undefined
);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [activeRequests, setActiveRequests] = useState(0);

  const apiFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      setActiveRequests((count) => count + 1);

      try {
        return await fetch(input, init);
      } finally {
        setActiveRequests((count) => Math.max(0, count - 1));
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      isLoading: activeRequests > 0,
      apiFetch,
    }),
    [activeRequests, apiFetch]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);

  if (!context) {
    throw new Error("useLoading must be used inside LoadingProvider");
  }

  return context;
}
