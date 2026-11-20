import {describe, expect, it} from "vitest";
import {guestImportFixtures} from "../../stories/fixtures/guestImportTryIt";
import {
  emptyGuestMapping,
  guestColumnsRead,
  guestFileBase64,
  guestFileProblem,
  guestFileSize,
  guestImportMaxBytes,
  guestMappingProblem,
  guestMergeSuggestions,
  guestPhoneCounts,
  guestRowsToLookAt,
  guestStartingMapping,
  guestTagSuggestions,
  isGuestFileRefusal,
  isGuestMappingRefusal,
} from "./guestImportModel";

describe("guest import model", () => {
  it("sends only CSV and Excel files with something in them, up to the command's 5 MB", () => {
    expect(guestFileProblem({name: "salt-air-guests.csv", size: 2048})).toBeNull();
    expect(guestFileProblem({name: "Guest list FINAL.XLSX", size: guestImportMaxBytes})).toBeNull();
    expect(guestFileProblem({name: "guests.xls", size: 2048})).toBe("fileType");
    expect(guestFileProblem({name: "guests.numbers", size: 2048})).toBe("fileType");
    expect(guestFileProblem({name: ".csv", size: 2048})).toBe("fileType");
    expect(guestFileProblem({name: "guests.csv", size: 0})).toBe("fileEmpty");
    expect(guestFileProblem({name: "guests.csv", size: guestImportMaxBytes + 1})).toBe("fileTooLarge");
  });

  it("words file sizes and encodes bytes as the command takes them", () => {
    expect(guestFileSize(300)).toBe("1 KB");
    expect(guestFileSize(48 * 1024)).toBe("48 KB");
    expect(guestFileSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
    expect(guestFileBase64(new TextEncoder().encode("Name,Phone\n"))).toBe(btoa("Name,Phone\n"));
    const large = new Uint8Array(100_000).fill(65);
    expect(guestFileBase64(large)).toBe(btoa("A".repeat(100_000)));
  });

  it("needs a name column and one field per column", () => {
    expect(guestMappingProblem(emptyGuestMapping)).toBe("nameRequired");
    expect(guestMappingProblem({...emptyGuestMapping, displayName: 0, phone: 0})).toBe("duplicateColumn");
    expect(guestMappingProblem({...emptyGuestMapping, displayName: 0, phone: 1})).toBeNull();
  });

  it("starts the column choice from the one phone-like and email-like column", () => {
    expect(guestStartingMapping(guestImportFixtures.needsMapping.result)).toEqual({displayName: null, phone: 1, email: 2, ticketType: null});
    expect(guestStartingMapping({...guestImportFixtures.needsMapping.result, columnShapes: ["phone-like", "phone-like", "text", "text"]}).phone).toBeNull();
  });

  it("reads a preview as the review's groups", () => {
    const {previewed, needsReview} = guestImportFixtures;
    expect(guestRowsToLookAt(needsReview.result).map((row) => row.issueCode)).toEqual(["shared-phone-identity", "invalid-phone"]);
    expect(guestPhoneCounts(needsReview.result)).toEqual({formatted: 2, invalid: 1});
    expect(guestMergeSuggestions(previewed.result).map((merge) => merge.reason)).toEqual(["samePhone"]);
    expect(guestTagSuggestions(previewed.result)).toEqual([{tag: "Early bird", count: 2}, {tag: "Regular", count: 1}, {tag: "Returning guest", count: 1}]);
    expect(guestColumnsRead(previewed.result, (n) => `Column ${n}`)).toEqual([
      {field: "displayName", header: "Name"}, {field: "phone", header: "Phone"}, {field: "email", header: "Email"}, {field: "ticketType", header: "Ticket"},
    ]);
    expect(guestColumnsRead({...previewed.result, headers: ["", "Phone", "Email", "Ticket"]}, (n) => `Column ${n}`)[0]).toEqual({field: "displayName", header: "Column 1"});
  });

  it("tells file refusals from column refusals by reason", () => {
    expect(isGuestFileRefusal("roster_malformed_csv")).toBe(true);
    expect(isGuestFileRefusal("roster_invalid_mapping")).toBe(false);
    expect(isGuestFileRefusal(null)).toBe(false);
    expect(isGuestMappingRefusal("roster_duplicate_mapped_column")).toBe(true);
    expect(isGuestMappingRefusal("roster_file_too_large")).toBe(false);
  });
});
