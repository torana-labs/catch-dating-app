import {describe, expect, it} from "vitest";
import {
  emptyPastSalesDetails,
  formatPastSalesMoney,
  formatPastSalesRate,
  guessPastSalesMapping,
  pastSalesBase64,
  pastSalesDetailsInput,
  pastSalesFileProblem,
  pastSalesMappingProblems,
  pastSalesMaxBytes,
  pastSalesToday,
} from "./pastSalesModel";

describe("past sales model", () => {
  it("takes the files the command reads: CSV, Excel and vCard, up to 5 MB", () => {
    expect(pastSalesFileProblem(null)).toBe("fileRequired");
    expect(pastSalesFileProblem({name: "night.csv", size: 120})).toBeNull();
    expect(pastSalesFileProblem({name: "NIGHT.XLSX", size: 120})).toBeNull();
    expect(pastSalesFileProblem({name: "guests.vcf", size: 120})).toBeNull();
    expect(pastSalesFileProblem({name: "night.xls", size: 120})).toBe("fileType");
    expect(pastSalesFileProblem({name: "night.pdf", size: 120})).toBe("fileType");
    expect(pastSalesFileProblem({name: "night.csv", size: pastSalesMaxBytes + 1})).toBe("fileTooLarge");
    expect(pastSalesFileProblem({name: "night.csv", size: 0})).toBe("fileTooLarge");
  });

  it("turns the night's details into the command's input, leaving empty ones out", () => {
    expect(pastSalesDetailsInput(emptyPastSalesDetails, "2026-11-20")).toEqual({problems: {}, input: {}});
    expect(pastSalesDetailsInput({eventName: " Salt  Air ", eventDate: "2026-11-16", ticketPrice: "₹1,250.50", feePercent: "2.5", feePerTicket: ""}, "2026-11-20")).toEqual({
      problems: {},
      input: {event: {name: "Salt Air", localDate: "2026-11-16"}, fallbackTicketPrice: {amountMinor: 125050, currency: "INR"}, currentFees: {percent: 2.5, currency: "INR"}},
    });
    expect(pastSalesDetailsInput({...emptyPastSalesDetails, feePerTicket: "9.99"}, "2026-11-20").input).toEqual({currentFees: {perTicketMinor: 999, currency: "INR"}});
  });

  it("refuses a future date and amounts the command would refuse", () => {
    expect(pastSalesDetailsInput({eventName: "", eventDate: "2026-11-21", ticketPrice: "abc", feePercent: "101", feePerTicket: "1.234"}, "2026-11-20").problems).toEqual({
      eventDate: "dateInFuture", ticketPrice: "notNumber", feePercent: "tooLarge", feePerTicket: "notNumber",
    });
  });

  it("guesses each column once, from its shape or its heading", () => {
    expect(guessPastSalesMapping(["Guest", "Contact", "E-mail", "Amount"], ["text", "phone-like", "email-like", "number"])).toEqual({
      displayName: 0, phone: 1, email: 2, ticketType: null, status: null, revenueAmount: 3,
    });
    expect(guessPastSalesMapping(["A", "B"], ["text", "text"])).toEqual({displayName: null, phone: null, email: null, ticketType: null, status: null, revenueAmount: null});
  });

  it("needs a name column and one field per column", () => {
    const mapping = {displayName: null, phone: 1, email: 1, ticketType: null, status: null, revenueAmount: null};
    expect(pastSalesMappingProblems(mapping)).toEqual({displayName: "nameRequired", email: "duplicate"});
    expect(pastSalesMappingProblems({...mapping, displayName: 0, email: null})).toEqual({});
  });

  it("encodes the file as base64, in chunks", () => {
    const bytes = new Uint8Array(70_000).map((_, index) => index % 251);
    expect(atob(pastSalesBase64(bytes)).length).toBe(70_000);
    expect(pastSalesBase64(new TextEncoder().encode("Name\n"))).toBe("TmFtZQo=");
  });

  it("words the command's amounts and rates in the market's way", () => {
    expect(formatPastSalesMoney(2_080_000, "INR")).toBe("₹20,800");
    expect(formatPastSalesMoney(9_950, "INR")).toBe("₹99.50");
    expect(formatPastSalesRate(46 / 52)).toBe("88%");
    expect(formatPastSalesRate(0.29)).toBe("29%");
    expect(pastSalesToday(new Date("2026-11-19T20:00:00Z"), "Asia/Kolkata")).toBe("2026-11-20");
  });
});
