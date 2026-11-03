import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_menu_item.dart';
import 'package:catch_ui/src/components/catch_menu_row.dart';
import 'package:catch_ui/src/patterns/catch_tab_viewport_scope.dart';
import 'package:catch_ui/src/primitives/catch_divider.dart';
import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';
import 'package:flutter/material.dart';

typedef CatchMenuBuilder =
    Widget Function(
      BuildContext context,
      MenuController controller,
      Widget? child,
    );

/// Canonical menu panel, optionally anchored to a caller-owned trigger.
class CatchMenu<T> extends StatefulWidget {
  const CatchMenu({super.key, required this.items, this.onSelected, this.width})
    : builder = null,
      controller = null,
      alignmentOffset = Offset.zero;

  const CatchMenu.anchored({
    super.key,
    required this.items,
    required CatchMenuBuilder this.builder,
    this.controller,
    this.onSelected,
    this.width,
    this.alignmentOffset = Offset.zero,
  });

  final CatchMenuBuilder? builder;
  final MenuController? controller;
  final Offset alignmentOffset;
  final List<CatchMenuItem<T>> items;
  final void Function(T value, CatchMenuItem<T> item)? onSelected;
  final double? width;

  @override
  State<CatchMenu<T>> createState() => _CatchMenuState<T>();
}

class _CatchMenuState<T> extends State<CatchMenu<T>> {
  GlobalKey? _anchorKey;

  @override
  Widget build(BuildContext context) {
    if (widget.builder != null) {
      final anchorKey = _anchorKey ??= GlobalKey();
      final viewport = CatchMenuViewport.from(context);
      return LayoutBuilder(
        builder: (context, constraints) => MenuAnchor(
          controller: widget.controller,
          alignmentOffset: widget.alignmentOffset,
          style: _catchMenuAnchorStyle,
          menuChildren: [
            Builder(
              builder: (context) {
                final boundary = viewport.boundaryFor(anchorKey);
                return Padding(
                  // The shell clearance is deliberately placed on the side
                  // away from the actual menu. It participates in Material's
                  // flip calculation while the visible menu stays flush with
                  // its trigger on the chosen side.
                  padding: boundary.padding,
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: boundary.maxHeight > 0
                          ? boundary.maxHeight
                          : double.infinity,
                    ),
                    child: CatchMenu<T>(
                      width:
                          widget.width ??
                          (constraints.hasBoundedWidth
                              ? constraints.maxWidth
                              : null),
                      items: widget.items,
                      onSelected: widget.onSelected,
                    ),
                  ),
                );
              },
            ),
          ],
          builder: (context, controller, child) => KeyedSubtree(
            key: anchorKey,
            child: widget.builder!(context, controller, child),
          ),
        ),
      );
    }
    final mediaQuery = MediaQuery.of(context);
    final viewportHeight = math.max(
      0.0,
      mediaQuery.size.height - mediaQuery.padding.vertical,
    );
    final maxHeight = CatchLayout.menuMaxHeightFor(viewportHeight);

    return CatchLegacySurface(
      emphasis: CatchSurfaceEmphasis.floating,
      radius: CatchRadius.md,
      borderRole: CatchBorderRole.boundary,
      padding: EdgeInsets.zero,
      width: widget.width,
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxHeight),
        child: SingleChildScrollView(
          primary: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final indexed in widget.items.indexed) ...[
                if (indexed.$1 > 0 && indexed.$2.startsSection)
                  const CatchDivider.fieldRow(indent: 0),
                CatchMenuRow<T>(
                  item: indexed.$2,
                  onSelected: widget.onSelected,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// The physical viewport available to an anchored Catch menu.
@immutable
class CatchMenuViewport {
  const CatchMenuViewport({
    required this.usableRect,
    required this.overlayBottomClearance,
  });

  factory CatchMenuViewport.from(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final shellBottom = CatchTabViewportScope.bottomOverlayInsetOf(context);
    final physicalBottom = math.max(mediaQuery.padding.bottom, shellBottom);
    final inset = CatchLayout.menuViewportInset;
    final left = mediaQuery.padding.left + inset;
    final top = mediaQuery.padding.top + inset;
    final right = math.max(
      left,
      mediaQuery.size.width - mediaQuery.padding.right - inset,
    );
    final bottom = math.max(
      top,
      mediaQuery.size.height - physicalBottom - inset,
    );
    return CatchMenuViewport(
      usableRect: Rect.fromLTRB(left, top, right, bottom),
      // Flutter's overlay already understands the platform safe area. Add
      // only the remaining shell obstruction plus Catch's viewport inset.
      overlayBottomClearance:
          math.max(0, physicalBottom - mediaQuery.padding.bottom) + inset,
    );
  }

  final Rect usableRect;
  final double overlayBottomClearance;

  /// Resolves the physical boundary for a menu anchored in an overlay.
  ///
  /// Material's menu overlay is owned by the navigator and therefore cannot
  /// see shell-local inherited padding. This measures the anchor against the
  /// shell-aware usable rectangle and caps the menu to the larger of the spaces
  /// above and below it. Material can then place the menu on the viable side,
  /// while the menu's own scroll view handles overflow without entering the
  /// floating navigation region.
  ({EdgeInsets padding, double maxHeight}) boundaryFor(GlobalKey anchorKey) {
    final anchorBox =
        anchorKey.currentContext?.findRenderObject() as RenderBox?;
    final anchorRect = anchorBox == null || !anchorBox.hasSize
        ? null
        : anchorBox.localToGlobal(Offset.zero) & anchorBox.size;
    final spaceAbove = anchorRect == null
        ? usableRect.height
        : math.max(0.0, anchorRect.top - usableRect.top);
    final spaceBelow = anchorRect == null
        ? usableRect.height
        : math.max(0.0, usableRect.bottom - anchorRect.bottom);
    final placeAbove = spaceAbove > spaceBelow;
    final maxHeight = placeAbove
        ? math.max(0.0, spaceAbove - overlayBottomClearance)
        : spaceBelow;
    return (
      padding: EdgeInsets.only(
        top: placeAbove ? overlayBottomClearance : 0,
        bottom: placeAbove ? 0 : overlayBottomClearance,
      ),
      maxHeight: maxHeight,
    );
  }
}

const _catchMenuAnchorStyle = MenuStyle(
  backgroundColor: WidgetStatePropertyAll(Colors.transparent),
  elevation: WidgetStatePropertyAll(0),
  shadowColor: WidgetStatePropertyAll(Colors.transparent),
  surfaceTintColor: WidgetStatePropertyAll(Colors.transparent),
  padding: WidgetStatePropertyAll(EdgeInsets.zero),
);
