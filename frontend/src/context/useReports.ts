import { useContext } from "react";
import { ReportsContext, type ReportsContextValue } from "./context";

export function useReports(): ReportsContextValue {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error("useReports must be used within ReportsProvider");
  return ctx;
}
