import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  ReactElement,
  Dispatch,
  SetStateAction,
} from "react";
import { getCurrentUser } from "../lib/appwrite";

// Define types for context
interface GlobalContextProps {
  isLogged: boolean;
  setIsLogged: Dispatch<React.SetStateAction<boolean>>;
  user: any | null; // Replace 'any' with an actual type if possible
  setUser: Dispatch<React.SetStateAction<any | null>>;
  loading: boolean;
}

// Define a default value for the context (can be adjusted as needed)
const GlobalContext = createContext<GlobalContextProps>({
  isLogged: true,
  setIsLogged: () => {},
  user: null,
  setUser: () => {},
  loading: true,
});

// Custom hook to access the context
export const useGlobalContext = () => useContext(GlobalContext);

// Define props for the GlobalProvider component
interface GlobalProviderProps {
  children: ReactNode;
}

const GlobalProvider: React.FC<GlobalProviderProps> = ({ children }) => {
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null); // Replace 'any' if a specific type is available
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    console.log("Fetching current user...");
    getCurrentUser()
      .then((res) => {
        console.log("User fetched:", res);
        if (res) {
          setIsLogged(true);
          setUser(res);
        } else {
          // Handle guest user
          setIsLogged(false);
          setUser(null);
        }
      })
      .catch((error) => {
        console.error("Error fetching user:", error);
        setIsLogged(false);
        setUser(null);
      })
      .finally(() => {
        setLoading(false); // Ensure loading completes for all cases
      });
  }, []);

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        setIsLogged,
        user,
        setUser,
        loading,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
