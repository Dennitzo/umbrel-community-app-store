import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { apiUrl } from "../api/urls";

export const useTransactionsCount = () =>
  useQuery({
    queryKey: ["transactionsCount"],
    queryFn: async () => {
      try {
        const { data } = await axios.get(apiUrl("/transactions/count/"));
        return data as TransactionCount;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 503) {
          return null;
        }
        return {
          timestamp: 0,
          dateTime: "",
          coinbase: 0,
          regular: 0,
        } satisfies TransactionCount;
      }
    },
    retry: false,
  });

interface TransactionCount {
  timestamp: number;
  dateTime: string;
  coinbase: number;
  regular: number;
}
