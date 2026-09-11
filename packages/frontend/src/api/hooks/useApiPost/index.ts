import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { axios } from "../../axios";

export const useApiPost = <TRequest, TResponse>(
  url: string,
  options?: Omit<UseMutationOptions<TResponse, Error, TRequest>, "mutationFn">,
) => {
  return useMutation<TResponse, Error, TRequest>({
    mutationFn: async (body: TRequest) => {
      const { data } = await axios.post<TResponse>(url, body);
      return data;
    },
    ...options,
  });
};
