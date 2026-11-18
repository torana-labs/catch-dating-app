import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";

import {readGuestFile, zipDeclaredExpandedBytes} from "./file";
import {readGuestTable} from "./registry";

async function xlsx(sheets: Record<string, unknown[][]>): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(sheets)) {
    const sheet = workbook.addWorksheet(name);
    for (const row of rows) sheet.addRow(row);
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

test("XLSX: reads the sheet with a name column, not the longest", async () => {
  const bytes = await xlsx({
    Summary: [["Total"], [1], [2], [3], [4]],
    Guests: [["Name", "Phone", "Paid"], ["Asha Sample", 9876543210, true]],
  });
  const file = await readGuestFile({fileName: "guests.xlsx", bytes});
  assert.equal(file.format, "xlsx");
  assert.equal(file.worksheetCount, 2);
  assert.deepEqual(file.matrix, [["Name", "Phone", "Paid"],
    ["Asha Sample", "9876543210", "true"]]);
  assert.equal(readGuestTable(file.matrix).rows[0].value.phone,
    "9876543210");
});

test("XLSX: a zip declaring a huge expansion is refused unopened", () => {
  // One central directory entry declaring 30 MB, then the end record.
  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt32LE(30 * 1024 * 1024, 24);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(0, 16);
  const bytes = new Uint8Array(Buffer.concat([entry, end]));
  assert.equal(zipDeclaredExpandedBytes(bytes), 30 * 1024 * 1024);
  return assert.rejects(readGuestFile({fileName: "bomb.xlsx", bytes}),
    /roster_expanded_file_too_large/u);
});

test("XLSX: bytes that are not a zip are unreadable", () =>
  assert.rejects(readGuestFile({fileName: "guests.xlsx",
    bytes: new TextEncoder().encode("Name,Phone\n")}),
  /roster_unreadable_xlsx/u));

test("CSV: Latin-1 bytes are decoded and flagged", async () => {
  const bytes = new Uint8Array(Buffer.from("Name,Phone\nJosé Sample," +
    "9876543210\n", "latin1"));
  const file = await readGuestFile({fileName: "guests.csv", bytes});
  assert.equal(file.usedLegacyEncoding, true);
  assert.equal(file.matrix[1][0], "José Sample");
});

test("vCard: each card is a guest, read by the vCard converter",
  async () => {
    const vcf = [
      "BEGIN:VCARD", "VERSION:3.0", "N:Sample;Asha;;;", "FN:Asha Sample",
      "TEL;TYPE=CELL:+91 98765 43210", "EMAIL:asha@example.com",
      "END:VCARD",
      "BEGIN:VCARD", "VERSION:2.1", "N:Sample;Ravi;;;",
      "item1.TEL;CELL:9876543211", "END:VCARD",
      "BEGIN:VCARD", "VERSION:2.1",
      "FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Jos=C3=A9 Sample",
      "TEL:9876543212", "END:VCARD",
    ].join("\r\n");
    const file = await readGuestFile({fileName: "contacts.vcf",
      bytes: new TextEncoder().encode(vcf)});
    assert.equal(file.converterId, "vcard-v1");
    const result = readGuestTable(file.matrix,
      {converterId: file.converterId ?? undefined});
    assert.equal(result.adapter.adapterId, "vcard-v1");
    assert.deepEqual(result.rows.map((row) => [row.value.displayName,
      row.value.phone, row.value.email]), [
      ["Asha Sample", "+91 98765 43210", "asha@example.com"],
      ["Ravi Sample", "9876543211", null],
      ["José Sample", "9876543212", null],
    ]);
  });

test("files over 5 MB and other types are refused", async () => {
  await assert.rejects(readGuestFile({fileName: "guests.csv",
    bytes: new Uint8Array(5 * 1024 * 1024 + 1)}), /roster_file_too_large/u);
  await assert.rejects(readGuestFile({fileName: "guests.pdf",
    bytes: new Uint8Array(1)}), /roster_unsupported_file/u);
});
