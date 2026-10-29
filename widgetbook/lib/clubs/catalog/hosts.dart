import 'package:catch_dating_app/clubs/presentation/detail/club_detail_screen_state.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_contact_section.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_detail_formatters.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_host_section.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';

@widgetbook.UseCase(
  name: 'Host section states',
  type: ClubHostSection,
  path: '[Club Detail]/Sections',
)
Widget clubHostSectionStates(BuildContext context) {
  final messageableState = ClubDetailBodyState.fromDomain(
    club: widgetbookClubClub,
    uid: widgetbookClubViewerUid,
    isAuthenticated: true,
  );

  return WidgetbookScrollCatalogFrame(
    title: 'ClubHostSection',
    catalogId: 'section.club.hosts',
    children: [
      WidgetbookPageStateCard(
        label: 'messageable hosts',
        child: ClubHostSection(
          club: widgetbookClubClub,
          canViewProfile: true,
          isMessageHostPending: false,
          messageableHostUids: messageableState.messageableHostUids,
          onViewProfile: (_) {},
          onMessageHost: (_, _) async {},
        ),
      ),
      WidgetbookPageStateCard(
        label: 'public preview',
        child: ClubHostSection(
          club: widgetbookClubClub,
          canViewProfile: false,
          isMessageHostPending: false,
          messageableHostUids: const {},
          onViewProfile: null,
          onMessageHost: null,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'message pending',
        child: ClubHostSection(
          club: widgetbookClubClub,
          canViewProfile: true,
          isMessageHostPending: true,
          messageableHostUids: messageableState.messageableHostUids,
          onViewProfile: (_) {},
          onMessageHost: (_, _) async {},
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Host row states',
  type: ClubHostRow,
  path: '[Club Detail]/Sections',
)
Widget clubHostRowStates(BuildContext context) {
  final ownerSealColor = ActivityPalette.resolve(
    context,
    widgetbookClubClub.hostDefaults.primaryActivityKind,
  ).accent;
  final establishedLabel = clubEstablishedLabel(widgetbookClubClub);

  return WidgetbookScrollCatalogFrame(
    title: 'ClubHostRow',
    catalogId: 'section.club.hosts.row',
    children: [
      WidgetbookPageStateCard(
        label: 'owner / message / chevron',
        child: ClubHostRow(
          host: widgetbookClubClub.displayHostProfiles.first,
          borderColor: CatchTokens.of(context).primarySoft,
          ownerSealColor: ownerSealColor,
          establishedLabel: establishedLabel,
          onTap: widgetbookNoop,
          onMessage: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'public profile',
        child: ClubHostRow(
          host: widgetbookClubClub.displayHostProfiles.last,
          borderColor: CatchTokens.of(context).primarySoft,
          ownerSealColor: ownerSealColor,
          establishedLabel: establishedLabel,
          onTap: null,
          onMessage: null,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contact section states',
  type: ClubContactSection,
  path: '[Club Detail]/Sections',
)
Widget clubContactSectionStates(BuildContext context) {
  final contactState = ClubDetailBodyState.fromDomain(club: widgetbookClubClub);

  return WidgetbookScrollCatalogFrame(
    title: 'ClubContactSection',
    catalogId: 'section.club.contact',
    children: [
      WidgetbookPageStateCard(
        label: 'all channels',
        child: ClubContactSection(
          actions: contactState.contactActions,
          onContactSelected: (_) async {},
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'empty',
        child: ClubContactSection(actions: []),
      ),
    ],
  );
}
