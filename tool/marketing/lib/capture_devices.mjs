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
