import {brand} from "./brand.ts";

// The guest-list try-it tool's own words (features/guestImportTryIt), on
// Guest records' try band: choose a file, the phone step, the column
// choice, the review and the save. The phone step, the private profile and
// the shared failures keep tryIt.ts's words. Every line here says only what
// guests.import-list returns (contracts/callable_responses/
// import_guest_list_response.schema.json). No dating wording.

const host = brand.stores.hostAppName;

/** The fields a column can fill, as the review names them. */
const fields = {
  displayName: "Name",
  phone: "Phone number",
  email: "Email",
  ticketType: "Ticket type",
  status: "Booking status",
  externalReference: "Order or ticket number",
  arrivalGroup: "Group",
  city: "City",
  revenueAmount: "Amount paid",
  revenueCurrency: "Currency",
} as const;

export const guestImportTryItCopy = {
  /** The card's title, under the shared "Try it" label. */
  title: "Upload a guest list",
  choose: "Choose a file",
  chooseAnother: "Choose another file",
  /** {name} and {size} of the chosen file. */
  chosen: "{name} · {size}",
  accepts: "A CSV or Excel (.xlsx) file, up to 5 MB. The first 250 guests are read.",
  /** Where the file goes, under the form on every step before the save. */
  where: `Nothing leaves your browser until you confirm your phone number. Then ${brand.name}’s servers read the file only to import it, never use it to train AI, and don’t keep it. The guests in it wait in a private review on your account until you save them.`,
  fileRequired: "Choose a CSV or Excel file first.",
  fileType: "Choose a CSV or Excel (.xlsx) file.",
  fileEmpty: "This file is empty.",
  fileTooLarge: "This file is over 5 MB. Save only the columns you need, or split it.",
  fileUnreadable: "Your browser couldn’t open this file. Save it again and choose it.",
  working: "Reading your list…",
  fields,
  mapping: {
    title: "Which column is which?",
    /** {field} is one of the fields above. */
    fieldLabel: "Column for {field}",
    none: "Not in this file",
    /** {header} is the column's name in the file, {shape} what it holds. */
    column: "{header} ({shape})",
    untitled: "Column {number}",
    shapes: {
      empty: "empty",
      "phone-like": "phone numbers",
      "email-like": "emails",
      "date-like": "dates",
      number: "numbers",
      text: "text",
    },
    nameRequired: "Choose the column with your guests’ names.",
    duplicateColumn: "Each column can fill only one field.",
    invalidMapping: "That column isn’t in this file. Choose again.",
    submit: "Read my list",
  },
  review: {
    counts: "What saving would do",
    add: "Guests to add",
    update: "Guests to update",
    unchanged: "Already on the list",
    needsReview: "Need a look first",
    excluded: "Left out",
    skipped: "Rows skipped",
    columns: "Columns we read",
    /** {count} phone numbers on rows ready to save. */
    phones: "{count} phone numbers, written in one format",
    /** {count} rows whose phone number needs a look. */
    badPhones: "{count} phone numbers that don’t look right",
    look: {
      title: "Need a look before saving",
      lead: "Fix these in your file and choose it again, or leave them out of this import.",
      /** {row} is the row's number in the file. */
      row: "Row {row}",
      unnamed: "No name",
      leaveOut: "Leave out of this import",
      again: "Preview without them",
      issues: {
        "invalid-phone": "The phone number doesn’t look right.",
        "invalid-email": "The email doesn’t look right.",
        "shared-phone-identity": "Another guest in the file has the same phone number.",
        "duplicate-row": "The same guest is in the file twice.",
        "missing-stable-identity": "No phone, email or order number to tell this guest apart.",
        "email-only-identity": "Only an email to go on, and the guest is already on the list.",
        "contact-belongs-to-another-attendee": "This phone number belongs to another guest on the list.",
        "catch-booking-authority": `This guest booked on ${brand.name}, so their booking stays as it is.`,
        "claimed-identity": "This guest manages their own details.",
        "cancelled-status-needs-explicit-review": "This guest cancelled. Say whether they’re coming in the file’s status column.",
        "value-too-long": "A value is too long and was cut short.",
        "invalid-city": "The city isn’t one we know.",
        "invalid-revenue": "The amount paid doesn’t look right.",
        "invalid-revenue-amount": "The amount paid doesn’t look right.",
        "missing-revenue-currency": "The amount paid has no currency.",
        "unknown-status": "The booking status isn’t one we know.",
        "missing-name": "There’s no name.",
        other: "Something on this row needs a look.",
      },
    },
    merges: {
      title: "May already be in your contacts",
      note: `Nothing is merged now. After saving, check possible repeats in Customers in ${host}.`,
    },
    tags: {
      title: "Suggested tags",
      /** {count} guests the tag would go on. */
      count: "{count} guests",
      note: "From ticket types, and guests who came to your events before. Nothing is tagged yet.",
    },
    guests: "Guests in this list",
    /** {count} more rows than shown. */
    more: "And {count} more",
    kinds: {
      add: "New",
      update: "Update",
      unchanged: "No change",
      excluded: "Left out",
      needsReview: "Needs a look",
      identityConflict: "Needs a look",
    },
    nothing: "There’s no one new to save from this file.",
    blocked: "Leave out the guests that need a look, or fix them in your file, before saving.",
    note: "This is a preview. No one is on your guest list yet.",
    confirm: "Save to my draft event",
    back: "Use another file",
  },
  done: {
    title: "Saved",
    added: "Guests added",
    updated: "Guests updated",
    skipped: "Rows skipped",
    lead: "Guests aren’t messaged. Rename or date the draft event, and see your guest list, in the app.",
  },
  /** A file or a save the command refused, by its reason (functions/src/commands/importGuestList.ts). */
  refusals: {
    roster_file_too_large: "This file is over 5 MB. Save only the columns you need, or split it.",
    roster_unsupported_file: "Choose a CSV or Excel (.xlsx) file.",
    roster_unreadable_xlsx: "This spreadsheet couldn’t be opened. Save it again as .xlsx or CSV.",
    roster_expanded_file_too_large: "This spreadsheet is too large to read. Save only the sheet with your guests.",
    roster_missing_worksheet: "This spreadsheet has no rows.",
    roster_malformed_csv: "This CSV has an unclosed quote. Save it again from your spreadsheet.",
    roster_missing_rows: "This file needs a header row and at least one guest.",
    roster_too_many_columns: "This file has more than 40 columns. Save only the columns you need.",
    roster_missing_guest_names: "No row in this file has a guest name.",
    city_unavailable: `Your profile’s city isn’t open for events on ${brand.name} yet.`,
    intake_refused: "This guest list can’t be imported as it is. Check the file and try again.",
    unreadable: "This file couldn’t be read. Check it’s a guest list, or try another file.",
  },
} as const;
