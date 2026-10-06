import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import {
  useClaudeStateQuery,
  type IDecryptedState,
} from "../../api/hooks/useClaudeState";

export type { IDecryptedState, IFolderTreeNode } from "../../api/hooks/useClaudeState";

interface IClaudeStateContext {
  data: IDecryptedState;
  isLoading: boolean;
  isFetching: boolean;
}

const ClaudeStateContext = createContext<IClaudeStateContext | null>(null);

interface IClaudeStateProviderProps {
  children: ReactNode;
}

export const ClaudeStateProvider = ({
  children,
}: IClaudeStateProviderProps) => {
  const { data, isLoading, isFetching } = useClaudeStateQuery();

  const value = useMemo(
    () => ({ data, isLoading, isFetching }),
    [data, isLoading, isFetching],
  );

  return (
    <ClaudeStateContext.Provider value={value}>
      {children}
    </ClaudeStateContext.Provider>
  );
};

export const useClaudeState = (): IClaudeStateContext => {
  const context = useContext(ClaudeStateContext);

  if (!context) {
    throw new Error("useClaudeState must be used within a ClaudeStateProvider");
  }

  return context;
};
