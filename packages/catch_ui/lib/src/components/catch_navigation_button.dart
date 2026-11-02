import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_count_badge.dart';
import 'package:catch_ui/src/components/catch_navigation_button_status.dart';
import 'package:catch_ui/src/components/catch_tab_bar_item.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/foundations/catch_transitions.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:flutter/material.dart';

/// A navigation destination with bottom-bar and side-rail layout recipes.
///
/// Route ownership stays with the caller. Shared indicators distinguish a
/// temporary pointer preview from the destination still selected by the route.
class CatchNavigationButton<T> extends StatefulWidget {
  const CatchNavigationButton({
    super.key,
    required this.item,
    required bool selected,
    this.onTap,
    this.onTapDown,
    this.onTapCancel,
    this.onHoverChanged,
    this.onFocusChanged,
    this.onLongPress,
    this.showSelectedLabel,
  }) : status = selected
           ? CatchNavigationButtonStatus.selected
           : CatchNavigationButtonStatus.unselected,
       ownsIndicator = true,
       _railExpanded = null;

  /// Bottom-bar destination whose parent owns the moving indicator and haptic.
  const CatchNavigationButton.sharedIndicator({
    super.key,
    required this.item,
    required this.status,
    required this.showSelectedLabel,
    this.onTap,
    this.onTapDown,
    this.onTapCancel,
    this.onHoverChanged,
    this.onFocusChanged,
    this.onLongPress,
  }) : ownsIndicator = false,
       _railExpanded = null;

  /// Vertical navigation: a labelled compact rail or an expanded sidebar row.
  const CatchNavigationButton.rail({
    super.key,
    required this.item,
    required bool selected,
    required bool expanded,
    required this.onTap,
  }) : status = selected
           ? CatchNavigationButtonStatus.selected
           : CatchNavigationButtonStatus.unselected,
       _railExpanded = expanded,
       ownsIndicator = true,
       showSelectedLabel = true,
       onTapDown = null,
       onTapCancel = null,
       onHoverChanged = null,
       onFocusChanged = null,
       onLongPress = null;

  final CatchTabBarItem<T> item;
  final CatchNavigationButtonStatus status;
  final bool? _railExpanded;

  bool get selected => switch (status) {
    CatchNavigationButtonStatus.selected ||
    CatchNavigationButtonStatus.preview => true,
    _ => false,
  };

  bool get semanticSelected => switch (status) {
    CatchNavigationButtonStatus.selected ||
    CatchNavigationButtonStatus.retainedSelection => true,
    _ => false,
  };
  final VoidCallback? onTap;
  final GestureTapDownCallback? onTapDown;
  final VoidCallback? onTapCancel;
  final ValueChanged<bool>? onHoverChanged;
  final ValueChanged<bool>? onFocusChanged;
  final VoidCallback? onLongPress;
  final bool? showSelectedLabel;
  final bool ownsIndicator;

  @override
  State<CatchNavigationButton<T>> createState() =>
      _CatchNavigationButtonState<T>();
}

class _CatchNavigationButtonState<T> extends State<CatchNavigationButton<T>> {
  bool _pressed = false;
  bool _hovered = false;
  bool _focused = false;

  void _handleTap() {
    if (widget.ownsIndicator) catchSelectionHaptic();
    widget.onTap?.call();
  }

  @override
  Widget build(BuildContext context) {
    final disabledAnimations = MediaQuery.maybeOf(context)?.disableAnimations;
    final duration = disabledAnimations == true
        ? Duration.zero
        : CatchMotion.standard;
    final t = CatchTokens.of(context);
    final selected = widget.selected;
    final showSelectedLabel = widget.showSelectedLabel ?? selected;
    final color = selected ? t.ink : t.ink3;
    final sidebar = widget._railExpanded == true;
    final icon = CatchCountBadge.navigationIcon(
      icon: selected
          ? widget.item.activeIcon ?? widget.item.icon
          : widget.item.icon,
      color: color,
      // The sidebar has room to right-align its count beside the label.
      count: sidebar ? 0 : widget.item.badgeCount,
      child: selected
          ? widget.item.activeIconWidget ?? widget.item.iconWidget
          : widget.item.iconWidget,
    );
    if (widget._railExpanded case final expanded?) {
      final label = Text(
        widget.item.label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        textAlign: expanded ? TextAlign.start : TextAlign.center,
        style: CatchTextStyles.buttonSm(context, color: color),
      );
      final content = expanded
          ? Row(
              children: [
                icon,
                const SizedBox(width: CatchSpacing.s3),
                Expanded(child: label),
                if (widget.item.badgeCount > 0) ...[
                  const SizedBox(width: CatchSpacing.s2),
                  CatchSurface(
                    radius: CatchRadius.pill,
                    backgroundColor: selected ? t.surface : t.bg,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: CatchLayout.countBadgeHorizontalPadding,
                      ),
                      child: Text(
                        catchCountLabel(widget.item.badgeCount),
                        key: ValueKey(
                          'catch_navigation.sidebar_count.${widget.item.id}',
                        ),
                        style: CatchTextStyles.statusLabel(
                          context,
                          color: t.ink,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            )
          : Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                icon,
                const SizedBox(height: CatchSpacing.s1),
                label,
              ],
            );
      final button = Semantics(
        container: true,
        button: true,
        selected: selected,
        label: widget.item.label,
        value: widget.item.semanticValue,
        hint: widget.item.semanticHint,
        onTap: widget.onTap == null ? null : _handleTap,
        onLongPress: widget.item.onLongPress,
        child: ExcludeSemantics(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: expanded
                  ? CatchLayout.appShellSidebarItemMinHeight
                  : CatchLayout.appShellRailItemMinHeight,
            ),
            child: Material(
              color: selected
                  ? t.ink.withValues(alpha: CatchOpacity.tabBarPillFill)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(CatchRadius.md),
              child: InkWell(
                onTap: widget.onTap == null ? null : _handleTap,
                onLongPress: widget.item.onLongPress,
                borderRadius: BorderRadius.circular(CatchRadius.md),
                child: Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: expanded ? CatchSpacing.s3 : CatchSpacing.s1,
                    vertical: CatchSpacing.s2,
                  ),
                  child: content,
                ),
              ),
            ),
          ),
        ),
      );

      return expanded
          ? button
          : Tooltip(
              message: widget.item.label,
              excludeFromSemantics: true,
              child: button,
            );
    }
    final indicatorOpacity = _pressed
        ? CatchOpacity.tabBarPressedFill
        : _focused
        ? CatchOpacity.tabBarFocusFill
        : _hovered
        ? CatchOpacity.tabBarHoverFill
        : selected
        ? CatchOpacity.tabBarPillFill
        : CatchOpacity.none;
    final content = TweenAnimationBuilder<double>(
      key: ValueKey<Object>('catch_tab_bar.pill.${widget.item.id}'),
      duration: duration,
      curve: CatchMotion.standardCurve,
      tween: Tween<double>(end: showSelectedLabel ? 1 : 0),
      builder: (context, progress, child) => AnimatedContainer(
        duration: duration,
        curve: CatchMotion.standardCurve,
        constraints: const BoxConstraints(
          minWidth: CatchLayout.tabBarCompactItemExtent,
        ),
        height: CatchLayout.tabBarIndicatorExtent,
        padding: EdgeInsetsDirectional.only(
          start: showSelectedLabel
              ? CatchLayout.tabBarPillLeadingPadding
              : CatchLayout.tabBarCompactItemHorizontalPadding,
          end: showSelectedLabel
              ? CatchLayout.tabBarPillTrailingPadding
              : CatchLayout.tabBarCompactItemHorizontalPadding,
        ),
        decoration: ShapeDecoration(
          color: widget.ownsIndicator
              ? t.ink.withValues(alpha: indicatorOpacity)
              : Colors.transparent,
          shape: StadiumBorder(
            side: widget.ownsIndicator && _focused
                ? CatchBorder.resolve(t, CatchBorderRole.focus).side
                : BorderSide.none,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            icon,
            if (progress > 0.001)
              Flexible(
                child: ClipRect(
                  child: Align(
                    alignment: AlignmentDirectional.centerStart,
                    widthFactor: progress,
                    child: Opacity(
                      opacity: progress,
                      child: ExcludeSemantics(
                        key: ValueKey(
                          'catch_tab_bar.label.${widget.item.label}',
                        ),
                        child: Padding(
                          padding: const EdgeInsetsDirectional.only(
                            start: CatchLayout.tabBarLabelGap,
                          ),
                          child: Text(
                            widget.item.label,
                            maxLines: 1,
                            softWrap: false,
                            overflow: TextOverflow.fade,
                            style: CatchTextStyles.navigationLabel(
                              context,
                              color: t.ink,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );

    return Semantics(
      button: true,
      selected: widget.semanticSelected,
      label: widget.item.label,
      value: widget.item.semanticValue,
      hint: widget.item.semanticHint,
      onLongPress: widget.onLongPress ?? widget.item.onLongPress,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: widget.onTap == null ? null : _handleTap,
          onTapDown: (details) {
            if (!_pressed) setState(() => _pressed = true);
            widget.onTapDown?.call(details);
          },
          onTapCancel: () {
            if (_pressed) setState(() => _pressed = false);
            widget.onTapCancel?.call();
          },
          onTapUp: (_) {
            if (_pressed) setState(() => _pressed = false);
          },
          onLongPress: widget.onLongPress ?? widget.item.onLongPress,
          onHover: (hovered) {
            if (_hovered != hovered) setState(() => _hovered = hovered);
            widget.onHoverChanged?.call(hovered);
          },
          onFocusChange: (focused) {
            if (_focused != focused) setState(() => _focused = focused);
            widget.onFocusChanged?.call(focused);
          },
          customBorder: const StadiumBorder(),
          splashFactory: NoSplash.splashFactory,
          overlayColor: const WidgetStatePropertyAll<Color>(Colors.transparent),
          child: Center(child: content),
        ),
      ),
    );
  }
}
