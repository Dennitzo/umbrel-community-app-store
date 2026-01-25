import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { apiUrl } from "../api/urls";

export const useNetworkHashrate = () =>
  useQuery({
    queryKey: ["networkHashrate"],
    queryFn: async () => {
      const { data } = await axios.get(apiUrl("/info/hashrate"));
      if (typeof data === "number") {
        return data;
      }
      if (data && typeof data === "object") {
        const value = (data as { hashrate?: number; networkHashrate?: number }).hashrate ??
          (data as { networkHashrate?: number }).networkHashrate;
        return typeof value === "number" ? value : null;
      }
      return null;
    },
    refetchInterval: 20000,
    staleTime: Infinity,
  });
