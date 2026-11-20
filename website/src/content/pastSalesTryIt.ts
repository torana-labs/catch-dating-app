import {brand} from "./brand.ts";

// The words of Reports' export upload (features/pastSalesTryIt), the
// sales.import-past try-it tool on /product/reports-and-payouts/. The phone
// step, the profile step, the claim step and the shared failures are the
// try-it tools' own (content/tryIt.ts); the band, the file label and the
// button stay in the page's JSON. Every figure the report shows is the
// command's; when one is missing, these words say why instead of a number.
// No dating wording.

const host = brand.stores.hostAppName;

export const pastSalesTryItCopy = {
  /** The card's title, under the "Try it" label. */
  title: "Build a report from an export",
  /** What the file chooser offers. */
  chooseFile: "Choose a file",
  /** {name} is the chosen file's name. */
  chosenFile: "Chosen: {name}",
  changeFile: "Choose another file",
  fileHelp: "A CSV, Excel (.xlsx) or vCard (.vcf) file, up to 5 MB, with a row for each ticket or guest.",
  fileRequired: "Choose your export first.",
  fileType: "Choose a CSV, Excel (.xlsx) or vCard (.vcf) file.",
  fileTooLarge: "This file is over 5 MB. Export just the one event.",
  eventTitle: "The event",
  eventName: "What it was called",
  eventNameHint: "Salt Air Social Run",
  eventDate: "When it was",
  eventDateHelp: "Leave it empty for yesterday.",
  dateInFuture: "Choose a date that has already happened.",
  ticketPrice: "Ticket price",
  ticketPriceHelp: "Used only for rows the export gives no amount for.",
  feeTitle: "What your current tool charges",
  feePercent: "Its fee on ticket sales",
  feePercentHelp: "As a share of what you sold. Leave it empty if there isn’t one.",
  feePerTicket: "Its fee on each ticket",
  feePerTicketHelp: "A flat amount on each ticket sold. Leave it empty if there isn’t one.",
  errorNotNumber: "Enter a number.",
  errorNotWhole: "Enter a whole number.",
  /** {max} is the most the field takes. */
  errorTooLarge: "Enter {max} or less.",
  mapping: {
    title: "Which column is which?",
    lead: "We couldn’t tell this file’s columns apart. Choose the column for each one we need. Only the guest name is a must.",
    none: "Not in this file",
    /** {number} counts columns from 1, for a column with no heading. */
    untitled: "Column {number}",
    fields: {
      displayName: "Guest name",
      phone: "Phone number",
      email: "Email",
      ticketType: "Ticket type",
      status: "Checked in, or status",
      revenueAmount: "Amount paid",
    },
    nameRequired: "Choose the column with each guest’s name.",
    duplicate: "Each column can fill only one of these.",
    submit: "Build my report",
  },
  report: {
    /** {name} and {date}: the event as the command read it. */
    title: "{name} · {date}",
    tickets: "Tickets sold",
    sales: "Ticket sales",
    salesFromFile: "From the amounts in your export",
    salesEstimate: "From the ticket price you entered",
    salesMixed: "From your export, and your ticket price where it gave no amount",
    salesNone: "Your export has no amounts. Add your ticket price to work them out.",
    byType: "By ticket type",
    untypedTicket: "No ticket type",
    /** {count} tickets of a type. */
    typeCount: "{count} tickets",
    came: "Came",
    /** {came} of {sold}. */
    cameNote: "{came} of {sold} with tickets",
    attendanceMissing: "Your export doesn’t say who checked in, so who came isn’t counted.",
    guests: "First-timers",
    /** {repeat} guests who came back. */
    guestsNote: "{repeat} came back",
    guestsMissing: "First-timers and returning guests show once you’ve brought in an earlier night.",
    feesTitle: "Fees on this event",
    catchFee: `${brand.name}’s fee`,
    /** {days} free days. */
    catchFeeNote: "After your first {days} days free",
    catchFeeReasons: {
      terms_unavailable: `We couldn’t work out ${brand.name}’s fee just now. Try again later.`,
      no_sales_amounts: `Your export has no amounts, so ${brand.name}’s fee can’t be worked out. Add your ticket price.`,
      currency_mismatch: `Your export’s amounts aren’t all in one currency, so ${brand.name}’s fee can’t be worked out.`,
    },
    catchFeeUnknown: `${brand.name}’s fee can’t be worked out for this export.`,
    currentFee: "Your current tool",
    currentFeeNote: "From the fee you entered",
    currentFeeMissing: "Not entered, so there’s nothing to compare",
    difference: "The difference",
    differenceLess: `less with ${brand.name}`,
    differenceMore: `more with ${brand.name}`,
    differenceSame: "the same with both",
    differenceMissing: "Needs both fees",
    /** {count} rows the report leaves out: rows the reader skipped and rows the visitor left out. */
    skipped: "{count} rows in the file aren’t counted.",
  },
  review: {
    /** {count} rows that need a look. */
    rowsTitle: "To look at before you save ({count})",
    rowsLead: "Fix them in the file and choose it again, or leave them out of the report.",
    /** {number} is the row's number in the file. */
    row: "Row {number}",
    /** {count} more rows not listed. */
    moreRows: "And {count} more",
    leaveOut: "Leave them out",
    issues: {
      "missing-name": "No guest name",
      "invalid-city": "City not recognised",
      "invalid-revenue-amount": "Amount not readable",
      "missing-revenue-currency": "Amount has no currency",
      "unknown-status": "Status not recognised",
      "value-too-long": "A value is too long",
    } as Readonly<Record<string, string>>,
    unknownIssue: "Needs a look",
    note: "This is a preview. Nothing is saved yet.",
    save: "Save this night to my profile",
    saveNote: "Saving adds the night and its guest list to your private profile. No one is messaged.",
    back: "Use another file",
  },
  done: {
    /** {name} is the saved event. */
    title: "“{name}” is saved as a private past event.",
    /** {count} guests saved. */
    guests: "{count} guests saved to it.",
  },
  /** The file and reading problems the command names (its details.reason), in the site's words. */
  reasons: {
    roster_file_too_large: "This file is over 5 MB. Export just the one event.",
    roster_unsupported_file: "Choose a CSV, Excel (.xlsx) or vCard (.vcf) file.",
    roster_unreadable_xlsx: "This spreadsheet couldn’t be opened. Save it again as .xlsx or CSV.",
    roster_expanded_file_too_large: "This spreadsheet is too large to read. Export just the one event.",
    roster_missing_worksheet: "This spreadsheet has no rows.",
    roster_malformed_csv: "This CSV has an unclosed quote. Export it again.",
    roster_missing_rows: "This file needs a header row and at least one guest.",
    roster_too_many_columns: "This file has more than 40 columns. Export fewer.",
    roster_invalid_mapping: "A chosen column isn’t in this file.",
    roster_duplicate_mapped_column: "Each column can fill only one field.",
    roster_missing_guest_names: "No row in this file has a guest name.",
    date_in_future: "Choose a date that has already happened.",
    city_unavailable: `Your profile’s city isn’t open for events on ${brand.name} yet.`,
  } as Readonly<Record<string, string>>,
  /** When the command refuses a file for a reason not listed above. */
  fileUnreadable: "We couldn’t read this file. Check it’s the export for one event, or try another.",
  /** Under the form on every step after the first. */
  private: `Your file goes only to ${brand.name}, to build this report. Nothing is kept until you save it, and ${host} shows what you save.`,
} as const;
