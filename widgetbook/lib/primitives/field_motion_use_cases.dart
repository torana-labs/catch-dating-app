import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook/widgetbook.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

@widgetbook.UseCase(
  name: 'Approved production',
  type: CatchField,
  path: '[Review gates]/Field motion',
)
Widget catchFieldMotionReview(BuildContext context) {
  final accordionOpen = context.knobs.boolean(
    label: 'Accordion expanded',
    initialValue: true,
  );
  final drawerOpen = context.knobs.boolean(
    label: 'Disclosure drawer open',
    initialValue: true,
  );
  final status = context.knobs.object.dropdown<CatchFieldStatus>(
    label: 'Save status',
    options: CatchFieldStatus.values,
    initialOption: CatchFieldStatus.saved,
    labelBuilder: (value) => value.name,
  );
  final chipSelected = context.knobs.boolean(
    label: 'Chip selected',
    initialValue: true,
  );
  final disableAnimations = context.knobs.boolean(
    label: 'Disable animations',
    initialValue: false,
  );

  return MediaQuery(
    data: (MediaQuery.maybeOf(context) ?? const MediaQueryData()).copyWith(
      disableAnimations: disableAnimations,
    ),
    child: _MotionReviewScreen(
      accordionOpen: accordionOpen,
      drawerOpen: drawerOpen,
      status: status,
      chipSelected: chipSelected,
    ),
  );
}

@widgetbook.UseCase(
  name: 'Saving and saved',
  type: CatchFieldStatusIndicator,
  path: '[Core primitives]/Fields',
)
Widget catchFieldStatusIndicatorContract(BuildContext context) {
  final status = context.knobs.object.dropdown<CatchFieldStatus>(
    label: 'Status',
    options: CatchFieldStatus.values,
    initialOption: CatchFieldStatus.saved,
    labelBuilder: (value) => value.name,
  );
  final disableAnimations = context.knobs.boolean(
    label: 'Disable animations',
    initialValue: false,
  );
  return MediaQuery(
    data: (MediaQuery.maybeOf(context) ?? const MediaQueryData()).copyWith(
      disableAnimations: disableAnimations,
    ),
    child: Scaffold(
      body: Center(
        child: CatchFieldStatusIndicator(
          savingSemanticLabel: context.l10n.coreCatchFieldSemanticSaving,
          savedSemanticLabel: context.l10n.coreCatchFieldSemanticSaved,
          status: status,
        ),
      ),
    ),
  );
}

class _MotionReviewScreen extends StatelessWidget {
  const _MotionReviewScreen({
    required this.accordionOpen,
    required this.drawerOpen,
    required this.status,
    required this.chipSelected,
  });

  final bool accordionOpen;
  final bool drawerOpen;
  final CatchFieldStatus status;
  final bool chipSelected;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Scaffold(
      backgroundColor: t.bg,
      body: SafeArea(
        child: ListView(
          padding: CatchInsets.pageBody,
          children: [
            Text(
              'Approved field motion',
              style: CatchTextStyles.headline(context),
            ),
            gapH8,
            Text(
              'Owner-approved on 2026-07-19. Four moments only. Production '
              'reuses CatchMotion.base, '
              'CatchMotion.fast, CatchMotion.standardCurve, and '
              'CatchMotion.easeOutBackCurve; no tokens were added.',
              style: CatchTextStyles.bodyLead(context, color: t.ink2),
            ),
            gapH20,
            _Comparison(
              title: 'Accordion / inline editor',
              before: _AccordionPreview(open: accordionOpen),
              approved: _ProposedReveal(open: accordionOpen),
            ),
            gapH16,
            _Comparison(
              title: 'Disclosure drawer',
              before: _DrawerPreview(
                open: drawerOpen,
                revealDuration: CatchFieldTokens.reveal,
                opacityDuration: CatchFieldTokens.fast,
              ),
              approved: _DrawerPreview(
                open: drawerOpen,
                revealDuration: CatchMotion.base,
                opacityDuration: CatchMotion.base,
              ),
            ),
            gapH16,
            _Comparison(
              title: 'Idle → saving → saved',
              before: _StatusSnapshot(status: status),
              approved: CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: 'Profile details',
                body: 'Shared production status motion',
                status: status,
              ),
            ),
            gapH16,
            _Comparison(
              title: 'Selectable chip',
              before: CatchChip.selectable(
                label: 'Run club',
                selected: chipSelected,
                onChanged: (_) {},
              ),
              approved: CatchChip.selectable(
                label: 'Run club',
                selected: chipSelected,
                onChanged: (_) {},
              ),
              note:
                  'Already uses the shared short motion token with no layout shift.',
            ),
          ],
        ),
      ),
    );
  }
}

class _Comparison extends StatelessWidget {
  const _Comparison({
    required this.title,
    required this.before,
    required this.approved,
    this.note,
  });

  final String title;
  final Widget before;
  final Widget approved;
  final String? note;

  @override
  Widget build(BuildContext context) {
    return CatchSurface.card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: CatchTextStyles.sectionTitle(context)),
          if (note case final note?) ...[
            gapH4,
            Text(note, style: CatchTextStyles.supporting(context)),
          ],
          gapH12,
          LayoutBuilder(
            builder: (context, constraints) {
              final cards = [
                _Preview(label: 'Before approval', child: before),
                _Preview(label: 'Approved', child: approved),
              ];
              if (constraints.maxWidth < CatchLayout.maxContentWidth) {
                return Column(children: [cards.first, gapH12, cards.last]);
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: cards.first),
                  gapW12,
                  Expanded(child: cards.last),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _Preview extends StatelessWidget {
  const _Preview({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: CatchTextStyles.statusLabel(context, color: t.ink2)),
        gapH8,
        child,
      ],
    );
  }
}

class _AccordionPreview extends StatelessWidget {
  const _AccordionPreview({required this.open});

  final bool open;

  @override
  Widget build(BuildContext context) {
    return CatchSurface(
      borderRole: CatchBorderRole.separator,
      padding: CatchInsets.content,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Event description'),
          if (open) ...[
            gapH8,
            const Text('Add the details guests need before they book.'),
          ],
        ],
      ),
    );
  }
}

class _ProposedReveal extends StatelessWidget {
  const _ProposedReveal({required this.open});

  final bool open;

  @override
  Widget build(BuildContext context) {
    return CatchSurface(
      borderRole: CatchBorderRole.separator,
      padding: CatchInsets.content,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Event description'),
          TweenAnimationBuilder<double>(
            duration: MediaQuery.maybeOf(context)?.disableAnimations == true
                ? Duration.zero
                : CatchMotion.base,
            curve: CatchMotion.standardCurve,
            tween: Tween(end: open ? 1 : 0),
            builder: (context, value, child) => ClipRect(
              child: Align(
                alignment: Alignment.topCenter,
                heightFactor: value,
                child: Opacity(
                  opacity: value,
                  child: Transform.translate(
                    offset: Offset(0, CatchSpacing.s2 * (1 - value)),
                    child: child,
                  ),
                ),
              ),
            ),
            child: const Padding(
              padding: EdgeInsets.only(top: CatchSpacing.s2),
              child: Text('Add the details guests need before they book.'),
            ),
          ),
        ],
      ),
    );
  }
}

class _DrawerPreview extends StatelessWidget {
  const _DrawerPreview({
    required this.open,
    required this.revealDuration,
    required this.opacityDuration,
  });

  final bool open;
  final Duration revealDuration;
  final Duration opacityDuration;

  @override
  Widget build(BuildContext context) {
    return CatchSurface(
      borderRole: CatchBorderRole.separator,
      child: CatchFieldDrawer(
        open: open,
        offstage: !open,
        body: const Text('Drawer control content'),
        startPadding: CatchSpacing.s4,
        endPadding: CatchSpacing.s4,
        bottomPadding: CatchSpacing.s4,
        revealDuration: revealDuration,
        opacityDuration: opacityDuration,
        onRevealEnd: () {},
      ),
    );
  }
}

class _StatusSnapshot extends StatelessWidget {
  const _StatusSnapshot({required this.status});

  final CatchFieldStatus status;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      borderRole: CatchBorderRole.separator,
      padding: CatchInsets.content,
      child: Row(
        children: [
          const Expanded(child: Text('Profile details')),
          switch (status) {
            CatchFieldStatus.idle => const SizedBox.square(
              dimension: CatchIcon.md,
            ),
            CatchFieldStatus.saving => CatchLoadingIndicator.inline(
              color: t.ink3,
            ),
            CatchFieldStatus.saved => Icon(
              CatchIcons.checkCircleFilled,
              color: t.success,
            ),
          },
        ],
      ),
    );
  }
}
