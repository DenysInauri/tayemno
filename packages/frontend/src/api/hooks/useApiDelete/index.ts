import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { axios } from "../../axios";

export const useApiDelete = <TResponse>(
  url: string,
  options?: Omit<UseMutationOptions<TResponse, Error, void>, "mutationFn">,
) => {
  return useMutation<TResponse, Error, void>({
    mutationFn: async () => {
      const { data } = await axios.delete<TResponse>(url);
      return data;
    },
    ...options,
  });
};
