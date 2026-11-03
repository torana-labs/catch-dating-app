import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_cases_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_cases_page.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_queue_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_queue_sheet.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'event_assistance_help_queue_fixtures.dart';

void main() {
  testWidgets(
    'cursor history is bounded by status and ignores repeated stale taps',
    (tester) async {
      final repository = _Pages();
      final query = helpQueueQuery();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('host-1')),
            eventAssistanceCasesRepositoryProvider.overrideWith(
              (ref) => repository,
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: EventAssistanceHelpQueueSheet(
                organizerId: query.organizerId,
                eventId: query.eventId,
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      EventAssistanceHelpQueueSection controls() =>
          tester.widget(find.byType(EventAssistanceHelpQueueSection));
      final first = controls();
      expect(first.items.length, 50);
      expect(first.onPrevious, isNull);
      first.onNext!();
      first.onNext!();
      await pumpFeatureUi(tester);
      final second = controls();
      expect(second.items.single.displayName, 'Guest 051');
      expect(second.onNext, isNull);
      second.onPrevious!();
      second.onPrevious!();
      await pumpFeatureUi(tester);
      final back = controls();
      expect(back.items.length, 50);
      expect(back.onPrevious, isNull);
      back.onStatus(AssistanceCaseStatus.resolved);
      back.onNext!();
      await pumpFeatureUi(tester);
      expect(controls().status, AssistanceCaseStatus.resolved);
      expect(controls().items, isEmpty);
      expect(controls().onPrevious, isNull);
      expect(repository.reads.last.status, AssistanceCaseStatus.resolved);
      expect(repository.reads.last.cursor, isNull);
      expect(tester.takeException(), isNull);
    },
  );
}

class _Pages extends Fake implements EventAssistanceCasesRepository {
  final reads = <EventAssistanceCaseQuery>[];
  @override
  Stream<EventAssistanceCasesPage> watchPage(
    EventAssistanceCaseQuery query, {
    required String actorUid,
  }) {
    reads.add(query);
    final stage = helpQueueFixture('initial');
    final view = helpQueueViews(stage).single;
    final row = view.data['view']! as Map;
    final first = query.cursor == null;
    return Stream.value(
      EventAssistanceCasesPage.fromViews(
        query: query,
        views: [
          if (query.status == AssistanceCaseStatus.open)
            for (var i = first ? 1 : 51; i <= (first ? 50 : 51); i++)
              (
                id: 'case:${i.toString().padLeft(3, '0')}',
                data: {
                  ...view.data,
                  'caseId': 'case:${i.toString().padLeft(3, '0')}',
                  'view': {
                    ...row,
                    'caseId': 'case:${i.toString().padLeft(3, '0')}',
                    'displayName': 'Guest ${i.toString().padLeft(3, '0')}',
                  },
                },
                evaluatedAtMillis: view.evaluatedAtMillis,
              ),
        ],
        hasMore: query.status == AssistanceCaseStatus.open && first,
        managerOptions: null,
      ),
    );
  }
}
