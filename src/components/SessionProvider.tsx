"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useSessionPresenter, SessionViewModel, SessionInteractions } from "../interfaceAdapters/presenters/useSessionPresenter";

// Define the shape of the context data
interface SessionContextType extends SessionViewModel {
  interactions: SessionInteractions;
}

// Create the context with a default undefined value
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Create the provider component
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const sessionData = useSessionPresenter();

  return (
    <SessionContext.Provider value={sessionData}>
      {children}
    </SessionContext.Provider>
  );
};

// Create a custom hook for easy context consumption
export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
