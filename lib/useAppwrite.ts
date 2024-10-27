import { Alert } from "react-native";
import { useEffect, useState } from "react";

// Define the type for the function parameter
type FetchFunction<T> = () => Promise<T>;

const useAppwrite = <T>(fn: FetchFunction<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fn();
      setData(res);
    } catch (error: any) {
      if (__DEV__) console.error("Appwrite error:", error); // Only log in development
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refetch = () => fetchData();

  return { data, loading, refetch };
};

export default useAppwrite;