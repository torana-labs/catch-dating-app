import 'dart:math' as math;
import 'dart:ui';

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/components/catch_count_badge.dart';
import 'package:catch_ui/src/components/catch_icon_action.dart';
import 'package:catch_ui/src/components/catch_navigation_button.dart';
import 'package:catch_ui/src/components/catch_navigation_button_status.dart';
import 'package:catch_ui/src/components/catch_tab_bar_indicator.dart';
import 'package:catch_ui/src/components/catch_tab_bar_item.dart';
import 'package:catch_ui/src/foundations/catch_adaptive_platform.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/foundations/catch_transitions.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

part 'catch_tab_bar_geometry.dart';
part 'catch_tab_bar_selection.dart';

/// The app's destinations from one list of items: a bottom bar, a 96 px rail
/// or a 240 px sidebar.
///
/// The bottom bar keeps one shared selection and contact indicator,
/// drag-to-select and platform-adaptive chrome. When any item is [pinned]
/// and [more] is set, the bottom bar shows only the pinned items, then More.
/// The rail and the sidebar put [header] in the 56 px header row the top bar
/// and pane headers share (a [CatchTabBarIdentity] draws compact in the
/// rail), [primaryAction] under it (a filled square icon button in the rail,
/// a full-width button in the sidebar), then the items with their section
/// headings, and the sidebar ends with [footer].
///
/// [CatchTabBarItem.pinned]: CatchTabBarItem.pinned
class CatchTabBar<T> extends StatefulWidget {
  const CatchTabBar({
    super.key,
    required this.items,
    required this.active,
    this.onChanged,
    this.layout = CatchTabBarPlacement.auto,
    this.header,
    this.primaryAction,
    this.footer,
    this.label,
    this.more,
  });

  final List<CatchTabBarItem<T>> items;
  final T active;
  final ValueChanged<T>? onChanged;
  final CatchTabBarPlacement layout;

  /// Rail and sidebar: the app's mark or who the app acts as, usually a
  /// [CatchTabBarIdentity].
  final Widget? header;
  final CatchTabBarAction? primaryAction;

  /// Sidebar: who is signed in, usually a [CatchTabBarIdentity].
  final Widget? footer;

  /// The navigation's name for screen readers.
  final String? label;

  /// Bottom bar with pinned items: the last destination.
  final CatchTabBarMore? more;

  static bool floatsFor(BuildContext context) =>
      prefersCupertinoControls(platform: Theme.of(context).platform);

  static double reservedBottomInset(BuildContext context) {
    if (!floatsFor(context)) return 0;
    final bottom = MediaQuery.maybeOf(context)?.padding.bottom ?? 0;
    return CatchLayout.tabBarReservedBottomInset(bottom);
  }

  /// [layout] resolved against the CatchRoot size class.
  CatchTabBarPlacement placementOf(BuildContext context) =>
      layout != CatchTabBarPlacement.auto
      ? layout
      : switch (CatchRootScope.sizeClassOf(context)) {
          CatchWindowSize.compact => CatchTabBarPlacement.bottom,
          CatchWindowSize.medium => CatchTabBarPlacement.rail,
          CatchWindowSize.expanded => CatchTabBarPlacement.sidebar,
        };

  /// The active item's position in [items], or 0.
  int get activeIndex {
    final index = items.indexWhere((item) => item.id == active);
    return index < 0 ? 0 : index;
  }

  @override
  State<CatchTabBar<T>> createState() => _CatchTabBarState<T>();
}

class _CatchTabBarState<T> extends State<CatchTabBar<T>>
    with _CatchTabBarSelection<T> {
  @override
  void didUpdateWidget(covariant CatchTabBar<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.active != widget.active ||
        oldWidget.items.length != widget.items.length) {
      _clearTransientState();
    }
  }

  @override
  Widget build(BuildContext context) {
    final placement = widget.placementOf(context);
    if (placement != CatchTabBarPlacement.bottom) {
      final sidebar = placement == CatchTabBarPlacement.sidebar;
      final t = CatchTokens.of(context);
      final padding = MediaQuery.paddingOf(context);
      final inset = sidebar ? CatchSpacing.micro14 : CatchSpacing.s2;
      final header = widget.header;
      final footer = widget.footer;
      final primary = widget.primaryAction;
      final items = widget.items;
      final onChanged = widget.onChanged;
      final hairline = BorderSide(color: t.line);
      return Semantics(
        container: true,
        explicitChildNodes: true,
        label: widget.label,
        child: Material(
          type: MaterialType.transparency,
          child: DecoratedBox(
            key: ValueKey<String>(
              sidebar ? 'catch_tab_bar.sidebar' : 'catch_tab_bar.rail',
            ),
            decoration: BoxDecoration(
              color: t.ground,
              border: BorderDirectional(end: hairline),
            ),
            child: SizedBox(
              width: sidebar
                  ? GeneratedCatchLayoutTokens.sidebar
                  : GeneratedCatchLayoutTokens.rail,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (header != null)
                    DecoratedBox(
                      // The header row lines up with the top bar's 56 px row
                      // and shares its hairline.
                      decoration: BoxDecoration(
                        border: Border(bottom: hairline),
                      ),
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(
                          inset,
                          padding.top,
                          inset,
                          0,
                        ),
                        // 56 px, growing with large text rather than
                        // clipping the identity.
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(
                            minHeight: CatchLayout.topBarHeight,
                          ),
                          child: Align(
                            alignment: sidebar
                                ? AlignmentDirectional.centerStart
                                : Alignment.center,
                            heightFactor: 1,
                            child: header,
                          ),
                        ),
                      ),
                    ),
                  Expanded(
                    child: SingleChildScrollView(
                      primary: false,
                      padding: EdgeInsets.fromLTRB(
                        inset,
                        (header == null
                                ? padding.top + CatchLayout.topBarHeight
                                : 0) +
                            CatchSpacing.s3,
                        inset,
                        CatchSpacing.s3,
                      ),
                      child: Column(
                        crossAxisAlignment: sidebar
                            ? CrossAxisAlignment.stretch
                            : CrossAxisAlignment.center,
                        spacing: sidebar
                            ? CatchSpacing.micro2
                            : CatchSpacing.s2,
                        children: [
                          if (primary != null)
                            Padding(
                              padding: const EdgeInsets.only(
                                bottom: CatchSpacing.s2,
                              ),
                              child: sidebar
                                  ? CatchButton(
                                      label: primary.label,
                                      onPressed: primary.onPressed,
                                      size: CatchButtonSize.md,
                                      fullWidth: true,
                                      leading: Icon(
                                        primary.icon ?? CatchIcons.add,
                                      ),
                                    )
                                  : CatchIconAction(
                                      tooltip: primary.label,
                                      onPressed: primary.onPressed,
                                      size: GeneratedCatchSizeTokens.controlLg,
                                      borderRadius: CatchRadius.sm,
                                      backgroundColor: t.primary,
                                      borderColor: t.primary,
                                      child: Icon(
                                        primary.icon ?? CatchIcons.add,
                                        color: t.onPrimary,
                                      ),
                                    ),
                            ),
                          for (final (index, item) in items.indexed) ...[
                            // A section heading in the sidebar; a short rule
                            // between sections in the rail.
                            if (item.section != null &&
                                (index == 0 ||
                                    items[index - 1].section != item.section))
                              if (sidebar)
                                Padding(
                                  padding: EdgeInsetsDirectional.fromSTEB(
                                    CatchSpacing.s3,
                                    index == 0
                                        ? CatchSpacing.s1
                                        : CatchSpacing.s4,
                                    CatchSpacing.s3,
                                    CatchSpacing.s1,
                                  ),
                                  child: CatchText(
                                    item.section!,
                                    variant: CatchTextVariant.labelKicker,
                                    tone: CatchTextTone.secondary,
                                    maxLines: 1,
                                  ),
                                )
                              else if (index > 0)
                                SizedBox(
                                  width: CatchSpacing.s8,
                                  child: DecoratedBox(
                                    decoration: BoxDecoration(
                                      border: Border(bottom: hairline),
                                    ),
                                  ),
                                ),
                            Builder(
                              key: ValueKey<Object>(
                                'catch_tab_bar.destination.${item.id}',
                              ),
                              builder: (context) {
                                final current = item.id == widget.active;
                                final icon = CatchCountBadge.navigationIcon(
                                  icon: current
                                      ? item.activeIcon ?? item.icon
                                      : item.icon,
                                  color: current ? t.ink : t.ink2,
                                  // The sidebar right-aligns its count.
                                  count: sidebar ? 0 : item.badgeCount,
                                  child: current
                                      ? item.activeIconWidget ?? item.iconWidget
                                      : item.iconWidget,
                                );
                                final label = CatchText(
                                  item.label,
                                  variant: sidebar
                                      ? CatchTextVariant.labelButton
                                      : CatchTextVariant.labelBadge,
                                  tone: current
                                      ? CatchTextTone.primary
                                      : CatchTextTone.secondary,
                                  align: sidebar
                                      ? TextAlign.start
                                      : TextAlign.center,
                                  maxLines: 1,
                                );
                                final shape = BorderRadius.circular(
                                  sidebar ? CatchRadius.sm : CatchRadius.pill,
                                );
                                final ground = BoxDecoration(
                                  color: current ? t.tile : null,
                                  borderRadius: shape,
                                );
                                final onTap = onChanged == null
                                    ? null
                                    : () => onChanged(item.id);
                                final count = sidebar && item.badgeCount > 0
                                    ? Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: CatchSpacing.micro6,
                                        ),
                                        decoration: BoxDecoration(
                                          color: current ? t.ground : t.tile,
                                          borderRadius: BorderRadius.circular(
                                            CatchRadius.pill,
                                          ),
                                        ),
                                        child: CatchText(
                                          catchCountLabel(item.badgeCount),
                                          variant: CatchTextVariant.labelBadge,
                                          tone: CatchTextTone.primary,
                                          numeric: true,
                                        ),
                                      )
                                    : null;
                                return Semantics(
                                  container: true,
                                  button: true,
                                  selected: current,
                                  label: item.label,
                                  value: item.semanticValue,
                                  hint: item.semanticHint,
                                  onTap: onTap,
                                  onLongPress: item.onLongPress,
                                  child: ExcludeSemantics(
                                    child: InkWell(
                                      onTap: onTap,
                                      onLongPress: item.onLongPress,
                                      borderRadius: shape,
                                      child: sidebar
                                          ? Container(
                                              constraints: const BoxConstraints(
                                                minHeight:
                                                    GeneratedCatchSizeTokens
                                                        .touchMin,
                                              ),
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: CatchSpacing.s3,
                                                  ),
                                              decoration: ground,
                                              child: Row(
                                                spacing: CatchSpacing.s3,
                                                children: [
                                                  icon,
                                                  Expanded(child: label),
                                                  ?count,
                                                ],
                                              ),
                                            )
                                          : Tooltip(
                                              message: item.label,
                                              excludeFromSemantics: true,
                                              child: Container(
                                                width:
                                                    GeneratedCatchLayoutTokens
                                                        .rail -
                                                    CatchSpacing.s4,
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                      vertical: CatchSpacing.s1,
                                                    ),
                                                child: Column(
                                                  mainAxisSize:
                                                      MainAxisSize.min,
                                                  spacing: CatchSpacing.s1,
                                                  children: [
                                                    // The system's 56 by 32 px
                                                    // rail pill.
                                                    Container(
                                                      width:
                                                          CatchSpacing.s16 -
                                                          CatchSpacing.s2,
                                                      height:
                                                          GeneratedCatchSizeTokens
                                                              .controlSm,
                                                      alignment:
                                                          Alignment.center,
                                                      decoration: ground,
                                                      child: icon,
                                                    ),
                                                    label,
                                                  ],
                                                ),
                                              ),
                                            ),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: EdgeInsets.fromLTRB(
                      inset,
                      0,
                      inset,
                      padding.bottom +
                          (sidebar ? CatchSpacing.micro18 : CatchSpacing.s5),
                    ),
                    child: sidebar ? footer : null,
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    final isFloating = CatchTabBar.floatsFor(context);
    final textScale = MediaQuery.textScalerOf(context).scale(1);
    // Compact bottom navigation cannot guarantee both 48 px targets and
    // readable labels once the user's text scale reaches the large-text
    // layout. Keep every destination visible and preserve its semantic label;
    // the selected pill becomes icon-only until a side-navigation breakpoint
    // provides enough horizontal room for labels again.
    final compactDestinations = textScale >= 1.6;
    final t = CatchTokens.of(context);
    final disabledAnimations = MediaQuery.maybeOf(context)?.disableAnimations;
    final duration = disabledAnimations == true
        ? Duration.zero
        : CatchMotion.standard;
    final activeIndex = _activeIndex;
    final visible = _visible;
    final pinning = _pinning;
    final more = widget.more;
    CatchNavigationButtonStatus statusAt(int index, int visualIndex) =>
        switch ((index == activeIndex, index == visualIndex)) {
          (true, true) => CatchNavigationButtonStatus.selected,
          (false, true) => CatchNavigationButtonStatus.preview,
          (true, false) => CatchNavigationButtonStatus.retainedSelection,
          (false, false) => CatchNavigationButtonStatus.unselected,
        };
    final previewIndex = _dragging ? _dragIndex : _pressedIndex;
    final visualIndex = previewIndex ?? activeIndex;
    final navigation = Padding(
      padding: EdgeInsets.symmetric(
        horizontal: isFloating
            ? CatchLayout.tabBarContentHorizontalPaddingFor(textScale)
            : CatchLayout.tabBarHorizontalPadding,
      ),
      child: widget.items.isEmpty
          ? const SizedBox.shrink()
          : LayoutBuilder(
              builder: (context, constraints) {
                final geometry = _CatchTabBarGeometry.calculate(
                  context: context,
                  width: constraints.maxWidth,
                  labels: [
                    for (final item in visible) item.label,
                    if (more != null && pinning) more.label,
                  ],
                  activeIndex: activeIndex,
                  compact: compactDestinations,
                );
                final primaryRect = geometry.indicatorRectFor(
                  visualIndex,
                  expanded: visualIndex == activeIndex,
                );
                final secondaryIndex = previewIndex == null
                    ? _focusedIndex ?? _hoveredIndex
                    : null;
                final secondaryRect =
                    secondaryIndex == null || secondaryIndex == activeIndex
                    ? null
                    : geometry.indicatorRectFor(
                        secondaryIndex,
                        expanded: false,
                      );
                final primaryFocused = _focusedIndex == activeIndex;
                final primaryInteracted =
                    previewIndex != null || secondaryIndex == activeIndex;
                final primaryOpacity = previewIndex != null
                    ? CatchOpacity.tabBarPressedFill
                    : primaryInteracted
                    ? CatchOpacity.tabBarFocusFill
                    : CatchOpacity.tabBarPillFill;

                return GestureDetector(
                  behavior: HitTestBehavior.translucent,
                  onHorizontalDragStart: _enabled
                      ? (details) => _handleDragStart(details, geometry)
                      : null,
                  onHorizontalDragUpdate: _enabled
                      ? (details) => _handleDragUpdate(details, geometry)
                      : null,
                  onHorizontalDragEnd: _enabled ? _handleDragEnd : null,
                  onHorizontalDragCancel: _enabled ? _handleDragCancel : null,
                  child: Stack(
                    fit: StackFit.expand,
                    clipBehavior: Clip.none,
                    children: [
                      if (primaryRect != null)
                        AnimatedPositionedDirectional(
                          duration: duration,
                          curve: CatchMotion.standardCurve,
                          start: primaryRect.left,
                          top: primaryRect.top,
                          width: primaryRect.width,
                          height: primaryRect.height,
                          child: CatchTabBarIndicator(
                            key: const ValueKey('catch_tab_bar.indicator'),
                            color: t.ink.withValues(alpha: primaryOpacity),
                            focused: primaryFocused,
                          ),
                        ),
                      if (secondaryRect != null)
                        AnimatedPositionedDirectional(
                          duration: duration,
                          curve: CatchMotion.standardCurve,
                          start: secondaryRect.left,
                          top: secondaryRect.top,
                          width: secondaryRect.width,
                          height: secondaryRect.height,
                          child: CatchTabBarIndicator(
                            key: const ValueKey(
                              'catch_tab_bar.interaction_indicator',
                            ),
                            color: t.ink.withValues(
                              alpha: _focusedIndex == secondaryIndex
                                  ? CatchOpacity.tabBarFocusFill
                                  : CatchOpacity.tabBarHoverFill,
                            ),
                            focused: _focusedIndex == secondaryIndex,
                          ),
                        ),
                      for (final (index, item) in visible.indexed)
                        AnimatedPositionedDirectional(
                          key: ValueKey<Object>(
                            'catch_tab_bar.slot.${item.id}',
                          ),
                          duration: duration,
                          curve: CatchMotion.standardCurve,
                          start: geometry.itemRects[index].left,
                          top: 0,
                          width: geometry.itemWidths[index],
                          height: CatchLayout.tabBarExtent,
                          child: CatchNavigationButton<T>.sharedIndicator(
                            key: ValueKey<Object>(
                              'catch_tab_bar.destination.${item.id}',
                            ),
                            item: item,
                            status: statusAt(index, visualIndex),
                            showSelectedLabel:
                                !compactDestinations &&
                                index == activeIndex &&
                                visualIndex == activeIndex,
                            onTap: !_enabled ? null : () => _handleTap(index),
                            onTapDown: !_enabled
                                ? null
                                : (_) => _handlePressStart(index),
                            onTapCancel: !_enabled
                                ? null
                                : () => _handlePressCancel(index),
                            onHoverChanged: !_enabled
                                ? null
                                : (hovered) => _handleHover(index, hovered),
                            onFocusChanged: !_enabled
                                ? null
                                : (focused) => _handleFocus(index, focused),
                            onLongPress: item.onLongPress == null
                                ? null
                                : () => _handleLongPress(index),
                          ),
                        ),
                      if (more != null && pinning)
                        AnimatedPositionedDirectional(
                          key: const ValueKey<Object>(
                            'catch_tab_bar.more_slot',
                          ),
                          duration: duration,
                          curve: CatchMotion.standardCurve,
                          start: geometry.itemRects[visible.length].left,
                          top: 0,
                          width: geometry.itemWidths[visible.length],
                          height: CatchLayout.tabBarExtent,
                          child: CatchNavigationButton<String>.sharedIndicator(
                            key: const ValueKey<Object>('catch_tab_bar.more'),
                            item: CatchTabBarItem<String>(
                              id: 'more',
                              icon: CatchIcons.more,
                              label: more.label,
                              badgeCount: more.badge,
                            ),
                            status: statusAt(visible.length, visualIndex),
                            showSelectedLabel:
                                !compactDestinations &&
                                visible.length == activeIndex &&
                                visualIndex == activeIndex,
                            onTap: !_enabled
                                ? null
                                : () => _handleTap(visible.length),
                            onTapDown: !_enabled
                                ? null
                                : (_) => _handlePressStart(visible.length),
                            onTapCancel: !_enabled
                                ? null
                                : () => _handlePressCancel(visible.length),
                            onHoverChanged: !_enabled
                                ? null
                                : (hovered) =>
                                      _handleHover(visible.length, hovered),
                            onFocusChanged: !_enabled
                                ? null
                                : (focused) =>
                                      _handleFocus(visible.length, focused),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
    );

    if (!isFloating) {
      return DecoratedBox(
        key: const ValueKey('catch_tab_bar.anchored_chrome'),
        decoration: BoxDecoration(
          color: t.surface,
          border: Border(top: BorderSide(color: t.line)),
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: CatchLayout.tabBarExtent,
            child: Material(color: Colors.transparent, child: navigation),
          ),
        ),
      );
    }

    final floatingChromeRadius = BorderRadius.circular(CatchRadius.pill);

    final floatingHorizontalInset =
        CatchLayout.tabBarFloatingHorizontalInsetFor(textScale);
    return SafeArea(
      top: false,
      minimum: EdgeInsets.fromLTRB(
        floatingHorizontalInset,
        0,
        floatingHorizontalInset,
        CatchLayout.tabBarFloatingBottomInset,
      ),
      child: Align(
        alignment: Alignment.bottomCenter,
        child: ClipRRect(
          key: const ValueKey('catch_tab_bar.floating_chrome'),
          borderRadius: floatingChromeRadius,
          child: BackdropFilter(
            filter: ImageFilter.blur(
              sigmaX: CatchLayout.tabBarBlurSigma,
              sigmaY: CatchLayout.tabBarBlurSigma,
            ),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: t.surface.withValues(
                  alpha: CatchOpacity.tabBarGlassFill,
                ),
                border: Border.all(color: t.line),
                borderRadius: floatingChromeRadius,
              ),
              child: SizedBox(
                height: CatchLayout.tabBarExtent,
                child: navigation,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
