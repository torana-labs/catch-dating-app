import 'package:catch_dating_app/contexts/events/parts/event_draft_poster.dart';
import 'package:catch_dating_app/hosts/create/create_copy.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_preview.dart';
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
              label: CreateCopy.published,
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
              CreateCopy.stepTitle(CreateStep.share),
              variant: CatchTextVariant.pageTitle,
            ),
            const CatchText(
              CreateCopy.shareNote,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
        EventDraftPoster(
          draft: state.draft,
          untitled: CreateCopy.untitled,
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
                label: CreateCopy.copyLink,
                variant: CatchButtonVariant.secondary,
                size: CatchButtonSize.sm,
                leading: CatchIcon(CatchIcons.copy),
                onPressed: onCopyLink,
              ),
            ],
          ),
        ),
        CatchIndexRow(
          title: CreateCopy.qrTitle,
          subtitle: CreateCopy.qrNote,
          icon: CatchIcons.qrCode,
          onTap: onPrint,
          action: CatchIndexRowAction(
            label: CreateCopy.print,
            onPressed: onPrint,
          ),
        ),
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            CatchButton(
              key: const ValueKey<String>('create-share-story'),
              label: CreateCopy.shareStory,
              leading: CatchIcon(CatchIcons.share),
              fullWidth: true,
              onPressed: onShareStory,
            ),
            CatchButton(
              key: const ValueKey<String>('create-share-whatsapp'),
              label: CreateCopy.tellFollowers,
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
