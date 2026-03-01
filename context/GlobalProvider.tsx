import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";
import { getCurrentUser } from "../lib/appwrite";
import { Models } from "appwrite";

export interface User extends Models.Document {
  accountID: string;
  email: string;
  username: string;
  avatar?: string;
}

interface GlobalContextProps {
  isLogged: boolean;
  setIsLogged: Dispatch<SetStateAction<boolean>>;
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  error: Error | null;
}

const GlobalContext = createContext<GlobalContextProps>({
  isLogged: false,
  setIsLogged: () => {},
  user: null,
  setUser: () => {},
  loading: true,
  setLoading: () => {},
  error: null,
});

export const useGlobalContext = () => useContext(GlobalContext);

interface GlobalProviderProps {
  children: ReactNode;
}

const GlobalProvider: React.FC<GlobalProviderProps> = ({ children }) => {
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getCurrentUser();
        if (res) {
          setIsLogged(true);
          setUser(res as User);
        } else {
          setIsLogged(false);
          setUser(null);
        }
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error("Unknown error");
        setError(normalized);
        setIsLogged(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
    return () => {
      // getCurrentUser does not currently support abort signals; placeholder for future cancellation.
    };
  }, []);

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        setIsLogged,
        user,
        setUser,
        loading,
        setLoading,
        error,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;
