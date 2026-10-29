import 'package:catch_dating_app/routing/shell/app_shell_keys.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Shared adaptive placement contract for consumer and host tab shells.
///
/// Floating tab chrome overlays the body and publishes its raw physical
/// obstruction to root scroll owners. Anchored chrome is assigned to
/// [Scaffold.bottomNavigationBar], while a transient shell with no bottom
/// chrome leaves device-safe terminal clearance to [CatchTabViewportScope].
class AdaptiveTabScaffold extends StatelessWidget {
  const AdaptiveTabScaffold({
    super.key,
    required this.activeIndex,
    required this.body,
    this.navigationBar,
    this.mediumSideNavigation,
    this.expandedSideNavigation,
    this.anchoredFallback,
  });

  final int activeIndex;
  final Widget body;
  final Widget? navigationBar;
  final Widget? mediumSideNavigation;
  final Widget? expandedSideNavigation;
  final Widget? anchoredFallback;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final screenSize = CatchWindowSize.fromWidth(constraints.maxWidth);
        final sideNavigation = switch (screenSize) {
          CatchWindowSize.compact => null,
          CatchWindowSize.medium => mediumSideNavigation,
          CatchWindowSize.expanded =>
            expandedSideNavigation ?? mediumSideNavigation,
        };
        if (sideNavigation != null) {
          return CatchScaffold.workspace(
            scaffoldKey: AppShellKeys.scaffold,
            body: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                sideNavigation,
                Expanded(
                  // A nested Navigator's modal barrier may discard preceding
                  // semantics. Confine it to the page so it cannot hide the
                  // persistent side-navigation sibling.
                  child: Semantics(
                    container: true,
                    child: CatchTabViewportScope(
                      index: activeIndex,
                      child: body,
                    ),
                  ),
                ),
              ],
            ),
          );
        }

        final navigationBar = this.navigationBar;
        final keyboardVisible = MediaQuery.viewInsetsOf(context).bottom > 0;
        final candidateTabBarFloats =
            navigationBar != null && CatchTabBar.floatsFor(context);
        final tabBarFloats = candidateTabBarFloats && !keyboardVisible;
        final anchoredBar = keyboardVisible || candidateTabBarFloats
            ? null
            : navigationBar ?? anchoredFallback;
        final placement = tabBarFloats
            ? CatchTabViewportScopePlacement.floating
            : anchoredBar != null
            ? CatchTabViewportScopePlacement.anchored
            : CatchTabViewportScopePlacement.none;
        final bottomOverlayInset = tabBarFloats
            ? CatchTabBar.reservedBottomInset(context)
            : 0.0;
        final scopedBody = CatchTabViewportScope(
          index: activeIndex,
          bottomOverlayInset: bottomOverlayInset,
          bottomBarPlacement: placement,
          child: body,
        );

        return CatchScaffold.workspace(
          scaffoldKey: AppShellKeys.scaffold,
          extendBody: tabBarFloats,
          body: candidateTabBarFloats
              ? Stack(
                  children: [
                    Positioned.fill(child: scopedBody),
                    if (tabBarFloats)
                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 0,
                        child: navigationBar,
                      ),
                  ],
                )
              : scopedBody,
          footer: anchoredBar,
        );
      },
    );
  }
}
