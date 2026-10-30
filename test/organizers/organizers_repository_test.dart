import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_organizer_patch.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizers_test_helpers.dart';

class TestFirebaseFunctions extends Fake implements FirebaseFunctions {
  final callables = <String, TestHttpsCallable>{};

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    return callables.putIfAbsent(name, () => TestHttpsCallable(name));
  }
}

class TestHttpsCallable extends Fake implements HttpsCallable {
  TestHttpsCallable(this.name);

  final String name;
  final calls = <Object?>[];
  Object? resultData;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    calls.add(parameters);
    return TestHttpsCallableResult<T>(resultData as T);
  }
}

class TestHttpsCallableResult<T> extends Fake
    implements HttpsCallableResult<T> {
  TestHttpsCallableResult(this.dataValue);

  final T dataValue;

  @override
  T get data => dataValue;
}

void main() {
  group('OrganizersRepository', () {
    late FakeFirebaseFirestore firestore;
    late TestFirebaseFunctions functions;
    late OrganizersRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      functions = TestFirebaseFunctions();
      repository = OrganizersRepository(firestore, functions);
    });

    test('generateId uses an auto-generated document reference', () async {
      final generatedId = repository.generateId();

      expect(generatedId, isNotEmpty);
      final generatedDoc = await firestore
          .collection('organizers')
          .doc(generatedId)
          .get();
      expect(generatedDoc.exists, isFalse);
    });

    test(
      'converter round-trips Firestore data and injects the document id',
      () async {
        final organizer = buildOrganizer(id: 'club-88');

        await _seedOrganizer(firestore, organizer);

        final decoded = await repository.fetchOrganizer(organizer.id);
        final encoded =
            (await firestore.collection('organizers').doc(organizer.id).get())
                .data()!;
        expect(decoded?.id, 'club-88');
        expect(decoded?.name, 'Stride Social');
        expect(decoded?.appVisibility, OrganizerAppVisibility.discoverable);
        expect(encoded.containsKey('id'), isFalse);
        expect(encoded['name'], 'Stride Social');
      },
    );

    test('converter accepts unclaimed organizer host fields', () async {
      final organizer = buildOrganizer(
        id: 'unclaimed-club',
        name: 'Open Organizer',
        hostUserId: null,
        hostName: null,
      );

      await _seedOrganizer(firestore, organizer);

      final decoded = await repository.fetchOrganizer(organizer.id);
      expect(decoded?.hostUserId, isNull);
      expect(decoded?.hostName, isNull);
      expect(decoded?.displayHostName, 'Open Organizer');
      expect(decoded?.displayHostProfiles, isEmpty);
    });

    test('missing app visibility fails closed', () async {
      final organizer = buildOrganizer(id: 'missing-visibility');
      await firestore
          .collection('organizers')
          .doc(organizer.id)
          .set(organizer.toJson()..remove('appVisibility'));

      final decoded = await repository.fetchOrganizer(organizer.id);
      expect(decoded?.appVisibility, OrganizerAppVisibility.hidden);
      expect(decoded?.isAppDiscoverable, isFalse);
    });

    test('watchClub emits the decoded club when the document exists', () async {
      final organizer = buildOrganizer();
      await _seedOrganizer(firestore, organizer);

      await expectLater(repository.watchOrganizer('club-1'), emits(organizer));
    });

    test('watchClub emits null when the document is missing', () async {
      await expectLater(repository.watchOrganizer('club-missing'), emits(null));
    });

    test('fetchClub returns the decoded club when found', () async {
      final organizer = buildOrganizer();
      await _seedOrganizer(firestore, organizer);

      expect(await repository.fetchOrganizer('club-1'), organizer);
    });

    test('fetchClub returns null when the document is missing', () async {
      expect(await repository.fetchOrganizer('club-missing'), isNull);
    });

    test('reads only canonical organizers after fallback retirement', () async {
      final legacyOnly = buildOrganizer(id: 'legacy-only');
      await firestore
          .collection('clubs')
          .doc(legacyOnly.id)
          .set(legacyOnly.toJson());

      expect(await repository.fetchOrganizer(legacyOnly.id), isNull);
      await expectLater(repository.watchOrganizer(legacyOnly.id), emits(null));
      await expectLater(
        repository.watchOrganizersByLocation(legacyOnly.locationMarketId),
        emits(isEmpty),
      );
    });

    test(
      'watchClubsByLocation filters by city and orders by createdAt',
      () async {
        final older = buildOrganizer(id: 'older', createdAt: DateTime(2025));
        final newer = buildOrganizer(
          id: 'newer',
          createdAt: DateTime(2025, 1, 2),
        );
        await _seedOrganizer(firestore, older);
        await _seedOrganizer(firestore, newer);
        await _seedOrganizer(
          firestore,
          buildOrganizer(id: 'delhi-club', location: 'in-dl-delhi-ncr'),
        );

        await expectLater(
          repository.watchOrganizersByLocation('in-mh-mumbai'),
          emits([newer, older]),
        );
      },
    );

    test('watchClubsByLocation hides app-hidden organizer profiles', () async {
      final visible = buildOrganizer(id: 'visible');
      final hidden = buildOrganizer(
        id: 'hidden',
        appVisibility: OrganizerAppVisibility.hidden,
        createdAt: DateTime(2025, 1, 2),
      );
      await _seedOrganizer(firestore, visible);
      await _seedOrganizer(firestore, hidden);

      await expectLater(
        repository.watchOrganizersByLocation('in-mh-mumbai'),
        emits([visible]),
      );
    });

    test('watchClubsByLocation hides synthetic organizer profiles', () async {
      final visible = buildOrganizer(id: 'visible');
      final synthetic = buildOrganizer(id: 'synthetic');
      await _seedOrganizer(firestore, visible);
      await _seedOrganizer(firestore, synthetic);
      await firestore.collection('organizers').doc(synthetic.id).update({
        'synthetic': true,
        'seedPrefix': 'cross_paths_mumbai_qa',
      });

      await expectLater(
        repository.watchOrganizersByLocation('in-mh-mumbai'),
        emits([visible]),
      );
    });

    test('watchClubsByLocation caps the discovery stream', () async {
      for (var i = 0; i < ReadLimitPolicy.directoryPage + 5; i++) {
        await _seedOrganizer(
          firestore,
          buildOrganizer(
            id: 'club-$i',
            createdAt: DateTime(2025).add(Duration(days: i)),
          ),
        );
      }

      await expectLater(
        repository.watchOrganizersByLocation('in-mh-mumbai'),
        emits(
          allOf(
            hasLength(ReadLimitPolicy.directoryPage),
            predicate<List<Organizer>>(
              (organizers) => organizers.first.id == 'club-34',
            ),
          ),
        ),
      );
    });

    test('watchClubsByLocationSortedByRating orders by rating', () async {
      final lowerRated = buildOrganizer(
        id: 'club-low',
        location: 'in-dl-delhi-ncr',
        rating: 3.8,
      );
      final topOrganizer = buildOrganizer(
        id: 'club-top',
        location: 'in-dl-delhi-ncr',
        rating: 4.9,
      );
      await _seedOrganizer(firestore, lowerRated);
      await _seedOrganizer(firestore, topOrganizer);

      await expectLater(
        repository.watchOrganizersByLocationSortedByRating('in-dl-delhi-ncr'),
        emits([topOrganizer, lowerRated]),
      );
    });

    test('watchClubsByIds hides app-hidden search matches', () async {
      final visible = buildOrganizer(id: 'visible');
      final hidden = buildOrganizer(
        id: 'hidden',
        appVisibility: OrganizerAppVisibility.hidden,
      );
      await _seedOrganizer(firestore, visible);
      await _seedOrganizer(firestore, hidden);

      await expectLater(
        repository.watchOrganizersByIds(
          organizerIds: const ['hidden', 'visible'],
        ),
        emits([visible]),
      );
    });

    test('messaging lookup keeps app-hidden club identity', () async {
      final visible = buildOrganizer(id: 'visible');
      final hidden = buildOrganizer(
        id: 'hidden',
        appVisibility: OrganizerAppVisibility.hidden,
      );
      await _seedOrganizer(firestore, visible);
      await _seedOrganizer(firestore, hidden);

      await expectLater(
        repository.watchOrganizersForMessagingByIds(
          organizerIds: const ['hidden', 'visible'],
        ),
        emits([hidden, visible]),
      );
    });

    test('watchClubsHostedBy filters by host user id', () async {
      final hosted = buildOrganizer(id: 'hosted');
      final coHosted = buildOrganizer(
        id: 'co-hosted',
        hostUserId: 'host-2',
        hostUserIds: const ['host-2', 'host-1'],
      );
      final other = buildOrganizer(id: 'other', hostUserId: 'host-2');
      await _seedOrganizer(firestore, hosted);
      await _seedOrganizer(firestore, coHosted);
      await _seedOrganizer(firestore, other);

      await expectLater(
        repository.watchOrganizersHostedBy('host-1'),
        emits(unorderedEquals([hosted, coHosted])),
      );
    });

    test('watchClubsOwnedBy filters out co-hosted clubs', () async {
      final owned = buildOrganizer(
        id: 'owned',
        ownerUserId: 'host-1',
        hostUserIds: const ['host-1'],
      );
      final coHosted = buildOrganizer(
        id: 'co-hosted',
        hostUserId: 'host-2',
        ownerUserId: 'host-2',
        hostUserIds: const ['host-2', 'host-1'],
      );
      await _seedOrganizer(firestore, owned);
      await _seedOrganizer(firestore, coHosted);

      await expectLater(
        repository.watchOrganizersOwnedBy('host-1'),
        emits([owned]),
      );
    });

    test('createClub delegates creation to the organizer callable', () async {
      final callable =
          functions.httpsCallable('createOrganizer') as TestHttpsCallable;
      callable.resultData = {'organizerId': 'club-42'};

      final createdId = await repository.createOrganizer(
        clubId: 'club-42',
        name: 'Sunset Striders',
        description: 'Easy city loops',
        location: 'in-mh-mumbai',
        area: 'Bandra',
        imageUrl: 'https://example.com/cover.jpg',
      );

      expect(createdId, 'club-42');
      expect(callable.calls, [
        {
          'organizerId': 'club-42',
          'name': 'Sunset Striders',
          'description': 'Easy city loops',
          'location': 'in-mh-mumbai',
          'area': 'Bandra',
          'organizerType': 'club',
          'imageUrl': 'https://example.com/cover.jpg',
        },
      ]);
    });

    test('createClub passes contact fields through to the callable', () async {
      final callable =
          functions.httpsCallable('createOrganizer') as TestHttpsCallable;
      callable.resultData = {'organizerId': 'club-42'};

      await repository.createOrganizer(
        clubId: 'club-42',
        name: 'Contact Club',
        description: 'A club with contact info.',
        location: 'in-mh-mumbai',
        area: 'Bandra',
        instagramHandle: '@contactclub',
        phoneNumber: '+91 99999 99999',
        email: 'hello@contactclub.com',
      );

      expect(
        callable.calls.single,
        containsPair('instagramHandle', '@contactclub'),
      );
      expect(
        callable.calls.single,
        containsPair('phoneNumber', '+91 99999 99999'),
      );
      expect(
        callable.calls.single,
        containsPair('email', 'hello@contactclub.com'),
      );
    });

    test('updateClub delegates field patches to the callable', () async {
      await repository.updateOrganizer(
        clubId: 'club-1',
        patch: UpdateOrganizerPatch(name: 'New Name', area: 'New Area'),
      );

      final callable =
          functions.httpsCallable('updateOrganizer') as TestHttpsCallable;
      expect(callable.calls, [
        {
          'organizerId': 'club-1',
          'fields': {'name': 'New Name', 'area': 'New Area'},
        },
      ]);
    });

    test(
      'updateClub delegates nullable media fields to the callable',
      () async {
        await repository.updateOrganizer(
          clubId: 'club-1',
          patch: UpdateOrganizerPatch(
            imageUrl: 'https://example.com/updated.jpg',
          ),
        );

        final callable =
            functions.httpsCallable('updateOrganizer') as TestHttpsCallable;
        expect(callable.calls, [
          {
            'organizerId': 'club-1',
            'fields': {'imageUrl': 'https://example.com/updated.jpg'},
          },
        ]);
      },
    );

    test('joinClub delegates membership to the callable', () async {
      await repository.joinOrganizer('club-1');

      expect(functions.callables['followOrganizer']?.calls, [
        {'organizerId': 'club-1'},
      ]);
      expect(functions.callables.containsKey('unfollowOrganizer'), isFalse);
    });

    test('leaveClub delegates membership to the callable', () async {
      await repository.leaveOrganizer('club-1');

      expect(functions.callables['unfollowOrganizer']?.calls, [
        {'organizerId': 'club-1'},
      ]);
      expect(functions.callables.containsKey('followOrganizer'), isFalse);
    });

    test(
      'organizersRepositoryProvider builds from firebaseFirestoreProvider',
      () {
        final container = ProviderContainer(
          overrides: [
            firebaseFirestoreProvider.overrideWithValue(firestore),
            firebaseFunctionsProvider.overrideWithValue(functions),
          ],
        );
        addTearDown(container.dispose);

        expect(
          container.read(organizersRepositoryProvider),
          isA<OrganizersRepository>(),
        );
      },
    );

    test('repository provider wrappers delegate to the repository', () async {
      final fakeRepository = FakeOrganizersRepository();
      final organizer = buildOrganizer();
      final topOrganizer = buildOrganizer(id: 'club-top', rating: 4.9);
      fakeRepository.organizersById[organizer.id] = organizer;
      fakeRepository.organizersById[topOrganizer.id] = topOrganizer;
      fakeRepository.organizersByLocation['in-mh-mumbai'] = [
        organizer,
        topOrganizer,
      ];

      final container = ProviderContainer(
        overrides: [
          organizersRepositoryProvider.overrideWith((ref) => fakeRepository),
        ],
      );
      addTearDown(container.dispose);

      final organizerSubscription = container.listen(
        watchOrganizerProvider(organizer.id),
        (_, _) {},
        fireImmediately: true,
      );
      final locationSubscription = container.listen(
        watchOrganizersByLocationProvider('in-mh-mumbai'),
        (_, _) {},
        fireImmediately: true,
      );
      final ratingSubscription = container.listen(
        watchOrganizersByLocationSortedByRatingProvider('in-mh-mumbai'),
        (_, _) {},
        fireImmediately: true,
      );
      final hostedSubscription = container.listen(
        watchOrganizersHostedByProvider('host-1'),
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(organizerSubscription.close);
      addTearDown(locationSubscription.close);
      addTearDown(ratingSubscription.close);
      addTearDown(hostedSubscription.close);
      await container.pump();

      expect(organizerSubscription.read().value, organizer);
      expect(locationSubscription.read().value, [organizer, topOrganizer]);
      expect(ratingSubscription.read().value?.first.id, 'club-top');
      expect(hostedSubscription.read().value, [organizer, topOrganizer]);
      expect(
        await container.read(fetchOrganizerProvider(organizer.id).future),
        organizer,
      );
    });

    testWidgets(
      'watchOrganizersByLocationProvider keeps realtime streams alive while idle',
      (tester) async {
        final organizer = buildOrganizer();
        final organizersController = StreamController<List<Organizer>>();
        addTearDown(organizersController.close);

        final container = ProviderContainer(
          overrides: [
            organizersRepositoryProvider.overrideWith(
              (ref) => _IdleOrganizersRepository(
                organizersByLocationStream: organizersController.stream,
              ),
            ),
          ],
        );
        addTearDown(container.dispose);

        final provider = watchOrganizersByLocationProvider('in-mh-mumbai');
        final subscription = container.listen(provider, (_, _) {});
        addTearDown(subscription.close);

        organizersController.add([organizer]);
        await container.pump();
        expect(subscription.read().value, [organizer]);

        await tester.pump(_pastLegacyStreamTimeout);
        await container.pump();

        expect(subscription.read(), isA<AsyncData<List<Organizer>>>());
        expect(subscription.read().value, [organizer]);
      },
    );
  });
}

Future<void> _seedOrganizer(
  FakeFirebaseFirestore firestore,
  Organizer organizer,
) {
  return firestore
      .collection('organizers')
      .doc(organizer.id)
      .set(organizer.toJson());
}

class _IdleOrganizersRepository extends Fake implements OrganizersRepository {
  _IdleOrganizersRepository({required this.organizersByLocationStream});

  final Stream<List<Organizer>> organizersByLocationStream;

  @override
  Stream<List<Organizer>> watchOrganizersByLocation(String location) =>
      organizersByLocationStream;
}

const _pastLegacyStreamTimeout = Duration(seconds: 11);
