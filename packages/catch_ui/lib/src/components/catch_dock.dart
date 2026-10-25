import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/foundations/catch_adaptive_platform.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_divider.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:flutter/material.dart';

enum CatchDockVariant { utility, primary, primaryContent, pageAction }

typedef _PrimaryAction = ({
  String label,
  VoidCallback? onPressed,
  Widget? leading,
  Key? buttonKey,
  bool isLoading,
  Color? buttonAccentColor,
  CatchButtonMode buttonMode,
  String? catchLine,
  Color? catchLineAccent,
  String? footnote,
  double bottomPadding,
});

/// Persistent control surface with utility and primary-action recipes.
///
/// Utilities retain anchored chrome. [CatchDock.primary] selects
/// floating Cupertino or anchored Material chrome. The [CatchDock.primaryContent]
/// recipe reuses the action body when its caller already owns the surface.
class CatchDock extends StatelessWidget {
  const CatchDock({
    super.key,
    required Widget this.child,
    this.padding = const EdgeInsets.fromLTRB(
      CatchSpacing.s4,
      CatchSpacing.s3,
      CatchSpacing.s4,
      CatchSpacing.s3,
    ),
    this.includeSafeArea = true,
  }) : variant = CatchDockVariant.utility,
       _primary = null,
       backgroundColor = null,
       dividerColor = null;

  const CatchDock.primary({
    super.key,
    required String label,
    required VoidCallback? onPressed,
    Widget? leading,
    Key? buttonKey,
    bool isLoading = false,
    this.backgroundColor,
    this.dividerColor,
    Color? buttonAccentColor,
    CatchButtonMode buttonMode = CatchButtonMode.pill,
    String? catchLine,
    Color? catchLineAccent,
    String? footnote,
  }) : variant = CatchDockVariant.primary,
       child = null,
       padding = EdgeInsets.zero,
       includeSafeArea = true,
       _primary = (
         label: label,
         onPressed: onPressed,
         leading: leading,
         buttonKey: buttonKey,
         isLoading: isLoading,
         buttonAccentColor: buttonAccentColor,
         buttonMode: buttonMode,
         catchLine: catchLine,
         catchLineAccent: catchLineAccent,
         footnote: footnote,
         bottomPadding: CatchSpacing.s3,
       );

  /// One persistent page action without a floating card or perimeter.
  /// The scaffold reserves its actual height, including the safe area, and
  /// positions snackbars above it so feedback never blocks the next action.
  const CatchDock.pageAction({
    super.key,
    required String label,
    required VoidCallback? onPressed,
    Key? buttonKey,
    bool isLoading = false,
  }) : variant = CatchDockVariant.pageAction,
       child = null,
       padding = EdgeInsets.zero,
       includeSafeArea = true,
       backgroundColor = null,
       dividerColor = null,
       _primary = (
         label: label,
         onPressed: onPressed,
         leading: null,
         buttonKey: buttonKey,
         isLoading: isLoading,
         buttonAccentColor: null,
         buttonMode: CatchButtonMode.pill,
         catchLine: null,
         catchLineAccent: null,
         footnote: null,
         bottomPadding: CatchSpacing.s3,
       );

  const CatchDock.primaryContent({
    super.key,
    required String label,
    required VoidCallback? onPressed,
    Widget? leading,
    Key? buttonKey,
    bool isLoading = false,
    Color? buttonAccentColor,
    CatchButtonMode buttonMode = CatchButtonMode.pill,
    String? catchLine,
    Color? catchLineAccent,
    String? footnote,
    double bottomPadding = CatchSpacing.s3,
  }) : variant = CatchDockVariant.primaryContent,
       child = null,
       padding = EdgeInsets.zero,
       includeSafeArea = false,
       backgroundColor = null,
       dividerColor = null,
       _primary = (
         label: label,
         onPressed: onPressed,
         leading: leading,
         buttonKey: buttonKey,
         isLoading: isLoading,
         buttonAccentColor: buttonAccentColor,
         buttonMode: buttonMode,
         catchLine: catchLine,
         catchLineAccent: catchLineAccent,
         footnote: footnote,
         bottomPadding: bottomPadding,
       );

  final CatchDockVariant variant;
  final Widget? child;
  final EdgeInsetsGeometry padding;
  final bool includeSafeArea;
  final Color? backgroundColor;
  final Color? dividerColor;
  final _PrimaryAction? _primary;

  CatchButtonMode get buttonMode =>
      _primary?.buttonMode ?? CatchButtonMode.pill;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final action = _primary;
    final floating =
        variant == CatchDockVariant.primary &&
        prefersCupertinoControls(platform: Theme.of(context).platform);
    final bottomPadding =
        (action?.bottomPadding ?? 0) +
        (variant == CatchDockVariant.primary && !floating
            ? MediaQuery.paddingOf(context).bottom
            : 0);

    final body = action == null
        ? Padding(padding: padding, child: child)
        : Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (action.catchLine != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    CatchSpacing.s4,
                    CatchSpacing.s2,
                    CatchSpacing.s4,
                    CatchSpacing.s0,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        CatchIcons.sparkle,
                        size: CatchIconSize.xs,
                        color: action.catchLineAccent ?? t.ink2,
                      ),
                      const SizedBox(width: CatchSpacing.micro6),
                      Flexible(
                        child: Text(
                          action.catchLine!.toUpperCase(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: CatchTextStyles.monoLabel(
                            context,
                            color: t.ink2,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              Padding(
                padding: EdgeInsets.fromLTRB(
                  variant == CatchDockVariant.pageAction
                      ? CatchSpacing.screenPx
                      : CatchSpacing.s4,
                  CatchSpacing.s3,
                  variant == CatchDockVariant.pageAction
                      ? CatchSpacing.screenPx
                      : CatchSpacing.s4,
                  bottomPadding,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        if (action.leading != null) ...[
                          action.leading!,
                          gapW14,
                        ],
                        Expanded(
                          child: CatchButton(
                            key: action.buttonKey,
                            label: action.label,
                            onPressed: action.onPressed,
                            size: CatchButtonSize.lg,
                            status: action.isLoading
                                ? CatchButtonStatus.loading
                                : CatchButtonStatus.idle,
                            fullWidth: true,
                            mode: action.buttonMode,
                            accentColor: action.buttonAccentColor,
                          ),
                        ),
                      ],
                    ),
                    if (action.footnote != null) ...[
                      const SizedBox(height: CatchSpacing.s2),
                      Text(
                        action.footnote!,
                        textAlign: TextAlign.center,
                        style: CatchTextStyles.monoLabelS(
                          context,
                          color: t.ink3,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          );
    if (variant == CatchDockVariant.primaryContent) return body;

    if (variant == CatchDockVariant.pageAction) {
      return ColoredBox(
        key: const ValueKey('catch_bottom_action.page_action'),
        color: t.bg,
        child: SafeArea(top: false, child: body),
      );
    }
    final radius = floating ? BorderRadius.circular(CatchRadius.lg) : null;
    final dock = DecoratedBox(
      key: action == null
          ? null
          : ValueKey(
              floating
                  ? 'catch_bottom_action.floating_chrome'
                  : 'catch_bottom_action.anchored_chrome',
            ),
      decoration: BoxDecoration(
        color: backgroundColor ?? t.surface,
        border: floating
            ? Border.all(color: dividerColor ?? t.line)
            : action == null
            ? Border(top: BorderSide(color: t.line))
            : null,
        borderRadius: radius,
        boxShadow: floating ? CatchElevation.raised : null,
      ),
      child: floating
          ? ClipRRect(borderRadius: radius!, child: body)
          : action == null
          ? body
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CatchDivider.section(color: dividerColor),
                body,
              ],
            ),
    );
    if (floating) {
      return SafeArea(
        top: false,
        minimum: const EdgeInsets.fromLTRB(
          CatchSpacing.screenPx,
          CatchSpacing.s0,
          CatchSpacing.screenPx,
          CatchSpacing.s2,
        ),
        child: dock,
      );
    }
    return action == null && includeSafeArea
        ? SafeArea(top: false, child: dock)
        : dock;
  }
}
