import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_create_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_draft_restore.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_setup_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../organizers/organizers_test_helpers.dart';
import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('inline return waits for a matching manager read after receipt', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    final date = DateUtils.dateOnly(
      DateTime.now().add(const Duration(days: 2)),
    );
    final localDate =
        '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
    final read = Completer<PrivateEventBasicSummary>();
    final saved = <String>[];
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
        ],
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          builder: (context, child) => RepaintBoundary(
            key: const ValueKey('inline-event-capture'),
            child: child!,
          ),
          theme: CatchTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: PrivateEventCreateScreen(
            organizer: buildOrganizer(),
            promptForDraftsOnStart: false,
            returnToResponsesOnSave: true,
            initialDraft: EventDraft(
              id: 'inline-draft',
              organizerId: 'club-1',
              savedAt: DateTime.now(),
              name: 'Saturday mixer',
              eventCityId: 'in-mh-mumbai',
              eventMarketId: 'in-mh-mumbai',
              eventLocalDate: localDate,
              eventLocalStartTime: '19:00',
              eventTimezone: 'Asia/Kolkata',
              eventCityMode: 'set',
              eventTimezoneMode: 'set',
            ),
            create:
                ({
                  required organizerId,
                  required requestId,
                  required basics,
                }) async => const PrivateEventCreateReceipt(
                  eventId: 'event-inline',
                  setupRevision: 1,
                  replayed: false,
                ),
            readSaved: ({required organizerId, required eventId}) =>
                read.future,
            onSaved: (receipt) => saved.add(receipt.eventId),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Save & return to review'), findsOneWidget);
    if (Platform.environment['CATCH_RSVP_FLOW_REVIEW_DIR'] case final output?) {
      final boundary = tester.renderObject<RenderRepaintBoundary>(
        find.byKey(const ValueKey('inline-event-capture')),
      );
      await tester.runAsync(() async {
        final image = await boundary.toImage(pixelRatio: 2);
        final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
        image.dispose();
        final file = File('$output/create-event.png');
        await file.parent.create(recursive: true);
        await file.writeAsBytes(bytes!.buffer.asUint8List());
      });
    }
    await tester.tap(find.byKey(const ValueKey('private-event-save')));
    await tester.pump();
    expect(saved, isEmpty);
    read.complete(
      PrivateEventBasicSummary(
        eventId: 'event-inline',
        organizerId: 'club-1',
        setupRevision: 1,
        name: 'Saturday mixer',
        city: const EventSetupCity(
          cityId: 'in-mh-mumbai',
          marketId: 'in-mh-mumbai',
        ),
        localDate: localDate,
        localStartTime: '19:00',
        timezone: 'Asia/Kolkata',
        startTimeMillis: date.millisecondsSinceEpoch,
        status: 'active',
        setupDefaults: const {},
        detailsConfigured: false,
        eventPreferences: null,
        canEditBasics: true,
        canChangeCity: true,
      ),
    );
    await pumpFeatureUi(tester);
    expect(saved, ['event-inline']);
  });

  for (final status in ['active', 'cancelled']) {
    testWidgets('$status past private event reopens without setup actions', (
      tester,
    ) async {
      final date = DateTime.now().subtract(const Duration(days: 2));
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
          ],
          child: MaterialApp(
            theme: CatchTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: PrivateEventCreateScreen(
              organizer: buildOrganizer(),
              promptForDraftsOnStart: false,
              initialSavedEventId: 'history-1',
              readSaved: ({required organizerId, required eventId}) async =>
                  PrivateEventBasicSummary(
                    eventId: eventId,
                    organizerId: organizerId,
                    setupRevision: 1,
                    name: 'Previous mixer',
                    city: const EventSetupCity(
                      cityId: 'in-mh-mumbai',
                      marketId: 'in-mh-mumbai',
                    ),
                    localDate:
                        '${date.year}-${date.month.toString().padLeft(2, '0')}-'
                        '${date.day.toString().padLeft(2, '0')}',
                    localStartTime: '19:00',
                    timezone: 'Asia/Kolkata',
                    startTimeMillis: date.millisecondsSinceEpoch,
                    status: status,
                    setupDefaults: const {},
                    detailsConfigured: false,
                    eventPreferences: null,
                    canEditBasics: status == 'active',
                    canChangeCity: status == 'active',
                  ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      final screen = tester.widget<PrivateEventSetupScreen>(
        find.byType(PrivateEventSetupScreen),
      );
      expect(screen.readOnly, isTrue);
      expect(screen.onEditBasics, isNull);
      expect(screen.onEditPayments, isNull);
      expect(screen.onEditDetails, isNull);
      expect(find.text('Event history'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  test('restores canonical and legacy local draft times', () {
    final canonical = EventDraft(
      id: 'canonical',
      organizerId: 'club-1',
      savedAt: DateTime(2026, 9, 24),
      eventLocalDate: '2090-10-03',
      eventLocalStartTime: '19:30',
      selectedDateMillis: DateTime(2090, 10, 4).millisecondsSinceEpoch,
      selectedStartHour: 8,
      selectedStartMinute: 15,
    );
    expect(
      restoredPrivateEventDate(canonical, rejectPast: true),
      DateTime(2090, 10, 3),
    );
    expect(
      restoredPrivateEventStart(canonical),
      const TimeOfDay(hour: 19, minute: 30),
    );
    final legacy = canonical.copyWith(
      eventLocalDate: null,
      eventLocalStartTime: null,
    );
    expect(
      restoredPrivateEventDate(legacy, rejectPast: true),
      DateTime(2090, 10, 4),
    );
    expect(
      restoredPrivateEventStart(legacy),
      const TimeOfDay(hour: 8, minute: 15),
    );
  });

  testWidgets('trusted organizer read binds inherited basics to server hash', (
    tester,
  ) async {
    final date = DateUtils.dateOnly(
      DateTime.now().add(const Duration(days: 2)),
    );
    final localDate =
        '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
    final hash = List.filled(64, 'b').join();
    final draft = EventDraft(
      id: 'inherited-draft',
      organizerId: 'club-1',
      savedAt: DateTime.now(),
      name: 'Saturday mixer',
      eventCityId: 'in-mh-mumbai',
      eventMarketId: 'in-mh-mumbai',
      eventLocalDate: localDate,
      eventLocalStartTime: '19:00',
      eventTimezone: 'Asia/Kolkata',
      eventCityMode: 'inherit',
      eventTimezoneMode: 'inherit',
      eventReviewedDefaultsHash: hash,
    );
    PrivateEventBasics? sent;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
        ],
        child: MaterialApp(
          theme: CatchTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: PrivateEventCreateScreen(
            organizer: buildOrganizer(),
            initialDraft: draft,
            promptForDraftsOnStart: false,
            readOrganizerDefaults: (_) async => ManagerEventSetupDefaults(
              organizerId: 'club-1',
              cityId: 'in-mh-mumbai',
              marketId: 'in-mh-mumbai',
              timezone: 'Asia/Kolkata',
              organizerDefaultsRevision: 7,
              basicsReviewedHash: hash,
              preferencesRevision: 0,
              preferences: const ManagerEventSetupPreferences(
                timezone: 'Asia/Kolkata',
              ),
              preferencesHash: hash,
              reviewedDefaultsHash: hash,
            ),
            create:
                ({
                  required organizerId,
                  required requestId,
                  required basics,
                }) async {
                  sent = basics;
                  return const PrivateEventCreateReceipt(
                    eventId: 'event-inherited',
                    setupRevision: 1,
                    replayed: false,
                  );
                },
            readSaved: ({required organizerId, required eventId}) async =>
                PrivateEventBasicSummary(
                  eventId: eventId,
                  organizerId: organizerId,
                  setupRevision: 1,
                  name: 'Saturday mixer',
                  city: const EventSetupCity(
                    cityId: 'in-mh-mumbai',
                    marketId: 'in-mh-mumbai',
                  ),
                  localDate: localDate,
                  localStartTime: '19:00',
                  timezone: 'Asia/Kolkata',
                  startTimeMillis: date.millisecondsSinceEpoch,
                  status: 'active',
                  setupDefaults: const {},
                  detailsConfigured: false,
                  eventPreferences: null,
                  canEditBasics: true,
                  canChangeCity: true,
                ),
          ),
        ),
      ),
    );
    await pumpUntilFound(
      tester,
      find.byKey(const ValueKey('private-event-save')),
    );
    await tester.tap(find.byKey(const ValueKey('private-event-save')));
    await pumpFeatureUi(tester);
    expect(sent?.city.mode, EventSetupValueMode.inherit);
    expect(sent?.timezone.mode, EventSetupValueMode.inherit);
    expect(sent?.reviewedDefaultsHash, hash);
  });

  testWidgets('one first-save request opens the private setup workspace', (
    tester,
  ) async {
    final date = DateUtils.dateOnly(
      DateTime.now().add(const Duration(days: 2)),
    );
    final localDate =
        '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
    final draft = EventDraft(
      id: 'local-draft',
      organizerId: 'club-1',
      savedAt: DateTime.now(),
      name: 'Saturday mixer',
      eventCityId: 'in-mh-mumbai',
      eventMarketId: 'in-mh-mumbai',
      eventLocalDate: localDate,
      eventLocalStartTime: '19:00',
      eventTimezone: 'Asia/Kolkata',
      eventCityMode: 'set',
      eventTimezoneMode: 'set',
    );
    String? submittedRequestId;
    PrivateEventBasics? submitted;
    var calls = 0;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
        ],
        child: MaterialApp(
          theme: CatchTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: PrivateEventCreateScreen(
            organizer: buildOrganizer(),
            initialDraft: draft,
            create:
                ({
                  required organizerId,
                  required requestId,
                  required basics,
                }) async {
                  calls += 1;
                  expect(organizerId, 'club-1');
                  submittedRequestId = requestId;
                  submitted = basics;
                  return const PrivateEventCreateReceipt(
                    eventId: 'event-1',
                    setupRevision: 1,
                    replayed: false,
                  );
                },
            readSaved: ({required organizerId, required eventId}) async =>
                PrivateEventBasicSummary(
                  eventId: eventId,
                  organizerId: organizerId,
                  setupRevision: 3,
                  name: 'Server-confirmed Saturday mixer',
                  city: const EventSetupCity(
                    cityId: 'in-mh-mumbai',
                    marketId: 'in-mh-mumbai',
                  ),
                  localDate: localDate,
                  localStartTime: '19:00',
                  timezone: 'Asia/Kolkata',
                  startTimeMillis: date.millisecondsSinceEpoch,
                  status: 'active',
                  setupDefaults: const {},
                  detailsConfigured: false,
                  eventPreferences: null,
                  canEditBasics: true,
                  canChangeCity: true,
                ),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Sell tickets with Catch'), findsNothing);
    expect(find.text('Use guest list'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('private-event-save')));
    await pumpFeatureUi(tester);
    expect(calls, 1);
    expect(submittedRequestId, isNotEmpty);
    expect(submitted?.name, 'Saturday mixer');
    expect(submitted?.localDate, localDate);
    expect(submitted?.localStartTime, '19:00');
    expect(find.text('Private'), findsOneWidget);
    expect(find.byType(PrivateEventSetupScreen), findsOneWidget);
    expect(find.text('Server-confirmed Saturday mixer'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('lost response retries the persisted body after reopening', (
    tester,
  ) async {
    final date = DateUtils.dateOnly(
      DateTime.now().add(const Duration(days: 2)),
    );
    final localDate =
        '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
    final initial = EventDraft(
      id: 'local-draft',
      organizerId: 'club-1',
      savedAt: DateTime.now(),
      name: 'Saturday mixer',
      eventCityId: 'in-mh-mumbai',
      eventMarketId: 'in-mh-mumbai',
      eventLocalDate: localDate,
      eventLocalStartTime: '19:00',
      eventTimezone: 'Asia/Kolkata',
      eventCityMode: 'set',
      eventTimezoneMode: 'set',
    );
    String? firstRequestId;
    Map<String, Object?>? firstPayload;
    Widget app(EventDraft draft, CreatePrivateEvent create) => ProviderScope(
      overrides: [
        // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
        uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
      ],
      child: MaterialApp(
        theme: CatchTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: PrivateEventCreateScreen(
          organizer: buildOrganizer(),
          initialDraft: draft,
          create: create,
          readSaved: ({required organizerId, required eventId}) async =>
              PrivateEventBasicSummary(
                eventId: eventId,
                organizerId: organizerId,
                setupRevision: draft.eventCreateReceiptRevision ?? 1,
                name: 'Saturday mixer',
                city: const EventSetupCity(
                  cityId: 'in-mh-mumbai',
                  marketId: 'in-mh-mumbai',
                ),
                localDate: localDate,
                localStartTime: '19:00',
                timezone: 'Asia/Kolkata',
                startTimeMillis: date.millisecondsSinceEpoch,
                status: 'active',
                setupDefaults: const {},
                detailsConfigured: false,
                eventPreferences: null,
                canEditBasics: true,
                canChangeCity: true,
              ),
        ),
      ),
    );

    await tester.pumpWidget(
      app(initial, ({
        required organizerId,
        required requestId,
        required basics,
      }) async {
        firstRequestId = requestId;
        firstPayload = basics.toJson();
        throw StateError('response lost');
      }),
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(const ValueKey('private-event-save')));
    await pumpFeatureUi(tester);

    final prefs = await SharedPreferences.getInstance();
    final saved = EventDraft.listFromJson(
      prefs.getString('event_drafts_club-1_host-1')!,
    ).single;
    expect(saved.eventCreateRequestId, firstRequestId);
    expect(jsonDecode(saved.eventCreatePayloadJson!), firstPayload);
    expect(saved.eventCreateReceiptEventId, isNull);

    // Reopening the draft after an uncertain response retains the exact
    // request even if the organizer's defaults and form values change.
    await tester.pumpWidget(const SizedBox.shrink());
    var replayAttempts = 0;
    await tester.pumpWidget(
      app(saved.copyWith(name: 'Edited after failure'), ({
        required organizerId,
        required requestId,
        required basics,
      }) async {
        replayAttempts += 1;
        expect(requestId, firstRequestId);
        expect(basics.toJson(), firstPayload);
        if (replayAttempts == 1) {
          throw FirebaseFunctionsException(
            code: 'permission-denied',
            message: 'Manager access changed',
          );
        }
        return const PrivateEventCreateReceipt(
          eventId: 'event-1',
          setupRevision: 1,
          replayed: true,
        );
      }),
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(const ValueKey('private-event-save')));
    await pumpFeatureUi(tester);
    final stillPending = EventDraft.listFromJson(
      prefs.getString('event_drafts_club-1_host-1')!,
    ).single;
    expect(stillPending.eventCreateRequestId, firstRequestId);
    expect(jsonDecode(stillPending.eventCreatePayloadJson!), firstPayload);
    expect(stillPending.eventCreateReceiptEventId, isNull);
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(const ValueKey('private-event-save')));
    await pumpFeatureUi(tester);
    final completed = EventDraft.listFromJson(
      prefs.getString('event_drafts_club-1_host-1')!,
    ).single;
    expect(completed.eventCreateReceiptEventId, 'event-1');
    expect(completed.eventCreateReceiptRevision, 1);
    expect(replayAttempts, 2);
    expect(find.text('Private'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
    var accidentalCreateCalls = 0;
    await tester.pumpWidget(
      app(completed, ({
        required organizerId,
        required requestId,
        required basics,
      }) async {
        accidentalCreateCalls += 1;
        throw StateError('saved event must not be created twice');
      }),
    );
    await pumpFeatureUi(tester);
    expect(find.text('Private'), findsOneWidget);
    expect(accidentalCreateCalls, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets('manager read reopens a saved event and replays a lost edit', (
    tester,
  ) async {
    final date = DateUtils.dateOnly(
      DateTime.now().add(const Duration(days: 3)),
    );
    final localDate =
        '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
    var canonicalName = 'Saturday mixer';
    var canonicalRevision = 2;
    PrivateEventBasicSummary read() => PrivateEventBasicSummary.fromResponse({
      'eventId': 'event-1',
      'organizerId': 'club-1',
      'setupRevision': canonicalRevision,
      'publicationState': 'private',
      'status': 'active',
      'name': canonicalName,
      'city': {'cityId': 'in-mh-mumbai', 'marketId': 'in-mh-mumbai'},
      'localDate': localDate,
      'localStartTime': '19:00',
      'timezone': 'Asia/Kolkata',
      'startTimeMillis': date.millisecondsSinceEpoch,
      'setupDefaults': <String, Object?>{},
      'detailsConfigured': false,
      'canEditBasics': true,
      'canChangeCity': true,
      'eventDetails': <String, Object?>{
        'endTimeMillis': null,
        'venueName': null,
        'sourceVenueId': null,
        'eventFormat': null,
      },
    });
    final attempted = <PrivateEventBasicsUpdateRequest>[];
    var createCalls = 0;
    var updateCalls = 0;
    Widget app() => ProviderScope(
      overrides: [
        // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
        uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
      ],
      child: MaterialApp(
        theme: CatchTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: PrivateEventCreateScreen(
          organizer: buildOrganizer(),
          initialSavedEventId: 'event-1',
          readSaved: ({required organizerId, required eventId}) async {
            expect(organizerId, 'club-1');
            expect(eventId, 'event-1');
            return read();
          },
          create:
              ({
                required organizerId,
                required requestId,
                required basics,
              }) async {
                createCalls++;
                throw StateError('saved event must not call create');
              },
          update: (request) async {
            attempted.add(request);
            updateCalls++;
            if (updateCalls == 1) throw StateError('response lost');
            if (updateCalls == 2) {
              throw FirebaseFunctionsException(
                code: 'permission-denied',
                message: 'Manager access temporarily changed',
              );
            }
            canonicalName = request.basics.name;
            canonicalRevision = 3;
            return const PrivateEventCreateReceipt(
              eventId: 'event-1',
              setupRevision: 3,
              replayed: true,
            );
          },
        ),
      ),
    );

    await tester.pumpWidget(app());
    await pumpUntilFound(tester, find.byType(PrivateEventSetupScreen));
    expect(find.byType(PrivateEventSetupScreen), findsOneWidget);
    await tester.tap(find.text('Edit event basics'));
    await pumpFeatureUi(tester);
    await tester.enterText(
      find.descendant(
        of: find.byKey(const ValueKey('private-event-name')),
        matching: find.byType(EditableText),
      ),
      'Sunday mixer',
    );
    await tester.tap(find.byKey(const ValueKey('private-event-save')));
    await pumpFeatureUi(tester);
    expect(updateCalls, 1);
    expect(attempted.single.eventId, 'event-1');
    expect(attempted.single.expectedSetupRevision, 2);
    expect(attempted.single.basics.name, 'Sunday mixer');
    final firstBody = attempted.single.toJson();

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpWidget(app());
    await pumpUntilFound(
      tester,
      find.byKey(const ValueKey('private-event-save')),
    );
    expect(find.text('Retry the same save'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('private-event-save')));
    await pumpFeatureUi(tester);
    expect(updateCalls, 2);
    expect(attempted.last.toJson(), firstBody);
    await pumpFeatureUi(tester);
    await tester.tap(find.byKey(const ValueKey('private-event-save')));
    await pumpFeatureUi(tester);
    expect(updateCalls, 3);
    expect(attempted.last.toJson(), firstBody);
    expect(createCalls, 0);
    expect(find.byType(PrivateEventSetupScreen), findsOneWidget);
    expect(find.text('Sunday mixer'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('failed manager reread blocks stale setup until retry succeeds', (
    tester,
  ) async {
    final date = DateUtils.dateOnly(
      DateTime.now().add(const Duration(days: 2)),
    );
    final localDate =
        '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
    var reads = 0;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          // ignore: riverpod_lint/scoped_providers_should_specify_dependencies
          uidProvider.overrideWithValue(const AsyncData<String?>('host-1')),
        ],
        child: MaterialApp(
          theme: CatchTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: PrivateEventCreateScreen(
            organizer: buildOrganizer(),
            initialSavedEventId: 'event-1',
            readSaved: ({required organizerId, required eventId}) async {
              reads++;
              if (reads == 1) throw StateError('manager read unavailable');
              return PrivateEventBasicSummary(
                eventId: eventId,
                organizerId: organizerId,
                setupRevision: 2,
                name: 'Authoritative event',
                city: const EventSetupCity(
                  cityId: 'in-mh-mumbai',
                  marketId: 'in-mh-mumbai',
                ),
                localDate: localDate,
                localStartTime: '19:00',
                timezone: 'Asia/Kolkata',
                startTimeMillis: date.millisecondsSinceEpoch,
                status: 'active',
                setupDefaults: const {},
                detailsConfigured: false,
                eventPreferences: null,
                canEditBasics: true,
              );
            },
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.byType(PrivateEventSetupScreen), findsNothing);
    expect(find.text('Authoritative event'), findsNothing);
    await tester.tap(find.text('Retry event read'));
    await pumpUntilFound(tester, find.byType(PrivateEventSetupScreen));
    expect(reads, 2);
    expect(find.text('Authoritative event'), findsWidgets);
    await tester.tap(find.text('Edit event basics'));
    await pumpFeatureUi(tester);
    expect(find.byKey(const ValueKey('private-event-city')), findsOneWidget);
    expect(find.byType(CatchChip), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('saved setup action remains reachable at 360px and 2x text', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(360, 800);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    var guideOpens = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: MediaQuery(
          data: const MediaQueryData(
            size: Size(360, 800),
            textScaler: TextScaler.linear(2),
          ),
          child: PrivateEventSetupScreen(
            organizer: buildOrganizer(),
            receipt: const PrivateEventCreateReceipt(
              eventId: 'saved-private-event',
              setupRevision: 1,
              replayed: false,
            ),
            name: 'Saturday mixer',
            date: DateTime(2026, 10, 3),
            start: const TimeOfDay(hour: 19, minute: 0),
            cityLabel: 'Mumbai',
            onClose: () {},
            onSetupGuide: () => guideOpens++,
          ),
        ),
      ),
    );
    await tester.ensureVisible(find.text('Live event guide'));
    await pumpFeatureUi(tester);
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('Live event guide'));
    await tester.pump();
    expect(guideOpens, 1);
    expect(tester.takeException(), isNull);
  });
}
