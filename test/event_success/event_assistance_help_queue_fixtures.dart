import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_managers.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';

Map<String, Object?> helpQueueFixture(String key) => Map<String, Object?>.from(
  (jsonDecode(
            File(
              'test/event_success/fixtures/help_queue.json',
            ).readAsStringSync(),
          )
          as Map)[key]
      as Map,
);

EventAssistanceCaseQuery helpQueueQuery({
  AssistanceCaseStatus status = AssistanceCaseStatus.open,
}) => EventAssistanceCaseQuery(
  organizerId: 'o-00000000-0000-0000-0000-000000000123',
  eventId: 'e-00000000-0000-0000-0000-000000000123',
  status: status,
);

/// A fixture stage's views as the data layer hands them over.
List<AssistanceCaseViewDocument> helpQueueViews(Map<String, Object?> stage) => [
  for (final raw in stage['views']! as List)
    (
      id: (raw as Map)['id'] as String,
      data: Map<String, Object?>.from(raw['data'] as Map),
      evaluatedAtMillis: (raw['data'] as Map)['evaluatedAt'] as int,
    ),
];

/// The organizer the fixture's handoff choices come from.
Organizer helpQueueOrganizer(Map<String, Object?> stage) {
  final organizer = stage['organizer']! as Map;
  return Organizer(
    id: helpQueueQuery().organizerId,
    name: 'Fixture organizer',
    description: '',
    location: '',
    area: '',
    createdAt: DateTime.utc(2026),
    hostUserId: organizer['hostUserId'] as String?,
    ownerUserId: organizer['ownerUserId'] as String?,
    hostName: organizer['hostName'] as String?,
    hostUserIds: [...(organizer['hostUserIds'] as List).cast<String>()],
    hostProfiles: [
      for (final profile in organizer['hostProfiles'] as List)
        OrganizerHostProfile.fromJson(
          Map<String, dynamic>.from(profile as Map),
        ),
    ],
  );
}

EventAssistanceCasesPage helpQueuePage(String key) => helpQueuePageFor(
  helpQueueFixture(key),
  helpQueueQuery(
    status: key == 'handled'
        ? AssistanceCaseStatus.resolved
        : AssistanceCaseStatus.open,
  ),
);

/// A fixture stage as the listener for [query] would deliver it: only the
/// views in the query's status, with [actorUid]'s handoff choices.
EventAssistanceCasesPage helpQueuePageFor(
  Map<String, Object?> stage,
  EventAssistanceCaseQuery query, {
  String actorUid = 'host-1',
}) => EventAssistanceCasesPage.fromViews(
  query: query,
  views: [
    for (final view in helpQueueViews(stage))
      if (view.data['status'] == query.status.name) view,
  ],
  hasMore: false,
  managerOptions: AssistanceCaseManagerOptions.fromOrganizer(
    organizer: helpQueueOrganizer(stage),
    actorUid: actorUid,
  ),
);
