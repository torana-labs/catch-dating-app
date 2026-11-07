import 'package:catch_ui/src/components/catch_tab_bar.dart';
import 'package:catch_ui/src/components/catch_tab_bar_item.dart';
import 'package:catch_ui/src/patterns/catch_tab_viewport_scope.dart';
import 'package:flutter/material.dart';

/// Where the shell put the navigation, for the screens inside it.
@immutable
class CatchShellScopeData {
  const CatchShellScopeData({
    required this.navigationPlacement,
    this.bottomInset = 0,
  });

  /// Bottom, rail or sidebar (never auto).
  final CatchTabBarPlacement navigationPlacement;

  /// How much of the screen's bottom edge a floating bottom bar covers,
  /// the device inset included. Zero when the bar sits below the screen (it
  /// then takes the device inset itself), while the keyboard hides it, and
  /// beside a rail or sidebar.
  final double bottomInset;

  @override
  bool operator ==(Object other) =>
      other is CatchShellScopeData &&
      other.navigationPlacement == navigationPlacement &&
      other.bottomInset == bottomInset;

  @override
  int get hashCode => Object.hash(navigationPlacement, bottomInset);
}

/// Publishes a [CatchAppShell]'s navigation placement to the screens inside
/// it. [CatchAppShell] is its only provider.
class CatchShellScope extends InheritedWidget {
  const CatchShellScope({super.key, required this.data, required super.child});

  final CatchShellScopeData data;

  static CatchShellScopeData? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<CatchShellScope>()?.data;

  /// Whether a shell holds this screen.
  static bool inShellOf(BuildContext context) => maybeOf(context) != null;

  @override
  bool updateShouldNotify(CatchShellScope oldWidget) => data != oldWidget.data;
}

/// The frame of an app: it places the navigation by size class and hosts the
/// screen.
///
/// Inside a CatchRoot, a [CatchTabBar] with the auto layout is a bottom bar
/// under 600 px, with the screen above it; a 96 px rail from 600 and a 240 px
/// sidebar from 840, with the screen beside it. The shell draws nothing of its
/// own, no colour and no line: the navigation and the screen own their
/// grounds. While the keyboard is up the bottom bar steps aside, and where the
/// platform floats the bottom bar over the screen the shell reports how much
/// it covers through [CatchShellScope], as it does to legacy screens through
/// [CatchTabViewportScope].
///
/// The system's AppShell also slots the top bar, the dock and the body,
/// because a web page has one of each. In Flutter the router's navigator is
/// [child] and every route brings its own CatchScreen with those slots.
class CatchAppShell extends StatelessWidget {
  const CatchAppShell({
    super.key,
    required this.navigation,
    required this.child,
    this.overlay,
  });

  final CatchTabBar<Object?> navigation;

  /// The screen, usually the router's navigator.
  final Widget child;

  /// Drawn over the navigation and the screen: an organizer switcher sheet, a
  /// toast.
  final Widget? overlay;

  @override
  Widget build(BuildContext context) {
    final placement = navigation.placementOf(context);
    final bottom = placement == CatchTabBarPlacement.bottom;
    final keyboard = MediaQuery.viewInsetsOf(context).bottom > 0;
    final barShown = !bottom || !keyboard;
    final floats = bottom && barShown && CatchTabBar.floatsFor(context);
    final anchored = bottom && barShown && !floats;
    final bottomInset = floats ? CatchTabBar.reservedBottomInset(context) : 0.0;
    final ltr = Directionality.of(context) == TextDirection.ltr;
    final overlay = this.overlay;
    // The screen keeps its key and its place in the tree whatever the
    // placement, so a rotation or the keyboard never rebuilds the navigator.
    final screen = Expanded(
      key: const ValueKey<String>('catch_app_shell.screen'),
      child: MediaQuery.removePadding(
        context: context,
        removeBottom: anchored,
        removeLeft: !bottom && ltr,
        removeRight: !bottom && !ltr,
        child: CatchShellScope(
          data: CatchShellScopeData(
            navigationPlacement: placement,
            bottomInset: bottomInset,
          ),
          child: CatchTabViewportScope(
            index: navigation.activeIndex,
            bottomOverlayInset: bottomInset,
            bottomBarPlacement: floats
                ? CatchTabViewportScopePlacement.floating
                : anchored
                ? CatchTabViewportScopePlacement.anchored
                : CatchTabViewportScopePlacement.none,
            child: child,
          ),
        ),
      ),
    );
    return Stack(
      children: [
        Positioned.fill(
          child: Flex(
            direction: bottom ? Axis.vertical : Axis.horizontal,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!bottom) navigation,
              screen,
              if (anchored) navigation,
            ],
          ),
        ),
        if (floats) Positioned(left: 0, right: 0, bottom: 0, child: navigation),
        if (overlay != null) Positioned.fill(child: overlay),
      ],
    );
  }
}
