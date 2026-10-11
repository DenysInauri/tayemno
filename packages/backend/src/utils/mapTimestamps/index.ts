interface IRow {
  createdAt: Date | string;
  updatedAt: Date | string;
}

const toISO = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : value;

export const mapTimestamps = <T extends IRow>(
  row: T,
): Omit<T, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
} => ({
  ...row,
  createdAt: toISO(row.createdAt),
  updatedAt: toISO(row.updatedAt),
});
