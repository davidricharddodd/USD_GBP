import { useQuery } from "@tanstack/react-query";
import { getForecast } from "../endpoints/rates/forecast_GET.schema";

export const useForecast = (enabled: boolean) => {
  return useQuery({
    queryKey: ["rates", "forecast"],
    queryFn: () => getForecast(),
    enabled,
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
  });
};