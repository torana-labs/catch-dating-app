import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/events/shared/event_share_card.dart';
import 'package:catch_dating_app/kernel/brand.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:share_plus/share_plus.dart';

import '../test_pump_helpers.dart';
import 'events_test_helpers.dart';

void main() {
  testWidgets('exports an event invite as a png with the event link', (
    tester,
  ) async {
    ShareParams? sharedParams;
    final event = buildEvent(
      meetingPoint: 'Bandra',
      startTime: DateTime(2026, 6, 1, 18),
      endTime: DateTime(2026, 6, 1, 20),
      bookedCount: 12,
    );
    final share = ExternalShareController((params) async {
      sharedParams = params;
    });

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: FilledButton(
                onPressed: () => showEventShareCardSheet(
                  context,
                  event: event,
                  share: share,
                  inviteCode: 'VIP42',
                  inviteLinkId: 'invite-link-1',
                ),
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open'));
    await pumpFeatureUi(tester);

    expect(find.byKey(CatchShareCardSheet.cardPreviewKey), findsOneWidget);
    expect(find.byType(EventShareCard), findsOneWidget);
    expect(find.text('CATCH INVITE'), findsOneWidget);
    expect(find.text(event.title), findsOneWidget);
    expect(find.text('Bandra'), findsOneWidget);

    await tester.tap(find.byKey(CatchShareCardSheet.shareButtonKey));
    await tester.pump();
    await pumpFeatureUi(tester);
    await tester.runAsync(() async {
      for (var i = 0; i < 20 && sharedParams == null; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 10));
      }
    });

    expect(sharedParams?.subject, 'Join me at ${event.title}');
    expect(sharedParams?.text, contains('invite=VIP42'));
    expect(sharedParams?.text, contains('il=invite-link-1'));
    expect(sharedParams?.files, hasLength(1));
    expect(sharedParams?.fileNameOverrides, ['catch-event-invite.png']);
  });

  testWidgets('uses a personal invite URL and records only share intent', (
    tester,
  ) async {
    ShareParams? sharedParams;
    var shareIntentCount = 0;
    final event = buildEvent();
    final share = ExternalShareController((params) async {
      sharedParams = params;
    });

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Builder(
          builder: (context) => Scaffold(
            body: FilledButton(
              onPressed: () => showEventShareCardSheet(
                context,
                event: event,
                share: share,
                inviteUri: Uri.parse(
                  '${Brand.webOrigin}/invite/v2_personal_token',
                ),
                onShareIntent: () async => shareIntentCount += 1,
              ),
              child: const Text('Open personal share'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open personal share'));
    await pumpFeatureUi(tester);
    expect(shareIntentCount, 0);

    await tester.tap(find.byKey(CatchShareCardSheet.shareButtonKey));
    await tester.pump();
    await pumpFeatureUi(tester);
    await tester.runAsync(() async {
      for (var i = 0; i < 20 && sharedParams == null; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 10));
      }
    });

    expect(shareIntentCount, 1);
    expect(
      sharedParams?.text,
      contains('${Brand.webOrigin}/invite/v2_personal_token'),
    );
  });
}
