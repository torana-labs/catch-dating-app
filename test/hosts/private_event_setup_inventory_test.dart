import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/widgets/host_events_list.dart';

import 'package:catch_dating_app/hosts/presentation/event_management/host_private_event_setup_inventory_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

const _city = EventSetupCity(cityId: 'in-mh-mumbai', marketId: 'in-mh-mumbai');

const _saved = PrivateEventSetupInventoryItem(
  eventId: 'event-1',
  name: 'Saturday mixer',
  city: _city,
  localDate: '2026-09-26',
  localStartTime: '19:00',
  timezone: 'Asia/Kolkata',
  startTimeMillis: 1790449200000,
  setupRevision: 1,
  detailsConfigured: false,
);

void main() {
  setUpAll(loadCatchTestFonts);
  test(
    'manager inventory validates every returned private item and cursor',
    () {
      final body = <String, Object?>{
        'events': [
          {
            'eventId': 'event-1',
            'name': 'Saturday mixer',
            'city': {'cityId': 'in-mh-mumbai', 'marketId': 'in-mh-mumbai'},
            'localDate': '2026-09-26',
            'localStartTime': '19:00',
            'timezone': 'Asia/Kolkata',
            'startTimeMillis': 1790449200000,
            'setupRevision': 1,
            'status': 'active',
            'detailsConfigured': false,
          },
        ],
        'nextCursor': 'next_page',
      };
      final page = PrivateEventSetupInventoryPage.fromResponse(body);
      expect(page.events.single.eventId, 'event-1');
      expect(page.nextCursor, 'next_page');
      expect(
        PrivateEventSetupInventoryPage.fromResponse({
          ...body,
          'events': [
            {...(body['events'] as List).single as Map, 'status': 'cancelled'},
          ],
        }).events.single.status,
        'cancelled',
      );
      final item = Map<String, Object?>.from(
        (body['events'] as List).single as Map,
      );
      expect(
        () => PrivateEventSetupInventoryPage.fromResponse({
          ...body,
          'events': [
            {...item, 'status': 'unknown'},
          ],
        }),
        throwsFormatException,
      );
      expect(
        () => PrivateEventSetupInventoryPage.fromResponse({
          ...body,
          'events': [item, item],
        }),
        throwsFormatException,
      );
      expect(
        () => PrivateEventSetupInventoryPage.fromResponse({
          ...body,
          'nextCursor': 'bad/cursor',
        }),
        throwsFormatException,
      );
    },
  );

  testWidgets('manager inventory pages and reopens the canonical id', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    final cursors = <String?>[];
    final opened = <String>[];
    await tester.pumpWidget(
      _app(
        HostPrivateEventSetupInventorySection(
          organizerId: 'club-1',
          read: ({required organizerId, required limit, cursor, scope}) async {
            expect(organizerId, 'club-1');
            expect(limit, 20);
            cursors.add(cursor);
            return PrivateEventSetupInventoryPage(
              events: cursor == null ? const [_saved] : const [],
              nextCursor: cursor == null ? 'page_2' : null,
            );
          },
          openSaved: (eventId) async {
            opened.add(eventId);
          },
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Saturday mixer'), findsOneWidget);
    final filterLeft = tester.getTopLeft(find.text('Upcoming')).dx;
    final loadMoreLeft = tester
        .getTopLeft(find.text('Load more private events'))
        .dx;
    expect(loadMoreLeft, greaterThanOrEqualTo(CatchSpacing.screenPx));
    expect(loadMoreLeft, lessThan(filterLeft));
    await _capture(tester, 'private-event-inventory');
    await tester.tap(find.text('Load more private events'));
    await pumpFeatureUi(tester);
    expect(cursors, [null, 'page_2']);
    await tester.tap(find.text('Saturday mixer'));
    await pumpFeatureUi(tester);
    expect(opened, ['event-1']);
    expect(cursors, [null, 'page_2', null]);
    expect(tester.takeException(), isNull);
  });

  testWidgets('stale organizer response cannot replace the current inventory', (
    tester,
  ) async {
    final oldRead = Completer<PrivateEventSetupInventoryPage>();
    Widget inventory(String organizerId) => _app(
      HostPrivateEventSetupInventorySection(
        organizerId: organizerId,
        read: ({required organizerId, required limit, cursor, scope}) =>
            organizerId == 'old'
            ? oldRead.future
            : Future.value(
                const PrivateEventSetupInventoryPage(
                  events: [_saved],
                  nextCursor: null,
                ),
              ),
        openSaved: (_) async {},
      ),
    );
    await tester.pumpWidget(inventory('old'));
    await tester.pump();
    await tester.pumpWidget(inventory('new'));
    await pumpFeatureUi(tester);
    oldRead.complete(
      const PrivateEventSetupInventoryPage(events: [], nextCursor: null),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Saturday mixer'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('changing history filter ignores stale pages and resets cursor', (
    tester,
  ) async {
    final upcoming = Completer<PrivateEventSetupInventoryPage>();
    final calls = <PrivateEventSetupScope?>[];
    await tester.pumpWidget(
      _app(
        HostPrivateEventSetupInventorySection(
          organizerId: 'club-1',
          read: ({required organizerId, required limit, cursor, scope}) {
            calls.add(scope);
            expect(cursor, isNull);
            return scope == PrivateEventSetupScope.upcoming
                ? upcoming.future
                : Future.value(
                    const PrivateEventSetupInventoryPage(
                      events: [],
                      nextCursor: null,
                    ),
                  );
          },
          openSaved: (_) async {},
        ),
      ),
    );
    await tester.pump();
    await tester.tap(find.text('Past'));
    await pumpFeatureUi(tester);
    expect(find.text('No private events in this view.'), findsOneWidget);
    upcoming.complete(
      const PrivateEventSetupInventoryPage(
        events: [_saved],
        nextCursor: 'old_page',
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Saturday mixer'), findsNothing);
    expect(find.text('Load more private events'), findsNothing);
    await tester.tap(find.text('Cancelled'));
    await pumpFeatureUi(tester);
    expect(calls, [
      PrivateEventSetupScope.upcoming,
      PrivateEventSetupScope.past,
      PrivateEventSetupScope.cancelled,
    ]);
    expect(tester.takeException(), isNull);
  });

  testWidgets('timeline row renders the saved event and forwards its id', (
    tester,
  ) async {
    String? resumed;
    final row = HostEventLifecycleRowData.fromUnpublished(
      setup: _saved,
      now: DateTime(2026, 9, 25, 12),
    );
    await tester.pumpWidget(
      _app(
        Builder(
          builder: (context) => CatchField.navigate(
            content: hostEventRecordLayout(context, row),
            onActivate: () => resumed = row.id,
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Saturday mixer'), findsOneWidget);
    await tester.tap(find.text('Saturday mixer'));
    await pumpFeatureUi(tester);
    expect(resumed, 'event-1');
    expect(tester.takeException(), isNull);
  });
}

Widget _app(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  home: RepaintBoundary(
    key: const ValueKey('history-capture'),
    child: Scaffold(body: SingleChildScrollView(child: child)),
  ),
);

Future<void> _capture(WidgetTester tester, String name) async {
  final output = Platform.environment['CATCH_RSVP_HISTORY_REVIEW_DIR'];
  if (output == null) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const ValueKey('history-capture')),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    final file = File('$output/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
  });
}
