import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { apiUrl } from "../api/urls";

export const useNetworkHashrate = () =>
  useQuery({
    queryKey: ["networkHashrate"],
    queryFn: async () => {
      const { data } = await axios.get(apiUrl("/info/hashrate"));
      const normalizeHashrate = (value: number) => (value < 1e9 ? value * 1e15 : value);
      if (typeof data === "number") {
        return normalizeHashrate(data);
      }
      if (data && typeof data === "object") {
        const value = (data as { hashrate?: number; networkHashrate?: number }).hashrate ??
          (data as { networkHashrate?: number }).networkHashrate;
        return typeof value === "number" ? normalizeHashrate(value) : null;
      }
      return null;
    },
    refetchInterval: 20000,
    staleTime: Infinity,
  });
