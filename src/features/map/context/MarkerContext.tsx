import React, { createContext, useState, useContext, ReactNode } from "react";

interface MarkerContextProps {
  isMarkerSelected: boolean;
  setIsMarkerSelected: (selected: boolean) => void;
  isNavigationActive: boolean;
  setIsNavigationActive: (active: boolean) => void;
}

const MarkerContext = createContext<MarkerContextProps | undefined>(undefined);

interface MarkerProviderProps {
  children: ReactNode;
}

export const MarkerProvider: React.FC<MarkerProviderProps> = ({ children }) => {
  const [isMarkerSelected, setIsMarkerSelected] = useState<boolean>(false);
  const [isNavigationActive, setIsNavigationActive] = useState<boolean>(false);

  return (
    <MarkerContext.Provider
      value={{
        isMarkerSelected,
        setIsMarkerSelected,
        isNavigationActive,
        setIsNavigationActive,
      }}
    >
      {children}
    </MarkerContext.Provider>
  );
};

export const useMarkerContext = () => {
  const context = useContext(MarkerContext);
  if (!context) {
    throw new Error("useMarkerContext must be used within a MarkerProvider");
  }
  return context;
};
