import 'dart:async';

import 'package:catch_dating_app/hosts/people/sends/sends_sheets_body.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('submits trimmed follower copy and closes after acceptance', (
    tester,
  ) async {
    String? submitted;
    String? submittedRequestId;
    var requestSequence = 0;
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => unawaited(
                  showHostFollowerUpdateSheet(
                    context: context,
                    remainingQuota: 2,
                    weeklyQuota: 3,
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
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => unawaited(
                  showHostFollowerUpdateSheet(
                    context: context,
                    remainingQuota: 2,
                    weeklyQuota: 3,
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

    // The error line grows the sheet, so bring the button back into view.
    await tester.ensureVisible(
      find.byKey(const ValueKey('host-follower-update-submit')),
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(const ValueKey('host-follower-update-submit')));
    await pumpFeatureUi(tester);

    expect(requestIds, ['request-1', 'request-1']);
    expect(find.text('Posted to followers.'), findsOneWidget);
  });

  testWidgets('the WhatsApp switch adds the channel and reports the count', (
    tester,
  ) async {
    bool? sentOnWhatsapp;
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
                    showHostFollowerUpdateSheet(
                      context: context,
                      remainingQuota: 2,
                      weeklyQuota: 3,
                      requestIdFactory: () => 'request-1',
                      whatsappAvailable: available,
                      onSubmitPost:
                          ({
                            required requestId,
                            required text,
                            required whatsapp,
                          }) async {
                            sentOnWhatsapp = whatsapp;
                            return whatsapp ? 4 : null;
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
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: HostFollowerUpdateSheet(
              remainingQuota: 2,
              weeklyQuota: 3,
              requestIdFactory: () => 'request-1',
              onSubmit:
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
