import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test/ui_captures/catalog/screen_capture_catalog.dart';

const _outputDirArg = String.fromEnvironment(
  'DESIGN_CONTEXT_PACK_OUTPUT_DIR',
  defaultValue: 'design_context_pack',
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('page spacing resolves generated semantic layout aliases', () {
    final pack = _ContextPackBuilder(Directory.systemTemp)._tokensJson();
    final spacing = pack['space']! as Map<String, Object?>;
    expect((spacing['screenPx']! as Map)[r'$value'], '20px');
    expect((spacing['screenPt']! as Map)[r'$value'], '16px');
  });

  testWidgets('writes the design context pack', (tester) async {
    final builder = _ContextPackBuilder(Directory(_outputDirArg));
    await builder.write(tester);
  });
}

class _ContextPackBuilder {
  _ContextPackBuilder(this.outputDirectory);

  final Directory outputDirectory;
  final _json = const JsonEncoder.withIndent('  ');

  Future<void> write(WidgetTester tester) async {
    outputDirectory.createSync(recursive: true);
    final tokens = _tokensJson();
    final activityPalette = _activityPaletteJson();
    final typography = await _typographyJson(tester);
    final componentContracts = _componentContractsJson();
    final galleryManifest = _galleryManifestJson();

    _writeText('README.txt', _readmeText());
    _writeText(
      'design_system/design_language.txt',
      File('docs/design_language.md').readAsStringSync(),
    );
    _writeJson('design_system/tokens.json', tokens);
    _writeJson('design_system/activity_palette.json', activityPalette);
    _writeJson('design_system/typography.json', typography);
    _writeJson('design_system/components.json', componentContracts);
    _writeText(
      'design_system/specimens/catch_design_system.html',
      _specimenHtml(
        tokens: tokens,
        activityPalette: activityPalette,
        typography: typography,
      ),
    );
    _writeJson('gallery/manifest.json', galleryManifest);
  }

  void _writeJson(String relativePath, Object? value) {
    _writeText(relativePath, '${_json.convert(value)}\n');
  }

  void _writeText(String relativePath, String contents) {
    final file = File('${outputDirectory.path}/$relativePath');
    file.parent.createSync(recursive: true);
    file.writeAsStringSync(contents, flush: true);
  }

  String _readmeText() {
    return '''
Catch design context pack

Upload surface for Claude Design and other AI design tools. This pack is generated
from the live Flutter design system; do not edit generated files by hand.

Use the design_system files to establish or refresh the organization-level design
system. Use design_system/components.json as the allowed Catch primitive
contract list for handoffs. For the live Badge + Field synchronization spike,
use design_system/claude_design_handoff_request.json and return exactly its
machine-checkable receipt contract. Use gallery shots as per-screen taste
anchors during a redesign chat.

Generated sources:
- docs/design_language.md
- design/components/catch.components.json
- packages/catch_tokens/lib/catch_tokens.dart
- lib/core/theme/activity_palette.dart
- packages/catch_ui/lib/src/foundations/catch_text_styles.dart
- packages/catch_ui/lib/src/foundations/catch_fonts.dart
- test/ui_captures/catalog/screen_capture_catalog.dart

Regenerate:
node tool/design/build_context_pack.mjs

Check drift:
node tool/design/build_context_pack.mjs --check

Render high-DPR gallery PNGs when needed:
node tool/ui_capture/run_captures.mjs --profile design-gallery
''';
  }

  Map<String, Object?> _tokensJson() {
    final light = _themeExtension<CatchTokens>(AppTheme.light);
    final dark = _themeExtension<CatchTokens>(AppTheme.dark);
    final generatedSpacing = _doubleConstants(
      'GeneratedCatchSpacingTokens',
      sourcePath:
          'packages/catch_tokens/lib/generated/catch_design_tokens.g.dart',
    );
    final generatedRadius = _doubleConstants(
      'GeneratedCatchRadiusTokens',
      sourcePath:
          'packages/catch_tokens/lib/generated/catch_design_tokens.g.dart',
    );
    final generatedLayout = _doubleConstants(
      'GeneratedCatchLayoutTokens',
      sourcePath:
          'packages/catch_tokens/lib/generated/catch_design_tokens.g.dart',
    );
    final spacing = _doubleConstants(
      'CatchSpacing',
      sourcePath: 'packages/catch_tokens/lib/src/primitives/catch_spacing.dart',
      refs: {
        'GeneratedCatchSpacingTokens': generatedSpacing,
        'GeneratedCatchLayoutTokens': generatedLayout,
      },
    );
    final radius = _doubleConstants(
      'CatchRadius',
      sourcePath: 'packages/catch_tokens/lib/src/primitives/catch_radius.dart',
      refs: {
        'CatchSpacing': spacing,
        'GeneratedCatchRadiusTokens': generatedRadius,
      },
    );
    final generatedOpacity = _doubleConstants(
      'GeneratedCatchOpacityTokens',
      sourcePath:
          'packages/catch_tokens/lib/generated/catch_design_tokens.g.dart',
    );
    final opacity = _doubleConstants(
      'CatchOpacity',
      sourcePath: 'packages/catch_tokens/lib/src/semantic/catch_opacity.dart',
      refs: {'GeneratedCatchOpacityTokens': generatedOpacity},
    );
    final generatedStroke = _doubleConstants(
      'GeneratedCatchStrokeTokens',
      sourcePath:
          'packages/catch_tokens/lib/generated/catch_design_tokens.g.dart',
    );
    final stroke = _doubleConstants(
      'CatchStroke',
      sourcePath: 'packages/catch_tokens/lib/src/primitives/catch_stroke.dart',
      refs: {'GeneratedCatchStrokeTokens': generatedStroke},
    );

    return {
      'version': 1,
      'source': 'packages/catch_tokens/lib/catch_tokens.dart',
      'color': {
        for (final role in _tokenColorRoles(light, dark).entries)
          role.key: {
            r'$type': 'color',
            r'$value': {
              'light': _colorValue(role.value.light),
              'dark': _colorValue(role.value.dark),
            },
          },
      },
      'gradient': {
        'heroGrad': {
          r'$type': 'gradient',
          r'$value': {
            'light': _gradientValue(light.heroGrad),
            'dark': _gradientValue(dark.heroGrad),
          },
          'deprecated': true,
          'note':
              'Hero/wow gradients should derive from ActivityPalette or ink.',
        },
      },
      'space': _dimensionTokens(spacing),
      'radius': _dimensionTokens(radius),
      'stroke': _dimensionTokens(stroke),
      'opacity': _numberTokens(opacity),
      'elevation': _elevationTokens(),
    };
  }

  Map<String, _ModeColor> _tokenColorRoles(
    CatchTokens light,
    CatchTokens dark,
  ) {
    return {
      'bg': _ModeColor(light.bg, dark.bg),
      'surface': _ModeColor(light.surface, dark.surface),
      'raised': _ModeColor(light.raised, dark.raised),
      'overlay': _ModeColor(light.overlay, dark.overlay),
      'ink': _ModeColor(light.ink, dark.ink),
      'ink2': _ModeColor(light.ink2, dark.ink2),
      'ink3': _ModeColor(light.ink3, dark.ink3),
      'line': _ModeColor(light.line, dark.line),
      'line2': _ModeColor(light.line2, dark.line2),
      'primary': _ModeColor(light.primary, dark.primary),
      'primaryInk': _ModeColor(light.primaryInk, dark.primaryInk),
      'primarySoft': _ModeColor(light.primarySoft, dark.primarySoft),
      'accent': _ModeColor(light.accent, dark.accent),
      'accentInk': _ModeColor(light.accentInk, dark.accentInk),
      'success': _ModeColor(light.success, dark.success),
      'warning': _ModeColor(light.warning, dark.warning),
      'danger': _ModeColor(light.danger, dark.danger),
      'like': _ModeColor(light.like, dark.like),
      'pass': _ModeColor(light.pass, dark.pass),
      'gold': _ModeColor(light.gold, dark.gold),
    };
  }

  Map<String, Object?> _dimensionTokens(Map<String, double> values) {
    return {
      for (final entry in values.entries)
        entry.key: {
          r'$type': 'dimension',
          r'$value': '${_trim(entry.value)}px',
        },
    };
  }

  Map<String, Object?> _numberTokens(Map<String, double> values) {
    return {
      for (final entry in values.entries)
        entry.key: {r'$type': 'number', r'$value': entry.value},
    };
  }

  Map<String, Object?> _elevationTokens() {
    return {
      'none': {r'$type': 'shadow', r'$value': <Object?>[]},
      'physicalTicket': {
        r'$type': 'number',
        r'$value': CatchElevation.physicalTicket,
      },
      'physicalControl': {
        r'$type': 'number',
        r'$value': CatchElevation.physicalControl,
      },
      'physicalPassControl': {
        r'$type': 'number',
        r'$value': CatchElevation.physicalPassControl,
      },
      'menu': {r'$type': 'number', r'$value': CatchElevation.menu},
      'card': {r'$type': 'shadow', r'$value': _shadows(CatchElevation.card)},
      'raised': {
        r'$type': 'shadow',
        r'$value': _shadows(CatchElevation.raised),
      },
      'overlay': {
        r'$type': 'shadow',
        r'$value': _shadows(CatchElevation.overlay),
      },
    };
  }

  List<Object?> _shadows(List<BoxShadow> shadows) {
    return [
      for (final shadow in shadows)
        {
          'color': _colorValue(shadow.color),
          'blurRadius': shadow.blurRadius,
          'spreadRadius': shadow.spreadRadius,
          'offset': {'x': shadow.offset.dx, 'y': shadow.offset.dy},
        },
    ];
  }

  Map<String, Object?> _activityPaletteJson() {
    final light = _themeExtension<ActivityPalette>(AppTheme.light);
    final dark = _themeExtension<ActivityPalette>(AppTheme.dark);
    return {
      'version': 1,
      'source': 'lib/core/theme/activity_palette.dart',
      'activities': {
        for (final kind in ActivityKind.values)
          kind.name: {
            'label': kind.label,
            'light': _activitySwatch(light.forKind(kind)),
            'dark': _activitySwatch(dark.forKind(kind)),
          },
      },
    };
  }

  Map<String, Object?> _activitySwatch(ActivitySwatch swatch) {
    return {
      'accent': _colorValue(swatch.accent),
      'deep': _colorValue(swatch.deep),
      'soft': _colorValue(swatch.soft),
    };
  }

  Map<String, Object?> _componentContractsJson() {
    return jsonDecode(
          File('design/components/catch.components.json').readAsStringSync(),
        )
        as Map<String, Object?>;
  }

  Future<Map<String, Object?>> _typographyJson(WidgetTester tester) async {
    final light = _snapshotStyles(await _pumpTheme(tester, AppTheme.light));
    final dark = _snapshotStyles(await _pumpTheme(tester, AppTheme.dark));
    final source = File(
      'packages/catch_ui/lib/src/foundations/catch_text_styles.dart',
    ).readAsStringSync();
    final publicMethodNames = _publicTextStyleMethodNames(source);
    final accountedNames = <String>{
      for (final entry in _styleRegistry) entry.name,
      for (final entry in _excludedStyleRegistry) entry.name,
    };
    final missing = publicMethodNames.difference(accountedNames);
    final extra = accountedNames.difference(publicMethodNames);
    if (missing.isNotEmpty || extra.isNotEmpty) {
      throw StateError(
        'CatchTextStyles registry drift. Missing: ${missing.join(', ')}. '
        'Extra: ${extra.join(', ')}.',
      );
    }

    return {
      'version': 1,
      'source': 'packages/catch_ui/lib/src/foundations/catch_text_styles.dart',
      'families': {
        'voice': CatchFonts.voiceFamily,
        'function': CatchFonts.functionFamily,
        'data': CatchFonts.monoFamily,
      },
      'variableAxes': {
        'voice': {
          'wght': {'min': 100, 'max': 900},
          'wdth': {
            'min': 62,
            'max': 125,
            'lockedValue': CatchFonts.archivoWidth,
          },
        },
      },
      'rules': {
        'familyRoles':
            'Archivo is display/brand voice; platform system is prose, user content, and UI; IBM Plex Mono is data.',
        'tracking':
            'Zero by default. Caps-only mono roles own 0.08-0.18em; welcomeReelHeadline owns the -0.5px display exception.',
        'uppercase':
            'Use uppercase-enforcing owners with kicker, monoCapsLabel, and badgeCaps.',
        'displayVoice':
            'Archivo is roman-only at the locked 78% width and is centralized through CatchFonts.',
        'color':
            'Base UI is paper and ink; chroma is reserved for activity meaning.',
      },
      'registry': {
        'publicStaticTextStyleMethods': publicMethodNames.length,
        'covered': _styleRegistry.length,
        'excluded': _excludedStyleRegistry.length,
      },
      'excluded': {
        for (final entry in _excludedStyleRegistry) entry.name: entry.reason,
      },
      'styles': {
        for (final entry in _styleRegistry)
          entry.name: _mergeStyleEntry(
            entry,
            light[entry.name]!,
            dark[entry.name]!,
          ),
      },
    };
  }

  Future<BuildContext> _pumpTheme(WidgetTester tester, ThemeData theme) async {
    late BuildContext themedContext;
    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: Theme(
          data: theme,
          child: Builder(
            builder: (context) {
              themedContext = context;
              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );
    await tester.pump();
    return themedContext;
  }

  Map<String, _ResolvedStyleEntry> _snapshotStyles(BuildContext context) {
    return {
      for (final entry in _styleRegistry) entry.name: entry.resolve(context),
    };
  }

  Map<String, Object?> _mergeStyleEntry(
    _StyleEntry entry,
    _ResolvedStyleEntry light,
    _ResolvedStyleEntry dark,
  ) {
    if (entry.parametric) {
      return {
        'role': entry.role,
        'casePolicy': entry.casePolicy,
        if (entry.aliasOf != null) 'aliasOf': entry.aliasOf,
        'parametric': true,
        'samples': {
          for (final sample in light.samples.entries)
            sample.key: _styleMetrics(
              sample.value,
              role: entry.role,
              darkStyle: dark.samples[sample.key],
            ),
        },
      };
    }
    return {
      ..._styleMetrics(
        light.samples.values.single,
        role: entry.role,
        darkStyle: dark.samples.values.single,
      ),
      'casePolicy': entry.casePolicy,
      if (entry.aliasOf != null) 'aliasOf': entry.aliasOf,
    };
  }

  Map<String, Object?> _styleMetrics(
    TextStyle style, {
    required String role,
    TextStyle? darkStyle,
  }) {
    return {
      'role': role,
      // The design export and its CSS use the typeface name, not Dart's asset namespace.
      'family': style.fontFamily?.replaceFirst('packages/catch_ui/', ''),
      'size': style.fontSize,
      'weight': style.fontWeight?.value,
      'lineHeight': style.height,
      'tracking': style.letterSpacing ?? 0,
      'fontStyle': style.fontStyle == FontStyle.italic ? 'italic' : 'normal',
      if (style.color != null || darkStyle?.color != null)
        'defaultColor': {
          if (style.color != null) 'light': _colorValue(style.color!),
          if (darkStyle?.color != null) 'dark': _colorValue(darkStyle!.color!),
        },
      if (style.fontVariations != null && style.fontVariations!.isNotEmpty)
        'fontVariations': [
          for (final variation in style.fontVariations!)
            {'axis': variation.axis, 'value': variation.value},
        ],
      if (style.fontFeatures != null && style.fontFeatures!.isNotEmpty)
        'fontFeatures': [for (final feature in style.fontFeatures!) '$feature'],
    };
  }

  Set<String> _publicTextStyleMethodNames(String source) {
    return RegExp(r'static\s+TextStyle\s+([A-Za-z]\w*)\s*\(')
        .allMatches(source)
        .map((match) => match.group(1)!)
        .where((name) => !name.startsWith('_'))
        .toSet();
  }

  Map<String, Object?> _galleryManifestJson() {
    final coverage =
        jsonDecode(
              File('tool/ui_capture/capture_coverage.json').readAsStringSync(),
            )
            as Map<String, Object?>;
    final routes = (coverage['routes'] as List<Object?>)
        .cast<Map<String, Object?>>();
    final statusCounts = <String, int>{};
    for (final route in routes) {
      final status = route['status'] as String;
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }

    return {
      'version': 1,
      'source': 'test/ui_captures/catalog/screen_capture_catalog.dart',
      'coverage': {
        'routes': routes.length,
        'captures': screenCaptureCatalog.length,
        'statusCounts': statusCounts,
      },
      'profile': {
        'command':
            'node tool/ui_capture/run_captures.mjs --profile design-gallery',
        'pixelRatio': 3.0,
        'outputLayout': 'theme-first',
      },
      'shots': [
        for (final entry in screenCaptureCatalog)
          {
            'id': entry.id,
            'routes': entry.routeIds,
            'device': entry.device.id,
            'themes': const ['light', 'dark'],
            'files': {
              'light': 'light/${entry.id}.png',
              'dark': 'dark/${entry.id}.png',
            },
            if (entry.marketingFixtureKeys.isNotEmpty)
              'marketingFixtureKeys': entry.marketingFixtureKeys,
            'whatItIs': _humanizeCaptureId(entry.id),
            'keepChangeNotes': '',
          },
      ],
    };
  }

  String _humanizeCaptureId(String id) {
    return id
        .split('_')
        .map(
          (part) => part.isEmpty
              ? part
              : '${part[0].toUpperCase()}${part.substring(1)}',
        )
        .join(' ');
  }

  String _specimenHtml({
    required Map<String, Object?> tokens,
    required Map<String, Object?> activityPalette,
    required Map<String, Object?> typography,
  }) {
    final colors = tokens['color']! as Map<String, Object?>;
    String color(String name, String mode) {
      final token = colors[name]! as Map<String, Object?>;
      final values = token[r'$value']! as Map<String, Object?>;
      return values[mode]! as String;
    }

    final styles = typography['styles']! as Map<String, Object?>;
    String sampleStyle(String name) {
      final style = styles[name]! as Map<String, Object?>;
      final family = style['family'];
      final size = style['size'];
      final weight = style['weight'];
      final lineHeight = style['lineHeight'];
      final tracking = style['tracking'];
      final fontStyle = style['fontStyle'];
      return 'font-family:"$family";font-size:${size}px;font-weight:$weight;'
          'line-height:$lineHeight;letter-spacing:${tracking}px;font-style:$fontStyle;';
    }

    final activities = (activityPalette['activities']! as Map<String, Object?>)
        .entries
        .take(8);

    final activityCards = activities
        .map((entry) {
          final data = entry.value! as Map<String, Object?>;
          final light = data['light']! as Map<String, Object?>;
          return '''
      <div class="activity" style="--accent:${light['accent']};--deep:${light['deep']};--soft:${light['soft']}">
        <span>${data['label']}</span>
      </div>''';
        })
        .join('\n');

    return '''
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Catch Design System Specimen</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --bg: ${color('bg', 'light')};
  --surface: ${color('surface', 'light')};
  --raised: ${color('raised', 'light')};
  --ink: ${color('ink', 'light')};
  --ink2: ${color('ink2', 'light')};
  --ink3: ${color('ink3', 'light')};
  --line: ${color('line', 'light')};
  --primary: ${color('primary', 'light')};
  --primary-ink: ${color('primaryInk', 'light')};
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
main { max-width: 1120px; margin: 0 auto; padding: 56px 28px 72px; }
.kicker { ${sampleStyle('kicker')} color: var(--ink2); text-transform: uppercase; }
h1 { ${sampleStyle('display')} max-width: 760px; margin: 14px 0 18px; }
.lead { ${sampleStyle('bodyL')} max-width: 680px; color: var(--ink2); }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin-top: 34px; }
.panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 24px;
}
.headline { ${sampleStyle('headline')} margin: 0 0 12px; }
.body { ${sampleStyle('bodyM')} color: var(--ink2); }
    .mono { ${sampleStyle('monoCapsLabel')} color: var(--ink2); text-transform: uppercase; }
.button {
  ${sampleStyle('buttonMd')}
  display: inline-block;
  margin-top: 20px;
  padding: 15px 22px;
  border-radius: 999px;
  background: var(--primary);
  color: var(--primary-ink);
}
.activity-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
.activity {
  min-height: 96px;
  border-radius: 18px;
  padding: 14px;
  background:
    linear-gradient(135deg, var(--accent), var(--deep));
  color: #fff;
  display: flex;
  align-items: end;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.24);
}
.activity span { ${sampleStyle('monoCapsLabel')} color: #fff; text-transform: uppercase; }
.dark {
  --bg: ${color('bg', 'dark')};
  --surface: ${color('surface', 'dark')};
  --raised: ${color('raised', 'dark')};
  --ink: ${color('ink', 'dark')};
  --ink2: ${color('ink2', 'dark')};
  --ink3: ${color('ink3', 'dark')};
  --line: ${color('line', 'dark')};
  --primary: ${color('primary', 'dark')};
  --primary-ink: ${color('primaryInk', 'dark')};
  background: var(--bg);
  color: var(--ink);
}
@media (max-width: 760px) {
  main { padding: 36px 18px 52px; }
  .grid, .activity-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
<main>
  <div class="kicker">Catch design system</div>
  <h1>Editorial restraint, a typographic voice, and activity color only where it means something.</h1>
  <p class="lead">Catch is paper and ink by default. Typography carries personality; color appears as an event, tied to the activity and never used as decoration.</p>
  <section class="grid">
    <div class="panel">
      <div class="mono">Light browse register</div>
      <h2 class="headline">Hairlines, generous type, no brand hue</h2>
      <p class="body">Archivo provides the voice, the platform system font handles controls, and IBM Plex Mono carries metadata, time, counts, and labels.</p>
      <span class="button">Primary action</span>
    </div>
    <div class="panel dark">
      <div class="mono">Dark wow register</div>
      <h2 class="headline">Dark mode is first-class but intentional</h2>
      <p class="body">Use dark surfaces for spotlight moments and media-led states, not as the default shell.</p>
      <span class="button">Primary action</span>
    </div>
  </section>
  <section class="panel" style="margin-top:18px">
    <div class="mono">Activity pigments</div>
    <div class="activity-grid">
$activityCards
    </div>
  </section>
</main>
</body>
</html>
''';
  }

  T _themeExtension<T extends ThemeExtension<T>>(ThemeData theme) {
    final extension = theme.extension<T>();
    if (extension == null) throw StateError('Missing theme extension $T.');
    return extension;
  }

  Map<String, double> _doubleConstants(
    String className, {
    required String sourcePath,
    Map<String, Map<String, double>> refs = const {},
  }) {
    final source = File(sourcePath).readAsStringSync();
    final body = _classBody(source, className);
    final constants = <String, double>{};
    final scopedRefs = {...refs, className: constants};
    for (final match in RegExp(
      r'static\s+const\s+double\s+(\w+)\s*=\s*([^;]+);',
    ).allMatches(body)) {
      final name = match.group(1)!;
      final expression = match.group(2)!.trim();
      constants[name] = _resolveDoubleExpression(
        expression,
        scopedRefs,
        localClassName: className,
      );
    }
    return constants;
  }

  String _classBody(String source, String className) {
    final classStart = source.indexOf('class $className');
    if (classStart == -1) throw StateError('Could not find $className.');
    final openBrace = source.indexOf('{', classStart);
    var depth = 0;
    for (var index = openBrace; index < source.length; index += 1) {
      final char = source[index];
      if (char == '{') depth += 1;
      if (char == '}') depth -= 1;
      if (depth == 0) return source.substring(openBrace + 1, index);
    }
    throw StateError('Could not parse body for $className.');
  }

  double _resolveDoubleExpression(
    String expression,
    Map<String, Map<String, double>> refs, {
    required String localClassName,
  }) {
    final literal = double.tryParse(expression);
    if (literal != null) return literal;
    final localReference = RegExp(r'^\w+$').firstMatch(expression);
    if (localReference != null) {
      final value = refs[localClassName]?[expression];
      if (value != null) return value;
    }
    final reference = RegExp(r'^(\w+)\.(\w+)$').firstMatch(expression);
    if (reference != null) {
      final className = reference.group(1)!;
      final name = reference.group(2)!;
      final value = refs[className]?[name];
      if (value != null) return value;
    }
    throw StateError('Unsupported const double expression: $expression');
  }

  String _colorValue(Color color) {
    final argb = color.toARGB32();
    final alpha = (argb >> 24) & 0xff;
    final red = (argb >> 16) & 0xff;
    final green = (argb >> 8) & 0xff;
    final blue = argb & 0xff;
    if (alpha == 0xff) {
      return '#${_hex(red)}${_hex(green)}${_hex(blue)}';
    }
    return 'rgba($red,$green,$blue,${_alpha(alpha)})';
  }

  Map<String, Object?> _gradientValue(Gradient gradient) {
    return {
      'type': gradient.runtimeType.toString(),
      'colors': [for (final color in gradient.colors) _colorValue(color)],
      if (gradient is LinearGradient) ...{
        'begin': _alignmentValue(gradient.begin),
        'end': _alignmentValue(gradient.end),
      },
    };
  }

  Map<String, double> _alignmentValue(AlignmentGeometry alignment) {
    final resolved = alignment.resolve(TextDirection.ltr);
    return {'x': resolved.x, 'y': resolved.y};
  }

  String _hex(int value) =>
      value.toRadixString(16).padLeft(2, '0').toUpperCase();

  String _alpha(int value) {
    return (value / 255)
        .toStringAsFixed(3)
        .replaceFirst(RegExp(r'0+$'), '')
        .replaceFirst(RegExp(r'\.$'), '');
  }

  String _trim(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toString();
  }
}

class _ModeColor {
  const _ModeColor(this.light, this.dark);

  final Color light;
  final Color dark;
}

typedef _StyleResolver = TextStyle Function(BuildContext context);

class _StyleEntry {
  _StyleEntry({
    required this.name,
    required this.role,
    required this.samples,
    this.parametric = false,
    this.casePolicy = 'mixed',
    this.aliasOf,
  });

  factory _StyleEntry.single(
    String name,
    String role,
    _StyleResolver resolver, {
    String casePolicy = 'mixed',
    String? aliasOf,
  }) {
    return _StyleEntry(
      name: name,
      role: role,
      samples: {'default': resolver},
      casePolicy: casePolicy,
      aliasOf: aliasOf,
    );
  }

  final String name;
  final String role;
  final Map<String, _StyleResolver> samples;
  final bool parametric;
  final String casePolicy;
  final String? aliasOf;

  _ResolvedStyleEntry resolve(BuildContext context) {
    return _ResolvedStyleEntry(
      samples: {
        for (final sample in samples.entries) sample.key: sample.value(context),
      },
    );
  }
}

class _ExcludedStyleEntry {
  const _ExcludedStyleEntry(this.name, this.reason);

  final String name;
  final String reason;
}

class _ResolvedStyleEntry {
  const _ResolvedStyleEntry({required this.samples});

  final Map<String, TextStyle> samples;
}

final _styleRegistry = <_StyleEntry>[
  _StyleEntry.single('control', 'function', CatchTextStyles.control),
  _StyleEntry.single(
    'selectionLabel',
    'function',
    (context) => CatchTextStyles.selectionLabel(context, selected: false),
  ),
  _StyleEntry.single(
    'supportingStrong',
    'function',
    CatchTextStyles.supportingStrong,
  ),
  _StyleEntry.single('metric', 'function', CatchTextStyles.metric),
  _StyleEntry.single('tabLabel', 'function', CatchTextStyles.tabLabel),
  _StyleEntry.single(
    'navigationLabel',
    'function',
    CatchTextStyles.navigationLabel,
  ),
  _StyleEntry.single('display', 'voice', CatchTextStyles.display),
  _StyleEntry.single('headline', 'function', CatchTextStyles.headline),
  _StyleEntry.single('headlineS', 'voice', CatchTextStyles.headlineS),
  _StyleEntry.single(
    'welcomeReelHeadline',
    'voice',
    CatchTextStyles.welcomeReelHeadline,
  ),
  _StyleEntry.single(
    'welcomeIntroBody',
    'voice',
    CatchTextStyles.welcomeIntroBody,
  ),
  _StyleEntry.single('titleL', 'function', CatchTextStyles.titleL),
  _StyleEntry(
    name: 'clubDisplay',
    role: 'voice',
    parametric: true,
    samples: {
      's': (context) =>
          CatchTextStyles.clubDisplay(context, step: CatchTextStylesSize.s),
      'm': (context) =>
          CatchTextStyles.clubDisplay(context, step: CatchTextStylesSize.m),
      'l': (context) =>
          CatchTextStyles.clubDisplay(context, step: CatchTextStylesSize.l),
      'xl': (context) =>
          CatchTextStyles.clubDisplay(context, step: CatchTextStylesSize.xl),
    },
  ),
  _StyleEntry(
    name: 'eventDisplay',
    role: 'voice',
    parametric: true,
    samples: {
      's': (context) =>
          CatchTextStyles.eventDisplay(context, step: CatchTextStylesSize.s),
      'm': (context) =>
          CatchTextStyles.eventDisplay(context, step: CatchTextStylesSize.m),
      'l': (context) =>
          CatchTextStyles.eventDisplay(context, step: CatchTextStylesSize.l),
      'xl': (context) =>
          CatchTextStyles.eventDisplay(context, step: CatchTextStylesSize.xl),
    },
  ),
  _StyleEntry.single('eventTitle', 'voice', CatchTextStyles.eventTitle),
  _StyleEntry.single('consoleTitle', 'voice', CatchTextStyles.consoleTitle),
  _StyleEntry.single('hint', 'voice', CatchTextStyles.hint),
  _StyleEntry.single('sectionTitle', 'function', CatchTextStyles.sectionTitle),
  _StyleEntry.single('sectionCount', 'data', CatchTextStyles.sectionCount),
  _StyleEntry.single('titleS', 'function', CatchTextStyles.titleS),
  _StyleEntry.single(
    'fieldRowTitle',
    'function',
    CatchTextStyles.fieldRowTitle,
    aliasOf: 'titleS',
  ),
  _StyleEntry.single(
    'fieldRowValue',
    'function',
    (context) => CatchTextStyles.fieldRowValue(
      context,
      color: CatchTokens.of(context).ink,
    ),
  ),
  _StyleEntry.single('bodyLead', 'function', CatchTextStyles.bodyLead),
  _StyleEntry.single('bodyL', 'function', CatchTextStyles.bodyL),
  _StyleEntry.single('bodyM', 'function', CatchTextStyles.bodyM),
  _StyleEntry.single('bodyS', 'function', CatchTextStyles.bodyS),
  _StyleEntry.single('supporting', 'function', CatchTextStyles.supporting),
  _StyleEntry.single(
    'labelL',
    'function',
    CatchTextStyles.labelL,
    aliasOf: 'titleS',
  ),
  _StyleEntry.single('fieldLabel', 'function', CatchTextStyles.fieldLabel),
  _StyleEntry.single('statusLabel', 'function', CatchTextStyles.statusLabel),
  _StyleEntry.single('buttonSm', 'function', CatchTextStyles.buttonSm),
  _StyleEntry.single('buttonMd', 'function', CatchTextStyles.buttonMd),
  _StyleEntry.single('buttonLg', 'function', CatchTextStyles.buttonLg),
  _StyleEntry(
    name: 'avatarCount',
    role: 'function',
    parametric: true,
    samples: {
      '12': (context) => CatchTextStyles.avatarCount(context, size: 12),
      '16': (context) => CatchTextStyles.avatarCount(context, size: 16),
      '20': (context) => CatchTextStyles.avatarCount(context, size: 20),
    },
  ),
  _StyleEntry(
    name: 'avatarInitials',
    role: 'data',
    parametric: true,
    casePolicy: 'uppercase-initials',
    samples: {
      '12': (context) => CatchTextStyles.avatarInitials(context, size: 12),
      '18': (context) => CatchTextStyles.avatarInitials(context, size: 18),
      '24': (context) => CatchTextStyles.avatarInitials(context, size: 24),
    },
  ),
  _StyleEntry.single(
    'otpDigit',
    'data',
    CatchTextStyles.otpDigit,
    casePolicy: 'numeric',
  ),
  _StyleEntry.single('statCompact', 'function', CatchTextStyles.statCompact),
  _StyleEntry.single(
    'kicker',
    'data',
    CatchTextStyles.kicker,
    casePolicy: 'uppercase',
  ),
  _StyleEntry.single(
    'fieldSectionKicker',
    'data',
    CatchTextStyles.fieldSectionKicker,
    casePolicy: 'uppercase',
  ),
  _StyleEntry.single(
    'kickerLg',
    'data',
    CatchTextStyles.kickerLg,
    casePolicy: 'uppercase',
  ),
  _StyleEntry.single('monoLabel', 'data', CatchTextStyles.monoLabel),
  _StyleEntry.single(
    'monoCapsLabel',
    'data',
    CatchTextStyles.monoCapsLabel,
    casePolicy: 'uppercase',
  ),
  _StyleEntry.single('monoLabelS', 'data', CatchTextStyles.monoLabelS),
  _StyleEntry.single('mono', 'data', CatchTextStyles.mono),
  _StyleEntry.single('numericLarge', 'data', CatchTextStyles.numericLarge),
  _StyleEntry.single('numericMeta', 'data', CatchTextStyles.numericMeta),
  _StyleEntry.single('meta', 'data', CatchTextStyles.meta),
  _StyleEntry.single('badge', 'data', CatchTextStyles.badge),
  _StyleEntry.single(
    'badgeCaps',
    'data',
    CatchTextStyles.badgeCaps,
    casePolicy: 'uppercase',
  ),
  _StyleEntry.single('statDisplay', 'data', CatchTextStyles.statDisplay),
  _StyleEntry.single(
    'clubMemberSeal',
    'function',
    CatchTextStyles.clubMemberSeal,
  ),
  _StyleEntry.single('debugDetails', 'debug', CatchTextStyles.debugDetails),
];

const _excludedStyleRegistry = <_ExcludedStyleEntry>[
  _ExcludedStyleEntry(
    'iconRasterGlyph',
    'Raster-only icon-font style; excluded from app text typography.',
  ),
  _ExcludedStyleEntry(
    'transparentInput',
    'Utility style for hidden platform input; excluded from design typography.',
  ),
];
