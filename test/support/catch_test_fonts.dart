import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';

/// Loads the app text fonts plus icon fonts for visual tests.
///
/// Flutter widget tests do not automatically register bundled icon fonts, so
/// [Icon] falls back to missing-glyph boxes unless we load Material Icons and
/// package icon fonts explicitly.
Future<void> loadCatchTestFonts({String? nativeIosFontPath}) async {
  final platformFunctionFonts = _platformFunctionFontFiles();
  final loaders = <FontLoader>[
    FontLoader('packages/catch_ui/Archivo')
      ..addFont(_bytes('assets/fonts/Archivo-Roman-VF.ttf')),
    FontLoader('packages/catch_ui/Lucide')
      ..addFont(_bytes('assets/fonts/lucide/lucide.ttf')),
    FontLoader('packages/catch_ui/IBM Plex Mono')
      ..addFont(_bytes('assets/fonts/IBMPlexMono-Regular.ttf'))
      ..addFont(_bytes('assets/fonts/IBMPlexMono-Medium.ttf'))
      ..addFont(_bytes('assets/fonts/IBMPlexMono-SemiBold.ttf'))
      ..addFont(_bytes('assets/fonts/IBMPlexMono-Bold.ttf')),
    for (final family in _platformFunctionFamilies)
      if (nativeIosFontPath != null &&
          (family.startsWith('CupertinoSystem') ||
              family == '.AppleSystemUIFont'))
        FontLoader(family)..addFont(_fileBytes(File(nativeIosFontPath)))
      else
        FontLoader(family)
          ..addFont(_fileBytes(platformFunctionFonts.regular))
          ..addFont(_fileBytes(platformFunctionFonts.medium))
          ..addFont(_fileBytes(platformFunctionFonts.bold)),
    FontLoader('MaterialIcons')..addFont(_fileBytes(_materialIconsFont())),
  ];

  await Future.wait([for (final loader in loaders) loader.load()]);
}

Future<ByteData> _bytes(String path) => File(
  '${_packageRoot('catch_ui').path}/$path',
).readAsBytes().then(ByteData.sublistView);

Future<ByteData> _fileBytes(File file) =>
    file.readAsBytes().then(ByteData.sublistView);

File _materialIconsFont() {
  for (final candidate in _materialIconFontCandidates()) {
    if (candidate.existsSync()) return candidate;
  }
  throw StateError(
    'Unable to locate MaterialIcons-Regular.otf. Set FLUTTER_ROOT or run with '
    'a Flutter SDK that has material font artifacts.',
  );
}

_PlatformFunctionFontFiles _platformFunctionFontFiles() {
  final root = _flutterRootDirectory();
  final fontDir = Directory('${root.path}/bin/cache/artifacts/material_fonts');
  final regular = File('${fontDir.path}/Roboto-Regular.ttf');
  final medium = File('${fontDir.path}/Roboto-Medium.ttf');
  final bold = File('${fontDir.path}/Roboto-Bold.ttf');
  final missing = [regular, medium, bold]
      .where((file) => !file.existsSync())
      .map((file) => file.path)
      .toList(growable: false);

  if (missing.isNotEmpty) {
    throw StateError(
      'Missing platform-function golden test font(s): ${missing.join(', ')}',
    );
  }

  return _PlatformFunctionFontFiles(
    regular: regular,
    medium: medium,
    bold: bold,
  );
}

Directory _flutterRootDirectory() {
  final flutterRoot = Platform.environment['FLUTTER_ROOT'];
  if (flutterRoot != null && flutterRoot.isNotEmpty) {
    return Directory(flutterRoot);
  }

  var dir = File(Platform.resolvedExecutable).parent;
  for (var i = 0; i < 8; i += 1) {
    final candidate = Directory('${dir.path}/bin/cache/artifacts');
    if (candidate.existsSync()) return dir;
    final parent = dir.parent;
    if (parent.path == dir.path) break;
    dir = parent;
  }

  throw StateError(
    'Unable to locate Flutter root. Set FLUTTER_ROOT before running goldens.',
  );
}

Iterable<File> _materialIconFontCandidates() sync* {
  final flutterRoot = Platform.environment['FLUTTER_ROOT'];
  if (flutterRoot != null && flutterRoot.isNotEmpty) {
    yield File(
      '$flutterRoot/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf',
    );
  }

  var dir = File(Platform.resolvedExecutable).parent;
  for (var i = 0; i < 8; i += 1) {
    yield File(
      '${dir.path}/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf',
    );
    final parent = dir.parent;
    if (parent.path == dir.path) break;
    dir = parent;
  }

  yield File('build/unit_test_assets/fonts/MaterialIcons-Regular.otf');
  yield File('build/flutter_assets/fonts/MaterialIcons-Regular.otf');
}

Directory _packageRoot(String packageName) {
  final configFile = File('.dart_tool/package_config.json');
  if (!configFile.existsSync()) {
    throw StateError('Missing .dart_tool/package_config.json.');
  }

  final config =
      jsonDecode(configFile.readAsStringSync()) as Map<String, Object?>;
  final packages = (config['packages'] as List<Object?>)
      .cast<Map<String, Object?>>();
  final package = packages.where((entry) => entry['name'] == packageName).first;
  final rootUri = Uri.parse(package['rootUri']! as String);
  final resolved = rootUri.hasScheme
      ? rootUri
      : configFile.parent.uri.resolveUri(rootUri);
  return Directory.fromUri(resolved);
}

class _PlatformFunctionFontFiles {
  const _PlatformFunctionFontFiles({
    required this.regular,
    required this.medium,
    required this.bold,
  });

  final File regular;
  final File medium;
  final File bold;
}

const _platformFunctionFamilies = <String>{
  'Roboto',
  'CupertinoSystemText',
  'CupertinoSystemDisplay',
  '.AppleSystemUIFont',
  'Segoe UI',
};
