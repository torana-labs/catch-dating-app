part of 'catch_tab_bar.dart';

// The bottom bar's measured slots: the selected destination widens to fit its
// label, the others share what is left, and drag positions map back to slots.
class _CatchTabBarGeometry {
  const _CatchTabBarGeometry({
    required this.width,
    required this.textDirection,
    required this.itemRects,
    required this.itemWidths,
    required this.selectedIndicatorWidth,
  });

  final double width;
  final TextDirection textDirection;
  final List<Rect> itemRects;

  /// Each slot's exact width. A [Rect] keeps its edges and recomputes its
  /// width from them, which can come back an ulp narrower than the slot; a
  /// label given that width would fade its last letter.
  final List<double> itemWidths;
  final double selectedIndicatorWidth;

  static _CatchTabBarGeometry calculate({
    required BuildContext context,
    required double width,
    required List<String> labels,
    required int activeIndex,
    bool compact = false,
  }) {
    final textDirection = Directionality.of(context);
    if (labels.isEmpty || !width.isFinite || width <= 0) {
      return _CatchTabBarGeometry(
        width: 0,
        textDirection: textDirection,
        itemRects: const <Rect>[],
        itemWidths: const <double>[],
        selectedIndicatorWidth: 0,
      );
    }

    final count = labels.length;
    final minimumExtent = CatchLayout.tabBarMinimumTapExtent;
    if (compact || width < minimumExtent * count) {
      final itemWidth = width / count;
      return _CatchTabBarGeometry(
        width: width,
        textDirection: textDirection,
        itemRects: [
          for (var index = 0; index < count; index++)
            Rect.fromLTWH(
              itemWidth * index,
              0,
              itemWidth,
              CatchLayout.tabBarExtent,
            ),
        ],
        itemWidths: List<double>.filled(count, itemWidth),
        selectedIndicatorWidth: math.min(
          itemWidth,
          CatchLayout.tabBarCompactItemExtent,
        ),
      );
    }

    final resolvedActiveIndex = activeIndex.clamp(0, count - 1);
    final labelPainter = TextPainter(
      text: TextSpan(
        text: labels[resolvedActiveIndex],
        style: CatchTextStyles.navigationLabel(context),
      ),
      maxLines: 1,
      textDirection: textDirection,
      textScaler: MediaQuery.textScalerOf(context),
    )..layout();
    // The label is measured to a whole logical pixel. The slot widths are sums
    // and differences of fractional widths, so an exact measurement can come
    // back a hair narrower than the text, and the label's fade overflow would
    // then fade its last letter ("Events" drew as "Event…" at 390 wide).
    final selectedWidth = CatchLayout.tabBarSelectedExtentFor(
      availableWidth: width,
      itemCount: count,
      labelWidth: labelPainter.width.ceilToDouble(),
    );
    final inactiveWidth = count == 1
        ? 0.0
        : (width - selectedWidth) / (count - 1);
    var start = 0.0;
    final rects = <Rect>[];
    final widths = <double>[];
    for (var index = 0; index < count; index++) {
      final itemWidth = index == resolvedActiveIndex
          ? selectedWidth
          : inactiveWidth;
      rects.add(Rect.fromLTWH(start, 0, itemWidth, CatchLayout.tabBarExtent));
      widths.add(itemWidth);
      start += itemWidth;
    }

    return _CatchTabBarGeometry(
      width: width,
      textDirection: textDirection,
      itemRects: rects,
      itemWidths: widths,
      selectedIndicatorWidth: selectedWidth,
    );
  }

  Rect? indicatorRectFor(int index, {required bool expanded}) {
    if (index < 0 || index >= itemRects.length) return null;
    final itemRect = itemRects[index];
    final indicatorWidth = math.min(
      itemRect.width,
      expanded ? selectedIndicatorWidth : CatchLayout.tabBarCompactItemExtent,
    );
    return Rect.fromCenter(
      center: itemRect.center,
      width: indicatorWidth,
      height: CatchLayout.tabBarIndicatorExtent,
    );
  }

  int? indexForPosition(Offset position, {int? currentIndex}) {
    final logicalX = textDirection == TextDirection.ltr
        ? position.dx
        : width - position.dx;
    if (logicalX < 0 ||
        logicalX > width ||
        position.dy < -CatchLayout.tabBarDragCancelSlop ||
        position.dy > CatchLayout.tabBarDragBottomLimit) {
      return null;
    }
    if (currentIndex != null &&
        currentIndex >= 0 &&
        currentIndex < itemRects.length) {
      final currentRect = itemRects[currentIndex];
      if (logicalX >= currentRect.left - CatchLayout.tabBarDragHysteresis &&
          logicalX <= currentRect.right + CatchLayout.tabBarDragHysteresis) {
        return currentIndex;
      }
    }
    for (final (index, rect) in itemRects.indexed) {
      if (logicalX >= rect.left && logicalX <= rect.right) return index;
    }
    return null;
  }
}
