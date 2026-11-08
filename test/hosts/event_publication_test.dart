import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_publication_journal.dart';
import 'package:catch_dating_app/contexts/events/data/event_publication_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_publication_controller.dart';
import 'package:catch_platform/analytics/app_analytics.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'event_controller_test_support.dart';
import 'support/read_model_feeds.dart';

PrivateEventBasicSummary publicationEvent({
  int revision = 2,
  String state = 'private',
  bool ready = true,
}) => PrivateEventBasicSummary(
  eventId: 'event1',
  organizerId: 'org1',
  setupRevision: revision,
  name: 'Sunday dinner',
  city: const EventSetupCity(cityId: 'in-mp-indore', marketId: 'in-mp-indore'),
  localDate: '2030-03-17',
  localStartTime: '19:00',
  timezone: 'Asia/Kolkata',
  startTimeMillis: 1900000000000,
  status: 'active',
  setupDefaults: const {},
  detailsConfigured: true,
  eventPreferences: null,
  publicationState: state,
  publicationReadiness: EventPublicationReadiness(
    canPublish: ready && state == 'private',
    missing: ready ? const [] : const ['venue'],
  ),
);

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test(
    'publication diagnostics require a new validated success receipt',
    () async {
      for (final outcome in ['new', 'replay', 'wrong-identity', 'failure']) {
        SharedPreferences.setMockInitialValues({});
        final analytics = _PublicationAnalytics();
        var current = publicationEvent();
        final feed = ReadModelFeed(
          () => PrivateEventSetupView.complete(current),
        );
        final container = ProviderContainer(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('host1')),
            appAnalyticsProvider.overrideWith((ref) => analytics),
            privateEventSetupViewProvider(
              organizerId: 'org1',
              eventId: 'event1',
            ).overrideWith((ref) => feed.stream),
            eventPublicationDependenciesProvider.overrideWithValue(
              EventPublicationDependencies(
                currentUserId: () => 'host1',
                write: refreshingAfter((_) async {
                  if (outcome == 'failure') throw StateError('unavailable');
                  current = publicationEvent(revision: 3, state: 'published');
                  return EventPublicationReceipt(
                    eventId: outcome == 'wrong-identity' ? 'foreign' : 'event1',
                    setupRevision: 3,
                    publicationState: 'published',
                    replayed: outcome == 'replay',
                  );
                }, [feed]),
              ),
            ),
          ],
        );
        const scope = (userId: 'host1', organizerId: 'org1', eventId: 'event1');
        final subscription = container.listen(
          eventPublicationControllerProvider(scope),
          (_, _) {},
        );
        final controller = container.read(
          eventPublicationControllerProvider(scope).notifier,
        );
        await controller.load();
        await controller.changeTo('published');
        expect(
          analytics.events,
          outcome == 'new' ? ['host_event_published'] : [],
          reason: outcome,
        );
        subscription.close();
        container.dispose();
      }
    },
  );

  test(
    'lost response replays exact intent and rereads current visibility',
    () async {
      var current = publicationEvent();
      final commands = <String>[];
      var calls = 0;
      Future<EventPublicationReceipt> write(
        EventPublicationRequest request,
      ) async {
        commands.add(jsonEncode(request.toJson()));
        calls++;
        if (calls == 1) {
          current = publicationEvent(revision: 3, state: 'published');
          throw StateError('response lost');
        }
        if (calls == 2) throw StateError('manager temporarily unavailable');
        return const EventPublicationReceipt(
          eventId: 'event1',
          setupRevision: 3,
          publicationState: 'published',
          replayed: true,
        );
      }

      TestEventPublicationController make() => TestEventPublicationController(
        userId: 'host1',
        organizerId: 'org1',
        eventId: 'event1',
        read: ({required organizerId, required eventId}) async => current,
        write: write,
        currentUserId: () => 'host1',
      );
      final first = make();
      await first.load();
      await first.changeTo('published');
      expect(first.pending, isNotNull);
      expect(first.canUnpublish, isFalse);
      first.dispose();
      final reopened = make();
      addTearDown(reopened.dispose);
      await reopened.load();
      expect(reopened.event?.publicationState, 'published');
      expect(reopened.canUnpublish, isFalse);
      await reopened.retry();
      expect(reopened.pending, isNotNull);
      // Another manager made the event private after the original publish.
      current = publicationEvent(revision: 4);
      await reopened.retry();
      expect(commands, everyElement(commands.first));
      expect(reopened.pending, isNull);
      expect(reopened.event?.publicationState, 'private');
      expect(reopened.event?.setupRevision, 4);
      expect(reopened.canPublish, isTrue);
    },
  );

  test(
    'only exact stale-rejection proof clears uncertain publication',
    () async {
      var exact = false;
      final controller = TestEventPublicationController(
        userId: 'host1',
        organizerId: 'org1',
        eventId: 'event1',
        read: ({required organizerId, required eventId}) async =>
            publicationEvent(),
        currentUserId: () => 'host1',
        write: (request) async {
          throw FirebaseFunctionsException(
            message: 'Review changed',
            code: 'aborted',
            details: exact
                ? {
                    'reason': 'event-publication-review-stale',
                    ...request.toJson(),
                  }
                : {
                    'reason': 'event-publication-review-stale',
                    'requestId': 'wrong',
                  },
          );
        },
      );
      addTearDown(controller.dispose);
      await controller.load();
      await controller.changeTo('published');
      expect(controller.pending, isNotNull);
      exact = true;
      await controller.retry();
      expect(controller.pending, isNull);
      expect(controller.canPublish, isTrue);
      expect(
        await const EventPublicationJournal().load(
          userId: 'host1',
          organizerId: 'org1',
          eventId: 'event1',
        ),
        isNull,
      );
    },
  );

  test(
    'readiness blocks publishing and receipt identity cannot unlock UI',
    () async {
      var ready = false;
      var writes = 0;
      final controller = TestEventPublicationController(
        userId: 'host1',
        organizerId: 'org1',
        eventId: 'event1',
        read: ({required organizerId, required eventId}) async =>
            publicationEvent(ready: ready),
        currentUserId: () => 'host1',
        write: (_) async {
          writes++;
          return const EventPublicationReceipt(
            eventId: 'other',
            setupRevision: 3,
            publicationState: 'published',
            replayed: false,
          );
        },
      );
      addTearDown(controller.dispose);
      await controller.load();
      await controller.changeTo('published');
      expect(writes, 0);
      // The server rewrites the view once every requirement is met.
      ready = true;
      await controller.eventFeed.refresh();
      await pumpEventQueue();
      await controller.changeTo('published');
      expect(controller.pending, isNotNull);
      expect(controller.error, isA<FormatException>());
    },
  );

  test(
    'account switch discards late results and preserves original journal',
    () async {
      var uid = 'host1';
      final response = Completer<EventPublicationReceipt>();
      final invoked = Completer<void>();
      final controller = TestEventPublicationController(
        userId: 'host1',
        organizerId: 'org1',
        eventId: 'event1',
        read: ({required organizerId, required eventId}) async =>
            publicationEvent(),
        currentUserId: () => uid,
        write: (_) {
          invoked.complete();
          return response.future;
        },
      );
      addTearDown(controller.dispose);
      await controller.load();
      final save = controller.changeTo('published');
      await invoked.future;
      uid = 'host2';
      controller.invalidateActor();
      response.complete(
        const EventPublicationReceipt(
          eventId: 'event1',
          setupRevision: 3,
          publicationState: 'published',
          replayed: false,
        ),
      );
      await save;
      expect(controller.event, isNull);
      expect(controller.receipt, isNull);
      expect(controller.canChange, isFalse);
      expect(
        await const EventPublicationJournal().load(
          userId: 'host1',
          organizerId: 'org1',
          eventId: 'event1',
        ),
        isNotNull,
      );
    },
  );

  test('a series receipt lists its events in order', () {
    final receipt = PrivateEventSeriesReceipt.fromResponse({
      'seriesId': 'series-abc',
      'eventIds': ['e1', 'e2'],
      'replayed': false,
    });
    expect(receipt.eventIds, ['e1', 'e2']);
    expect(
      () => PrivateEventSeriesReceipt.fromResponse({
        'seriesId': 'series-abc',
        'eventIds': ['e1'],
        'replayed': false,
      }),
      throwsFormatException,
    );
  });

  test('publication settings round-trip and the view reads defaults', () {
    const request = EventPublicationRequest(
      organizerId: 'org1',
      eventId: 'event1',
      requestId: 'publication-settings',
      expectedSetupRevision: 2,
      publicationState: 'published',
      listing: 'link',
      showGuestList: false,
    );
    expect(request.toJson()['listing'], 'link');
    expect(request.toJson().containsKey('priceHiddenUntilBookingOpens'), false);
    expect(
      EventPublicationRequest.fromJson(request.toJson()).toJson(),
      request.toJson(),
    );
    expect(
      () =>
          EventPublicationRequest.fromJson({...request.toJson(), 'listing': 7}),
      throwsFormatException,
    );
    expect(PrivateEventSettings.fromView(null).listing, 'listed');
    expect(PrivateEventSettings.fromView(null).showGuestList, true);
    final linked = PrivateEventSettings.fromView({
      'listing': 'link',
      'showGuestList': false,
      'priceHiddenUntilBookingOpens': true,
    });
    expect(linked.linkOnly, true);
    expect(
      () => PrivateEventSettings.fromView({'listing': 'invite'}),
      throwsFormatException,
    );
  });

  test('publication request journal rejects unknown authority fields', () {
    const request = EventPublicationRequest(
      organizerId: 'org1',
      eventId: 'event1',
      requestId: 'publication-one',
      expectedSetupRevision: 2,
      publicationState: 'published',
    );
    expect(
      EventPublicationRequest.fromJson(request.toJson()).toJson(),
      request.toJson(),
    );
    expect(
      () => EventPublicationRequest.fromJson({
        ...request.toJson(),
        'bypass': true,
      }),
      throwsFormatException,
    );
    EventPublicationReadiness readiness(
      Map<String, Object?> raw, {
      String state = 'private',
      int start = 1900000000000,
    }) => EventPublicationReadiness.fromView(
      raw,
      publicationState: state,
      status: 'active',
      startTimeMillis: start,
      now: DateTime.fromMillisecondsSinceEpoch(1800000000000),
    );
    expect(
      () => readiness({
        'canPublishWhenFuture': true,
        'missing': ['venue'],
      }),
      throwsFormatException,
    );
    // Time is the phone's: the server never lists futureActive.
    expect(
      () => readiness({
        'canPublishWhenFuture': false,
        'missing': ['futureActive'],
      }),
      throwsFormatException,
    );
    final future = readiness({'canPublishWhenFuture': true, 'missing': []});
    expect(future.canPublish, isTrue);
    expect(future.missing, isEmpty);
    final started = readiness({
      'canPublishWhenFuture': true,
      'missing': [],
    }, start: 1700000000000);
    expect(started.canPublish, isFalse);
    expect(started.missing, ['futureActive']);
    final published = readiness(
      {'canPublishWhenFuture': false, 'missing': []},
      state: 'published',
      start: 1700000000000,
    );
    expect(published.canPublish, isFalse);
    expect(published.missing, isEmpty);
  });
}

final class _PublicationAnalytics extends AppAnalytics {
  _PublicationAnalytics()
    : super(reporter: const NoOpAnalyticsReporter(), shouldCollect: false);
  final events = <String>[];
  @override
  void Function() hostEventCompletion(String name) =>
      () => events.add(name);
}
