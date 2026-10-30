import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen_state.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_contact_section.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_detail_formatters.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_host_section.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';

@widgetbook.UseCase(
  name: 'Host section states',
  type: OrganizerHostSection,
  path: '[Club Detail]/Sections',
)
Widget organizerHostSectionStates(BuildContext context) {
  final messageableState = OrganizerDetailBodyState.fromDomain(
    organizer: widgetbookOrganizerOrganizer,
    uid: widgetbookOrganizerViewerUid,
    isAuthenticated: true,
  );

  return WidgetbookScrollCatalogFrame(
    title: 'ClubHostSection',
    catalogId: 'section.club.hosts',
    children: [
      WidgetbookPageStateCard(
        label: 'messageable hosts',
        child: OrganizerHostSection(
          organizer: widgetbookOrganizerOrganizer,
          canViewProfile: true,
          isMessageHostPending: false,
          messageableHostUids: messageableState.messageableHostUids,
          onViewProfile: (_) {},
          onMessageHost: (_, _) async {},
        ),
      ),
      WidgetbookPageStateCard(
        label: 'public preview',
        child: OrganizerHostSection(
          organizer: widgetbookOrganizerOrganizer,
          canViewProfile: false,
          isMessageHostPending: false,
          messageableHostUids: const {},
          onViewProfile: null,
          onMessageHost: null,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'message pending',
        child: OrganizerHostSection(
          organizer: widgetbookOrganizerOrganizer,
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
  type: OrganizerHostRow,
  path: '[Club Detail]/Sections',
)
Widget organizerHostRowStates(BuildContext context) {
  final ownerSealColor = ActivityPalette.resolve(
    context,
    widgetbookOrganizerOrganizer.hostDefaults.primaryActivityKind,
  ).accent;
  final establishedLabel = organizerEstablishedLabel(
    widgetbookOrganizerOrganizer,
  );

  return WidgetbookScrollCatalogFrame(
    title: 'ClubHostRow',
    catalogId: 'section.club.hosts.row',
    children: [
      WidgetbookPageStateCard(
        label: 'owner / message / chevron',
        child: OrganizerHostRow(
          host: widgetbookOrganizerOrganizer.displayHostProfiles.first,
          borderColor: CatchTokens.of(context).primarySoft,
          ownerSealColor: ownerSealColor,
          establishedLabel: establishedLabel,
          onTap: widgetbookNoop,
          onMessage: widgetbookNoop,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'public profile',
        child: OrganizerHostRow(
          host: widgetbookOrganizerOrganizer.displayHostProfiles.last,
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
  type: OrganizerContactSection,
  path: '[Club Detail]/Sections',
)
Widget organizerContactSectionStates(BuildContext context) {
  final contactState = OrganizerDetailBodyState.fromDomain(
    organizer: widgetbookOrganizerOrganizer,
  );

  return WidgetbookScrollCatalogFrame(
    title: 'ClubContactSection',
    catalogId: 'section.club.contact',
    children: [
      WidgetbookPageStateCard(
        label: 'all channels',
        child: OrganizerContactSection(
          actions: contactState.contactActions,
          onContactSelected: (_) async {},
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'empty',
        child: OrganizerContactSection(actions: []),
      ),
    ],
  );
}
