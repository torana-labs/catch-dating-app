import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_button.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:catch_ui/src/primitives/catch_text_input.dart';
import 'package:flutter/material.dart';

/// Where the dock sits. `auto` is a bar fixed to the bottom on compact and
/// medium windows and a floating card on expanded ones; `pane` is the
/// decision bar at the foot of a detail pane.
enum CatchDockPlacement { auto, bar, card, pane }

/// One dock action.
@immutable
class CatchDockAction {
  const CatchDockAction({
    required this.label,
    this.onPressed,
    this.icon,
    this.loading = false,
  });

  final String label;

  /// Null disables the action.
  final VoidCallback? onPressed;

  /// A leading icon.
  final IconData? icon;
  final bool loading;
}

/// The one-line note above a pane dock's actions ("Why? Only your team sees
/// this").
@immutable
class CatchDockNote {
  const CatchDockNote({
    required this.label,
    required this.controller,
    this.placeholder,
    this.onChanged,
  });

  final String label;
  final String? placeholder;

  /// Owned by the caller, so the note survives rebuilds.
  final TextEditingController controller;
  final ValueChanged<String>? onChanged;
}

/// The bottom action bar: one primary action, with a secondary action or a
/// summary beside it, in the system's four placements.
///
/// A bar or a card puts the summary (a price, a date, a count) or the quiet
/// secondary action first and lets the large primary fill the rest. A pane
/// dock puts the note field above a row of what comes next (or the summary)
/// and the actions: the refusing action as a quiet danger button, the
/// secondary, then the primary. Inside a CatchScreen the dock sits below the
/// body, so the body never runs under it.
class CatchDock extends StatelessWidget {
  const CatchDock({
    super.key,
    required this.primary,
    this.secondary,
    this.summary,
    this.placement = CatchDockPlacement.auto,
    this.danger,
    this.note,
    this.next,
  });

  final CatchDockAction primary;
  final CatchDockAction? secondary;

  /// Before the primary: a price, a date, a count. It replaces the secondary
  /// action in a bar or a card.
  final Widget? summary;
  final CatchDockPlacement placement;

  /// `pane` only: the refusing action (Reject, Decline).
  final CatchDockAction? danger;

  /// `pane` only: the note field above the actions.
  final CatchDockNote? note;

  /// `pane` only: what happens after the decision ("Then: Harbor Social · 3
  /// left"), in place of the summary.
  final Widget? next;

  /// [placement] resolved against the CatchRoot size class.
  CatchDockPlacement placementOf(BuildContext context) =>
      placement != CatchDockPlacement.auto
      ? placement
      : CatchRootScope.sizeClassOf(context) == CatchWindowSize.expanded
      ? CatchDockPlacement.card
      : CatchDockPlacement.bar;

  @override
  Widget build(BuildContext context) {
    final tokens = CatchTokens.of(context);
    final place = placementOf(context);
    final safeBottom = MediaQuery.paddingOf(context).bottom;
    final gutter = switch (CatchRootScope.sizeClassOf(context)) {
      CatchWindowSize.compact => GeneratedCatchLayoutTokens.gutterCompact,
      CatchWindowSize.medium => GeneratedCatchLayoutTokens.gutterMedium,
      CatchWindowSize.expanded => GeneratedCatchLayoutTokens.gutterExpanded,
    };
    final hairline = Border(top: BorderSide(color: tokens.line));
    final secondary = this.secondary;
    final danger = this.danger;
    final note = this.note;
    final lead = place == CatchDockPlacement.pane ? next ?? summary : summary;

    if (place == CatchDockPlacement.pane) {
      return DecoratedBox(
        key: const ValueKey<String>('catch_dock.pane'),
        decoration: BoxDecoration(color: tokens.ground, border: hairline),
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            CatchSpacing.s6,
            CatchSpacing.s4,
            CatchSpacing.s6,
            safeBottom + CatchSpacing.s4,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            spacing: CatchSpacing.s3,
            children: [
              if (note != null)
                CatchTextInput(
                  controller: note.controller,
                  onChanged: note.onChanged,
                  decoration: InputDecoration(
                    labelText: note.label,
                    hintText: note.placeholder,
                  ),
                ),
              Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: CatchSpacing.s3,
                runSpacing: CatchSpacing.s3,
                children: [
                  ?lead,
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    spacing: CatchSpacing.s2,
                    children: [
                      if (danger != null)
                        CatchButton(
                          label: danger.label,
                          onPressed: danger.onPressed,
                          variant: CatchButtonVariant.quiet,
                          size: CatchButtonSize.md,
                          foregroundColor: tokens.deepCoral,
                        ),
                      if (secondary != null)
                        CatchButton(
                          label: secondary.label,
                          onPressed: secondary.onPressed,
                          variant: CatchButtonVariant.secondary,
                          size: CatchButtonSize.md,
                        ),
                      CatchButton(
                        label: primary.label,
                        onPressed: primary.onPressed,
                        size: CatchButtonSize.md,
                        status: primary.loading
                            ? CatchButtonStatus.loading
                            : CatchButtonStatus.idle,
                        leading: primary.icon == null
                            ? null
                            : Icon(primary.icon),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    final card = place == CatchDockPlacement.card;
    final first = lead != null
        ? Padding(
            padding: const EdgeInsetsDirectional.only(end: CatchSpacing.s2),
            child: lead,
          )
        : secondary == null
        ? null
        : CatchButton(
            label: secondary.label,
            onPressed: secondary.onPressed,
            variant: CatchButtonVariant.quiet,
            size: CatchButtonSize.lg,
          );
    final primaryButton = CatchButton(
      label: primary.label,
      onPressed: primary.onPressed,
      size: CatchButtonSize.lg,
      fullWidth: true,
      status: primary.loading
          ? CatchButtonStatus.loading
          : CatchButtonStatus.idle,
      leading: primary.icon == null ? null : Icon(primary.icon),
    );
    if (card) {
      return Padding(
        key: const ValueKey<String>('catch_dock.card'),
        padding: EdgeInsets.fromLTRB(
          gutter,
          CatchSpacing.s3,
          gutter,
          safeBottom + CatchSpacing.s4,
        ),
        child: CatchSurface(
          block: CatchSurfaceBlock.floating,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            spacing: CatchSpacing.micro10,
            children: [?first, primaryButton],
          ),
        ),
      );
    }
    return DecoratedBox(
      key: const ValueKey<String>('catch_dock.bar'),
      decoration: BoxDecoration(color: tokens.ground, border: hairline),
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          gutter,
          CatchSpacing.s3,
          gutter,
          safeBottom + CatchSpacing.s2,
        ),
        child: Row(
          spacing: CatchSpacing.micro10,
          children: [
            if (first != null) Flexible(child: first),
            Expanded(child: primaryButton),
          ],
        ),
      ),
    );
  }
}
