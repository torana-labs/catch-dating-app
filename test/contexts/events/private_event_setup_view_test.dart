import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_view_reads.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

const _start = 1900000000000;

Map<String, Object?> _summary({
  String publicationState = 'private',
  String status = 'active',
  Map<String, Object?>? readiness = const {
    'canPublishWhenFuture': true,
    'missing': <String>[],
  },
}) => {
  'eventId': 'event-1',
  'organizerId': 'org-1',
  'setupRevision': 3,
  'name': 'Sunday Mixer',
  'city': {'cityId': 'in-mh-mumbai', 'marketId': 'in-mh-mumbai'},
  'localDate': '2030-03-17',
  'localStartTime': '19:00',
  'timezone': 'Asia/Kolkata',
  'startTimeMillis': _start,
  'publicationState': publicationState,
  'status': status,
  'setupDefaults': <String, Object?>{},
  'detailsConfigured': true,
  'eventPreferences': null,
  'eventDetails': {
    'endTimeMillis': null,
    'venueName': null,
    'sourceVenueId': null,
    'eventFormat': null,
  },
  'canEditBasics': publicationState == 'private',
  'canChangeCity': false,
  'publicationReadiness': readiness,
};

Map<String, Object?> _view({
  String coverage = 'complete',
  String? source,
  Map<String, Object?>? summary,
  String organizerId = 'org-1',
}) => {
  'schemaVersion': 1,
  'eventId': 'event-1',
  'organizerId': organizerId,
  'setupRevision': 3,
  'revision': 2,
  'evaluatedAt': Timestamp.fromMillisecondsSinceEpoch(1800000000000),
  'sourceCoverage': coverage,
  'incompleteSource': source,
  'summary': summary,
};

PrivateEventSetupView _parse(Map<String, Object?>? data, {DateTime? now}) =>
    PrivateEventSetupView.fromFirestore(
      organizerId: 'org-1',
      eventId: 'event-1',
      data: data,
      now: now ?? DateTime.fromMillisecondsSinceEpoch(_start - 60000),
    );

void main() {
  test('a missing document is a missing view, not an empty event', () {
    final view = _parse(null);
    expect(view.sourceCoverage, PrivateEventSetupCoverage.missing);
    expect(view.isComplete, isFalse);
    expect(
      view.requireSummary,
      throwsA(
        isA<PrivateEventSetupViewUnavailable>().having(
          (error) => error.coverage,
          'coverage',
          PrivateEventSetupCoverage.missing,
        ),
      ),
    );
  });

  test('a complete view parses its summary and revision', () {
    final view = _parse(_view(summary: _summary()));
    expect(view.isComplete, isTrue);
    expect(view.setupRevision, 3);
    expect(view.evaluatedAt, isNotNull);
    expect(view.summary!.name, 'Sunday Mixer');
    expect(view.reflects(3), isTrue);
    expect(view.reflects(4), isFalse);
  });

  test('an invalid source keeps its summary but is never usable', () {
    final view = _parse(
      _view(coverage: 'invalidSource', source: 'events', summary: _summary()),
    );
    expect(view.isComplete, isFalse);
    expect(view.reflects(1), isFalse);
    expect(
      view.requireSummary,
      throwsA(
        isA<PrivateEventSetupViewUnavailable>().having(
          (error) => error.source,
          'source',
          'events',
        ),
      ),
    );
  });

  test('another organizer, a complete view without summary or a bad shape '
      'are format errors', () {
    expect(
      () => _parse(_view(organizerId: 'org-2', summary: _summary())),
      throwsFormatException,
    );
    expect(() => _parse(_view()), throwsFormatException);
    expect(
      () => _parse({..._view(summary: _summary()), 'schemaVersion': 2}),
      throwsFormatException,
    );
    expect(
      () => _parse(_view(summary: {..._summary(), 'eventId': 'event-2'})),
      throwsFormatException,
    );
  });

  test('the phone applies time to publication readiness', () {
    final future = _parse(_view(summary: _summary())).summary!;
    expect(future.publicationReadiness!.canPublish, isTrue);
    expect(future.publicationReadiness!.missing, isEmpty);

    final started = _parse(
      _view(summary: _summary()),
      now: DateTime.fromMillisecondsSinceEpoch(_start + 1),
    ).summary!;
    expect(started.publicationReadiness!.canPublish, isFalse);
    expect(started.publicationReadiness!.missing, ['futureActive']);

    final incomplete = _parse(
      _view(
        summary: _summary(
          readiness: const {
            'canPublishWhenFuture': false,
            'missing': ['venue'],
          },
        ),
      ),
    ).summary!;
    expect(incomplete.publicationReadiness!.missing, ['venue']);

    final cancelled = _parse(
      _view(
        summary: {
          ..._summary(status: 'cancelled'),
          'canEditBasics': false,
        },
      ),
    ).summary!;
    expect(cancelled.publicationReadiness!.canPublish, isFalse);
    expect(cancelled.publicationReadiness!.missing, ['futureActive']);

    final published = _parse(
      _view(
        summary: _summary(
          publicationState: 'published',
          readiness: const {
            'canPublishWhenFuture': false,
            'missing': <String>[],
          },
        ),
      ),
      now: DateTime.fromMillisecondsSinceEpoch(_start + 1),
    ).summary!;
    expect(published.publicationReadiness!.canPublish, isFalse);
    expect(published.publicationReadiness!.missing, isEmpty);
  });

  test(
    'the first complete view awaits a missing one and reflects a revision',
    () async {
      final views = StreamController<PrivateEventSetupView>();
      addTearDown(views.close);
      final first = firstCompleteSetupView(views.stream, atLeastRevision: 3);
      views.add(_parse(null));
      views.add(PrivateEventSetupView.complete(_withRevision(2)));
      views.add(_parse(_view(summary: _summary())));
      expect((await first).setupRevision, 3);
    },
  );

  test('the first complete view fails on an invalid source', () async {
    expect(
      firstCompleteSetupView(
        Stream.value(
          _parse(_view(coverage: 'invalidSource', source: 'organizers')),
        ),
      ),
      throwsA(isA<PrivateEventSetupViewUnavailable>()),
    );
  });

  test(
    'the manager listener reads the document and updates while open',
    () async {
      final db = FakeFirebaseFirestore();
      final reads = HostEventSetupViewReads(
        db,
        clock: AppClock.custom(
          () => DateTime.fromMillisecondsSinceEpoch(_start - 60000),
        ),
      );
      final delivered = <PrivateEventSetupView>[];
      final subscription = reads
          .watch(organizerId: 'org-1', eventId: 'event-1')
          .listen(delivered.add);
      addTearDown(subscription.cancel);
      await pumpEventQueue();
      expect(
        delivered.single.sourceCoverage,
        PrivateEventSetupCoverage.missing,
      );
      await db
          .collection('hostEventSetupViews')
          .doc('event-1')
          .set(_view(summary: _summary()));
      await pumpEventQueue();
      expect(delivered.last.isComplete, isTrue);
      expect(delivered.last.summary!.publicationReadiness!.canPublish, isTrue);
      expect(
        () => reads.watch(organizerId: '', eventId: 'event-1'),
        throwsArgumentError,
      );
    },
  );
}

PrivateEventBasicSummary _withRevision(int revision) =>
    PrivateEventBasicSummary.fromFirestore({
      ..._summary(),
      'setupRevision': revision,
    }, now: DateTime.fromMillisecondsSinceEpoch(_start - 60000));
