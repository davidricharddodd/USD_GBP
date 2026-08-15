import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentRate } from "../endpoints/rates/current_GET.schema";
import { getRateHistory } from "../endpoints/rates/history_GET.schema";
import { getAlertsList } from "../endpoints/alerts/list_GET.schema";
import { postCreateAlert, InputType as CreateAlertInput } from "../endpoints/alerts/create_POST.schema";
import { postDeleteAlert } from "../endpoints/alerts/delete_POST.schema";

export const useCurrentRate = () => {
  return useQuery({
    queryKey: ["rates", "current"],
    queryFn: () => getCurrentRate(),
    refetchInterval: 60000, // 1 minute
  });
};

export const useRateHistory = (days: number) => {
  return useQuery({
    queryKey: ["rates", "history", days],
    queryFn: () => getRateHistory({ days }),
    placeholderData: (prev) => prev,
  });
};

export const useAlerts = () => {
  return useQuery({
    queryKey: ["alerts", "list"],
    queryFn: () => getAlertsList(),
  });
};

export const useCreateAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAlertInput) => postCreateAlert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", "list"] });
    },
  });
};

export const useDeleteAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => postDeleteAlert({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", "list"] });
    },
  });
};