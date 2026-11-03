import 'package:catch_dating_app/contexts/organizers/data/organizer_journey_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_journey.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_journey/host_organizer_journey_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/page_preview.dart';

final _waiting = OrganizerJourney(
  organizerId: 'afterfly',
  organizerName: 'Afterfly',
  waitingClaim: true,
  steps: [
    OrganizerJourneyStep(
      kind: OrganizerJourneyStepKind.nominated,
      at: DateTime(2026, 10, 28),
      detail: 'luma.com/afterfly',
    ),
    OrganizerJourneyStep(
      kind: OrganizerJourneyStepKind.listed,
      at: DateTime(2026, 10, 31),
      detail: null,
    ),
    OrganizerJourneyStep(
      kind: OrganizerJourneyStepKind.claimRequested,
      at: DateTime(2026, 11, 2),
      detail: null,
    ),
  ],
  next: OrganizerJourneyNext.runYourPage,
);

final _claimed = OrganizerJourney(
  organizerId: 'lantern',
  organizerName: 'Lantern Lane',
  waitingClaim: false,
  steps: [
    OrganizerJourneyStep(
      kind: OrganizerJourneyStepKind.claimed,
      at: DateTime(2026, 9, 2),
      detail: null,
    ),
    OrganizerJourneyStep(
      kind: OrganizerJourneyStepKind.firstEvent,
      at: DateTime(2026, 9, 20),
      detail: 'Tuesday Trivia',
    ),
    OrganizerJourneyStep(
      kind: OrganizerJourneyStepKind.firstPaidBooking,
      at: DateTime(2026, 9, 21),
      detail: null,
    ),
  ],
  next: null,
);

@widgetbook.UseCase(
  name: 'A waiting claim and a claimed page',
  type: HostOrganizerJourneySection,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostOrganizerJourneySectionPreview(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'Your page so far',
      catalogId: 'host.organizer_journey',
      children: [
        for (final (label, journey) in [
          ('Waiting claim', _waiting),
          ('Claimed', _claimed),
        ])
          WidgetbookPageStateCard(
            label: label,
            child: WidgetbookContentFrame(
              child: HostOrganizerJourneySection(journey: journey),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Reads one organizer',
  type: HostOrganizerJourneySheet,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostOrganizerJourneySheetPreview(BuildContext context) => ProviderScope(
  overrides: [
    organizerJourneysProvider(
      'lantern',
    ).overrideWith((ref) async => [_claimed]),
  ],
  child: const HostOrganizerJourneySheet(organizerId: 'lantern'),
);

@widgetbook.UseCase(
  name: 'A page waiting to be claimed',
  type: HostWaitingClaimsSection,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostWaitingClaimsSectionPreview(BuildContext context) => ProviderScope(
  overrides: [
    organizerJourneysProvider(null).overrideWith((ref) async => [_waiting]),
  ],
  child: const HostWaitingClaimsSection(),
);
