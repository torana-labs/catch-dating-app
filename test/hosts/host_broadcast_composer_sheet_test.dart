import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/design_fixtures/host_inbox_surface_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_broadcast_composer_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets('keeps one request id across a failed retry', (tester) async {
    var generatedIds = 0;
    var attempts = 0;
    final sentIds = <String>[];

    await tester.pumpWidget(
      _app(
        HostBroadcastComposerSheet(
          event: HostInboxSurfaceFixtures.event,
          bookedCount: 24,
          prospectiveCount: 9,
          initialSegment: HostInboxAudienceSegment.booked,
          initialTemplate: HostBroadcastTemplate.reminder,
          requestIdFactory: () => 'request-${++generatedIds}',
          sendAction:
              ({
                required requestId,
                required eventId,
                required audience,
                required body,
              }) async {
                sentIds.add(requestId);
                attempts += 1;
                if (attempts == 1) throw StateError('temporary failure');
                return _response(recipientCount: 24);
              },
        ),
      ),
    );

    await tester.ensureVisible(find.text('Send to 24 people'));
    await tester.tap(find.text('Send to 24 people'));
    await pumpFeatureUi(tester);

    expect(find.text('Send to 24 people'), findsOneWidget);
    expect(sentIds, ['request-1']);

    await tester.ensureVisible(find.text('Send to 24 people'));
    await tester.tap(find.text('Send to 24 people'));
    await pumpFeatureUi(tester);

    expect(sentIds, ['request-1', 'request-1']);
    expect(generatedIds, 1);
  });

  testWidgets('rotates the request id when the payload changes', (
    tester,
  ) async {
    var generatedIds = 0;
    final sentIds = <String>[];

    await tester.pumpWidget(
      _app(
        HostBroadcastComposerSheet(
          event: HostInboxSurfaceFixtures.event,
          bookedCount: 24,
          prospectiveCount: 9,
          initialSegment: HostInboxAudienceSegment.booked,
          sendingEnabled: true,
          requestIdFactory: () => 'request-${++generatedIds}',
          sendAction:
              ({
                required requestId,
                required eventId,
                required audience,
                required body,
              }) async {
                sentIds.add(requestId);
                return _response(recipientCount: 24);
              },
        ),
      ),
    );

    await tester.tap(find.text('Reminder'));
    await pumpFeatureUi(tester);
    await tester.ensureVisible(find.text('Send to 24 people'));
    await tester.tap(find.text('Send to 24 people'));
    await pumpFeatureUi(tester);

    expect(generatedIds, 2);
    expect(sentIds, ['request-2']);
  });

  testWidgets('keeps sending disabled before the production preflight', (
    tester,
  ) async {
    var sendCalls = 0;
    await tester.pumpWidget(
      _app(
        HostBroadcastComposerSheet(
          event: HostInboxSurfaceFixtures.event,
          bookedCount: 24,
          prospectiveCount: 9,
          initialSegment: HostInboxAudienceSegment.booked,
          initialTemplate: HostBroadcastTemplate.reminder,
          sendingEnabled: false,
          requestIdFactory: () => 'request-disabled',
          sendAction:
              ({
                required requestId,
                required eventId,
                required audience,
                required body,
              }) async {
                sendCalls += 1;
                return _response(recipientCount: 24);
              },
        ),
      ),
    );

    expect(
      find.text(
        'Sending stays off in this build until the production callable passes the release preflight.',
      ),
      findsOneWidget,
    );
    final button = tester.widget<CatchButton>(find.byType(CatchButton));
    expect(button.onPressed, isNull);
    expect(sendCalls, 0);
  });
}

Widget _app(Widget child) => ProviderScope(
  child: MaterialApp(
    theme: AppTheme.light,
    home: Scaffold(body: child),
  ),
);

SendEventBroadcastCallableResponse _response({required int recipientCount}) =>
    SendEventBroadcastCallableResponse(
      broadcastId: 'broadcast-1',
      status: EventBroadcastDeliveryStatus.completed,
      recipientCount: recipientCount,
      excludedCount: 0,
      activityAvailableCount: recipientCount,
      pushAttemptedCount: 0,
      pushAcceptedCount: 0,
      pushFailedCount: 0,
      pushUnknownCount: 0,
      idempotentReplay: false,
    );
