import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_deliveries_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_delivery_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_decision_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_live_delivery_section.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import 'event_assistance_delivery_queue_fixtures.dart';
import 'event_assistance_delivery_widget_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final practice in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'delivery evidence, detached handoff and late receipt: practice=$practice scale=$scale',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = const Size(430, 932);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPhysicalSize);
          final live = DeliveryUiLive();
          final rehearsal = DeliveryUiPractice();
          final auth = StreamController<String?>.broadcast();
          addTearDown(auth.close);
          final boundary = GlobalKey();
          final query = deliveryQueueQuery();
          final guest = practice
              ? rehearsal.snapshot.actors.first.displayName
              : 'Alex Morgan';
          final id = practice
              ? rehearsal
                    .snapshot
                    .deliveryReviews!
                    .deliveries
                    .single
                    .scope
                    .messageId
              : ((deliveryQueueFixture('command')['command'] as Map)['payload']
                        as Map)['deliveryId']
                    as String;
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                uidProvider.overrideWith((ref) => auth.stream),
                eventAssistanceDeliveriesRepositoryProvider.overrideWith(
                  (ref) => live,
                ),
                eventRehearsalRepositoryProvider.overrideWith(
                  (ref) => rehearsal,
                ),
              ],
              child: MaterialApp(
                theme: AppTheme.light,
                localizationsDelegates: AppLocalizations.localizationsDelegates,
                supportedLocales: AppLocalizations.supportedLocales,
                builder: (context, child) => RepaintBoundary(
                  key: boundary,
                  child: MediaQuery(
                    data: MediaQuery.of(
                      context,
                    ).copyWith(textScaler: TextScaler.linear(scale)),
                    child: child!,
                  ),
                ),
                home: Scaffold(
                  body: SingleChildScrollView(
                    child: practice
                        ? EventRehearsalDeliverySection(
                            sessionId: rehearsal.snapshot.session.id,
                          )
                        : EventAssistanceLiveDeliverySection(
                            organizerId: query.organizerId,
                            eventId: query.eventId,
                          ),
                  ),
                ),
              ),
            ),
          );
          await tester.pump();
          auth.add('host-1');
          await pumpFeatureUi(tester);
          Future<void> tap(Finder finder) async {
            await tester.ensureVisible(finder);
            await tester.tap(finder);
            await pumpFeatureUi(tester);
          }

          Future<void> capture(String name) async {
            if (Platform.environment['CAPTURE_DELIVERY_QUEUE'] != '1') return;
            await tester.runAsync(() async {
              final image =
                  await (boundary.currentContext!.findRenderObject()!
                          as RenderRepaintBoundary)
                      .toImage();
              final bytes = await image.toByteData(
                format: ui.ImageByteFormat.png,
              );
              await File(
                '/tmp/delivery-$name-$practice-$scale.png',
              ).writeAsBytes(bytes!.buffer.asUint8List());
              image.dispose();
            });
          }

          await tap(find.text('Review messages'));
          expect(
            find.text(guest),
            practice ? findsOneWidget : findsNWidgets(2),
          );
          await capture('queue');
          await tap(find.byKey(ValueKey('delivery.message.$id')));
          expect(
            find.byType(EventAssistanceDeliveryDecisionSection),
            findsOneWidget,
          );
          expect(find.text('Delivery unconfirmed'), findsWidgets);
          expect(live.writes, isEmpty);
          expect(rehearsal.writes, isEmpty);
          await capture('review');
          await tap(find.byKey(const ValueKey('delivery.takeOver')));
          final original = practice
              ? rehearsal.writes.single.change
              : live.writes.single.change;
          if (practice) {
            rehearsal.writes.single.result.completeError(
              const NetworkException('unavailable', 'Offline'),
            );
          } else {
            live.writes.single.result.completeError(
              const NetworkException('unavailable', 'Offline'),
            );
          }
          await pumpFeatureUi(tester);
          expect(find.byKey(const ValueKey('delivery.takeOver')), findsNothing);
          await tap(find.text('Done'));
          await tap(find.byKey(ValueKey('delivery.pending.$id')));
          await tap(find.text('Confirm this handoff'));
          if (practice) {
            expect(rehearsal.writes.last.change, same(original));
            rehearsal.confirm();
          } else {
            expect(live.writes.last.change, same(original));
            live.confirm();
          }
          await pumpFeatureUi(tester);
          expect(find.text('Handoff confirmed'), findsOneWidget);
          expect(find.text('Delivery unconfirmed'), findsWidgets);
          await tap(find.text('Done'));
          expect(find.text('Handoff needs confirmation'), findsNothing);
          if (practice) {
            rehearsal.snapshot = practiceDeliveryQueue('delivered');
          } else {
            live.stage = 'delivered';
          }
          await tap(find.text('Reload messages'));
          await tap(find.byKey(ValueKey('delivery.message.$id')));
          expect(find.text('Delivered'), findsWidgets);
          expect(find.byKey(const ValueKey('delivery.takeOver')), findsNothing);
          expect(practice ? rehearsal.writes.length : live.writes.length, 2);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}
