import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The "Your page" tile: the page's link, or what stands in for it, a note
/// and, with [onCopy], a Copy button beside the link.
class HostSetupPageLinkTile extends StatelessWidget {
  const HostSetupPageLinkTile({
    super.key,
    required this.link,
    this.note,
    this.onCopy,
    this.copied = false,
  });

  /// The address, or a line saying when it will exist.
  final String link;
  final String? note;
  final VoidCallback? onCopy;

  /// The link was just copied.
  final bool copied;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = CatchStack(
      gap: CatchStackGap.g2,
      children: [
        CatchText(
          l10n.hostOnboardingPageKicker,
          variant: CatchTextVariant.labelKicker,
          tone: CatchTextTone.secondary,
        ),
        CatchText(link, variant: CatchTextVariant.titleRow, maxLines: 2),
        if (note != null)
          CatchText(
            note!,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
      ],
    );
    final copy = onCopy;
    return CatchSurface(
      child: copy == null
          ? text
          : CatchStack(
              direction: CatchStackDirection.row,
              justify: CatchStackJustify.between,
              align: CatchStackAlign.center,
              children: [
                Expanded(child: text),
                CatchButton(
                  key: const ValueKey<String>('host-setup-copy-link'),
                  label: copied
                      ? l10n.hostOnboardingDoneCopied
                      : l10n.hostOnboardingDoneCopy,
                  onPressed: copy,
                  variant: CatchButtonVariant.secondary,
                  size: CatchButtonSize.sm,
                  leading: CatchIcon(CatchIcons.copy, size: CatchIconSize.sm),
                ),
              ],
            ),
    );
  }
}
