import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as image;
import 'package:xml/xml.dart';

void main() {
  test('Host native launch background matches Flutter in each appearance', () {
    const directory =
        'apps/host/ios/Runner/Assets.xcassets/LaunchBackground.imageset';
    final contents =
        jsonDecode(File('$directory/Contents.json').readAsStringSync())
            as Map<String, dynamic>;
    for (final item in contents['images'] as List<dynamic>) {
      final entry = item as Map<String, dynamic>;
      final dark =
          (entry['appearances'] as List<dynamic>?)?.any(
            (dynamic appearance) =>
                (appearance as Map<String, dynamic>)['value'] == 'dark',
          ) ??
          false;
      final color = (dark ? AppTheme.dark : AppTheme.light)
          .extension<CatchTokens>()!
          .bg;
      final bitmap = image.decodePng(
        File('$directory/${entry['filename']}').readAsBytesSync(),
      )!;
      final pixel = bitmap.getPixel(0, 0);
      expect(pixel.a, 255);
      expect(pixel.r, (color.toARGB32() >> 16) & 255);
      expect(pixel.g, (color.toARGB32() >> 8) & 255);
      expect(pixel.b, color.toARGB32() & 255);
    }
  });

  test('Host native launch matches the shared safe-area reading lane', () {
    final document = XmlDocument.parse(
      File(
        'apps/host/ios/Runner/Base.lproj/LaunchScreen.storyboard',
      ).readAsStringSync(),
    );
    final constraints = {
      for (final element in document.findAllElements('constraint'))
        element.getAttribute('id'): element,
    };
    expect(
      double.parse(constraints['7Hs-Wd']!.getAttribute('constant')!),
      CatchStartupTokens.hostStartupLogoExtent,
    );
    expect(
      double.parse(constraints['8Hs-Ht']!.getAttribute('constant')!),
      CatchStartupTokens.hostStartupLogoExtent,
    );
    expect(
      double.parse(constraints['6Hs-Tp']!.getAttribute('constant')!),
      CatchStartupTokens.hostStartupLogoTopInset,
    );
    expect(constraints['6Hs-Tp']!.getAttribute('secondItem'), '6Tk-OE-BBY');
    expect(
      double.parse(constraints['5Hs-Lmin']!.getAttribute('constant')!),
      CatchStartupTokens.hostStartupLogoLeadingInset,
    );
    expect(
      constraints['5Hs-Lmin']!.getAttribute('relation'),
      'greaterThanOrEqual',
    );
    expect(constraints['5Hs-Lmin']!.getAttribute('secondItem'), '6Tk-OE-BBY');
    expect(constraints['5Hs-Ledge']!.getAttribute('priority'), '749');
    expect(constraints['5Hs-Cx']!.getAttribute('priority'), '750');
    expect(constraints['5Hs-Cx']!.getAttribute('secondItem'), '6Tk-OE-BBY');
    expect(
      double.parse(constraints['5Hs-Cx']!.getAttribute('constant')!),
      CatchStartupTokens.hostStartupLogoLeadingInset +
          CatchStartupTokens.hostStartupLogoExtent / 2 -
          CatchLayout.maxContentWidth / 2,
    );
  });

  test(
    'Host wordmarks use the locked Archivo axes and singular product name',
    () {
      final generator = File(
        'tool/branding/generate_catch_icon.swift',
      ).readAsStringSync();

      expect(generator, contains('private let archivoWidth: CGFloat = 78'));
      expect(generator, contains('private let archivoWeight: CGFloat = 600'));
      expect(
        generator,
        contains(
          'private func hostFont(size: CGFloat) -> NSFont {\n'
          '  consumerWordmarkFont(size: size)\n'
          '}',
        ),
      );
      expect(generator, contains('string: "Host"'));
      expect(generator, isNot(contains('string: "Hosts"')));
      expect(generator, isNot(contains('NSFont.systemFont')));
    },
  );

  test('Host splash masters remain transparent and unclipped', () {
    for (final path in const [
      'assets/branding/catch_host_splash_mark_light.png',
      'assets/branding/catch_host_splash_mark_dark.png',
    ]) {
      final decoded = image.decodePng(File(path).readAsBytesSync());
      expect(decoded, isNotNull, reason: path);
      expect(decoded!.width, 1024, reason: path);
      expect(decoded.height, 1024, reason: path);

      final bounds = _alphaBounds(decoded);
      expect(bounds.minX, greaterThan(0), reason: path);
      expect(bounds.minY, greaterThan(0), reason: path);
      expect(bounds.maxX, lessThan(decoded.width - 1), reason: path);
      expect(bounds.maxY, lessThan(decoded.height - 1), reason: path);
    }
  });

  test(
    'Host installable target receives generated icons and splash assets',
    () {
      final manifest = File(
        'tool/branding/native_branding.generated.json',
      ).readAsStringSync();
      expect(
        manifest,
        contains('assets/branding/catch_host_splash_mark_light.png'),
      );
      expect(
        manifest,
        contains('assets/branding/catch_host_splash_mark_dark.png'),
      );
      expect(
        manifest,
        contains(
          'apps/host/ios/Runner/Assets.xcassets/'
          'AppIcon-host-prod.appiconset',
        ),
      );
      expect(
        manifest,
        contains('apps/host/android/app/src/main/res/**/splash.png'),
      );

      _expectPngSize(
        'apps/host/ios/Runner/Assets.xcassets/'
        'AppIcon-host-prod.appiconset/Icon-App-host-prod-1024x1024@1x.png',
        1024,
      );
      _expectPngSize(
        'apps/host/ios/Runner/Assets.xcassets/'
        'LaunchImage.imageset/LaunchImage@3x.png',
        768,
      );
      _expectPngSize(
        'apps/host/android/app/src/hostProd/res/'
        'mipmap-xxxhdpi/ic_launcher.png',
        192,
      );
      _expectPngSize(
        'apps/host/android/app/src/main/res/'
        'drawable-xxxhdpi/android12splash.png',
        1024,
      );
    },
  );
}

({int minX, int minY, int maxX, int maxY}) _alphaBounds(image.Image source) {
  var minX = source.width;
  var minY = source.height;
  var maxX = -1;
  var maxY = -1;

  for (final pixel in source) {
    if (pixel.a == 0) continue;
    if (pixel.x < minX) minX = pixel.x;
    if (pixel.y < minY) minY = pixel.y;
    if (pixel.x > maxX) maxX = pixel.x;
    if (pixel.y > maxY) maxY = pixel.y;
  }

  expect(maxX, greaterThanOrEqualTo(0));
  expect(maxY, greaterThanOrEqualTo(0));
  return (minX: minX, minY: minY, maxX: maxX, maxY: maxY);
}

void _expectPngSize(String path, int expected) {
  final bytes = Uint8List.fromList(File(path).readAsBytesSync());
  final decoded = image.decodePng(bytes);
  expect(decoded, isNotNull, reason: path);
  expect(decoded!.width, expected, reason: path);
  expect(decoded.height, expected, reason: path);
}
