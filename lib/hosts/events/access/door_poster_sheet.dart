import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/riverpod_ui/catch_external_share_sheet.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

/// Shows the join-only door poster for an event (owner decision on #2061,
/// 19 Nov 2026: door mode (a1)), through the app's share-card sheet, which
/// shares it as an image to print or save. Its QR opens the event's public
/// companion page with no venue token, so guests can confirm their phone
/// and claim their guest-list row while they queue. It cannot check anyone
/// in: that still takes the host's live QR or a manual check-in.
Future<void> showHostDoorPoster(
  BuildContext context, {
  required String eventName,
  required Uri joinLink,
  required ExternalShareController share,
}) => showCatchBottomSheet<void>(
  context: context,
  builder: (_) => CatchExternalShareSheet(
    media: HostDoorPoster(eventName: eventName, joinLink: joinLink),
    share: share,
    fileName: context.l10n.hostsDoorPosterFileName,
    buttonLabel: context.l10n.hostsDoorPosterShare,
    footnote: context.l10n.hostsDoorPosterSubtitle,
    subject: context.l10n.hostsDoorPosterTitle,
    text: joinLink.toString(),
  ),
);

/// What the poster's QR encodes: the join link with any fragment removed, so
/// a venue token (carried in the fragment) can never reach a printed poster.
String hostDoorPosterQrData(Uri joinLink) =>
    joinLink.removeFragment().toString();

/// The poster itself: what guests see at the entrance.
class HostDoorPoster extends StatelessWidget {
  const HostDoorPoster({
    super.key,
    required this.eventName,
    required this.joinLink,
  });

  final String eventName;

  /// The event's public companion link, without any venue token.
  final Uri joinLink;

  @override
  Widget build(BuildContext context) => CatchSurface(
    block: CatchSurfaceBlock.floating,
    padding: CatchSurfacePadding.lg,
    child: CatchStack(
      align: CatchStackAlign.center,
      children: [
        CatchText(
          eventName,
          variant: CatchTextVariant.pageTitle,
          align: TextAlign.center,
        ),
        CatchText(
          context.l10n.hostsDoorPosterHeadline,
          variant: CatchTextVariant.titleRow,
          align: TextAlign.center,
        ),
        QrImageView(
          key: const ValueKey('host_door_poster_qr'),
          data: hostDoorPosterQrData(joinLink),
          size: CatchLayout.eventSuccessVenueQrExtent,
          padding: EdgeInsets.zero,
          backgroundColor: CatchTokens.editorialWhite,
        ),
        CatchText(
          context.l10n.hostsDoorPosterStepJoin,
          align: TextAlign.center,
        ),
        CatchText(
          context.l10n.hostsDoorPosterStepCheckIn,
          tone: CatchTextTone.secondary,
          align: TextAlign.center,
        ),
      ],
    ),
  );
}
