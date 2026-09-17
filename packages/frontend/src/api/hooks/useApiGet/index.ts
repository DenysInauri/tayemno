import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { axios } from "../../axios";

export const useApiGet = <TResponse, TData = TResponse>(
  queryKey: QueryKey,
  url: string,
  options?: Omit<
    UseQueryOptions<TResponse, Error, TData>,
    "queryKey" | "queryFn"
  >,
) => {
  return useQuery<TResponse, Error, TData>({
    queryKey,
    queryFn: async () => {
      const { data } = await axios.get<TResponse>(url);
      return data;
    },
    ...options,
  });
};
