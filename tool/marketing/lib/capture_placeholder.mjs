// Placeholder images for pending-fixture captures. A page can show a pending
// capture before the macOS capture lane renders it, so its placeholder has
// the capture's exact framed size (pages reserve that space) and looks like a
// generic device with a neutral, loading-style screen: no app UI, no text,
// nothing that could pass for a real screen. Pixels are drawn directly, so the
// output is identical on every machine.
import {PNG} from "pngjs";
import {captureDevice, framedSize, isFramedCaptureDevice} from "./capture_devices.mjs";

const BEZEL = [18, 16, 19, 255];
const SCREEN = [246, 240, 232, 255];
const BLOCK = [228, 220, 210, 255];
const CLEAR = [0, 0, 0, 0];

function insideRoundedRect(x, y, left, top, width, height, radius) {
  if (x < left || y < top || x >= left + width || y >= top + height) return false;
  const r = Math.min(radius, width / 2, height / 2);
  const cx = x < left + r ? left + r : x >= left + width - r ? left + width - r : x;
  const cy = y < top + r ? top + r : y >= top + height - r ? top + height - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/** The placeholder PNG for a capture on this device, as a Buffer. */
export function capturePlaceholderPng(deviceId) {
  const device = captureDevice(deviceId);
  const {width, height} = framedSize(deviceId);
  const scale = device.outputScale;
  const png = new PNG({width, height});
  const framed = isFramedCaptureDevice(deviceId);
  const margin = device.canvasMargin * scale;
  const inset = device.frameInset * scale;
  const outer = {left: margin, top: margin, width: width - 2 * margin, height: height - 2 * margin, radius: device.outerRadius * scale};
  const screen = {left: margin + inset, top: margin + inset, width: width - 2 * (margin + inset), height: height - 2 * (margin + inset),
    radius: device.screenRadius * scale};
  // Loading-style blocks: a title bar, two short lines and a large card, as shares of the screen.
  const unit = screen.width / 100;
  const blocks = [
    {left: 8, top: 10, width: 56, height: 5},
    {left: 8, top: 18, width: 38, height: 2.5},
    {left: 8, top: 26, width: 84, height: 44},
    {left: 8, top: 76, width: 64, height: 3},
    {left: 8, top: 82, width: 46, height: 3},
  ].map((block) => ({left: screen.left + block.left * unit, top: screen.top + (block.top / 100) * screen.height,
    width: block.width * unit, height: block.height * unit, radius: 3 * unit}));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let colour = CLEAR;
      if (!framed || insideRoundedRect(x, y, outer.left, outer.top, outer.width, outer.height, outer.radius)) colour = framed ? BEZEL : SCREEN;
      if (insideRoundedRect(x, y, screen.left, screen.top, screen.width, screen.height, screen.radius)) colour = SCREEN;
      if (colour === SCREEN && blocks.some((block) => insideRoundedRect(x, y, block.left, block.top, block.width, block.height, block.radius))) colour = BLOCK;
      const index = (y * width + x) * 4;
      png.data[index] = colour[0];
      png.data[index + 1] = colour[1];
      png.data[index + 2] = colour[2];
      png.data[index + 3] = colour[3];
    }
  }
  return PNG.sync.write(png, {colorType: 6});
}
