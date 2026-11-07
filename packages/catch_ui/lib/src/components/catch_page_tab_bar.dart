import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_choice_input.dart';
import 'package:catch_ui/src/components/catch_choice_input_variant.dart';
import 'package:catch_ui/src/components/catch_option.dart';
import 'package:catch_ui/src/components/catch_primary_rail.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_scaled_preferred_size.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// A segmented control's height: md 40, sm 32.
enum CatchPageTabBarSize {
  md(GeneratedCatchSizeTokens.controlMd),
  sm(GeneratedCatchSizeTokens.controlSm);

  const CatchPageTabBarSize(this.extent);

  final double extent;
}

/// Page-level peer navigation in the canonical scaled app-bar shell.
///
/// [controlled] binds a caller-owned pager to the same option renderer.
/// Product-level bottom navigation remains the responsibility of CatchTabBar.
///
/// [CatchPageTabBar.segmented] is the system Segmented: two to five views of
/// the same thing in a pill track, each with an optional [CatchOption.count];
/// the selected ink pill slides between equal items, or the items keep their
/// own widths and scroll when [fill] is false.
class CatchPageTabBar<T> extends StatelessWidget
    implements CatchPrimaryRail, CatchScaledPreferredSize {
  /// The pinned slot and its content use the same scaled line-box geometry.
  /// The unscaled preferredSize remains the canonical minimum contract.
  static double heightFor(
    BuildContext context, {
    CatchChoiceInputVariant variant = CatchChoiceInputVariant.label,
  }) {
    final style = CatchTextStyles.tabLabel(context);
    final lineHeight =
        MediaQuery.textScalerOf(context).scale(style.fontSize!) * style.height!;
    final contentHeight = lineHeight + CatchSpacing.s4 + CatchSpacing.micro2;
    final gridHeight =
        (contentHeight / CatchSpacing.s1).ceil() * CatchSpacing.s1;
    final inset = variant == CatchChoiceInputVariant.operational
        ? CatchSpacing.s2
        : 0.0;
    return math.max(gridHeight, minimumHeight) + inset;
  }

  static double get minimumHeight => math.max(
    CatchLayout.tabRailHeight,
    CatchPlatformTokens.minimumInteractiveExtent,
  );

  static double minimumHeightFor(CatchChoiceInputVariant variant) =>
      minimumHeight +
      (variant == CatchChoiceInputVariant.operational ? CatchSpacing.s2 : 0);

  const CatchPageTabBar({
    super.key,
    required T this._selected,
    required this.options,
    this.onChanged,
    this.groupKey,
    this.selectionPosition,
    this.trailing,
    this.scrollable = false,
    this.variant = CatchChoiceInputVariant.label,
    this.accent,
    this.backgroundColor,
    this.contentPadding = CatchInsets.screenControlRow,
  }) : controller = null,
       size = CatchPageTabBarSize.md,
       fill = true,
       label = null,
       _segmentedPill = false;

  /// The system Segmented control.
  const CatchPageTabBar.segmented({
    super.key,
    required T this._selected,
    required this.options,
    this.onChanged,
    this.size = CatchPageTabBarSize.md,
    this.fill = true,
    this.label,
  }) : assert(options.length > 0),
       controller = null,
       groupKey = null,
       selectionPosition = null,
       trailing = null,
       scrollable = false,
       variant = CatchChoiceInputVariant.label,
       accent = null,
       backgroundColor = null,
       contentPadding = EdgeInsets.zero,
       _segmentedPill = true;

  /// Shares selection, drag interpolation and geometry with the value recipe.
  /// The caller owns and disposes [controller].
  const CatchPageTabBar.controlled({
    super.key,
    required TabController this.controller,
    required this.options,
    this.groupKey,
    this.trailing,
    this.scrollable = false,
    this.variant = CatchChoiceInputVariant.label,
    this.accent,
    this.backgroundColor,
    this.contentPadding = CatchInsets.screenControlRow,
  }) : assert(options.length > 0),
       assert(options.length == controller.length),
       _selected = null,
       onChanged = null,
       selectionPosition = null,
       size = CatchPageTabBarSize.md,
       fill = true,
       label = null,
       _segmentedPill = false;

  final T? _selected;
  final TabController? controller;

  /// The committed value; drag progress does not change the selected semantics.
  T get selected =>
      controller == null ? _selected as T : options[controller!.index].value;
  final ValueChanged<T>? onChanged;
  final List<CatchOption<T>> options;
  final Key? groupKey;
  final double? selectionPosition;
  final Widget? trailing;
  final bool scrollable;
  final CatchChoiceInputVariant variant;
  final Color? accent;
  final Color? backgroundColor;
  final EdgeInsetsGeometry contentPadding;

  /// Segmented only: the track's height.
  final CatchPageTabBarSize size;

  /// Segmented only: equal items with a sliding pill (true), or items at
  /// their own widths that scroll.
  final bool fill;

  /// Segmented only: the group's screen-reader label, such as "Show guests".
  final String? label;
  final bool _segmentedPill;

  @override
  Size get preferredSize =>
      Size.fromHeight(_segmentedPill ? size.extent : minimumHeightFor(variant));

  @override
  Size preferredSizeFor(BuildContext context, {double? width}) =>
      Size.fromHeight(
        _segmentedPill
            ? size.extent
            : CatchPageTabBar.heightFor(context, variant: variant),
      );

  @override
  Widget build(BuildContext context) {
    if (_segmentedPill) {
      return _CatchSegmentedPill<T>(
        selected: selected,
        options: options,
        onChanged: onChanged,
        size: size,
        fill: fill,
        label: label,
      );
    }
    final t = CatchTokens.of(context);
    final operational = variant == CatchChoiceInputVariant.operational;

    return AnimatedBuilder(
      animation: controller?.animation ?? kAlwaysDismissedAnimation,
      builder: (context, _) => ColoredBox(
        color: backgroundColor ?? t.bg,
        child: Padding(
          padding: operational
              ? const EdgeInsets.symmetric(horizontal: CatchSpacing.s4)
              : EdgeInsets.zero,
          child: SizedBox(
            height: heightFor(context, variant: variant),
            child: DecoratedBox(
              decoration: operational
                  ? BoxDecoration(
                      color: t.raised,
                      borderRadius: BorderRadius.circular(CatchRadius.pill),
                      border: CatchBorder.resolve(
                        t,
                        CatchBorderRole.boundary,
                      ).all,
                    )
                  : const BoxDecoration(),
              child: CatchChoiceInput<T>.segmented(
                key: groupKey,
                selected: selected,
                onChanged: controller == null
                    ? onChanged
                    : (value) {
                        final index = options.indexWhere(
                          (option) => option.value == value,
                        );
                        if (index != -1) controller!.animateTo(index);
                      },
                options: options,
                selectionPosition:
                    controller?.animation?.value ?? selectionPosition,
                trailing: trailing,
                scrollable: scrollable,
                variant: variant,
                accent: accent,
                contentPadding: operational
                    ? const EdgeInsets.all(CatchSpacing.s1)
                    : contentPadding,
                showDivider: !operational,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CatchSegmentedPill<T> extends StatelessWidget {
  const _CatchSegmentedPill({
    required this.selected,
    required this.options,
    required this.onChanged,
    required this.size,
    required this.fill,
    required this.label,
  });

  final T selected;
  final List<CatchOption<T>> options;
  final ValueChanged<T>? onChanged;
  final CatchPageTabBarSize size;
  final bool fill;
  final String? label;

  /// The track's inset around the pill.
  static const double _inset = CatchSpacing.micro3;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final ground = CatchRootScope.groundOf(context);
    final index = options
        .indexWhere((option) => option.value == selected)
        .clamp(0, options.length - 1);
    final duration = MediaQuery.maybeOf(context)?.disableAnimations ?? false
        ? Duration.zero
        : GeneratedCatchDurationTokens.standard;
    final radius = BorderRadius.circular(CatchRadius.pill);
    Widget item(int at, double? width) {
      final option = options[at];
      final on = at == index;
      final count = option.count;
      final color = on ? t.onPrimary : t.ink;
      final body = Padding(
        padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.s3),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          spacing: CatchSpacing.micro6,
          children: [
            Flexible(
              child: CatchText(
                option.label,
                variant: CatchTextVariant.labelAction,
                maxLines: 1,
              ),
            ),
            if (count != null)
              Opacity(
                opacity: _countOpacity,
                child: CatchText(
                  '$count',
                  variant: CatchTextVariant.labelAction,
                  numeric: true,
                ),
              ),
          ],
        ),
      );
      final pressable = option.enabled && onChanged != null;
      return Semantics(
        selected: on,
        button: true,
        enabled: pressable,
        label: [
          option.semanticLabel ?? option.label,
          ?count?.toString(),
        ].join(' '),
        excludeSemantics: true,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: pressable ? () => onChanged!(option.value) : null,
          child: AnimatedDefaultTextStyle(
            duration: duration,
            style: TextStyle(color: color),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: width == null && on ? t.primary : null,
                borderRadius: radius,
              ),
              child: SizedBox(
                width: width,
                child: Center(
                  widthFactor: width == null ? 1 : null,
                  child: body,
                ),
              ),
            ),
          ),
        ),
      );
    }

    final scroller = SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [for (var at = 0; at < options.length; at++) item(at, null)],
      ),
    );
    final track = !fill
        ? scroller
        : LayoutBuilder(
            builder: (context, constraints) {
              // Each item keeps at least its own width and shares the rest
              // equally; when they cannot all fit the track scrolls.
              final natural = [
                for (final option in options) _naturalWidth(context, option),
              ];
              final total = natural.fold<double>(0, (sum, w) => sum + w);
              if (total > constraints.maxWidth) return scroller;
              final share = (constraints.maxWidth - total) / options.length;
              final widths = [for (final w in natural) w + share];
              final start = widths
                  .take(index)
                  .fold<double>(0, (sum, w) => sum + w);
              return Stack(
                children: [
                  AnimatedPositioned(
                    duration: duration,
                    curve: GeneratedCatchEasingTokens.standard,
                    left: start,
                    top: 0,
                    bottom: 0,
                    width: widths[index],
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: t.primary,
                        borderRadius: radius,
                      ),
                    ),
                  ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      for (var at = 0; at < options.length; at++)
                        item(at, widths[at]),
                    ],
                  ),
                ],
              );
            },
          );
    return Semantics(
      container: true,
      label: label,
      child: SizedBox(
        height: size.extent,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: ground == CatchGround.tile || ground == CatchGround.nested
                ? t.nested
                : t.tile,
            borderRadius: radius,
          ),
          child: Padding(padding: const EdgeInsets.all(_inset), child: track),
        ),
      ),
    );
  }

  /// A count after its label, at 66% of the item's ink.
  static const double _countOpacity = 0.66;

  /// An item's label, count and padding, measured in the label role.
  static double _naturalWidth(
    BuildContext context,
    CatchOption<Object?> option,
  ) {
    final style = CatchTextVariant.labelAction.style(
      CatchRootScope.sizeClassOf(context),
    );
    final scaler = MediaQuery.textScalerOf(context);
    double measure(String text) {
      final painter = TextPainter(
        text: TextSpan(text: text, style: style),
        textDirection: Directionality.of(context),
        textScaler: scaler,
        maxLines: 1,
      )..layout();
      final width = painter.width;
      painter.dispose();
      return width;
    }

    final count = option.count;
    return measure(option.label) +
        (count == null ? 0 : CatchSpacing.micro6 + measure('$count')) +
        CatchSpacing.s3 * 2 +
        CatchStroke.hairline;
  }
}
