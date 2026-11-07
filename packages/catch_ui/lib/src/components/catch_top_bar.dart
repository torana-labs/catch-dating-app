import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_avatar.dart';
import 'package:catch_ui/src/components/catch_badge.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/components/catch_icon_action.dart';
import 'package:catch_ui/src/components/catch_search_field.dart';
import 'package:catch_ui/src/components/catch_top_bar_search.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/patterns/catch_screen.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// The six app tops. `tabHome` is a tab's own screen, `tool` a sub-screen
/// with back, `subject` sits over a hero, `step` is a step in a flow,
/// `live` is the night console and `moment` is a full-screen moment with
/// close only. The system's `site` header is web-only.
enum CatchTopBarVariant { tabHome, tool, subject, step, live, moment }

/// Back (or close) at the start of a top bar.
@immutable
class CatchTopBarBack {
  const CatchTopBarBack({this.label, this.onPressed, this.close = false});

  /// The tooltip and screen-reader label; null uses the platform's back or
  /// close label.
  final String? label;

  /// Null pops the nearest navigator.
  final VoidCallback? onPressed;

  /// Draws close instead of back (a moment, a sheet-like flow).
  final bool close;
}

/// The one text action at the end of a top bar: "Reset", "Preview", "Save".
@immutable
class CatchTopBarAction {
  const CatchTopBarAction({required this.label, this.onPressed});

  final String label;

  /// Null disables the action.
  final VoidCallback? onPressed;
}

/// Where a step top bar is in its flow.
@immutable
class CatchTopBarStep {
  const CatchTopBarStep({
    required this.index,
    required this.total,
    required this.label,
  }) : assert(total > 0 && index >= 1 && index <= total);

  /// One-based position of the current step.
  final int index;
  final int total;

  /// The caller's localized position, such as "Step 2 of 5": the compact
  /// kicker, the wide breadcrumb and the meter's screen-reader label.
  final String label;
}

/// Who a tab-home bar acts as on a phone: the organizer's avatar, which
/// opens the switcher. On wider windows the navigation's header carries it.
@immutable
class CatchTopBarIdentity {
  const CatchTopBarIdentity({
    required this.name,
    required this.label,
    this.photoUrl,
    this.initials,
    this.onTap,
  });

  /// The name behind the avatar's initials.
  final String name;

  /// The press label, such as "Lantern Lane Social. Switch organiser".
  final String label;
  final String? photoUrl;
  final String? initials;
  final VoidCallback? onTap;
}

/// The top of every screen, in the system's six app variants.
///
/// On medium and expanded windows every variant but [CatchTopBarVariant.moment]
/// is one 56 px row: back or close as a small ghost icon button, the kicker as a
/// muted breadcrumb before a one-line title, then the live badge, the text
/// action and [actions]. On compact windows each variant has its own shape:
/// `tabHome` puts the kicker over a section-size title, `step` adds a
/// segmented meter, `moment` shows close only, and `tool`, `subject` and
/// `live` are a three-column row of back, titles and actions.
///
/// The bar reads [CatchScreenScope]: it shows its hairline only once the body
/// has scrolled, and a `subject` bar stays transparent over its hero (titles
/// hidden) until then. A `tabHome` bar ends with its [identity] on compact
/// windows and starts its actions with the fixed [search] field on expanded
/// ones; otherwise a top bar holds no search or footer, which belong to the
/// body.
class CatchTopBar extends StatelessWidget {
  const CatchTopBar({
    super.key,
    required this.variant,
    this.title,
    this.kicker,
    this.back,
    this.action,
    this.actions = const <Widget>[],
    this.step,
    this.live,
    this.identity,
    this.search,
  });

  final CatchTopBarVariant variant;
  final String? title;

  /// Above the title on compact bars (below it on `live`); a breadcrumb before
  /// it on wide bars.
  final String? kicker;
  final CatchTopBarBack? back;
  final CatchTopBarAction? action;

  /// Icon buttons or a button after the text action.
  final List<Widget> actions;

  /// `step` only: the position, the meter and the breadcrumb.
  final CatchTopBarStep? step;

  /// The live badge, such as "Live · 9:04 PM".
  final String? live;

  /// `tabHome` on compact windows: the avatar at the end of the bar.
  final CatchTopBarIdentity? identity;

  /// `tabHome` on expanded windows: a search field before the actions,
  /// 240 to 360 px wide.
  final CatchTopBarSearch? search;

  /// The search field's share of the window, between its 240 and 360 px.
  static const double _searchWidthRatio = 0.28;

  @override
  Widget build(BuildContext context) {
    final tokens = CatchTokens.of(context);
    final sizeClass = CatchRootScope.sizeClassOf(context);
    final scrolled = CatchScreenScope.scrolledOf(context);
    final safeTop = MediaQuery.paddingOf(context).top;
    final gutter = switch (sizeClass) {
      CatchWindowSize.compact => GeneratedCatchLayoutTokens.gutterCompact,
      CatchWindowSize.medium => GeneratedCatchLayoutTokens.gutterMedium,
      CatchWindowSize.expanded => GeneratedCatchLayoutTokens.gutterExpanded,
    };
    final wide =
        sizeClass != CatchWindowSize.compact &&
        variant != CatchTopBarVariant.moment;
    final subject = variant == CatchTopBarVariant.subject;
    final transparent =
        variant == CatchTopBarVariant.moment || (subject && !scrolled);
    final titlesHidden = subject && !scrolled;
    final localizations = MaterialLocalizations.of(context);
    final back = this.back;
    final backLabel =
        back?.label ??
        (back?.close ?? false
            ? localizations.closeButtonTooltip
            : localizations.backButtonTooltip);
    final onBack = back?.onPressed ?? () => Navigator.of(context).maybePop();
    final backIcon = back?.close ?? false ? CatchIcons.close : CatchIcons.back;
    final action = this.action;
    final step = this.step;
    final crumb = variant == CatchTopBarVariant.step && step != null
        ? step.label
        : kicker;
    final tabHome = variant == CatchTopBarVariant.tabHome;
    final search = tabHome && sizeClass == CatchWindowSize.expanded
        ? this.search
        : null;
    final identity = tabHome && sizeClass == CatchWindowSize.compact
        ? this.identity
        : null;
    final trailing = <Widget>[
      if (search != null)
        SizedBox(
          width: (MediaQuery.sizeOf(context).width * _searchWidthRatio).clamp(
            GeneratedCatchLayoutTokens.sidebar,
            GeneratedCatchLayoutTokens.paneList,
          ),
          child: CatchSearchField.expanded(
            key: search.fieldKey,
            copy: search.copy,
            value: search.value,
            contract: search.contract,
            contractExemption: search.contractExemption,
            placeholder: search.placeholder,
            onChanged: search.onChanged,
            autofocus: search.autofocus,
            enabled: search.enabled,
            textInputAction: search.textInputAction,
            onSubmitted: search.onSubmitted,
            onFocusChanged: search.onFocusChanged,
            semanticLabel: search.semanticLabel ?? search.placeholder,
          ),
        ),
      if (live case final live?) CatchBadge.live(label: live),
      if (action != null)
        CatchButton(
          label: action.label,
          onPressed: action.onPressed,
          variant: CatchButtonVariant.quiet,
          size: wide ? CatchButtonSize.sm : CatchButtonSize.md,
        ),
      ...actions,
      if (identity != null)
        Semantics(
          button: true,
          label: identity.label,
          child: ExcludeSemantics(
            child: InkWell(
              onTap: identity.onTap,
              customBorder: const CircleBorder(),
              child: CatchAvatar(
                size: GeneratedCatchSizeTokens.avatarMd,
                name: identity.name,
                imageUrl: identity.photoUrl,
                initials: identity.initials,
              ),
            ),
          ),
        ),
    ];
    final trailingRow = trailing.isEmpty
        ? null
        : Row(
            mainAxisSize: MainAxisSize.min,
            spacing: CatchSpacing.s2,
            children: trailing,
          );
    final titleText = title == null
        ? null
        : Semantics(
            header: true,
            child: CatchText(
              title!,
              variant: CatchTextVariant.titleBar,
              maxLines: 1,
            ),
          );
    final kickerText = kicker == null
        ? null
        : CatchText(
            kicker!,
            variant: CatchTextVariant.labelKicker,
            tone: CatchTextTone.secondary,
            maxLines: 1,
          );

    final Widget content;
    final EdgeInsets padding;
    if (wide) {
      padding = EdgeInsets.fromLTRB(gutter, safeTop, gutter, 0);
      content = ConstrainedBox(
        constraints: const BoxConstraints(minHeight: CatchLayout.topBarHeight),
        child: Row(
          spacing: CatchSpacing.s3,
          children: [
            if (back != null)
              CatchIconAction.icon(
                icon: backIcon,
                tooltip: backLabel,
                onPressed: onBack,
                variant: CatchIconActionVariant.plain,
                size: GeneratedCatchSizeTokens.controlSm,
              ),
            Expanded(
              child: AnimatedOpacity(
                opacity: titlesHidden ? 0 : 1,
                duration: CatchMotion.quick,
                child: ExcludeSemantics(
                  excluding: titlesHidden,
                  child: LayoutBuilder(
                    // The breadcrumb gives way before the title does.
                    builder: (context, constraints) => Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      spacing: CatchSpacing.s2,
                      children: [
                        if (crumb != null) ...[
                          Flexible(
                            child: CatchText(
                              crumb,
                              tone: CatchTextTone.secondary,
                              maxLines: 1,
                            ),
                          ),
                          const ExcludeSemantics(
                            child: CatchText('/', tone: CatchTextTone.tertiary),
                          ),
                        ],
                        if (titleText != null)
                          ConstrainedBox(
                            constraints: BoxConstraints(
                              maxWidth: crumb == null
                                  ? constraints.maxWidth
                                  : constraints.maxWidth *
                                        CatchLayout.topBarTrailingMaxRatio,
                            ),
                            child: titleText,
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            ?trailingRow,
          ],
        ),
      );
    } else {
      padding = EdgeInsets.fromLTRB(
        gutter,
        safeTop +
            (variant == CatchTopBarVariant.tabHome
                ? CatchSpacing.s3
                : CatchSpacing.s2),
        gutter,
        CatchSpacing.s2,
      );
      const rowHeight = BoxConstraints(
        minHeight: GeneratedCatchSizeTokens.controlMd,
      );
      final outlinedBack = back == null
          ? null
          : CatchIconAction.icon(
              icon: backIcon,
              tooltip: backLabel,
              onPressed: onBack,
              variant: subject
                  ? CatchIconActionVariant.float
                  : CatchIconActionVariant.bordered,
              size: GeneratedCatchSizeTokens.controlMd,
            );
      content = switch (variant) {
        CatchTopBarVariant.tabHome => ConstrainedBox(
          constraints: rowHeight,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            spacing: CatchSpacing.s3,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  spacing: CatchSpacing.s1,
                  children: [
                    if (kicker != null)
                      CatchText(
                        kicker!,
                        variant: CatchTextVariant.labelKicker,
                        tone: CatchTextTone.secondary,
                      ),
                    if (title != null)
                      Semantics(
                        header: true,
                        child: CatchText(
                          title!,
                          variant: CatchTextVariant.displaySection,
                        ),
                      ),
                  ],
                ),
              ),
              ?trailingRow,
            ],
          ),
        ),
        CatchTopBarVariant.step => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          spacing: CatchSpacing.micro14,
          children: [
            ConstrainedBox(
              constraints: rowHeight,
              child: Row(
                spacing: CatchSpacing.s3,
                children: [
                  ?outlinedBack,
                  if (crumb != null)
                    Expanded(
                      child: CatchText(
                        crumb,
                        variant: CatchTextVariant.labelKicker,
                        tone: CatchTextTone.secondary,
                        maxLines: 1,
                      ),
                    ),
                  ?trailingRow,
                ],
              ),
            ),
            if (step != null)
              Semantics(
                label: step.label,
                child: ExcludeSemantics(
                  child: Row(
                    spacing: CatchSpacing.s1,
                    children: [
                      for (var index = 1; index <= step.total; index++)
                        Expanded(
                          child: SizedBox(
                            height: GeneratedCatchStrokeTokens.meterSm,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: index <= step.index
                                    ? tokens.primary
                                    : tokens.track,
                                borderRadius: BorderRadius.circular(
                                  CatchRadius.pill,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            if (title != null)
              Semantics(
                header: true,
                child: CatchText(
                  title!,
                  variant: CatchTextVariant.displaySection,
                ),
              ),
          ],
        ),
        CatchTopBarVariant.moment => ConstrainedBox(
          constraints: rowHeight,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (back != null)
                CatchIconAction.icon(
                  icon: CatchIcons.close,
                  tooltip: back.label ?? localizations.closeButtonTooltip,
                  onPressed: onBack,
                  variant: CatchIconActionVariant.plain,
                  size: GeneratedCatchSizeTokens.controlMd,
                ),
            ],
          ),
        ),
        CatchTopBarVariant.tool ||
        CatchTopBarVariant.subject ||
        CatchTopBarVariant.live => ConstrainedBox(
          constraints: rowHeight,
          child: Row(
            spacing: CatchSpacing.s3,
            children: [
              outlinedBack ??
                  SizedBox(
                    width: CatchIconAction.targetExtentFor(
                      GeneratedCatchSizeTokens.controlMd,
                    ),
                  ),
              Expanded(
                child: AnimatedOpacity(
                  opacity: titlesHidden ? 0 : 1,
                  duration: CatchMotion.quick,
                  child: ExcludeSemantics(
                    excluding: titlesHidden,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      spacing: CatchSpacing.micro2,
                      children: [
                        if (variant != CatchTopBarVariant.live) ?kickerText,
                        ?titleText,
                        if (variant == CatchTopBarVariant.live) ?kickerText,
                      ],
                    ),
                  ),
                ),
              ),
              ?trailingRow,
            ],
          ),
        ),
      };
    }

    return DecoratedBox(
      decoration: BoxDecoration(color: transparent ? null : tokens.ground),
      position: DecorationPosition.background,
      child: DecoratedBox(
        // The hairline paints inside the bar, so it never moves the body.
        decoration: BoxDecoration(
          border: scrolled
              ? Border(bottom: BorderSide(color: tokens.line))
              : const Border(),
        ),
        position: DecorationPosition.foreground,
        child: Padding(padding: padding, child: content),
      ),
    );
  }
}
