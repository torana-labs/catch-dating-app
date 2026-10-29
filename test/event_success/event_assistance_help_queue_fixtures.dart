import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';

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

EventAssistanceCasesPage helpQueuePage(String key) =>
    EventAssistanceCasesPage.fromCallableData(
      helpQueueFixture(key),
      expectedQuery: helpQueueQuery(
        status: key == 'handled'
            ? AssistanceCaseStatus.resolved
            : AssistanceCaseStatus.open,
      ),
    );
