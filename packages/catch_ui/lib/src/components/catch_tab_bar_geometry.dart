part of 'catch_tab_bar.dart';

// The bottom bar's slots: every destination takes an equal share with its
// label under its icon, and drag positions map back to slots.
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
          CatchLayout.tabBarIconPillWidth,
        ),
      );
    }

    // Every destination takes an equal slot with its label under its icon,
    // as the system bottom bar draws it.
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
        CatchLayout.tabBarIconPillWidth,
      ),
    );
  }

  /// The pill behind a destination's icon, at the top of its slot.
  Rect? indicatorRectFor(int index, {required bool expanded}) {
    if (index < 0 || index >= itemRects.length) return null;
    final itemRect = itemRects[index];
    return Rect.fromLTWH(
      itemRect.center.dx - selectedIndicatorWidth / 2,
      CatchLayout.tabBarIconPillTop,
      selectedIndicatorWidth,
      CatchLayout.tabBarIconPillHeight,
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
