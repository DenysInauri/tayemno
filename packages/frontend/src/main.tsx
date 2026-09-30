import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Box, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "./i18n/i18n";
import { App } from "./App";
import { queryClient } from "./api/queryClient";
import { MobileBlockScreen } from "./components/layout/MobileBlockScreen";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider defaultColorScheme="light">
        <Box hiddenFrom="sm">
          <MobileBlockScreen />
        </Box>
        <Box visibleFrom="sm">
          <App />
        </Box>
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>,
);
