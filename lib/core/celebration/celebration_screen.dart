import 'dart:async';

import 'package:catch_dating_app/core/celebration/celebration_effects_controller.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _celebrationInk = CatchCelebrationColors.ink;
const _celebrationCream = CatchCelebrationColors.cream;
const _celebrationActionInk = CatchCelebrationColors.actionInk;

class CelebrationDetail {
  const CelebrationDetail({
    required this.label,
    required this.value,
    this.icon,
  });

  final String label;
  final String value;
  final IconData? icon;
}

class CelebrationAction {
  const CelebrationAction({
    this.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.variant = CatchButtonVariant.primary,
  });

  final Key? key;
  final String label;
  final VoidCallback onPressed;
  final Widget? icon;
  final CatchButtonVariant variant;
}

class CelebrationScreen extends ConsumerStatefulWidget {
  const CelebrationScreen({
    super.key,
    required this.kind,
    required this.title,
    required this.message,
    required this.primaryAction,
    this.eyebrow,
    this._icon,
    this.visual,
    this.details = const [],
    this.note,
    this.supplementalChildren = const [],
    this.secondaryAction,
    this.onClose,
    this.showCloseButton,
    this.playEffects = true,
  });

  final CelebrationMomentKind kind;
  final String? eyebrow;
  final String title;
  final String message;
  final IconData? _icon;
  final Widget? visual;
  final List<CelebrationDetail> details;
  final String? note;
  final List<Widget> supplementalChildren;
  final CelebrationAction primaryAction;
  final CelebrationAction? secondaryAction;
  final VoidCallback? onClose;
  final bool? showCloseButton;
  final bool playEffects;

  IconData get icon => _icon ?? CatchIcons.checkRounded;

  @override
  ConsumerState<CelebrationScreen> createState() =>
      _CatchCelebrationScreenState();
}

class _CatchCelebrationScreenState extends ConsumerState<CelebrationScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.playEffects) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        unawaited(
          ref.read(celebrationEffectsControllerProvider).play(widget.kind),
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final details = widget.details;
    final secondaryAction = widget.secondaryAction;
    final showCloseButton = widget.showCloseButton ?? widget.onClose != null;

    final body = DecoratedBox(
      decoration: BoxDecoration(gradient: t.heroGrad),
      child: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              physics: const ClampingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(
                CatchSpacing.s5,
                CatchSpacing.s4,
                CatchSpacing.s5,
                CatchSpacing.s5,
              ),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight:
                      constraints.maxHeight -
                      CatchLayout.celebrationViewportVerticalPadding,
                ),
                child: IntrinsicHeight(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Align(
                        alignment: Alignment.centerRight,
                        child: !showCloseButton || widget.onClose == null
                            ? gapH44
                            : CatchIconAction(
                                backgroundColor: _celebrationCream.withValues(
                                  alpha: 0.22,
                                ),
                                onPressed: widget.onClose,
                                child: Icon(
                                  CatchIcons.closeRounded,
                                  color: _celebrationInk,
                                ),
                              ),
                      ),
                      gapH36,
                      Align(
                        alignment: Alignment.centerLeft,
                        child:
                            widget.visual ?? CelebrationIcon(icon: widget.icon),
                      ),
                      gapH24,
                      if (widget.eyebrow != null) ...[
                        Text(
                          widget.eyebrow!.toUpperCase(),
                          style: CatchTextStyles.statusLabel(
                            context,
                            color: _celebrationCream.withValues(alpha: 0.9),
                          ).copyWith(fontWeight: FontWeight.w800),
                        ),
                        gapH8,
                      ],
                      Text(
                        widget.title,
                        style: CatchTextStyles.display(
                          context,
                          color: _celebrationCream,
                        ),
                      ),
                      gapH14,
                      CatchText(
                        widget.message,
                        variant: CatchTextVariant.bodyL,
                        color: _celebrationCream.withValues(alpha: 0.92),
                      ),
                      if (details.isNotEmpty) ...[
                        gapH28,
                        CelebrationDetailsCard(details: details),
                      ],
                      if (widget.note != null) ...[
                        gapH16,
                        CelebrationNote(note: widget.note!),
                      ],
                      for (final child in widget.supplementalChildren) ...[
                        gapH16,
                        child,
                      ],
                      const Spacer(),
                      gapH32,
                      CatchButton(
                        key: widget.primaryAction.key,
                        label: widget.primaryAction.label,
                        onPressed: widget.primaryAction.onPressed,
                        leading: widget.primaryAction.icon,
                        variant: CatchButtonVariant.light,
                        fullWidth: true,
                        backgroundColor: _celebrationCream,
                        foregroundColor: _celebrationActionInk,
                      ),
                      if (secondaryAction != null) ...[
                        gapH12,
                        CatchButton(
                          key: secondaryAction.key,
                          label: secondaryAction.label,
                          onPressed: secondaryAction.onPressed,
                          leading: secondaryAction.icon,
                          variant: secondaryAction.variant,
                          fullWidth: true,
                          backgroundColor: _celebrationCream.withValues(
                            alpha: 0.58,
                          ),
                          foregroundColor: _celebrationActionInk,
                          borderColor: _celebrationActionInk.withValues(
                            alpha: 0.16,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
    return CatchScaffold.standalone(
      safeArea: CatchScaffoldPlacement.none,
      extendBody: true,
      body: body,
    );
  }
}

class PaperCelebrationScaffold extends StatelessWidget {
  const PaperCelebrationScaffold({
    super.key,
    required this.title,
    required this.message,
    required this.primaryAction,
    this.eyebrow,
    this.icon,
    this.visual,
    this.details = const [],
    this.note,
    this.supplementalChildren = const [],
    this.secondaryAction,
    this.onClose,
    this.showCloseButton,
  });

  final String? eyebrow;
  final String title;
  final String message;
  final IconData? icon;
  final Widget? visual;
  final List<CelebrationDetail> details;
  final String? note;
  final List<Widget> supplementalChildren;
  final CelebrationAction primaryAction;
  final CelebrationAction? secondaryAction;
  final VoidCallback? onClose;
  final bool? showCloseButton;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final secondaryAction = this.secondaryAction;
    final showCloseButton = this.showCloseButton ?? onClose != null;

    final body = SafeArea(
      child: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            physics: const ClampingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              CatchSpacing.s5,
              CatchLayout.celebrationPaperTopPadding,
              CatchSpacing.s5,
              CatchLayout.celebrationPaperBottomPadding,
            ),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight:
                    constraints.maxHeight -
                    CatchLayout.celebrationPaperViewportVerticalPadding,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (showCloseButton && onClose != null) ...[
                    Align(
                      alignment: Alignment.centerRight,
                      child: CatchIconAction(
                        backgroundColor: t.primarySoft,
                        onPressed: onClose,
                        child: Icon(CatchIcons.closeRounded, color: t.primary),
                      ),
                    ),
                    gapH20,
                  ],
                  Align(
                    child:
                        visual ??
                        PaperCelebrationIcon(
                          icon: icon ?? CatchIcons.checkRounded,
                        ),
                  ),
                  if (eyebrow != null) ...[
                    gapH16,
                    Text(
                      eyebrow!.toUpperCase(),
                      textAlign: TextAlign.center,
                      style: CatchTextStyles.statusLabel(
                        context,
                        color: t.primary,
                      ).copyWith(fontWeight: FontWeight.w800),
                    ),
                  ],
                  gapH8,
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: CatchTextStyles.display(context, color: t.ink),
                  ),
                  gapH10,
                  Align(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 340),
                      child: CatchText(
                        message,
                        textAlign: TextAlign.center,
                        variant: CatchTextVariant.bodyM,
                        color: t.ink2,
                      ),
                    ),
                  ),
                  if (details.isNotEmpty) ...[
                    gapH24,
                    PaperCelebrationDetailsCard(details: details),
                  ],
                  if (note != null) ...[
                    gapH12,
                    CatchText(
                      note!,
                      textAlign: TextAlign.center,
                      variant: CatchTextVariant.supporting,
                      color: t.ink3,
                    ),
                  ],
                  for (final child in supplementalChildren) ...[gapH18, child],
                  const SizedBox(
                    height: CatchLayout.celebrationPaperActionTopGap,
                  ),
                  CatchButton(
                    key: primaryAction.key,
                    label: primaryAction.label,
                    onPressed: primaryAction.onPressed,
                    leading: primaryAction.icon,
                    fullWidth: true,
                    backgroundColor: t.primary,
                    foregroundColor: t.primaryInk,
                  ),
                  if (secondaryAction != null) ...[
                    gapH10,
                    CatchButton(
                      key: secondaryAction.key,
                      label: secondaryAction.label,
                      onPressed: secondaryAction.onPressed,
                      leading: secondaryAction.icon,
                      variant: secondaryAction.variant,
                      fullWidth: true,
                      backgroundColor: Colors.transparent,
                      foregroundColor: t.ink,
                      borderColor: t.line2,
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
    return CatchScaffold.stepFlow(
      safeArea: CatchScaffoldPlacement.none,
      backgroundColor: t.bg,
      body: body,
    );
  }
}

class PaperCelebrationIcon extends StatelessWidget {
  const PaperCelebrationIcon({super.key, required this.icon});

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Container(
      width: CatchSpacing.s16,
      height: CatchSpacing.s16,
      decoration: BoxDecoration(color: t.primarySoft, shape: BoxShape.circle),
      child: Icon(icon, color: t.primary, size: 30),
    );
  }
}

class PaperCelebrationDetailsCard extends StatelessWidget {
  const PaperCelebrationDetailsCard({super.key, required this.details});

  final List<CelebrationDetail> details;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: t.surface,
        borderRadius: BorderRadius.circular(CatchRadius.md),
        border: Border.all(color: t.line),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.s4),
        child: Column(
          children: [
            for (final entry in details.indexed) ...[
              PaperCelebrationDetailRow(detail: entry.$2),
              if (entry.$1 != details.length - 1)
                const CatchDivider.fieldRow(indent: 0),
            ],
          ],
        ),
      ),
    );
  }
}

class PaperCelebrationDetailRow extends StatelessWidget {
  const PaperCelebrationDetailRow({super.key, required this.detail});

  final CelebrationDetail detail;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final icon = detail.icon;

    return Padding(
      padding: const EdgeInsets.symmetric(
        vertical: CatchLayout.celebrationPaperDetailRowVerticalPadding,
      ),
      child: Row(
        children: [
          if (icon != null) ...[Icon(icon, size: 18, color: t.ink3), gapW12],
          SizedBox(
            width: CatchLayout.celebrationDetailLabelWidth,
            child: CatchText(
              detail.label.toUpperCase(),
              variant: CatchTextVariant.statusLabel,
              color: t.ink2,
            ),
          ),
          gapW12,
          Expanded(
            child: Text(
              detail.value,
              textAlign: TextAlign.right,
              style: CatchTextStyles.labelL(context, color: t.ink),
            ),
          ),
        ],
      ),
    );
  }
}

class CelebrationIcon extends StatelessWidget {
  const CelebrationIcon({super.key, required this.icon});

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: CatchLayout.celebrationIconExtent,
      height: CatchLayout.celebrationIconExtent,
      decoration: BoxDecoration(
        color: _celebrationCream.withValues(alpha: 0.22),
        shape: BoxShape.circle,
        border: Border.all(color: _celebrationCream.withValues(alpha: 0.28)),
      ),
      child: Icon(icon, color: _celebrationInk, size: 40),
    );
  }
}

class CelebrationDetailsCard extends StatelessWidget {
  const CelebrationDetailsCard({super.key, required this.details});

  final List<CelebrationDetail> details;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: _celebrationCream.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(CatchRadius.lg),
        border: Border.all(color: _celebrationCream.withValues(alpha: 0.34)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(CatchSpacing.s4),
        child: Column(
          children: [
            for (final entry in details.indexed) ...[
              CelebrationDetailRow(detail: entry.$2),
              if (entry.$1 != details.length - 1)
                Padding(
                  padding: const EdgeInsets.symmetric(
                    vertical: CatchSpacing.s2,
                  ),
                  child: CatchDivider.fieldRow(
                    indent: 0,
                    color: _celebrationInk.withValues(alpha: 0.20),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class CelebrationDetailRow extends StatelessWidget {
  const CelebrationDetailRow({super.key, required this.detail});

  final CelebrationDetail detail;

  @override
  Widget build(BuildContext context) {
    final icon = detail.icon;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 18, color: _celebrationInk),
          gapW10,
        ],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CatchText(
                detail.label,
                variant: CatchTextVariant.statusLabel,
                color: _celebrationInk.withValues(alpha: 0.74),
              ),
              gapH3,
              CatchText(
                detail.value,
                variant: CatchTextVariant.bodyLead,
                color: _celebrationInk,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class CelebrationNote extends StatelessWidget {
  const CelebrationNote({super.key, required this.note});

  final String note;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: _celebrationCream.withValues(alpha: 0.20),
        borderRadius: BorderRadius.circular(CatchRadius.lg),
        border: Border.all(color: _celebrationCream.withValues(alpha: 0.28)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(CatchSpacing.s4),
        child: Row(
          children: [
            Icon(CatchIcons.boltRounded, color: _celebrationInk, size: 18),
            gapW10,
            Expanded(
              child: CatchText(
                note,
                variant: CatchTextVariant.supporting,
                color: _celebrationInk,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
