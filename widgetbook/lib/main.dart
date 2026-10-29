import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook/widgetbook.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'main.directories.g.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: CatchWidgetbookApp()));
}

@widgetbook.App()
class CatchWidgetbookApp extends StatelessWidget {
  const CatchWidgetbookApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Widgetbook.material(
      initialRoute: _initialWidgetbookRoute(),
      directories: directories,
      lightTheme: AppTheme.light,
      darkTheme: AppTheme.dark,
      home: const _RouteAwareWidgetbookHome(),
      addons: [
        MaterialThemeAddon(
          themes: [
            WidgetbookTheme(name: 'Catch Light', data: AppTheme.light),
            WidgetbookTheme(name: 'Catch Dark', data: AppTheme.dark),
          ],
        ),
        ViewportAddon([
          Viewports.none,
          IosViewports.iPhoneSE,
          IosViewports.iPhone13,
          AndroidViewports.samsungGalaxyA50,
        ]),
        TextScaleAddon(initialScale: 1, min: 0.85, max: 2.0, divisions: 6),
        LocalizationAddon(
          locales: const [Locale('en')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
        ),
        InspectorAddon(),
      ],
      integrations: [_InitialWidgetbookRouteIntegration()],
    );
  }
}

class _InitialWidgetbookRouteIntegration extends WidgetbookIntegration {
  @override
  void onInit(WidgetbookState state) {
    _WidgetbookRouteConfig.fromBaseUri()?.applyTo(state);
  }
}

class _RouteAwareWidgetbookHome extends StatefulWidget {
  const _RouteAwareWidgetbookHome();

  @override
  State<_RouteAwareWidgetbookHome> createState() =>
      _RouteAwareWidgetbookHomeState();
}

class _RouteAwareWidgetbookHomeState extends State<_RouteAwareWidgetbookHome> {
  String? _scheduledRouteSignature;

  @override
  Widget build(BuildContext context) {
    _scheduleRouteRepair(context);
    return const _WidgetbookHomeFallback();
  }

  void _scheduleRouteRepair(BuildContext context) {
    final config = _WidgetbookRouteConfig.fromBaseUri();
    if (config == null) return;

    final state = WidgetbookState.of(context);
    if (state.path == config.path) return;

    final signature = config.signature;
    if (_scheduledRouteSignature == signature) return;
    _scheduledRouteSignature = signature;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      config.applyTo(WidgetbookState.of(context));
    });
  }
}

class _WidgetbookHomeFallback extends StatelessWidget {
  const _WidgetbookHomeFallback();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Select a Widgetbook use case.')),
    );
  }
}

class _WidgetbookRouteConfig {
  const _WidgetbookRouteConfig({
    required this.path,
    required this.previewMode,
    required this.query,
    required this.queryParams,
    required this.panels,
  });

  final String path;
  final bool previewMode;
  final String? query;
  final Map<String, String> queryParams;
  final Set<LayoutPanel>? panels;

  String get signature => '$path|$previewMode|$query|$queryParams|$panels';

  void applyTo(WidgetbookState state) {
    state.previewMode = previewMode;
    state.query = query;
    state.queryParams = Map<String, String>.from(queryParams);
    state.panels = previewMode ? null : panels;

    // ignore: invalid_use_of_internal_member
    state.updatePath(path);
  }

  static _WidgetbookRouteConfig? fromBaseUri() {
    final route = _routeFromBaseUri();
    final path = route?.queryParameters['path'];
    if (route == null || path == null || path.isEmpty) return null;

    final previewMode = route.queryParameters.containsKey('preview');
    return _WidgetbookRouteConfig(
      path: path,
      previewMode: previewMode,
      query: route.queryParameters['q'],
      queryParams: Map<String, String>.from(route.queryParameters)
        ..removeWhere(_reservedWidgetbookRouteKey),
      panels: previewMode
          ? null
          : _parsePanels(route.queryParameters['panels']),
    );
  }

  static Uri? _routeFromBaseUri() {
    final base = Uri.base;
    if (base.fragment.isNotEmpty) {
      final route = Uri.tryParse(base.fragment);
      if (route != null && route.queryParameters.containsKey('path')) {
        return route;
      }
    }

    if (base.queryParameters.containsKey('path')) {
      return Uri(path: '/', queryParameters: base.queryParameters);
    }

    return null;
  }

  static bool _reservedWidgetbookRouteKey(String key, String _) {
    return key == 'path' || key == 'preview' || key == 'q' || key == 'panels';
  }

  static Set<LayoutPanel>? _parsePanels(String? value) {
    if (value == null || value.isEmpty) return null;
    final panels = <LayoutPanel>{};
    for (final name in value.split(',')) {
      for (final panel in LayoutPanel.values) {
        if (panel.name == name) {
          panels.add(panel);
          break;
        }
      }
    }
    return panels;
  }
}

String _initialWidgetbookRoute() {
  final config = _WidgetbookRouteConfig.fromBaseUri();
  if (config == null) return '/';
  return Uri(
    path: '/',
    queryParameters: {
      'path': config.path,
      if (config.previewMode) 'preview': '',
      if (config.query != null) 'q': config.query,
      if (config.panels != null)
        'panels': config.panels!.map((panel) => panel.name).join(','),
      ...config.queryParams,
    },
  ).toString();
}
