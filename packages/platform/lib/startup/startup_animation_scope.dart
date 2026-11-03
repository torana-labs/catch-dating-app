import 'package:flutter/widgets.dart';

/// Session-scoped startup state shared with route-owned welcome surfaces.
///
/// The consumer cold-start reel and [OnboardingWelcomeBody] use the same visual scene.
/// This scope prevents the route from replaying that reel after bootstrap.
class StartupAnimationScope extends InheritedWidget {
  const StartupAnimationScope({
    required this.consumerWelcomeReelPlayed,
    required super.child,
    super.key,
  });

  final bool consumerWelcomeReelPlayed;

  /// Whether the consumer welcome reel already played, when a scope is present.
  static bool? maybeOf(BuildContext context) => context
      .dependOnInheritedWidgetOfExactType<StartupAnimationScope>()
      ?.consumerWelcomeReelPlayed;

  @override
  bool updateShouldNotify(StartupAnimationScope oldWidget) {
    return consumerWelcomeReelPlayed != oldWidget.consumerWelcomeReelPlayed;
  }
}
