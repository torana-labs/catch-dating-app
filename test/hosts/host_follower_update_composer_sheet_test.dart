import 'dart:async';

import 'package:catch_dating_app/hosts/presentation/inbox/host_follower_update_composer_sheet.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
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
                    onSubmitPost: ({required requestId, required text}) async {
                      submittedRequestId = requestId;
                      submitted = text;
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
                    onSubmitPost: ({required requestId, required text}) async {
                      requestIds.add(requestId);
                      attempts += 1;
                      if (attempts == 1) {
                        throw StateError('temporary failure');
                      }
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
}
