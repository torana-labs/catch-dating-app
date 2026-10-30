import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/organizers/shared/organizer_host_identity_row.dart';
import 'package:catch_dating_app/organizers/shared/organizer_placeholder_cover.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_external_share_sheet.dart';
import 'package:catch_dating_app/routing/app_deep_links.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

Future<void> showOrganizerShareCardSheet(
  BuildContext context, {
  required Organizer organizer,
  required ExternalShareController share,
}) {
  return showCatchBottomSheet<void>(
    context: context,
    builder: (_) => CatchExternalShareSheet(
      media: OrganizerShareCard(organizer: organizer),
      share: share,
      fileName: 'catch-organizer-card.png',
      buttonLabel: context.l10n.organizersOrganizerHeroAppBarTooltipShareOrganizer,
      footnote: context.l10n.organizersOrganizerShareCardFootnote,
      subject: organizer.name,
      text: organizerShareText(organizer, context.l10n),
    ),
  );
}

String organizerShareText(Organizer organizer, AppLocalizations l10n) {
  final uri = AppDeepLinks.organizer(organizer.id);
  return [
    l10n.organizersOrganizerShareTextIntro(organizerName: organizer.name),
    '${organizer.area}, ${cityLabel(organizer.location)}',
    uri.toString(),
  ].join('\n');
}

class OrganizerShareCard extends StatelessWidget {
  const OrganizerShareCard({super.key, required this.organizer});

  final Organizer organizer;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final tags = visibleOrganizerTags(organizer, limit: CatchLayout.richShareCardMaxTags);

    return AspectRatio(
      aspectRatio: CatchLayout.richShareCardAspectRatio,
      child: CatchSurface(
        backgroundColor: t.bg,
        borderRole: CatchBorderRole.boundary,
        padding: CatchInsets.content,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              flex: 4,
              child: CatchSurface(
                duration: Duration.zero,
                tone: CatchSurfaceTone.transparent,
                radius: CatchRadius.md,
                clipBehavior: Clip.antiAlias,
                child: OrganizerShareCover(organizer: organizer),
              ),
            ),
            gapH14,
            Expanded(
              flex: 5,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CatchKickerText(
                    label: context.l10n.organizersOrganizerShareCardTextOrganizerOnCatch,
                    color: t.primary,
                  ),
                  gapH6,
                  CatchText(
                    organizer.name,
                    variant: CatchTextVariant.displayS,
                    color: t.ink,
                    maxLines: 2,
                  ),
                  gapH8,
                  CatchMetaRow(
                    icon: CatchIcons.location,
                    label: context.l10n.organizersOrganizerShareCardLabelAreaCitylabel(
                      area: organizer.area,
                      cityLabel: cityLabel(organizer.location),
                    ),
                  ),
                  gapH8,
                  CatchMetaRow(
                    icon: CatchIcons.people,
                    label: organizerMemberCountLabel(organizer),
                  ),
                  if (tags.isNotEmpty) ...[gapH10, OrganizerTagList(tags: tags)],
                  const Spacer(),
                  CatchAttributionRow(
                    brandLabel: context.l10n.coreCatchShareCardFooterTextCatch,
                    trailing: context.l10n.organizersOrganizerShareCardHostedBy(
                      hostName: organizer.displayHostName,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class OrganizerShareCover extends StatelessWidget {
  const OrganizerShareCover({super.key, required this.organizer});

  final Organizer organizer;

  @override
  Widget build(BuildContext context) {
    final photoUrl = organizer.primaryOrganizerPhotoUrl;
    if (photoUrl != null && photoUrl.trim().isNotEmpty) {
      return CatchHeroImage(
        imageUrl: photoUrl,
        semanticLabel: context.l10n
            .organizersOrganizerShareCardSemanticlabelNameCoverPhoto(name: organizer.name),
        showScrim: false,
      );
    }
    return OrganizerPlaceholderCover(organizer: organizer);
  }
}
