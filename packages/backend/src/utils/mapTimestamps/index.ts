interface IRow {
  createdAt: Date;
  updatedAt: Date;
}

export const mapTimestamps = <T extends IRow>(
  row: T,
): Omit<T, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
} => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
