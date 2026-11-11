import 'dart:io';
import 'dart:math' as math;

import 'package:image/image.dart' as img;

void main(List<String> args) {
  final inputPath = _valueAfter(args, '--input');
  final outputPath = _valueAfter(args, '--output');
  final deviceId = _valueAfter(args, '--device') ?? 'generic-phone';

  if (args.contains('--help') || args.contains('-h')) {
    _printHelp();
    return;
  }

  if (inputPath == null || outputPath == null) {
    stderr.writeln('--input and --output are required.');
    _printHelp();
    exitCode = 64;
    return;
  }

  final spec = _DeviceFrameSpec.forId(deviceId);
  final inputFile = File(inputPath);
  if (!inputFile.existsSync()) {
    stderr.writeln('Input screenshot does not exist: $inputPath');
    exitCode = 66;
    return;
  }

  final screenshot = img.decodePng(inputFile.readAsBytesSync());
  if (screenshot == null) {
    stderr.writeln('Input screenshot is not a readable PNG: $inputPath');
    exitCode = 65;
    return;
  }
  if (screenshot.width != spec.logicalWidth * spec.outputScale ||
      screenshot.height != spec.logicalHeight * spec.outputScale) {
    stderr.writeln(
      'Expected ${spec.id} screenshot to be '
      '${spec.logicalWidth * spec.outputScale}x'
      '${spec.logicalHeight * spec.outputScale} (native ${spec.outputScale}x), got '
      '${screenshot.width}x${screenshot.height}.',
    );
    exitCode = 65;
    return;
  }

  final framed = _renderDeviceFrame(screenshot, spec);
  final outputFile = File(outputPath)..parent.createSync(recursive: true);
  outputFile.writeAsBytesSync(img.encodePng(framed), flush: true);
  stdout.writeln('Wrote ${outputFile.path}');
}

img.Image _renderDeviceFrame(img.Image screenshot, _DeviceFrameSpec spec) {
  final scale = spec.outputScale;
  final screenW = spec.logicalWidth * scale;
  final screenH = spec.logicalHeight * scale;
  final frameInset = spec.frameInset * scale;
  final canvasMargin = spec.canvasMargin * scale;
  final deviceW = screenW + frameInset * 2;
  final deviceH = screenH + frameInset * 2;
  final deviceX = canvasMargin;
  final deviceY = canvasMargin;
  final screenX = deviceX + frameInset;
  final screenY = deviceY + frameInset;
  final canvas = img.Image(
    width: deviceW + canvasMargin * 2,
    height: deviceH + canvasMargin * 2,
    numChannels: 4,
  );

  for (var index = 5; index >= 0; index -= 1) {
    final grow = index * scale * 2;
    final offsetY = (10 + index * 3) * scale;
    img.fillRect(
      canvas,
      x1: deviceX - grow,
      y1: deviceY + offsetY - grow,
      x2: deviceX + deviceW + grow - 1,
      y2: deviceY + deviceH + offsetY + grow - 1,
      radius: spec.outerRadius * scale + grow,
      color: _rgba(0, 0, 0, 18),
    );
  }

  final island = spec.dynamicIsland;
  if (island == null) {
    // Generic body: a dark outer edge, a faint light rim just inside it, then
    // the near-black body, the website's CatchDeviceFrame in pixels.
    for (final (inset, color) in [
      (0, _rgba(0, 0, 0, 140)),
      (1, _rgba(42, 40, 43)),
      (2, _rgba(18, 16, 19)),
    ]) {
      img.fillRect(
        canvas,
        x1: deviceX + inset * scale,
        y1: deviceY + inset * scale,
        x2: deviceX + deviceW - inset * scale - 1,
        y2: deviceY + deviceH - inset * scale - 1,
        radius: (spec.outerRadius - inset) * scale,
        color: color,
      );
    }
    _copyRounded(
      canvas,
      screenshot,
      dstX: screenX,
      dstY: screenY,
      radius: spec.screenRadius * scale,
    );
    return canvas;
  }

  img.fillRect(
    canvas,
    x1: deviceX,
    y1: deviceY,
    x2: deviceX + deviceW - 1,
    y2: deviceY + deviceH - 1,
    radius: spec.outerRadius * scale,
    color: _rgba(58, 58, 62),
  );
  img.fillRect(
    canvas,
    x1: deviceX + 4 * scale,
    y1: deviceY + 4 * scale,
    x2: deviceX + deviceW - 4 * scale - 1,
    y2: deviceY + deviceH - 4 * scale - 1,
    radius: (spec.outerRadius - 4) * scale,
    color: _rgba(13, 13, 15),
  );
  img.fillRect(
    canvas,
    x1: screenX - 2 * scale,
    y1: screenY - 2 * scale,
    x2: screenX + screenW + 2 * scale - 1,
    y2: screenY + screenH + 2 * scale - 1,
    radius: (spec.screenRadius + 2) * scale,
    color: _rgba(4, 4, 5),
  );

  _copyRounded(
    canvas,
    screenshot,
    dstX: screenX,
    dstY: screenY,
    radius: spec.screenRadius * scale,
  );

  _drawDynamicIsland(canvas, spec, island, screenX: screenX, screenY: screenY);
  return canvas;
}

void _drawDynamicIsland(
  img.Image canvas,
  _DeviceFrameSpec spec,
  _DynamicIsland island, {
  required int screenX,
  required int screenY,
}) {
  final scale = spec.outputScale;
  final islandW = island.width * scale;
  final islandH = island.height * scale;
  final islandX = screenX + (spec.logicalWidth * scale - islandW) ~/ 2;
  final islandY = screenY + island.top * scale;
  final radius = islandH ~/ 2;

  img.fillRect(
    canvas,
    x1: islandX - scale,
    y1: islandY + scale,
    x2: islandX + islandW + scale - 1,
    y2: islandY + islandH + scale - 1,
    radius: radius + scale,
    color: _rgba(0, 0, 0, 58),
  );
  img.fillRect(
    canvas,
    x1: islandX,
    y1: islandY,
    x2: islandX + islandW - 1,
    y2: islandY + islandH - 1,
    radius: radius,
    color: _rgba(5, 5, 6),
  );
  img.fillCircle(
    canvas,
    x: islandX + islandW - 18 * scale,
    y: islandY + islandH ~/ 2,
    radius: 4 * scale,
    color: _rgba(28, 33, 42, 180),
    antialias: true,
  );
}

void _copyRounded(
  img.Image dst,
  img.Image src, {
  required int dstX,
  required int dstY,
  required int radius,
}) {
  for (var y = 0; y < src.height; y += 1) {
    for (var x = 0; x < src.width; x += 1) {
      if (!_insideRoundedRect(
        x: x,
        y: y,
        width: src.width,
        height: src.height,
        radius: radius,
      )) {
        continue;
      }
      final pixel = src.getPixel(x, y);
      dst.setPixelRgba(dstX + x, dstY + y, pixel.r, pixel.g, pixel.b, pixel.a);
    }
  }
}

bool _insideRoundedRect({
  required int x,
  required int y,
  required int width,
  required int height,
  required int radius,
}) {
  final left = radius;
  final right = width - radius - 1;
  final top = radius;
  final bottom = height - radius - 1;
  if ((x >= left && x <= right) || (y >= top && y <= bottom)) {
    return true;
  }

  final cornerX = x < left ? left : right;
  final cornerY = y < top ? top : bottom;
  final dx = x - cornerX;
  final dy = y - cornerY;
  return math.sqrt(dx * dx + dy * dy) <= radius;
}

img.ColorRgba8 _rgba(int r, int g, int b, [int a = 255]) =>
    img.ColorRgba8(r, g, b, a);

String? _valueAfter(List<String> args, String flag) {
  final index = args.indexOf(flag);
  if (index == -1) return null;
  if (index + 1 >= args.length) {
    throw ArgumentError('$flag requires a value.');
  }
  final value = args[index + 1];
  if (value.startsWith('--')) {
    throw ArgumentError('$flag requires a value.');
  }
  return value;
}

void _printHelp() {
  stdout.writeln('''
Usage: dart run tool/marketing/frame_device_capture.dart --input <png> --output <png> [--device generic-phone|iphone-17-pro]

Wraps a native 2x capture (804x1748 for both phones) without resizing.
generic-phone (the default) draws a generic bezel with nothing unique to
Apple hardware; iphone-17-pro keeps the older frame with a Dynamic Island.
''');
}

class _DeviceFrameSpec {
  const _DeviceFrameSpec({
    required this.id,
    required this.logicalWidth,
    required this.logicalHeight,
    required this.outputScale,
    required this.canvasMargin,
    required this.frameInset,
    required this.outerRadius,
    required this.screenRadius,
    this.dynamicIsland,
  });

  /// Sizes in points; tool/marketing/lib/capture_devices.mjs holds the same.
  factory _DeviceFrameSpec.forId(String id) {
    return switch (id) {
      // Bezel 12/426 = 0.028 and outer radius 70/426 = 0.165 of the frame
      // width, the website's CatchDeviceFrame kind "phone".
      'generic-phone' => const _DeviceFrameSpec(
        id: 'generic-phone',
        logicalWidth: 402,
        logicalHeight: 874,
        outputScale: 2,
        canvasMargin: 32,
        frameInset: 12,
        outerRadius: 70,
        screenRadius: 58,
      ),
      'iphone-17-pro' => const _DeviceFrameSpec(
        id: 'iphone-17-pro',
        logicalWidth: 402,
        logicalHeight: 874,
        outputScale: 2,
        canvasMargin: 32,
        frameInset: 22,
        outerRadius: 68,
        screenRadius: 52,
        dynamicIsland: _DynamicIsland(width: 126, height: 37, top: 12),
      ),
      _ => throw ArgumentError.value(id, 'id', 'Unsupported device frame.'),
    };
  }

  final String id;
  final int logicalWidth;
  final int logicalHeight;
  final int outputScale;
  final int canvasMargin;
  final int frameInset;
  final int outerRadius;
  final int screenRadius;

  /// Null for a generic device.
  final _DynamicIsland? dynamicIsland;
}

class _DynamicIsland {
  const _DynamicIsland({
    required this.width,
    required this.height,
    required this.top,
  });

  final int width;
  final int height;
  final int top;
}
