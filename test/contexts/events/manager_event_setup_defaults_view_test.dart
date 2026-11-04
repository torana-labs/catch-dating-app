import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_default_view_reads.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

final _hash = List.filled(64, 'a').join();

Map<String, Object?> _projection({String organizerId = 'org-1'}) => {
  'organizerId': organizerId,
  'city': {'cityId': 'in-mh-mumbai', 'marketId': 'in-mh-mumbai'},
  'timezone': 'Asia/Kolkata',
  'organizerDefaultsRevision': 2,
  'basicsReviewedHash': _hash,
  'preferencesRevision': 2,
  'preferences': {'timezone': 'Asia/Kolkata', 'currency': 'INR'},
  'preferencesHash': _hash,
  'reviewedDefaultsHash': _hash,
};

Map<String, Object?> _view({
  String coverage = 'complete',
  String? source,
  Map<String, Object?>? projection,
  String organizerId = 'org-1',
}) => {
  'schemaVersion': 1,
  'organizerId': organizerId,
  'revision': 4,
  'evaluatedAt': Timestamp.fromMillisecondsSinceEpoch(1800000000000),
  'sourceCoverage': coverage,
  'incompleteSource': source,
  'view': projection,
};

ManagerEventSetupDefaultsView _parse(Map<String, Object?>? data) =>
    ManagerEventSetupDefaultsView.fromFirestore(
      organizerId: 'org-1',
      data: data,
    );

void main() {
  test('missing, complete and invalid views keep their meaning', () {
    expect(
      _parse(null).sourceCoverage,
      ManagerEventSetupDefaultsCoverage.missing,
    );
    final complete = _parse(_view(projection: _projection()));
    expect(complete.isComplete, isTrue);
    expect(complete.revision, 4);
    expect(complete.requireDefaults().reviewedDefaultsHash, _hash);
    expect(complete.requireDefaults().timezone, 'Asia/Kolkata');
    final invalid = _parse(
      _view(
        coverage: 'invalidSource',
        source: 'organizerEventSetupDefaults',
        projection: _projection(),
      ),
    );
    expect(invalid.isComplete, isFalse);
    expect(
      invalid.requireDefaults,
      throwsA(
        isA<ManagerEventSetupDefaultsUnavailable>().having(
          (error) => error.source,
          'source',
          'organizerEventSetupDefaults',
        ),
      ),
    );
  });

  test('another organizer or a complete view without projection fails', () {
    expect(
      () => _parse(_view(organizerId: 'org-2', projection: _projection())),
      throwsFormatException,
    );
    expect(
      () => _parse(_view(projection: _projection(organizerId: 'org-2'))),
      throwsFormatException,
    );
    expect(() => _parse(_view()), throwsFormatException);
  });

  test('the first complete defaults await a missing view', () async {
    final first = firstCompleteDefaultsView(
      Stream.fromIterable([
        _parse(null),
        _parse(_view(projection: _projection())),
      ]),
    );
    expect((await first).organizerId, 'org-1');
    expect(
      firstCompleteDefaultsView(
        Stream.value(_parse(_view(coverage: 'invalidSource', source: 'x'))),
      ),
      throwsA(isA<ManagerEventSetupDefaultsUnavailable>()),
    );
  });

  test('the manager listener reads the defaults view', () async {
    final db = FakeFirebaseFirestore();
    await db
        .collection('hostEventSetupDefaultViews')
        .doc('org-1')
        .set(_view(projection: _projection()));
    final view = await HostEventSetupDefaultViewReads(db).watch('org-1').first;
    expect(view.requireDefaults().preferencesRevision, 2);
    expect(
      () => HostEventSetupDefaultViewReads(db).watch('bad id'),
      throwsArgumentError,
    );
  });
}
