import { useMutation, useQuery } from "@tanstack/react-query";
import { postWiseQuote, InputType } from "../endpoints/wise/quote_POST.schema";

export const useWiseQuote = () => {
  return useMutation({
    mutationFn: (data: InputType) => postWiseQuote(data),
  });
};

export const useWiseQuoteQuery = (sourceAmount: number) => {
  return useQuery({
    queryKey: ["wise", "quote", sourceAmount],
    queryFn: () => postWiseQuote({ sourceAmount }),
    enabled: sourceAmount > 0,
    staleTime: 30000, // 30 seconds
  });
};