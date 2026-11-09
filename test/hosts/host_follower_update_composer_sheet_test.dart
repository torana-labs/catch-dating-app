import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/data/organizer_callable_responses.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_follower_update_composer_sheet.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../organizers/organizers_test_helpers.dart' as organizer_test;
import '../test_pump_helpers.dart';

void main() {
  testWidgets('submits trimmed follower copy and closes after acceptance', (
    tester,
  ) async {
    String? submitted;
    String? submittedRequestId;
    var requestSequence = 0;
    final organizer = organizer_test.buildOrganizer(id: 'organizer-1');
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => unawaited(
                  showHostFollowerUpdateComposer(
                    context: context,
                    organizer: organizer,
                    remainingQuota: 2,
                    requestIdFactory: () => 'request-${requestSequence++}',
                    onSubmitPost:
                        ({
                          required requestId,
                          required text,
                          required whatsapp,
                        }) async {
                          submittedRequestId = requestId;
                          submitted = text;
                          return null;
                        },
                  ),
                ),
                child: const Text('Open composer'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open composer'));
    await pumpFeatureUi(tester);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('host-follower-update-text')),
        matching: find.byType(EditableText),
      ),
      '  Meet by the east gate.  ',
    );
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('host-follower-update-submit')));
    await pumpFeatureUi(tester);
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 1));

    expect(submitted, 'Meet by the east gate.');
    expect(submittedRequestId, 'request-1');
    expect(find.text('Post to followers'), findsNothing);
    expect(find.text('Posted to followers.'), findsOneWidget);
  });

  testWidgets('retry reuses the request id until the copy changes', (
    tester,
  ) async {
    final requestIds = <String>[];
    var requestSequence = 0;
    var attempts = 0;
    final organizer = organizer_test.buildOrganizer(id: 'organizer-1');
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => unawaited(
                  showHostFollowerUpdateComposer(
                    context: context,
                    organizer: organizer,
                    remainingQuota: 2,
                    requestIdFactory: () => 'request-${requestSequence++}',
                    onSubmitPost:
                        ({
                          required requestId,
                          required text,
                          required whatsapp,
                        }) async {
                          requestIds.add(requestId);
                          attempts += 1;
                          if (attempts == 1) {
                            throw StateError('temporary failure');
                          }
                          return null;
                        },
                  ),
                ),
                child: const Text('Open composer'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open composer'));
    await pumpFeatureUi(tester);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('host-follower-update-text')),
        matching: find.byType(EditableText),
      ),
      'Meet by the east gate.',
    );
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('host-follower-update-submit')));
    await pumpFeatureUi(tester);
    expect(
      find.text('Could not post this update. Please try again.'),
      findsOneWidget,
    );

    await tester.tap(find.byKey(const ValueKey('host-follower-update-submit')));
    await pumpFeatureUi(tester);

    expect(requestIds, ['request-1', 'request-1']);
    expect(find.text('Posted to followers.'), findsOneWidget);
  });

  testWidgets('the WhatsApp switch adds the channel and reports the count', (
    tester,
  ) async {
    bool? sentOnWhatsapp;
    final organizer = organizer_test.buildOrganizer(id: 'organizer-1');
    Future<void> open({required bool available}) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.light,
            builder: catchNoticeOverlayBuilder,
            home: Builder(
              builder: (context) => Scaffold(
                body: TextButton(
                  onPressed: () => unawaited(
                    showHostFollowerUpdateComposer(
                      context: context,
                      organizer: organizer,
                      remainingQuota: 2,
                      requestIdFactory: () => 'request-1',
                      whatsappAvailable: available,
                      onSubmitPost:
                          ({
                            required requestId,
                            required text,
                            required whatsapp,
                          }) async {
                            sentOnWhatsapp = whatsapp;
                            return CreateOrganizerPostCallableResponse(
                              postId: 'post-1',
                              remainingWeeklyQuota: 1,
                              deliveryStatus: 'pending',
                              recipientCount: 0,
                              excludedCount: 0,
                              activityAvailableCount: 0,
                              pushAttemptedCount: 0,
                              pushAcceptedCount: 0,
                              pushFailedCount: 0,
                              pushUnknownCount: 0,
                              idempotentReplay: false,
                              whatsapp: whatsapp
                                  ? const OrganizerPostWhatsappCounts(
                                      status: 'collecting',
                                      queuedCount: 4,
                                      skippedCount: 9,
                                      sentCount: 0,
                                      deliveredCount: 0,
                                      failedCount: 0,
                                    )
                                  : null,
                            );
                          },
                    ),
                  ),
                  child: const Text('Open composer'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open composer'));
      await pumpFeatureUi(tester);
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('host-follower-update-text')),
          matching: find.byType(EditableText),
        ),
        'New Sunday run.',
      );
      await tester.pump();
    }

    await open(available: true);
    await tester.tap(
      find.byKey(const ValueKey('host-follower-update-whatsapp')),
    );
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('host-follower-update-submit')));
    await pumpFeatureUi(tester);
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 1));
    expect(sentOnWhatsapp, isTrue);
    expect(
      find.text('Posted to followers. Sending on WhatsApp to 4 followers.'),
      findsOneWidget,
    );
  });

  testWidgets('without a ready WhatsApp number the switch stays off', (
    tester,
  ) async {
    final organizer = organizer_test.buildOrganizer(id: 'organizer-1');
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: HostFollowerUpdateComposerSheet(
              organizer: organizer,
              remainingQuota: 2,
              requestIdFactory: () => 'request-1',
              onSubmitPost:
                  ({
                    required requestId,
                    required text,
                    required whatsapp,
                  }) async => null,
            ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(
      find.text(
        'Connect your WhatsApp number and get the follower update template '
        'approved to send there too.',
      ),
      findsOneWidget,
    );
  });
}
