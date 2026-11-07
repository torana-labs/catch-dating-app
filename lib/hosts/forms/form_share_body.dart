import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Where the form can go: on WhatsApp, as a story, or embedded in a site.
enum HostFormShareTarget { whatsapp, story, embed }

/// Sharing a form in board order: the link tile with Copy, then WhatsApp,
/// Story and Embed.
class HostFormShareBody extends StatelessWidget {
  const HostFormShareBody({
    super.key,
    required this.url,
    required this.onCopy,
    required this.onShare,
  });

  /// The form's public link; null while it is read.
  final String? url;
  final VoidCallback onCopy;
  final ValueChanged<HostFormShareTarget> onShare;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final url = this.url;
    final link = CatchSurface(
      child: CatchStack(
        direction: CatchStackDirection.row,
        justify: CatchStackJustify.between,
        align: CatchStackAlign.center,
        children: [
          Expanded(
            child: CatchStack(
              gap: CatchStackGap.g2,
              children: [
                CatchText(
                  l10n.hostFormsShareLink,
                  variant: CatchTextVariant.labelKicker,
                  tone: CatchTextTone.secondary,
                ),
                CatchText(
                  url == null ? l10n.hostFormsShareLinkLoading : _display(url),
                  variant: CatchTextVariant.titleRow,
                  maxLines: 2,
                ),
              ],
            ),
          ),
          CatchButton(
            key: const ValueKey<String>('host-form-share-copy'),
            label: l10n.hostFormsShareCopy,
            variant: CatchButtonVariant.secondary,
            size: CatchButtonSize.sm,
            leading: CatchIcon(CatchIcons.copy),
            onPressed: url == null ? null : onCopy,
          ),
        ],
      ),
    );
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        if (url == null) CatchSkeleton.content(child: link) else link,
        CatchStack(
          direction: CatchStackDirection.row,
          gap: CatchStackGap.g8,
          equal: true,
          children: [
            for (final target in HostFormShareTarget.values)
              CatchButton(
                key: ValueKey<String>('host-form-share-${target.name}'),
                label: switch (target) {
                  HostFormShareTarget.whatsapp => l10n.hostFormsShareWhatsapp,
                  HostFormShareTarget.story => l10n.hostFormsShareStory,
                  HostFormShareTarget.embed => l10n.hostFormsShareEmbed,
                },
                leading: CatchIcon(switch (target) {
                  HostFormShareTarget.whatsapp => CatchIcons.send,
                  HostFormShareTarget.story => CatchIcons.share,
                  HostFormShareTarget.embed => CatchIcons.link,
                }),
                variant: CatchButtonVariant.secondary,
                size: CatchButtonSize.md,
                fullWidth: true,
                onPressed: url == null ? null : () => onShare(target),
              ),
          ],
        ),
      ],
    );
  }

  /// The link without its scheme or trailing slash, as the board shows it.
  static String _display(String url) => url
      .replaceFirst(RegExp('^https?://'), '')
      .replaceFirst(RegExp(r'/$'), '');
}
