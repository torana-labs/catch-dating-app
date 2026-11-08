import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The organizer's public page as a tile: whether it is live, its address,
/// what it is for, and Edit, View and Share.
class OrganizerPageTile extends StatelessWidget {
  const OrganizerPageTile({
    super.key,
    required this.live,
    required this.link,
    required this.onEdit,
    required this.onView,
    this.onShare,
  });

  /// The page is published on the website.
  final bool live;

  /// The address without its scheme; null until the page has a route.
  final String? link;
  final VoidCallback onEdit;
  final VoidCallback onView;

  /// Null hides Share, as when the page has no address yet.
  final VoidCallback? onShare;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final onShare = this.onShare;
    return CatchSurface(
      child: CatchStack(
        children: [
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            align: CatchStackAlign.center,
            children: [
              CatchBadge(
                label: live
                    ? l10n.hostOrganizerPageLive
                    : l10n.hostOrganizerPageNotLive,
                tone: live ? CatchBadgeTone.success : CatchBadgeTone.neutral,
                dot: true,
              ),
              Flexible(
                child: CatchText(
                  link ?? l10n.hostOrganizerPageNoLink,
                  variant: CatchTextVariant.titleRow,
                  maxLines: 1,
                ),
              ),
            ],
          ),
          CatchText(
            l10n.hostOrganizerPageNote,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            align: CatchStackAlign.center,
            children: [
              Expanded(
                child: CatchButton(
                  key: const ValueKey<String>('organizer-page-edit'),
                  label: l10n.hostOrganizerPageEdit,
                  size: CatchButtonSize.md,
                  fullWidth: true,
                  onPressed: onEdit,
                ),
              ),
              Expanded(
                child: CatchButton(
                  key: const ValueKey<String>('organizer-page-view'),
                  label: l10n.hostOrganizerPageView,
                  variant: CatchButtonVariant.secondary,
                  size: CatchButtonSize.md,
                  fullWidth: true,
                  onPressed: onView,
                ),
              ),
              if (onShare != null)
                CatchIconAction.icon(
                  key: const ValueKey<String>('organizer-page-share'),
                  icon: CatchIcons.share,
                  tooltip: l10n.hostOrganizerPageShare,
                  onPressed: onShare,
                ),
            ],
          ),
        ],
      ),
    );
  }
}
