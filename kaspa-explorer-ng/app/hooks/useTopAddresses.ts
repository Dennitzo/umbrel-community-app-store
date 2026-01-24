import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { apiUrl } from "../api/urls";

export const useTopAddresses = () =>
  useQuery({
    queryKey: ["topAddresses"],
    queryFn: async () => {
      try {
        const { data } = await axios.get(apiUrl("/addresses/top"));
        return data[0] as TopAddresses;
      } catch {
        return {
          timestamp: 0,
          ranking: [],
        } satisfies TopAddresses;
      }
    },
  });

interface TopAddresses {
  timestamp: number;
  ranking: {
    rank: number;
    address: string;
    amount: number;
  }[];
}
