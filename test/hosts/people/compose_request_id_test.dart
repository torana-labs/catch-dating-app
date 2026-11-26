import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/hosts/people/compose_controller.dart';
import 'package:catch_dating_app/hosts/people/compose_screen.dart';
import 'package:catch_dating_app/hosts/people/compose_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'people_captures.dart';
import 'people_fixtures.dart';

// The compose screen sends an announcement under one request id per draft,
// so a retry after a failure cannot send it twice (carried over from the old
// inbox broadcast composer sheet).

/// Records each send and fails the ones listed in [failAttempts].
class _FakeComposeCommands implements HostComposeCommands {
  _FakeComposeCommands({this.failAttempts = const {}});

  final Set<int> failAttempts;
  final sentIds = <String>[];
  int generatedIds = 0;

  @override
  String newRequestId() => 'request-${++generatedIds}';

  @override
  Future<SendEventBroadcastCallableResponse> send({
    required String requestId,
    required String eventId,
    required HostComposeAudience audience,
    required String body,
  }) async {
    sentIds.add(requestId);
    if (failAttempts.contains(sentIds.length)) {
      throw StateError('temporary failure');
    }
    return SendEventBroadcastCallableResponse(
      broadcastId: 'broadcast-1',
      status: EventBroadcastDeliveryStatus.completed,
      recipientCount: 79,
      excludedCount: 0,
      activityAvailableCount: 79,
      pushAttemptedCount: 0,
      pushAcceptedCount: 0,
      pushFailedCount: 0,
      pushUnknownCount: 0,
      idempotentReplay: false,
    );
  }
}

Future<void> _pump(WidgetTester tester, _FakeComposeCommands commands) async {
  tester.view.physicalSize = const Size(390, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        ...hostPeopleCaptureOverrides(),
        hostComposeCommandsProvider.overrideWithValue(commands),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: HostComposeScreen(
          organizerId: peopleOrganizer.id,
          now: peopleNow,
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

Future<void> _write(WidgetTester tester, String text) async {
  await tester.enterText(
    find.descendant(
      of: find.byKey(const ValueKey<String>('host-compose-message')),
      matching: find.byType(EditableText),
    ),
    text,
  );
  await pumpFeatureUi(tester);
}

Future<void> _send(WidgetTester tester) async {
  await tester.tap(find.text('Send to 79'));
  await pumpFeatureUi(tester);
}

void main() {
  testWidgets('a failed send retries under the same request id', (
    tester,
  ) async {
    final commands = _FakeComposeCommands(failAttempts: {1});
    await _pump(tester, commands);
    await _write(tester, 'Doors open at seven.');

    await _send(tester);
    expect(commands.sentIds, ['request-1']);
    expect(find.text('Send to 79'), findsOneWidget);

    await _send(tester);
    expect(commands.sentIds, ['request-1', 'request-1']);
    expect(commands.generatedIds, 1);
  });

  testWidgets('changing the draft after a failure sends a new request id', (
    tester,
  ) async {
    final commands = _FakeComposeCommands(failAttempts: {1});
    await _pump(tester, commands);
    await _write(tester, 'Doors open at seven.');

    await _send(tester);
    await _write(tester, 'Doors open at eight.');
    await _send(tester);

    expect(commands.sentIds, ['request-1', 'request-2']);
  });
}
