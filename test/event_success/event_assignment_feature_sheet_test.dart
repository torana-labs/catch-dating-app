import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assignment_feature_choice_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assignment_feature_choice.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_success/presentation/event_assignment_feature_sheet.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';

const _choice = EventAssignmentFeatureChoice(
  featureId: 'pace',
  responseId: 'response-1',
  questionLabel: 'How fast do you run?',
  answerLabel: 'Easy pace',
  status: EventAssignmentFeatureChoiceStatus.notGranted,
  revision: 0,
  canGrant: true,
);

class _ChoiceStore implements EventAssignmentFeatureChoiceStore {
  final reads = <Completer<EventAssignmentFeatureChoices>>[];
  final writes = <Completer<void>>[];
  @override
  Future<EventAssignmentFeatureChoices> list(String eventId) {
    final read = Completer<EventAssignmentFeatureChoices>();
    reads.add(read);
    return read.future;
  }

  @override
  Future<void> decide({
    required String eventId,
    required EventAssignmentFeatureChoice choice,
    required bool grant,
    required String requestId,
  }) {
    final write = Completer<void>();
    writes.add(write);
    return write.future;
  }
}

Future<void> _pump(
  WidgetTester tester,
  _ChoiceStore store,
  Stream<String?> auth, {
  String eventId = 'event-1',
}) async {
  await tester.pumpWidget(ProviderScope(
    overrides: [
      uidProvider.overrideWith((ref) => auth),
      eventAssignmentFeatureChoiceStoreProvider.overrideWithValue(store),
    ],
    child: MaterialApp(
      theme: AppTheme.light,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(body: EventAssignmentFeatureSheet(eventId: eventId)),
    ),
  ));
  await tester.pump();
}

void main() {
  setUpAll(loadCatchTestFonts);

  testWidgets('auth change discards prior answer result', (tester) async {
    final auth = StreamController<String?>.broadcast();
    addTearDown(auth.close);
    final store = _ChoiceStore();
    await _pump(tester, store, auth.stream);
    auth.add('runner-1');
    await tester.pump();
    await tester.pump();
    expect(store.reads, hasLength(1));
    auth.add('runner-2');
    await tester.pump();
    await tester.pump();
    expect(store.reads, hasLength(2));
    store.reads[0].complete(const EventAssignmentFeatureChoices(
      'event-1', [_choice],
    ));
    await tester.pump();
    expect(find.textContaining('Easy pace'), findsNothing);
    store.reads[1].complete(const EventAssignmentFeatureChoices(
      'event-1', [],
    ));
    await tester.pump();
    expect(find.textContaining('Easy pace'), findsNothing);
  });

  testWidgets('background clears answer and rejects late result', (
    tester,
  ) async {
    final store = _ChoiceStore();
    await _pump(tester, store, Stream.value('runner-1'));
    expect(store.reads, hasLength(1));
    store.reads.single.complete(const EventAssignmentFeatureChoices(
      'event-1', [_choice],
    ));
    await tester.pump();
    expect(find.textContaining('Easy pace'), findsOneWidget);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    await tester.pump();
    expect(find.textContaining('Easy pace'), findsNothing);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump();
    expect(store.reads, hasLength(2));
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    store.reads.last.complete(const EventAssignmentFeatureChoices(
      'event-1', [_choice],
    ));
    await tester.pump();
    expect(find.textContaining('Easy pace'), findsNothing);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
  });

  testWidgets('failed write retains error after authoritative refresh', (
    tester,
  ) async {
    final store = _ChoiceStore();
    await _pump(tester, store, Stream.value('runner-1'));
    store.reads.single.complete(const EventAssignmentFeatureChoices(
      'event-1', [_choice],
    ));
    await tester.pump();
    await tester.tap(find.text('Allow for this event'));
    await tester.pump();
    expect(store.writes, hasLength(1));
    store.writes.single.completeError(StateError('write failed'));
    await tester.pump();
    expect(store.reads, hasLength(2));
    store.reads.last.complete(const EventAssignmentFeatureChoices(
      'event-1', [_choice],
    ));
    await tester.pump();
    expect(find.byType(CatchLocalizedErrorBanner), findsOneWidget);
    expect(find.textContaining('Easy pace'), findsOneWidget);
    expect(find.text('Your choice is saved for this event.'), findsNothing);
  });
}
