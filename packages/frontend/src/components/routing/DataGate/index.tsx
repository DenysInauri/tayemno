import { Outlet } from "react-router-dom";
import { Center, Loader } from "@mantine/core";

import { useClaudeState } from "../../../contexts/ClaudeStateContext";

export const DataGate = () => {
  const { isLoading } = useClaudeState();

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return <Outlet />;
};
