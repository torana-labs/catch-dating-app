import 'dart:io';

import 'package:image/image.dart' as img;

import 'frame_device_capture.dart' as frame;

/// Framed sizes and the canvas-to-screen offset (2x margin + inset) per
/// device; tool/marketing/lib/capture_devices.mjs must agree.
const _devices = <String, ({int width, int height, int offset})>{
  'generic-phone': (width: 980, height: 1924, offset: 88),
  'iphone-17-pro': (width: 1020, height: 1964, offset: 108),
};

void main() {
  final directory = Directory.systemTemp.createTempSync('catch-device-frame-');
  try {
    final input = File('${directory.path}/native.png');
    final output = File('${directory.path}/framed.png');
    final screenshot = img.Image(width: 804, height: 1748, numChannels: 4);
    // Adjacent pixels distinguish native copy from resampling or interpolation.
    screenshot.setPixelRgba(200, 300, 255, 0, 0, 255);
    screenshot.setPixelRgba(201, 300, 0, 0, 255, 255);
    // A white top edge shows whether anything is drawn over the screen.
    for (var x = 0; x < 804; x += 1) {
      for (var y = 0; y < 120; y += 1) {
        screenshot.setPixelRgba(x, y, 255, 255, 255, 255);
      }
    }
    input.writeAsBytesSync(img.encodePng(screenshot));

    for (final MapEntry(key: device, value: expected) in _devices.entries) {
      frame.main([
        '--input',
        input.path,
        '--output',
        output.path,
        '--device',
        device,
      ]);
      if (exitCode != 0 || !output.existsSync()) {
        throw StateError('$device: native 2x screenshot must frame.');
      }
      final framed = img.decodePng(output.readAsBytesSync())!;
      if (framed.width != expected.width || framed.height != expected.height) {
        throw StateError('$device: framed product image dimensions changed.');
      }
      final red = framed.getPixel(expected.offset + 200, expected.offset + 300);
      final blue = framed.getPixel(
        expected.offset + 201,
        expected.offset + 300,
      );
      if (red.r != 255 || red.b != 0 || blue.r != 0 || blue.b != 255) {
        throw StateError('$device: native source pixels were resampled.');
      }
      // The centre of the screen's top edge: the island covers it on the
      // iPhone frame; the generic frame draws nothing over the screen.
      final topCentre = framed.getPixel(
        framed.width ~/ 2,
        expected.offset + 24 * 2 + 12,
      );
      final covered = topCentre.r < 64;
      if (covered != (device == 'iphone-17-pro')) {
        throw StateError('$device: unexpected camera cut-out over the screen.');
      }
      output.deleteSync();
    }

    frame.main(['--input', input.path, '--output', output.path]);
    final defaultFramed = img.decodePng(output.readAsBytesSync())!;
    if (defaultFramed.width != _devices['generic-phone']!.width) {
      throw StateError('The default frame must be the generic phone.');
    }
    output.deleteSync();

    input.writeAsBytesSync(img.encodePng(img.Image(width: 402, height: 874)));
    frame.main(['--input', input.path, '--output', output.path]);
    if (exitCode != 65 || output.existsSync()) {
      throw StateError('Undersampled inputs must fail before writing output.');
    }
    exitCode = 0;
    stdout.writeln(
      'Native framing dimensions, pixel preservation, generic bezel and '
      'rejection passed.',
    );
  } finally {
    directory.deleteSync(recursive: true);
  }
}
