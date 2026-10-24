import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/clubs/shared/club_host_identity_row.dart';
import 'package:catch_dating_app/clubs/shared/club_placeholder_cover.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_external_share_sheet.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/app_deep_links.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

Future<void> showClubShareCardSheet(
  BuildContext context, {
  required Club club,
  required ExternalShareController share,
}) {
  return showCatchBottomSheet<void>(
    context: context,
    builder: (_) => CatchExternalShareSheet(
      media: ClubShareCard(club: club),
      share: share,
      fileName: 'catch-organizer-card.png',
      buttonLabel: context.l10n.clubsClubHeroAppBarTooltipShareClub,
      footnote: context.l10n.clubsClubShareCardFootnote,
      subject: club.name,
      text: clubShareText(club, context.l10n),
    ),
  );
}

String clubShareText(Club club, AppLocalizations l10n) {
  final uri = AppDeepLinks.club(club.id);
  return [
    l10n.clubsClubShareTextIntro(clubName: club.name),
    '${club.area}, ${cityLabel(club.location)}',
    uri.toString(),
  ].join('\n');
}

class ClubShareCard extends StatelessWidget {
  const ClubShareCard({super.key, required this.club});

  final Club club;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final tags = visibleClubTags(club, limit: CatchLayout.richShareCardMaxTags);

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
                child: ClubShareCover(club: club),
              ),
            ),
            gapH14,
            Expanded(
              flex: 5,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.l10n.clubsClubShareCardTextClubOnCatch,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: CatchTextStyles.kicker(context, color: t.primary),
                  ),
                  gapH6,
                  Text(
                    club.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: CatchTextStyles.clubDisplay(
                      context,
                      step: CatchTextStylesSize.l,
                      height: 0.96,
                      color: t.ink,
                    ),
                  ),
                  gapH8,
                  CatchMetaRow(
                    icon: CatchIcons.locationOnOutlined,
                    label: context.l10n.clubsClubShareCardLabelAreaCitylabel(
                      area: club.area,
                      cityLabel: cityLabel(club.location),
                    ),
                  ),
                  gapH8,
                  CatchMetaRow(
                    icon: CatchIcons.group,
                    label: clubMemberCountLabel(club),
                  ),
                  if (tags.isNotEmpty) ...[gapH10, ClubTagList(tags: tags)],
                  const Spacer(),
                  CatchAttributionRow(
                    brandLabel: context.l10n.coreCatchShareCardFooterTextCatch,
                    trailing: context.l10n.clubsClubShareCardHostedBy(
                      hostName: club.displayHostName,
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

class ClubShareCover extends StatelessWidget {
  const ClubShareCover({super.key, required this.club});

  final Club club;

  @override
  Widget build(BuildContext context) {
    final photoUrl = club.primaryClubPhotoUrl;
    if (photoUrl != null && photoUrl.trim().isNotEmpty) {
      return CatchHeroImage(
        imageUrl: photoUrl,
        semanticLabel: context.l10n
            .clubsClubShareCardSemanticlabelNameCoverPhoto(name: club.name),
        showScrim: false,
      );
    }
    return ClubPlaceholderCover(club: club);
  }
}
