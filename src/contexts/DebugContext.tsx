"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface DebugAction {
  method: string;
  endpoint: string;
  status: number;
  message: string;
  timestamp: number;
}

interface DebugContextType {
  isDebug: boolean;
  toggleDebug: () => void;
  latestAction: DebugAction | null;
  logAction: (method: string, endpoint: string, status: number, message: string) => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: ReactNode }) {
  // Load debug state from localStorage on init
  const [isDebug, setIsDebug] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("debug-mode") === "true";
    }
    return false;
  });
  const [latestAction, setLatestAction] = useState<DebugAction | null>(null);

  const toggleDebug = () => {
    setIsDebug((prev) => {
      const newValue = !prev;
      localStorage.setItem("debug-mode", String(newValue));
      if (!newValue) {
        // Clear action when turning off debug mode
        setLatestAction(null);
      }
      return newValue;
    });
  };

  const logAction = (method: string, endpoint: string, status: number, message: string) => {
    setLatestAction({
      method,
      endpoint,
      status,
      message,
      timestamp: Date.now(),
    });
  };

  return (
    <DebugContext.Provider value={{ isDebug, toggleDebug, latestAction, logAction }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error("useDebug must be used within DebugProvider");
  }
  return context;
}
