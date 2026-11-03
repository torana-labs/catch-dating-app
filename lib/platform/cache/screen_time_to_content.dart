import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/cache/app_clock.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The analytics event a screen visit logs once, when it first shows data.
const screenTimeToContentEvent = 'screen_time_to_content';

/// Parameters of [screenTimeToContentEvent].
abstract final class ScreenTimeToContentParameters {
  /// The route name of the screen.
  static const surface = 'surface';

  /// Milliseconds from the screen opening to its first data.
  static const durationMs = 'duration_ms';

  /// `memory` when the screen opened with its data, otherwise `load`.
  static const contentSource = 'content_source';
}

/// One visit to one screen, from its route opening until it first shows
/// data. Every async boundary on the route joins the same visit, and the
/// first to show data logs it.
///
/// A visit is keyed by its route's page storage bucket, which lives exactly
/// as long as the route and is found without depending on the route, so a
/// route transition rebuilds nothing. Routes without a name, such as sheets
/// and dialogs, and trees without a `ProviderScope` or a navigator, are not
/// measured. The Host app drops the event, because it only sends its closed
/// product events.
final class ScreenVisit {
  ScreenVisit._(
    this._surface,
    this._openedAt,
    this._openedWithData,
    this._clock,
    this._analytics,
  );

  static final _visits = Expando<ScreenVisit>('screen visits');

  /// Joins the visit of the route around [context], starting it if this is
  /// the route's first boundary; [hasData] says whether that boundary mounts
  /// with data. Returns null when the screen is not measured. Call from
  /// `didChangeDependencies`.
  static ScreenVisit? join(BuildContext context, {required bool hasData}) {
    final bucket = PageStorage.maybeOf(context);
    if (bucket == null) return null;
    final existing = _visits[bucket];
    if (existing != null) return existing;
    final surface = ModalRoute.settingsOf(context)?.name;
    if (surface == null || surface.isEmpty) return null;
    final ProviderContainer container;
    try {
      container = ProviderScope.containerOf(context, listen: false);
    } on StateError {
      return null;
    }
    final clock = container.read(appClockProvider);
    return _visits[bucket] = ScreenVisit._(
      surface,
      clock.now(),
      hasData,
      clock,
      container.read(appAnalyticsProvider),
    );
  }

  final String _surface;
  final DateTime _openedAt;
  final bool _openedWithData;
  final AppClock _clock;
  final AppAnalytics _analytics;
  bool _logged = false;

  /// Logs the visit's time to content, once.
  void showedContent() {
    if (_logged) return;
    _logged = true;
    final elapsed = _clock.now().difference(_openedAt);
    _analytics.logEvent(
      screenTimeToContentEvent,
      parameters: {
        ScreenTimeToContentParameters.surface: _surface,
        ScreenTimeToContentParameters.durationMs: elapsed.inMilliseconds,
        ScreenTimeToContentParameters.contentSource: _openedWithData
            ? 'memory'
            : 'load',
      },
    );
  }
}
