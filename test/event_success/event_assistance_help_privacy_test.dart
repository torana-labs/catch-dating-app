import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_cases_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_managers.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_cases_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_decision_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_queue_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_sheet.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'event_assistance_help_queue_fixtures.dart';
import 'event_assistance_help_widget_fixtures.dart';

void main() {
  testWidgets(
    'new source redaction and access loss override a frozen help review',
    (tester) async {
      final repository = HelpUiLive();
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
              body: EventAssistanceHelpSheet(
                scope: helpQueuePage('initial').cases.single.scope,
                query: query,
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(EventAssistanceHelpSheet)),
        listen: false,
      );
      Future<void> tap(Finder finder) async {
        await tester.ensureVisible(finder);
        await tester.tap(finder);
        await pumpFeatureUi(tester);
      }

      await tap(find.byKey(const ValueKey('help.choose.take')));
      await tap(find.byKey(const ValueKey('help.confirm')));
      repository.writes.single.result.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Alex Morgan'), findsOneWidget);
      final raw = helpQueueFixture('initial');
      ((raw['cases'] as List).single as Map).addAll(<String, Object?>{
        'availability': 'sourceChanged',
        'attendeeId': null,
        'displayName': null,
        'canChange': false,
        'sourceHash': 'b' * 64,
        'assignment': {'kind': 'unavailable'},
      });
      repository.pageOverride = raw;
      container.read(eventAssistanceCasesProvider(query).notifier).reload();
      await pumpFeatureUi(tester);
      expect(find.text('Alex Morgan'), findsNothing);
      expect(find.text('Guest details unavailable'), findsOneWidget);
      expect(find.text('Retry this decision'), findsOneWidget);
      repository.readError = const PermissionException('Access removed.');
      container.read(eventAssistanceCasesProvider(query).notifier).reload();
      await pumpFeatureUi(tester);
      expect(find.byType(EventAssistanceHelpDecisionSection), findsNothing);
      expect(find.text('Alex Morgan'), findsNothing);
      expect(repository.writes.length, 1);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('indistinguishable manager names cannot form a handoff', (
    tester,
  ) async {
    final page = helpQueuePage('initial');
    final options = AssistanceCaseManagerOptions.fromJson({
      'actorUid': 'host-1',
      'managers': [
        {'uid': 'host-1', 'displayName': 'Sam'},
        {'uid': 'host-2', 'displayName': 'Priya'},
        {'uid': 'host-3', 'displayName': 'Priya'},
        {'uid': 'host-4', 'displayName': null},
      ],
    });
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: CatchSheet(
            mode: CatchSheetMode.scrollable,
            child: EventAssistanceHelpDecisionSection(
              item: liveHelpItem(page.cases.single),
              reviewIdentity: page,
              actorUid: 'host-1',
              options: options,
              phase: EventAssistanceHelpPhase.ready,
              onDecide: (_) => fail('No unambiguous host was selected.'),
              onDone: () {},
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    await tester.ensureVisible(
      find.byKey(const ValueKey('help.choose.transfer')),
    );
    await tester.tap(find.byKey(const ValueKey('help.choose.transfer')));
    await pumpFeatureUi(tester);
    expect(find.byKey(const ValueKey('help.manager')), findsNothing);
    expect(
      tester
          .widget<CatchButton>(find.byKey(const ValueKey('help.confirm')))
          .onPressed,
      isNull,
    );
    expect(
      find.text('Hosts need a distinct display name to appear here.'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
}
