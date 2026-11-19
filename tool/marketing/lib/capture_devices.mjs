// The devices marketing captures render on and the frame the exporter draws
// around each, in points. tool/marketing/frame_device_capture.dart draws the
// same frames (its test pins the framed sizes below), and
// test/ui_captures/support/capture_device.dart holds the same screens and
// safe areas for the Flutter render.
//
// generic-phone is the default (owner decision, 8 Nov 2026): the iPhone 17
// Pro screen, nothing unique to Apple hardware. Like generic-tablet and
// desktop-browser it is unframed (frameInset and canvasMargin 0): the PNG is
// the screen alone and the website draws the only frame in CSS
// (CatchDeviceFrame kind "phone", "tablet" or "browser"), so a page never
// shows a frame inside a frame. iphone-17-pro keeps its older drawn frame
// with a Dynamic Island for existing renders.

const devices = Object.freeze({
  "generic-phone": Object.freeze({
    kind: "phone",
    logicalWidth: 402, logicalHeight: 874, outputScale: 2,
    safeArea: Object.freeze({top: 62, right: 0, bottom: 34, left: 0}),
    // Safari's status bar fills the top safe area.
    safariStatusBar: 62,
    canvasMargin: 0, frameInset: 0, outerRadius: 0, screenRadius: 0, dynamicIsland: null, framed: false,
  }),
  "iphone-17-pro": Object.freeze({
    kind: "phone",
    logicalWidth: 402, logicalHeight: 874, outputScale: 2,
    safeArea: Object.freeze({top: 59, right: 0, bottom: 34, left: 0}),
    safariStatusBar: 54,
    canvasMargin: 32, frameInset: 22, outerRadius: 68, screenRadius: 52,
    dynamicIsland: Object.freeze({width: 126, height: 37, top: 12}),
  }),
  "generic-tablet": Object.freeze({
    kind: "tablet",
    logicalWidth: 1194, logicalHeight: 834, outputScale: 2,
    safeArea: Object.freeze({top: 24, right: 0, bottom: 20, left: 0}),
    safariStatusBar: 24,
    canvasMargin: 0, frameInset: 0, outerRadius: 0, screenRadius: 0, dynamicIsland: null, framed: false,
  }),
  "desktop-browser": Object.freeze({
    kind: "desktop",
    logicalWidth: 1440, logicalHeight: 900, outputScale: 2,
    safeArea: Object.freeze({top: 0, right: 0, bottom: 0, left: 0}),
    safariStatusBar: 0,
    canvasMargin: 0, frameInset: 0, outerRadius: 0, screenRadius: 0, dynamicIsland: null, framed: false,
  }),
});

export const captureDeviceIds = Object.freeze(Object.keys(devices));

export function isCaptureDevice(id) {
  return Object.hasOwn(devices, id);
}

export function captureDevice(id) {
  if (!isCaptureDevice(id)) {
    throw new Error(`Unsupported marketing capture device ${id}; supported: ${captureDeviceIds.join(", ")}.`);
  }
  return devices[id];
}

/** Whether this device is a phone (a web capture then draws Safari's status and address bars). */
export function isPhoneCaptureDevice(id) {
  return captureDevice(id).kind === "phone";
}

/** Whether the exporter draws a device frame around this device's captures. */
export function isFramedCaptureDevice(id) {
  return captureDevice(id).framed !== false;
}

/** The PNG's pixel size: the native screen, plus bezel and canvas margin on each side for a framed device. */
export function framedSize(id) {
  const {logicalWidth, logicalHeight, outputScale, canvasMargin, frameInset} = captureDevice(id);
  const edge = (canvasMargin + frameInset) * outputScale * 2;
  return {width: logicalWidth * outputScale + edge, height: logicalHeight * outputScale + edge};
}

/** The device block recorded in tool/marketing/app_screenshots_design_context.json, in pixels. */
export function deviceFrameSpec(id) {
  const device = captureDevice(id);
  const scale = device.outputScale;
  return {
    id,
    logicalSize: {width: device.logicalWidth, height: device.logicalHeight},
    outputScale: scale,
    safeArea: {...device.safeArea},
    frame: {
      framedSize: framedSize(id),
      canvasMargin: device.canvasMargin * scale,
      frameInset: device.frameInset * scale,
      outerRadius: device.outerRadius * scale,
      screenRadius: device.screenRadius * scale,
      dynamicIsland: device.dynamicIsland
        ? {width: device.dynamicIsland.width * scale, height: device.dynamicIsland.height * scale,
          top: device.dynamicIsland.top * scale}
        : null,
    },
  };
}
