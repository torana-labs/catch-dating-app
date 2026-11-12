// The phones marketing captures render on and the frame the exporter draws
// around each, in points. tool/marketing/frame_device_capture.dart draws the
// same frames (its test pins the framed sizes below), and
// test/ui_captures/support/capture_device.dart holds the same screens and
// safe areas for the Flutter render.
//
// generic-phone is the default (owner decision, 8 Nov 2026): the iPhone 17
// Pro screen with a generic bezel, nothing unique to Apple hardware, the same
// geometry as the website's CatchDeviceFrame kind "phone" (bezel 0.028 and
// outer radius 0.165 of the frame width). iphone-17-pro keeps its older frame
// with a drawn Dynamic Island for existing renders.
//
// generic-tablet and desktop-browser are unframed (frameInset and canvasMargin
// 0): the PNG is the screen alone, and the website draws the frame in CSS
// (CatchDeviceFrame kind "tablet", proposal L9, and kind "browser", W1).
// frame_device_capture.dart passes their native screens through unframed.

const devices = Object.freeze({
  "generic-phone": Object.freeze({
    logicalWidth: 402, logicalHeight: 874, outputScale: 2,
    safeArea: Object.freeze({top: 62, right: 0, bottom: 34, left: 0}),
    // Safari's status bar fills the top safe area.
    safariStatusBar: 62,
    canvasMargin: 32, frameInset: 12, outerRadius: 70, screenRadius: 58, dynamicIsland: null,
  }),
  "iphone-17-pro": Object.freeze({
    logicalWidth: 402, logicalHeight: 874, outputScale: 2,
    safeArea: Object.freeze({top: 59, right: 0, bottom: 34, left: 0}),
    safariStatusBar: 54,
    canvasMargin: 32, frameInset: 22, outerRadius: 68, screenRadius: 52,
    dynamicIsland: Object.freeze({width: 126, height: 37, top: 12}),
  }),
  "generic-tablet": Object.freeze({
    logicalWidth: 1194, logicalHeight: 834, outputScale: 2,
    safeArea: Object.freeze({top: 24, right: 0, bottom: 20, left: 0}),
    safariStatusBar: 24,
    canvasMargin: 0, frameInset: 0, outerRadius: 0, screenRadius: 0, dynamicIsland: null, framed: false,
  }),
  "desktop-browser": Object.freeze({
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

/** Whether the exporter draws a device frame around this device's captures. */
export function isFramedCaptureDevice(id) {
  return captureDevice(id).framed !== false;
}

/** The framed PNG's pixel size: native screen plus bezel and canvas margin on each side. */
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
