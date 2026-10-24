import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as image;

/// The website icons are projections of the Consumer launcher master written
/// by tool/branding/generate_native_brand_assets.dart; rerun it after the
/// master or the bg token changes.
void main() {
  final master = image.decodePng(
    File('assets/branding/catch_icon.png').readAsBytesSync(),
  )!;

  image.Image decode(String path) =>
      image.decodePng(File('website/public$path').readAsBytesSync())!;

  double meanDifference(image.Image a, image.Image b) {
    final left = image.copyResize(a, width: 64, height: 64);
    final right = image.copyResize(b, width: 64, height: 64);
    var total = 0.0;
    for (final pixel in left) {
      final other = right.getPixel(pixel.x, pixel.y);
      total +=
          (pixel.r - other.r).abs() +
          (pixel.g - other.g).abs() +
          (pixel.b - other.b).abs();
    }
    return total / (64 * 64 * 3);
  }

  test('home-screen and install icons are the full launcher icon', () {
    for (final path in [
      '/assets/icons/apple-touch-icon.png',
      '/assets/icons/icon-192.png',
      '/assets/icons/icon-512.png',
    ]) {
      expect(meanDifference(decode(path), master), lessThan(4), reason: path);
    }
    expect(decode('/assets/icons/apple-touch-icon.png').numChannels, 3);
  });

  test('tab-size icons crop to the wordmark so it stays readable', () {
    final icon = decode('/assets/icons/icon-32.png');
    final background = icon.getPixel(0, 0);
    var left = icon.width, right = -1;
    for (final pixel in icon) {
      final distance =
          (pixel.r - background.r).abs() +
          (pixel.g - background.g).abs() +
          (pixel.b - background.b).abs();
      if (distance <= 48) continue;
      if (pixel.x < left) left = pixel.x;
      if (pixel.x > right) right = pixel.x;
    }
    expect(right - left + 1, greaterThanOrEqualTo(26));
    expect(meanDifference(icon, master), greaterThan(4));
  });

  test('the manifest theme colour follows the light bg token', () {
    final tokens =
        jsonDecode(
              File(
                'design_context_pack/design_system/tokens.json',
              ).readAsStringSync(),
            )
            as Map<String, dynamic>;
    final bg =
        ((tokens['color'] as Map<String, dynamic>)['bg']
                as Map<String, dynamic>)['\$value']
            as Map<String, dynamic>;
    final manifest =
        jsonDecode(
              File('website/public/assets/site.webmanifest').readAsStringSync(),
            )
            as Map<String, dynamic>;
    expect(manifest['theme_color'], (bg['light'] as String).toUpperCase());
  });
}
