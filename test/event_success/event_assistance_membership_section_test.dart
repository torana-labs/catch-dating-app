import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_copy.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_membership_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_assistance_membership_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  testWidgets('unidentified or absent receivers cannot form a handover', (
    tester,
  ) async {
    for (final unnamed in [true, false]) {
      final wire = membershipWire(state: 'current');
      (wire['view'] as Map)['handoverReview'] = {
        'expiresAt': 7000,
        'receivers': [
          if (unnamed)
            {
              'operatorId': 'host-2',
              'displayName': null,
              'groups': [
                {'groupId': 'tempo', 'validUntil': 6000},
              ],
            },
        ],
      };
      final view = membershipResult(wire).view;
      await tester.pumpWidget(
        MaterialApp(
          key: UniqueKey(),
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: CatchSheet(
              title: 'Asha',
              mode: CatchSheetMode.scrollable,
              child: EventAssistanceMembershipSection(
                facts: view.facts,
                handoverReview: view.handoverReview,
                phase: EventAssistanceMembershipPhase.ready,
                actorUid: 'host-1',
                onDecide: (_) => fail('No receiver was identified.'),
                onDone: () {},
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      for (final label in [
        'Hand over to another group',
        'Group',
        'Tempo pace',
      ]) {
        await tester.ensureVisible(find.text(label));
        await tester.tap(find.text(label));
        await pumpFeatureUi(tester);
      }
      expect(find.text('Receiving host'), findsNothing);
      expect(
        tester
            .widget<CatchButton>(
              find.widgetWithText(CatchButton, 'Confirm group action'),
            )
            .onPressed,
        isNull,
      );
      expect(
        find.text(
          unnamed
              ? 'Some hosts have no name on file and can’t be selected.'
              : 'Receiving hosts are unavailable in this review. Refresh the group details to try again.',
        ),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    }
  });

  for (final action in AssistanceMembershipAction.values) {
    for (final scale
        in action == AssistanceMembershipAction.propose ? [1.0, 2.0] : [1.0]) {
      testWidgets('only reviewed $action can be confirmed; scale=$scale', (
        tester,
      ) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(430, 932);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        final boundary = GlobalKey();
        final receiver = [
          AssistanceMembershipAction.accept,
          AssistanceMembershipAction.reject,
        ].contains(action);
        final actor = receiver ? 'host-2' : 'host-1';
        final state = action == AssistanceMembershipAction.place
            ? 'uninitialized'
            : action == AssistanceMembershipAction.propose
            ? 'current'
            : 'pending';
        final wire = membershipWire(state: state, operatorId: actor);
        if (action == AssistanceMembershipAction.propose) {
          (wire['view'] as Map)['handoverReview'] = {
            'expiresAt': 7000,
            'receivers': [
              {
                'operatorId': 'host-2',
                'displayName': 'Sam',
                'groups': [
                  {'groupId': 'tempo', 'validUntil': 6000},
                ],
              },
            ],
          };
        }
        final view = membershipResult(wire).view;
        final submitted = <AssistanceMembershipDecision>[];
        late AppLocalizations l10n;
        await tester.pumpWidget(
          MaterialApp(
            theme: scale == 2 ? AppTheme.dark : AppTheme.light,
            builder: (context, child) => RepaintBoundary(
              key: boundary,
              child: MediaQuery(
                data: MediaQuery.of(
                  context,
                ).copyWith(textScaler: TextScaler.linear(scale)),
                child: child!,
              ),
            ),
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Builder(
              builder: (context) {
                l10n = context.l10n;
                return Scaffold(
                  body: Align(
                    alignment: Alignment.bottomCenter,
                    child: CatchSheet(
                      title: 'Asha',
                      mode: CatchSheetMode.scrollable,
                      child: EventAssistanceMembershipSection(
                        facts: view.facts,
                        handoverReview: view.handoverReview,
                        phase: EventAssistanceMembershipPhase.ready,
                        actorUid: actor,
                        onDecide: submitted.add,
                        onDone: () {},
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        );
        await pumpFeatureUi(tester);
        Future<void> tap(String text) async {
          await tester.ensureVisible(find.text(text));
          await tester.tap(find.text(text));
          await pumpFeatureUi(tester);
        }

        for (final unavailable in AssistanceMembershipAction.values.where(
          (a) => !view.actions.contains(a),
        )) {
          expect(
            find.byKey(ValueKey('membership.choose.${unavailable.name}')),
            findsNothing,
          );
        }
        await tap(assistanceMembershipActionLabel(l10n, action));
        expect(submitted, isEmpty);
        if (action == AssistanceMembershipAction.place ||
            action == AssistanceMembershipAction.propose) {
          await tap('Group');
          await tap(
            action == AssistanceMembershipAction.place
                ? 'Easy pace'
                : 'Tempo pace',
          );
        }
        if (action == AssistanceMembershipAction.propose) {
          final button = tester.widget<CatchButton>(
            find.widgetWithText(CatchButton, 'Confirm group action'),
          );
          expect(button.onPressed, isNull);
          await tap('Receiving host');
          await tap('Sam');
          // The accepted group remains unchanged while configuring the handover.
          expect(find.text('Easy pace'), findsOneWidget);
          if (Platform.environment['CAPTURE_MEMBERSHIP'] == '1') {
            await tester.runAsync(() async {
              final image =
                  await (boundary.currentContext!.findRenderObject()
                          as RenderRepaintBoundary)
                      .toImage();
              final bytes = await image.toByteData(
                format: ui.ImageByteFormat.png,
              );
              await File(
                '/tmp/membership-handover-$scale.png',
              ).writeAsBytes(bytes!.buffer.asUint8List());
              image.dispose();
            });
          }
        }
        expect(submitted, isEmpty);
        await tap('Confirm group action');
        expect(submitted.single.action, action);
        membershipChange(
          view: view,
          actorUid: actor,
          decision: submitted.single,
        );
        if (submitted.single case AssistanceProposeGroup(
          :final groupId,
          :final receivingOperatorId,
          :final expiresAt,
        )) {
          expect(groupId, 'tempo');
          expect(receivingOperatorId, 'host-2');
          expect(expiresAt, 6000);
        }
        expect(tester.takeException(), isNull);
      });
    }
  }
}
