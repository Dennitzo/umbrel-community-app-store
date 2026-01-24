import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { apiUrl } from "../api/urls";

export const useAddressDistribution = () =>
  useQuery({
    queryKey: ["addressDistribution"],
    queryFn: async () => {
      try {
        const { data } = await axios.get(apiUrl("/addresses/distribution"));
        return data as AddressDistribution[];
      } catch {
        return [];
      }
    },
  });

export interface AddressDistribution {
  tiers: {
    tier: number;
    count: number;
    amount: number;
  }[];
  timestamp: number;
}
