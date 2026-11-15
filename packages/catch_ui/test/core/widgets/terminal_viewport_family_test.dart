import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final sliver in [false, true]) {
    testWidgets('terminal gap preserves obstruction policy (sliver: $sliver)', (
      tester,
    ) async {
      const gapKey = ValueKey('terminal-gap');
      Future<void> pump(
        CatchTabViewportScopePlacement placement, {
        bool includeSafeArea = true,
      }) => tester.pumpWidget(
        _viewport(
          placement: placement,
          child: sliver
              ? CustomScrollView(
                  slivers: [
                    CatchScrollTerminalGap.sliver(
                      key: gapKey,
                      extra: 10,
                      includeSafeArea: includeSafeArea,
                    ),
                  ],
                )
              : Column(
                  children: [
                    CatchScrollTerminalGap(
                      key: gapKey,
                      extra: 10,
                      includeSafeArea: includeSafeArea,
                    ),
                  ],
                ),
        ),
      );
      double extent() => sliver
          ? tester
                .renderObject<RenderSliver>(find.byType(SliverToBoxAdapter))
                .geometry!
                .scrollExtent
          : tester.getSize(find.byKey(gapKey)).height;

      await pump(CatchTabViewportScopePlacement.none);
      expect(extent(), 44); // Uses the larger device viewPadding.
      await pump(CatchTabViewportScopePlacement.floating);
      expect(extent(), 98); // Floating chrome includes the device safe area.
      await pump(CatchTabViewportScopePlacement.anchored);
      expect(extent(), 10); // Anchored chrome already reduces the viewport.
      await pump(
        CatchTabViewportScopePlacement.floating,
        includeSafeArea: false,
      );
      expect(extent(), 10);
      expect(tester.takeException(), isNull);
    });

    testWidgets('state viewport updates visible center (sliver: $sliver)', (
      tester,
    ) async {
      const markerKey = ValueKey('state-content');
      // LayoutBuilder deliberately cannot supply intrinsic height: the sliver
      // recipe must preserve the bounded scroll-body protocol.
      final content = LayoutBuilder(
        builder: (context, constraints) => const Center(
          child: SizedBox(key: markerKey, width: 20, height: 20),
        ),
      );
      Future<void> pump(double overlay, {bool account = true}) =>
          tester.pumpWidget(
            _viewport(
              placement: CatchTabViewportScopePlacement.floating,
              overlay: overlay,
              child: sliver
                  ? CustomScrollView(
                      slivers: [
                        CatchStateViewport.sliver(
                          accountForBottomOverlay: account,
                          child: content,
                        ),
                      ],
                    )
                  : CatchStateViewport(
                      accountForBottomOverlay: account,
                      child: content,
                    ),
            ),
          );

      await pump(88);
      expect(tester.getCenter(find.byKey(markerKey)).dy, 156);
      await pump(40);
      expect(tester.getCenter(find.byKey(markerKey)).dy, 180);
      await pump(88, account: false);
      expect(tester.getCenter(find.byKey(markerKey)).dy, 200);
      expect(tester.takeException(), isNull);
    });
  }
}

Widget _viewport({
  required Widget child,
  required CatchTabViewportScopePlacement placement,
  double overlay = 88,
}) => Directionality(
  textDirection: TextDirection.ltr,
  child: MediaQuery(
    data: const MediaQueryData(
      padding: EdgeInsets.only(bottom: 24),
      viewPadding: EdgeInsets.only(bottom: 34),
    ),
    child: CatchTabViewportScope(
      index: 0,
      bottomOverlayInset: overlay,
      bottomBarPlacement: placement,
      child: Align(
        alignment: Alignment.topLeft,
        child: SizedBox(width: 300, height: 400, child: child),
      ),
    ),
  ),
);
