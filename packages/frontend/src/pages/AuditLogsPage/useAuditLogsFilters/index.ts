import { useState, useCallback } from "react";

interface IAuditLogsFilters {
  dateFrom: string | null;
  dateTo: string | null;
  actionType: string | null;
  userId: string | null;
}

export const useAuditLogsFilters = () => {
  const [filters, setFilters] = useState<IAuditLogsFilters>({
    dateFrom: null,
    dateTo: null,
    actionType: null,
    userId: null,
  });

  const setDateFrom = useCallback((value: string | null) => {
    setFilters((prev) => ({ ...prev, dateFrom: value }));
  }, []);

  const setDateTo = useCallback((value: string | null) => {
    setFilters((prev) => ({ ...prev, dateTo: value }));
  }, []);

  const setActionType = useCallback((value: string | null) => {
    setFilters((prev) => ({ ...prev, actionType: value }));
  }, []);

  const setUserId = useCallback((value: string | null) => {
    setFilters((prev) => ({ ...prev, userId: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ dateFrom: null, dateTo: null, actionType: null, userId: null });
  }, []);

  const hasActiveFilters =
    !!filters.dateFrom || !!filters.dateTo || !!filters.actionType || !!filters.userId;

  return {
    filters,
    setDateFrom,
    setDateTo,
    setActionType,
    setUserId,
    resetFilters,
    hasActiveFilters,
  };
};
