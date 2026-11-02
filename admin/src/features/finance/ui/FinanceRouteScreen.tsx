import {useState} from "react";
import {useFinanceMonthController} from "../controllers/useFinanceMonthController";
import {FinanceScreen} from "./FinanceScreen";

/** Last month in India time: Finance opens on the newest month with its bills made. */
function lastMonth(nowMillis: number): string {
  const india = new Date(nowMillis + 5.5 * 60 * 60 * 1000);
  const date = new Date(Date.UTC(india.getUTCFullYear(), india.getUTCMonth() - 1, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Finance as the shell routes it; the export downloads the month's CSV. */
export function FinanceRouteScreen({onOpenBills, onNotice}: {
  onOpenBills: () => void;
  onNotice: (message: string | null) => void;
}) {
  const [latestMonth] = useState(() => lastMonth(Date.now()));
  const controller = useFinanceMonthController({initialMonth: latestMonth});
  const download = async () => {
    const ledger = await controller.exportMonth();
    if (!ledger) return;
    const url = URL.createObjectURL(new Blob([ledger.csv], {type: "text/csv"}));
    const link = document.createElement("a");
    link.href = url;
    link.download = ledger.fileName;
    link.click();
    URL.revokeObjectURL(url);
    onNotice(`${ledger.fileName} downloaded: ${ledger.rowCount} rows for Zoho Books.`);
  };
  return <FinanceScreen controller={controller} latestMonth={latestMonth} onExport={() => void download()} onOpenBills={onOpenBills} />;
}
