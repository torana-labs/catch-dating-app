import {useState} from "react";
import {lastEventReport, type LastEventField, type LastEventInputs} from "./lastEventReportModel";

/**
 * Every field starts empty: the report shows nothing until the host types
 * their own numbers, so no figure on it is one the page made up. The
 * placeholders in the fields are hints, never worked into the sums.
 */
export const lastEventEmptyInputs: LastEventInputs = {sold: "", price: "", came: "", feePercent: "", feePerTicket: ""};

/**
 * The numbers-only report's state: what the host types, and the report
 * worked out from it (./lastEventReportModel). It lives in the page alone;
 * nothing is sent or stored.
 */
export function useLastEventReport(initial: LastEventInputs = lastEventEmptyInputs) {
  const [inputs, setInputs] = useState<LastEventInputs>(initial);
  const set = (field: LastEventField) => (value: string) => setInputs((current) => ({...current, [field]: value}));
  return {
    inputs,
    report: lastEventReport(inputs),
    setSold: set("sold"),
    setPrice: set("price"),
    setCame: set("came"),
    setFeePercent: set("feePercent"),
    setFeePerTicket: set("feePerTicket"),
  };
}
