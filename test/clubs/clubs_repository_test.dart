import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_club_patch.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'clubs_test_helpers.dart';

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
  group('ClubsRepository', () {
    late FakeFirebaseFirestore firestore;
    late TestFirebaseFunctions functions;
    late ClubsRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      functions = TestFirebaseFunctions();
      repository = ClubsRepository(firestore, functions);
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
        final club = buildClub(id: 'club-88');

        await _seedClub(firestore, club);

        final decoded = await repository.fetchClub(club.id);
        final encoded =
            (await firestore.collection('organizers').doc(club.id).get())
                .data()!;
        expect(decoded?.id, 'club-88');
        expect(decoded?.name, 'Stride Social');
        expect(decoded?.appVisibility, ClubAppVisibility.discoverable);
        expect(encoded.containsKey('id'), isFalse);
        expect(encoded['name'], 'Stride Social');
      },
    );

    test('converter accepts unclaimed organizer host fields', () async {
      final club = buildClub(
        id: 'unclaimed-club',
        name: 'Open Organizer',
        hostUserId: null,
        hostName: null,
      );

      await _seedClub(firestore, club);

      final decoded = await repository.fetchClub(club.id);
      expect(decoded?.hostUserId, isNull);
      expect(decoded?.hostName, isNull);
      expect(decoded?.displayHostName, 'Open Organizer');
      expect(decoded?.displayHostProfiles, isEmpty);
    });

    test('missing app visibility fails closed', () async {
      final organizer = buildClub(id: 'missing-visibility');
      await firestore
          .collection('organizers')
          .doc(organizer.id)
          .set(organizer.toJson()..remove('appVisibility'));

      final decoded = await repository.fetchClub(organizer.id);
      expect(decoded?.appVisibility, ClubAppVisibility.hidden);
      expect(decoded?.isAppDiscoverable, isFalse);
    });

    test('watchClub emits the decoded club when the document exists', () async {
      final club = buildClub();
      await _seedClub(firestore, club);

      await expectLater(repository.watchClub('club-1'), emits(club));
    });

    test('watchClub emits null when the document is missing', () async {
      await expectLater(repository.watchClub('club-missing'), emits(null));
    });

    test('fetchClub returns the decoded club when found', () async {
      final club = buildClub();
      await _seedClub(firestore, club);

      expect(await repository.fetchClub('club-1'), club);
    });

    test('fetchClub returns null when the document is missing', () async {
      expect(await repository.fetchClub('club-missing'), isNull);
    });

    test('reads only canonical organizers after fallback retirement', () async {
      final legacyOnly = buildClub(id: 'legacy-only');
      await firestore
          .collection('clubs')
          .doc(legacyOnly.id)
          .set(legacyOnly.toJson());

      expect(await repository.fetchClub(legacyOnly.id), isNull);
      await expectLater(repository.watchClub(legacyOnly.id), emits(null));
      await expectLater(
        repository.watchClubsByLocation(legacyOnly.locationMarketId),
        emits(isEmpty),
      );
    });

    test(
      'watchClubsByLocation filters by city and orders by createdAt',
      () async {
        final older = buildClub(id: 'older', createdAt: DateTime(2025));
        final newer = buildClub(id: 'newer', createdAt: DateTime(2025, 1, 2));
        await _seedClub(firestore, older);
        await _seedClub(firestore, newer);
        await _seedClub(
          firestore,
          buildClub(id: 'delhi-club', location: 'in-dl-delhi-ncr'),
        );

        await expectLater(
          repository.watchClubsByLocation('in-mh-mumbai'),
          emits([newer, older]),
        );
      },
    );

    test('watchClubsByLocation hides app-hidden organizer profiles', () async {
      final visible = buildClub(id: 'visible');
      final hidden = buildClub(
        id: 'hidden',
        appVisibility: ClubAppVisibility.hidden,
        createdAt: DateTime(2025, 1, 2),
      );
      await _seedClub(firestore, visible);
      await _seedClub(firestore, hidden);

      await expectLater(
        repository.watchClubsByLocation('in-mh-mumbai'),
        emits([visible]),
      );
    });

    test('watchClubsByLocation hides synthetic organizer profiles', () async {
      final visible = buildClub(id: 'visible');
      final synthetic = buildClub(id: 'synthetic');
      await _seedClub(firestore, visible);
      await _seedClub(firestore, synthetic);
      await firestore.collection('organizers').doc(synthetic.id).update({
        'synthetic': true,
        'seedPrefix': 'cross_paths_mumbai_qa',
      });

      await expectLater(
        repository.watchClubsByLocation('in-mh-mumbai'),
        emits([visible]),
      );
    });

    test('watchClubsByLocation caps the discovery stream', () async {
      for (var i = 0; i < ReadLimitPolicy.directoryPage + 5; i++) {
        await _seedClub(
          firestore,
          buildClub(
            id: 'club-$i',
            createdAt: DateTime(2025).add(Duration(days: i)),
          ),
        );
      }

      await expectLater(
        repository.watchClubsByLocation('in-mh-mumbai'),
        emits(
          allOf(
            hasLength(ReadLimitPolicy.directoryPage),
            predicate<List<Club>>((clubs) => clubs.first.id == 'club-34'),
          ),
        ),
      );
    });

    test('watchClubsByLocationSortedByRating orders by rating', () async {
      final lowerRated = buildClub(
        id: 'club-low',
        location: 'in-dl-delhi-ncr',
        rating: 3.8,
      );
      final topClub = buildClub(
        id: 'club-top',
        location: 'in-dl-delhi-ncr',
        rating: 4.9,
      );
      await _seedClub(firestore, lowerRated);
      await _seedClub(firestore, topClub);

      await expectLater(
        repository.watchClubsByLocationSortedByRating('in-dl-delhi-ncr'),
        emits([topClub, lowerRated]),
      );
    });

    test('watchClubsByIds hides app-hidden search matches', () async {
      final visible = buildClub(id: 'visible');
      final hidden = buildClub(
        id: 'hidden',
        appVisibility: ClubAppVisibility.hidden,
      );
      await _seedClub(firestore, visible);
      await _seedClub(firestore, hidden);

      await expectLater(
        repository.watchClubsByIds(clubIds: const ['hidden', 'visible']),
        emits([visible]),
      );
    });

    test('messaging lookup keeps app-hidden club identity', () async {
      final visible = buildClub(id: 'visible');
      final hidden = buildClub(
        id: 'hidden',
        appVisibility: ClubAppVisibility.hidden,
      );
      await _seedClub(firestore, visible);
      await _seedClub(firestore, hidden);

      await expectLater(
        repository.watchClubsForMessagingByIds(
          clubIds: const ['hidden', 'visible'],
        ),
        emits([hidden, visible]),
      );
    });

    test('watchClubsHostedBy filters by host user id', () async {
      final hosted = buildClub(id: 'hosted');
      final coHosted = buildClub(
        id: 'co-hosted',
        hostUserId: 'host-2',
        hostUserIds: const ['host-2', 'host-1'],
      );
      final other = buildClub(id: 'other', hostUserId: 'host-2');
      await _seedClub(firestore, hosted);
      await _seedClub(firestore, coHosted);
      await _seedClub(firestore, other);

      await expectLater(
        repository.watchClubsHostedBy('host-1'),
        emits(unorderedEquals([hosted, coHosted])),
      );
    });

    test('watchClubsOwnedBy filters out co-hosted clubs', () async {
      final owned = buildClub(
        id: 'owned',
        ownerUserId: 'host-1',
        hostUserIds: const ['host-1'],
      );
      final coHosted = buildClub(
        id: 'co-hosted',
        hostUserId: 'host-2',
        ownerUserId: 'host-2',
        hostUserIds: const ['host-2', 'host-1'],
      );
      await _seedClub(firestore, owned);
      await _seedClub(firestore, coHosted);

      await expectLater(repository.watchClubsOwnedBy('host-1'), emits([owned]));
    });

    test('createClub delegates creation to the organizer callable', () async {
      final callable =
          functions.httpsCallable('createOrganizer') as TestHttpsCallable;
      callable.resultData = {'organizerId': 'club-42'};

      final createdId = await repository.createClub(
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

      await repository.createClub(
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
      await repository.updateClub(
        clubId: 'club-1',
        patch: UpdateClubPatch(name: 'New Name', area: 'New Area'),
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
        await repository.updateClub(
          clubId: 'club-1',
          patch: UpdateClubPatch(imageUrl: 'https://example.com/updated.jpg'),
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
      await repository.joinClub('club-1');

      expect(functions.callables['followOrganizer']?.calls, [
        {'organizerId': 'club-1'},
      ]);
      expect(functions.callables.containsKey('unfollowOrganizer'), isFalse);
    });

    test('leaveClub delegates membership to the callable', () async {
      await repository.leaveClub('club-1');

      expect(functions.callables['unfollowOrganizer']?.calls, [
        {'organizerId': 'club-1'},
      ]);
      expect(functions.callables.containsKey('followOrganizer'), isFalse);
    });

    test('clubsRepositoryProvider builds from firebaseFirestoreProvider', () {
      final container = ProviderContainer(
        overrides: [
          firebaseFirestoreProvider.overrideWithValue(firestore),
          firebaseFunctionsProvider.overrideWithValue(functions),
        ],
      );
      addTearDown(container.dispose);

      expect(container.read(clubsRepositoryProvider), isA<ClubsRepository>());
    });

    test('repository provider wrappers delegate to the repository', () async {
      final fakeRepository = FakeClubsRepository();
      final club = buildClub();
      final topClub = buildClub(id: 'club-top', rating: 4.9);
      fakeRepository.clubsById[club.id] = club;
      fakeRepository.clubsById[topClub.id] = topClub;
      fakeRepository.clubsByLocation['in-mh-mumbai'] = [club, topClub];

      final container = ProviderContainer(
        overrides: [
          clubsRepositoryProvider.overrideWith((ref) => fakeRepository),
        ],
      );
      addTearDown(container.dispose);

      final clubSubscription = container.listen(
        watchClubProvider(club.id),
        (_, _) {},
        fireImmediately: true,
      );
      final locationSubscription = container.listen(
        watchClubsByLocationProvider('in-mh-mumbai'),
        (_, _) {},
        fireImmediately: true,
      );
      final ratingSubscription = container.listen(
        watchClubsByLocationSortedByRatingProvider('in-mh-mumbai'),
        (_, _) {},
        fireImmediately: true,
      );
      final hostedSubscription = container.listen(
        watchClubsHostedByProvider('host-1'),
        (_, _) {},
        fireImmediately: true,
      );
      addTearDown(clubSubscription.close);
      addTearDown(locationSubscription.close);
      addTearDown(ratingSubscription.close);
      addTearDown(hostedSubscription.close);
      await container.pump();

      expect(clubSubscription.read().value, club);
      expect(locationSubscription.read().value, [club, topClub]);
      expect(ratingSubscription.read().value?.first.id, 'club-top');
      expect(hostedSubscription.read().value, [club, topClub]);
      expect(await container.read(fetchClubProvider(club.id).future), club);
    });

    testWidgets(
      'watchClubsByLocationProvider keeps realtime streams alive while idle',
      (tester) async {
        final club = buildClub();
        final clubsController = StreamController<List<Club>>();
        addTearDown(clubsController.close);

        final container = ProviderContainer(
          overrides: [
            clubsRepositoryProvider.overrideWith(
              (ref) => _IdleClubsRepository(
                clubsByLocationStream: clubsController.stream,
              ),
            ),
          ],
        );
        addTearDown(container.dispose);

        final provider = watchClubsByLocationProvider('in-mh-mumbai');
        final subscription = container.listen(provider, (_, _) {});
        addTearDown(subscription.close);

        clubsController.add([club]);
        await container.pump();
        expect(subscription.read().value, [club]);

        await tester.pump(_pastLegacyStreamTimeout);
        await container.pump();

        expect(subscription.read(), isA<AsyncData<List<Club>>>());
        expect(subscription.read().value, [club]);
      },
    );
  });
}

Future<void> _seedClub(FakeFirebaseFirestore firestore, Club club) {
  return firestore.collection('organizers').doc(club.id).set(club.toJson());
}

class _IdleClubsRepository extends Fake implements ClubsRepository {
  _IdleClubsRepository({required this.clubsByLocationStream});

  final Stream<List<Club>> clubsByLocationStream;

  @override
  Stream<List<Club>> watchClubsByLocation(String location) =>
      clubsByLocationStream;
}

const _pastLegacyStreamTimeout = Duration(seconds: 11);
