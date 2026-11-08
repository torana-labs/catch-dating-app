import 'package:catch_dating_app/contexts/events/parts/event_draft_poster.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_preview.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// After publishing, in board order: the Published badge, the headline and
/// the two-day sentence, the poster, the link with Copy link, the door QR
/// with Print, and the two share buttons.
class CreateShareBody extends StatelessWidget {
  const CreateShareBody({
    super.key,
    required this.state,
    required this.link,
    required this.onCopyLink,
    required this.onPrint,
    required this.onShareStory,
    required this.onShareWhatsApp,
  });

  final CreateFlowState state;

  /// The event's public link, as shown.
  final String link;
  final VoidCallback onCopyLink;
  final VoidCallback onPrint;
  final VoidCallback onShareStory;
  final VoidCallback onShareWhatsApp;

  @override
  Widget build(BuildContext context) {
    final preview = CreatePreview.of(context, state);
    return CatchStack(
      gap: CatchStackGap.g24,
      children: [
        CatchStack(
          direction: CatchStackDirection.row,
          children: [
            CatchBadge(
              label: context.l10n.hostCreatePublished,
              tone: CatchBadgeTone.success,
              size: CatchBadgeSize.md,
              icon: CatchIcons.success,
            ),
          ],
        ),
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            CatchText(
              context.l10n.hostCreateStepTitle(step: CreateStep.share.name),
              variant: CatchTextVariant.pageTitle,
            ),
            CatchText(
              context.l10n.hostCreateShareNote,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
        EventDraftPoster(
          draft: state.draft,
          untitled: context.l10n.hostCreateUntitled,
          formatLabel: preview.formatLabel,
          when: preview.when,
          place: preview.place,
          counts: preview.counts,
        ),
        CatchSurface(
          child: CatchStack(
            direction: CatchStackDirection.row,
            justify: CatchStackJustify.between,
            align: CatchStackAlign.center,
            children: [
              Expanded(
                child: CatchText(
                  link,
                  variant: CatchTextVariant.titleRow,
                  maxLines: 1,
                ),
              ),
              CatchButton(
                key: const ValueKey<String>('create-copy-link'),
                label: context.l10n.hostCreateCopyLink,
                variant: CatchButtonVariant.secondary,
                size: CatchButtonSize.sm,
                leading: CatchIcon(CatchIcons.copy),
                onPressed: onCopyLink,
              ),
            ],
          ),
        ),
        CatchIndexRow(
          title: context.l10n.hostCreateQrTitle,
          subtitle: context.l10n.hostCreateQrNote,
          icon: CatchIcons.qrCode,
          onTap: onPrint,
          action: CatchIndexRowAction(
            label: context.l10n.hostCreatePrint,
            onPressed: onPrint,
          ),
        ),
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            CatchButton(
              key: const ValueKey<String>('create-share-story'),
              label: context.l10n.hostCreateShareStory,
              leading: CatchIcon(CatchIcons.share),
              fullWidth: true,
              onPressed: onShareStory,
            ),
            CatchButton(
              key: const ValueKey<String>('create-share-whatsapp'),
              label: context.l10n.hostCreateTellFollowers,
              variant: CatchButtonVariant.secondary,
              fullWidth: true,
              onPressed: onShareWhatsApp,
            ),
          ],
        ),
      ],
    );
  }
}
