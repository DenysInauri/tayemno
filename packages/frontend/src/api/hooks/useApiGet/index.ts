import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { axios } from "../../axios";

export const useApiGet = <TResponse>(
  queryKey: QueryKey,
  url: string,
  options?: Omit<UseQueryOptions<TResponse>, "queryKey" | "queryFn">,
) => {
  return useQuery<TResponse>({
    queryKey,
    queryFn: async () => {
      const { data } = await axios.get<TResponse>(url);
      return data;
    },
    ...options,
  });
};
