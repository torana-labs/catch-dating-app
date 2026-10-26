import qrcode from "qrcode-generator";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchQrCode, qrModulePath} from "./CatchQrCode";

afterEach(cleanup);

/** Rasterises the path's run commands back into a module grid. */
function modulesFromPath(path: string, extent: number) {
  const grid = Array.from({length: extent}, () => Array<boolean>(extent).fill(false));
  for (const [, x, y, width] of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let offset = 0; offset < Number(width); offset += 1) grid[Number(y)][Number(x) + offset] = true;
  }
  return grid;
}

describe("CatchQrCode", () => {
  it("draws exactly the encoder's dark modules inside a two-module quiet zone", () => {
    const value = "https://carterroadrunners.club";
    const {extent, path} = qrModulePath(value);
    const code = qrcode(0, "M");
    code.addData(value, "Byte");
    code.make();
    const count = code.getModuleCount();
    expect(extent).toBe(count + 4);
    const grid = modulesFromPath(path, extent);
    for (let row = 0; row < extent; row += 1) {
      for (let column = 0; column < extent; column += 1) {
        const inside = row >= 2 && column >= 2 && row < count + 2 && column < count + 2;
        expect(grid[row][column]).toBe(inside && code.isDark(row - 2, column - 2));
      }
    }
  });

  it("draws the three finder patterns", () => {
    const {extent, path} = qrModulePath("https://catchdates.com/app");
    const grid = modulesFromPath(path, extent);
    const count = extent - 4;
    for (const [top, left] of [[2, 2], [2, count - 5], [count - 5, 2]]) {
      const ring = (dy: number, dx: number) => grid[top + dy][left + dx];
      expect([0, 1, 2, 3, 4, 5, 6].every((i) => ring(0, i) && ring(6, i) && ring(i, 0) && ring(i, 6))).toBe(true);
      expect(ring(1, 1) || ring(5, 5)).toBe(false);
      expect([2, 3, 4].every((i) => [2, 3, 4].every((j) => ring(i, j)))).toBe(true);
    }
  });

  it("encodes the UTF-8 bytes, not the encoder's Latin-1 truncation", () => {
    const value = "https://catchdates.com/मुंबई";
    const bytes = String.fromCharCode(...new TextEncoder().encode(value));
    const expected = qrcode(0, "M");
    expected.addData(bytes, "Byte");
    expected.make();
    const {extent, path} = qrModulePath(value);
    const grid = modulesFromPath(path, extent);
    expect(extent - 4).toBe(expected.getModuleCount());
    expect(grid.slice(2, -2).map((row) => row.slice(2, -2))).toEqual(
      Array.from({length: extent - 4}, (_, row) => Array.from({length: extent - 4}, (_, column) => expected.isDark(row, column))),
    );
    expect(path).not.toBe(qrModulePath("https://catchdates.com/").path);
  });

  it("reads as one labelled image at the requested size", () => {
    render(<CatchQrCode label="QR code for carterroadrunners.club" size="l" value="https://carterroadrunners.club" />);
    const image = screen.getByRole("img", {name: "QR code for carterroadrunners.club"});
    expect(image.dataset.size).toBe("l");
    expect(image.getAttribute("viewBox")).toMatch(/^0 0 \d+ \d+$/);
  });
});
