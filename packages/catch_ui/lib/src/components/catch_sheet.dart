import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_badge.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/components/catch_sheet_header.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/foundations/catch_theme.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';
import 'package:catch_ui/src/primitives/catch_sheet_drag_indicator.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

Future<T?> showCatchBottomSheet<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  bool isScrollControlled = true,
  bool useSafeArea = true,
  bool useRootNavigator = true,
  Color? backgroundColor = Colors.transparent,
  bool isDismissible = true,
  bool enableDrag = true,
  RouteSettings? routeSettings,
  Color? barrierColor,
  BoxConstraints? constraints,
  ShapeBorder? shape,
  Clip? clipBehavior,
  bool? showDragHandle,
}) {
  return showModalBottomSheet<T>(
    context: context,
    builder: builder,
    isScrollControlled: isScrollControlled,
    useSafeArea: useSafeArea,
    useRootNavigator: useRootNavigator,
    backgroundColor: backgroundColor,
    isDismissible: isDismissible,
    enableDrag: enableDrag,
    routeSettings: routeSettings,
    barrierColor: barrierColor,
    constraints: constraints,
    shape: shape,
    clipBehavior: clipBehavior,
    showDragHandle: showDragHandle,
  );
}

/// Whether the sheet delegates scrolling to its body or owns it for all content.
enum CatchSheetMode { content, scrollable }

/// A contained sheet's fill: the ground, or [success] green when the sheet
/// itself says it worked (a guest checked in).
enum CatchSheetTone { standard, success }

/// Canonical sheet surface, header and terminal safe region.
class CatchSheet extends StatelessWidget {
  const CatchSheet({
    super.key,
    required this.child,
    this.title,
    this.subtitle,
    this.footer,
    this.glyph,
    this.badge,
    this.badgeTone = CatchBadgeTone.neutral,
    this.trailing,
    this.grabber = true,
    this.keyboardSafe = false,
    this.mode = CatchSheetMode.content,
    this.padding,
  }) : _filterCloseLabel = null,
       _onFilterClose = null,
       _standard = false,
       pinFooter = false,
       kicker = null,
       tone = CatchSheetTone.standard,
       scrim = true,
       _contained = false;

  /// Bounded, keyboard-safe sheet with one scroll owner and fixed geometry.
  /// Supply natural-height content; the sheet owns vertical scrolling.
  const CatchSheet.standard({
    super.key,
    required this.child,
    this.title,
    this.subtitle,
    this.footer,
    this.pinFooter = false,
    this.glyph,
    this.badge,
    this.badgeTone = CatchBadgeTone.neutral,
    this.trailing,
  }) : _filterCloseLabel = null,
       _onFilterClose = null,
       _standard = true,
       grabber = true,
       keyboardSafe = true,
       mode = CatchSheetMode.scrollable,
       padding = null,
       kicker = null,
       tone = CatchSheetTone.standard,
       scrim = true,
       _contained = false;

  /// Immediate filters have no instructional subtitle or commit action.
  /// The shell owns the persistent, secondary Close action.
  const CatchSheet.filter({
    super.key,
    required this.title,
    required this.child,
    required String closeLabel,
    required VoidCallback onClose,
    this.trailing,
  }) : _filterCloseLabel = closeLabel,
       _onFilterClose = onClose,
       _standard = true,
       pinFooter = true,
       subtitle = null,
       footer = null,
       glyph = null,
       badge = null,
       badgeTone = CatchBadgeTone.neutral,
       grabber = true,
       keyboardSafe = true,
       mode = CatchSheetMode.scrollable,
       padding = null,
       kicker = null,
       tone = CatchSheetTone.standard,
       scrim = true,
       _contained = false;

  /// The system Sheet drawn in place at the foot of its screen (the screen's
  /// overlay slot) rather than pushed as a route: a [kicker] over a
  /// [title], the [child] and a [footer] (usually one primary button). With
  /// [scrim] it dims the screen and docks to the bottom edge with a grabber;
  /// without one it floats 8 px in from the edges and the screen behind stays
  /// usable, as a scan result does. [tone] success fills it green, in day
  /// colours on any theme.
  const CatchSheet.contained({
    super.key,
    required this.child,
    this.title,
    this.kicker,
    this.footer,
    this.tone = CatchSheetTone.standard,
    this.scrim = true,
  }) : _filterCloseLabel = null,
       _onFilterClose = null,
       _standard = false,
       pinFooter = false,
       subtitle = null,
       glyph = null,
       badge = null,
       badgeTone = CatchBadgeTone.neutral,
       trailing = null,
       grabber = true,
       keyboardSafe = false,
       mode = CatchSheetMode.content,
       padding = null,
       _contained = true;

  /// Contained only: the line over the title, such as "Checked in".
  final String? kicker;
  final CatchSheetTone tone;

  /// Contained only: dims the screen and docks to the edge.
  final bool scrim;
  final bool _contained;

  final String? _filterCloseLabel;
  final VoidCallback? _onFilterClose;
  final bool _standard;

  /// Keeps a filter dismissal action reachable while long choices scroll.
  final bool pinFooter;

  final String? title;
  final String? subtitle;
  final Widget child;
  final Widget? footer;
  final IconData? glyph;
  final String? badge;
  final CatchBadgeTone badgeTone;
  final Widget? trailing;
  final bool grabber;

  /// Lets a larger keyboard inset replace the device bottom obstruction.
  final bool keyboardSafe;

  /// Scrolls the whole sheet when its natural content exceeds the viewport.
  final CatchSheetMode mode;

  /// Requested content insets.
  ///
  /// Top and horizontal values are applied as supplied. Bottom may request more
  /// space, but cannot remove the sheet-owned terminal safe region.
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    if (_contained) return _containedSheet(context);
    final footer = _filterCloseLabel == null
        ? this.footer
        : CatchButton.sheet(
            label: _filterCloseLabel,
            onPressed: _onFilterClose,
            role: CatchButtonEmphasis.dismiss,
          );
    final mediaQuery = MediaQuery.maybeOf(context);
    final viewPaddingBottom = mediaQuery?.viewPadding.bottom ?? 0.0;
    final keyboardInsetBottom = keyboardSafe && !_standard
        ? mediaQuery?.viewInsets.bottom ?? 0.0
        : 0.0;
    final obstructionBottom = math.max(viewPaddingBottom, keyboardInsetBottom);
    final minimumBottomPadding = math.max(
      CatchLayout.sheetBottomPadding,
      obstructionBottom + CatchLayout.sheetBottomSafeAreaGap,
    );
    final requestedPadding =
        padding?.resolve(Directionality.of(context)) ??
        const EdgeInsets.fromLTRB(
          CatchLayout.sheetHorizontalPadding,
          CatchLayout.sheetTopPadding,
          CatchLayout.sheetHorizontalPadding,
          CatchLayout.sheetBottomPadding,
        );
    final effectivePadding = requestedPadding.copyWith(
      bottom: math.max(requestedPadding.bottom, minimumBottomPadding),
    );
    final right = (badge?.isNotEmpty ?? false)
        ? CatchBadge.functional(label: badge!, tone: badgeTone)
        : trailing;
    final hasHeader =
        (title?.isNotEmpty ?? false) || glyph != null || right != null;

    final content = CatchLegacySurface(
      emphasis: CatchSurfaceEmphasis.floating,
      duration: Duration.zero,
      borderRadius: const BorderRadius.only(
        topLeft: Radius.circular(CatchLayout.sheetTopRadius),
        topRight: Radius.circular(CatchLayout.sheetTopRadius),
        bottomLeft: Radius.circular(CatchLayout.sheetBottomRadius),
        bottomRight: Radius.circular(CatchLayout.sheetBottomRadius),
      ),
      child: Padding(
        key: const ValueKey<String>('catch-bottom-sheet-content-padding'),
        padding: pinFooter && footer != null
            ? effectivePadding.copyWith(bottom: 0)
            : effectivePadding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: _standard
              ? CrossAxisAlignment.stretch
              : CrossAxisAlignment.start,
          children: [
            if (grabber) ...[
              const CatchSheetDragIndicator(),
              const SizedBox(height: CatchLayout.sheetGrabberBottomMargin),
            ],
            if (hasHeader)
              glyph == null
                  ? CatchSheetHeader(
                      title: title,
                      subtitle: subtitle,
                      trailing: right,
                    )
                  : CatchSheetHeader.branded(
                      glyph: glyph!,
                      title: title,
                      subtitle: subtitle,
                      trailing: right,
                    ),
            if (hasHeader)
              const SizedBox(height: CatchLayout.sheetHeaderBodyGap),
            child,
            if (footer != null && !pinFooter) ...[gapH16, footer],
          ],
        ),
      ),
    );
    if (_standard) {
      // Keyboard obstruction belongs outside the scrollable surface so content
      // remains visible rather than requiring a scroll through keyboard padding.
      final keyboard = mediaQuery?.viewInsets.bottom ?? 0.0;
      return LayoutBuilder(
        builder: (context, constraints) {
          final mediaHeight = mediaQuery?.size.height ?? 0.0;
          final viewportHeight = mediaHeight > 0
              ? mediaHeight
              : constraints.maxHeight;
          final availableHeight = math.min(
            constraints.hasBoundedHeight
                ? constraints.maxHeight
                : viewportHeight,
            viewportHeight - (mediaQuery?.padding.top ?? 0.0),
          );
          final height =
              math.max(0.0, availableHeight - keyboard) *
              CatchLayout.sheetViewportMaxHeightFraction;
          return Padding(
            padding: EdgeInsets.only(bottom: keyboard),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: height,
                maxWidth: CatchLayout.maxContentWidth,
              ),
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(CatchLayout.sheetTopRadius),
                ),
                child: pinFooter && footer != null
                    ? CatchLegacySurface(
                        emphasis: CatchSurfaceEmphasis.floating,
                        duration: Duration.zero,
                        borderRadius: content.borderRadius,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Flexible(
                              child: SingleChildScrollView(
                                key: const ValueKey('catch-sheet-scroll'),
                                child: content.child,
                              ),
                            ),
                            Padding(
                              padding: EdgeInsets.fromLTRB(
                                CatchLayout.sheetHorizontalPadding,
                                CatchSpacing.s4,
                                CatchLayout.sheetHorizontalPadding,
                                minimumBottomPadding,
                              ),
                              child: footer,
                            ),
                          ],
                        ),
                      )
                    : SingleChildScrollView(
                        key: const ValueKey('catch-sheet-scroll'),
                        child: content,
                      ),
              ),
            ),
          );
        },
      );
    }
    return mode == CatchSheetMode.scrollable
        ? SingleChildScrollView(child: content)
        : content;
  }

  Widget _containedSheet(BuildContext context) {
    final success = tone == CatchSheetTone.success;
    final ground = CatchRootScope.groundOf(context);
    final t = success ? CatchTokens.light : CatchTokens.of(context);
    final brightness = success
        ? Brightness.light
        : Theme.of(context).brightness;
    final fill = success
        ? t.formatCourts
        : ground.isNight
        ? t.tile
        : t.ground;
    final bottomInset = MediaQuery.maybeOf(context)?.viewPadding.bottom ?? 0.0;
    final title = this.title;
    final kicker = this.kicker;
    final footer = this.footer;
    final radius = scrim
        ? const BorderRadius.vertical(top: Radius.circular(CatchRadius.xl))
        : BorderRadius.circular(CatchRadius.xl);
    Widget panel = DecoratedBox(
      decoration: BoxDecoration(
        color: fill,
        borderRadius: radius,
        boxShadow: scrim
            ? CatchElevation.sheet(brightness)
            : CatchElevation.dialog(brightness),
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          CatchLayout.sheetHorizontalPadding,
          CatchSpacing.s2,
          CatchLayout.sheetHorizontalPadding,
          CatchSpacing.s5 + (scrim ? bottomInset : 0),
        ),
        child: DefaultTextStyle.merge(
          style: TextStyle(color: success ? CatchTokens.editorialBlack : t.ink),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            spacing: CatchSpacing.s5,
            children: [
              if (scrim) const Center(child: CatchSheetDragIndicator()),
              if (title != null || kicker != null)
                Semantics(
                  header: true,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    spacing: CatchSpacing.s1,
                    children: [
                      if (kicker != null)
                        CatchText(
                          kicker,
                          variant: CatchTextVariant.labelKicker,
                          tone: success
                              ? CatchTextTone.inherit
                              : CatchTextTone.secondary,
                        ),
                      if (title != null)
                        CatchText(title, variant: CatchTextVariant.displaySm),
                    ],
                  ),
                ),
              child,
              ?footer,
            ],
          ),
        ),
      ),
    );
    final scope = CatchRootScope.maybeOf(context);
    if (!success && ground.isNight && scope != null) {
      panel = CatchRootScope(
        data: CatchRootScopeData(
          theme: scope.theme,
          sizeClass: scope.sizeClass,
          format: scope.format,
          register: scope.register,
          ground: CatchGround.nightTile,
          reducedMotion: scope.reducedMotion,
        ),
        child: panel,
      );
    }
    if (success) {
      panel = Theme(
        data: CatchTheme.light,
        child: CatchRootScope(
          data: CatchRootScopeData(
            theme: CatchThemeMode.day,
            sizeClass: CatchRootScope.sizeClassOf(context),
            ground: CatchGround.colour,
          ),
          child: panel,
        ),
      );
    }
    final sheet = Semantics(
      scopesRoute: scrim,
      namesRoute: scrim,
      explicitChildNodes: true,
      label: title,
      child: scrim
          ? panel
          : Padding(
              padding: EdgeInsets.fromLTRB(
                CatchSpacing.s2,
                0,
                CatchSpacing.s2,
                CatchSpacing.s2 + bottomInset,
              ),
              child: panel,
            ),
    );
    if (!scrim) return Align(alignment: Alignment.bottomCenter, child: sheet);
    return Stack(
      children: [
        Positioned.fill(
          child: ColoredBox(color: CatchTokens.of(context).scrim),
        ),
        Align(alignment: Alignment.bottomCenter, child: sheet),
      ],
    );
  }
}
