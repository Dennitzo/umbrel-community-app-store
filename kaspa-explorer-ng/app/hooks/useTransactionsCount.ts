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
      } catch {
        return {
          timestamp: 0,
          dateTime: "",
          coinbase: 0,
          regular: 0,
        } satisfies TransactionCount;
      }
    },
  });

interface TransactionCount {
  timestamp: number;
  dateTime: string;
  coinbase: number;
  regular: number;
}
