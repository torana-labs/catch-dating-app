import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_transport_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_departures_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.utc(2026, 11, 20, 10);
  int ms(Duration after) => now.add(after).millisecondsSinceEpoch;
  final hour = ms(const Duration(hours: 1));
  final past = ms(const Duration(seconds: -1));

  Map<String, Object?> access({
    String role = 'staff',
    Map<String, int>? duties,
    Map<String, int>? hotelAll,
    Map<String, int>? hotelScoped,
    Map<String, int>? arrivalRoutes,
    Map<String, int>? tripRoutes,
    int? expiresAt,
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'uid': 'u1',
    'ownerUid': 'owner',
    'role': role,
    'status': 'active',
    'activeFromMillis': 0,
    'expiresAtMillis': role == 'manager' ? null : expiresAt ?? hour,
    'duties': duties ?? {},
    'pickupAll': <String, int>{},
    'pickupScoped': <String, int>{},
    'hotelAll': hotelAll ?? <String, int>{},
    'hotelScoped': hotelScoped ?? <String, int>{},
    'functionAll': <String, int>{},
    'functionScoped': <String, int>{},
    'workPickup': <String, int>{},
    'workHotel': <String, int>{},
    'workFunction': <String, int>{},
    'arrivalRoutes': arrivalRoutes ?? <String, int>{},
    'tripRoutes': tripRoutes ?? <String, int>{},
    'assignments': <Map<String, Object?>>[],
    'grantExpiresAtMillis': role == 'manager' ? null : hour,
    'revision': 1,
    'version': 1,
  };

  ProgramTransportViewsRepository repository(FakeFirebaseFirestore firestore) {
    final clock = AppClock.custom(() => now);
    return ProgramTransportViewsRepository(
      firestore,
      ProgramAccessRepository(firestore, clock),
      clock,
    );
  }

  Future<FakeFirebaseFirestore> withAccess(Map<String, Object?> view) async {
    final firestore = FakeFirebaseFirestore();
    await firestore.collection('programAccessViews').doc('p1__u1').set(view);
    return firestore;
  }

  Map<String, Object?> arrival(
    String legId, {
    String pickup = 'pp1',
    String hotel = 'h1',
    String? claimedBy,
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'legId': legId,
    'guestId': 'g-$legId',
    'partyId': null,
    'pickupPointId': pickup,
    'pickupKey': pickup,
    'hotelKey': hotel,
    'guestDisplayName': 'Guest $legId',
    'partyLabel': null,
    'partyGuestIds': <String>[],
    'passengers': 2,
    'luggageUnits': 1,
    'flightNumber': 'AI101',
    'originIata': 'DEL',
    'arrivalTerminal': null,
    'flightStatus': 'scheduled',
    'curbAtMillis': null,
    'curbSource': null,
    'unavailableReason': null,
    'readiness': 'expected',
    'claimedByDisplay': claimedBy == null ? null : 'Pooja',
    'claimedByUid': claimedBy,
    'destinationHotelId': hotel,
    'destinationLabel': 'Hotel',
    'requiredCapabilities': <String>[],
    'dedicatedVehicle': false,
    'revision': 1,
    'version': 1,
  };

  Future<void> seedArrivals(FakeFirebaseFirestore firestore) async {
    for (final row in [
      arrival('l2', claimedBy: 'u1'),
      arrival('l1', claimedBy: 'someone'),
      arrival('l3', pickup: 'pp2'),
      arrival('l4', hotel: 'h2'),
    ]) {
      await firestore
          .collection('programArrivalViews')
          .doc(row['legId']! as String)
          .set(row);
    }
  }

  group('arrivals', () {
    test(
      'a scoped route reads only its journeys, claims told by uid',
      () async {
        final firestore = await withAccess(
          access(arrivalRoutes: {'pp1|h1': hour}),
        );
        await seedArrivals(firestore);
        final roster = await repository(
          firestore,
        ).watchArrivals('p1', 'u1').first;
        expect(roster.rows.map((row) => row.legId), ['l1', 'l2']);
        expect(roster.rows.first.claimedByMe, isFalse);
        expect(roster.rows.last.claimedByMe, isTrue);
        expect(
          roster.accessExpiresAt,
          DateTime.fromMillisecondsSinceEpoch(hour),
        );
      },
    );

    test(
      'a pickup point narrows the roster; an unreached one is empty',
      () async {
        final firestore = await withAccess(
          access(arrivalRoutes: {'pp1|*': hour}),
        );
        await seedArrivals(firestore);
        final reader = repository(firestore);
        final own = await reader
            .watchArrivals('p1', 'u1', pickupPointId: 'pp1')
            .first;
        expect(own.rows.map((row) => row.legId), ['l1', 'l2', 'l4']);
        final other = await reader
            .watchArrivals('p1', 'u1', pickupPointId: 'pp2')
            .first;
        expect(other.rows, isEmpty);
      },
    );

    test('the all-routes key and the owner read every journey', () async {
      for (final view in [
        access(arrivalRoutes: {'*|*': hour}),
        access(role: 'manager'),
      ]) {
        final firestore = await withAccess(view);
        await seedArrivals(firestore);
        final roster = await repository(
          firestore,
        ).watchArrivals('p1', 'u1').first;
        expect(roster.rows, hasLength(4));
      }
    });

    test('overlapping routes list a journey once', () async {
      final firestore = await withAccess(
        access(arrivalRoutes: {'pp1|*': hour, '*|h1': hour}),
      );
      await seedArrivals(firestore);
      final roster = await repository(
        firestore,
      ).watchArrivals('p1', 'u1').first;
      expect(roster.rows.map((row) => row.legId), ['l1', 'l2', 'l3', 'l4']);
    });

    test('no route is denied, and an expired route stops the roster', () async {
      for (final view in [
        access(),
        access(arrivalRoutes: {'*|*': past}, expiresAt: past),
      ]) {
        final firestore = await withAccess(view);
        await seedArrivals(firestore);
        await expectLater(
          repository(firestore).watchArrivals('p1', 'u1'),
          emitsError(isA<PermissionException>()),
        );
      }
    });

    test('a delivery changes the roster with no new subscription', () async {
      final firestore = await withAccess(access(role: 'manager'));
      await seedArrivals(firestore);
      final seen = <int>[];
      final subscription = repository(firestore)
          .watchArrivals('p1', 'u1')
          .listen((roster) => seen.add(roster.rows.length));
      await Future<void>.delayed(const Duration(milliseconds: 30));
      expect(seen.last, 4);
      await firestore
          .collection('programArrivalViews')
          .doc('l9')
          .set(arrival('l9'));
      await Future<void>.delayed(const Duration(milliseconds: 30));
      expect(seen.last, 5);
      await subscription.cancel();
    });

    test('more than one page is read to the end', () async {
      final firestore = await withAccess(access(role: 'manager'));
      for (var i = 0; i < 230; i++) {
        final id = 'l${i.toString().padLeft(4, '0')}';
        await firestore
            .collection('programArrivalViews')
            .doc(id)
            .set(arrival(id));
      }
      final roster = await repository(firestore)
          .watchArrivals('p1', 'u1')
          .firstWhere((roster) => roster.rows.length == 230);
      expect(roster.rows, hasLength(230));
    });
  });

  group('departures', () {
    Map<String, Object?> departure(
      String legId, {
      required String state,
      int? leaveBy,
      String hotel = 'h1',
    }) => {
      'programId': 'p1',
      'organizerId': 'o1',
      'legId': legId,
      'hotelId': hotel,
      'guestId': 'g-$legId',
      'guestDisplayName': 'Guest $legId',
      'partyLabel': null,
      'passengers': 1,
      'luggageUnits': 0,
      'flightNumber': null,
      'flightAtMillis': null,
      'leaveByMillis': leaveBy,
      'roomLabel': '101',
      'state': state,
      'revision': 1,
      'version': 1,
    };

    Future<FakeFirebaseFirestore> seeded(Map<String, Object?> view) async {
      final firestore = await withAccess(view);
      await firestore
          .collection('programResourceViews')
          .doc('p1__hotel__h1')
          .set({'label': 'Palace'});
      for (final row in [
        departure('a', state: 'inRoom', leaveBy: ms(const Duration(hours: 1))),
        departure('b', state: 'inRoom', leaveBy: ms(const Duration(hours: -1))),
        departure(
          'c',
          state: 'checkedOut',
          leaveBy: ms(const Duration(hours: 5)),
        ),
        departure('d', state: 'left', leaveBy: ms(const Duration(minutes: -5))),
        departure('e', state: 'inRoom'),
        departure('x', state: 'inRoom', hotel: 'h2'),
      ]) {
        await firestore
            .collection('programDepartureViews')
            .doc(row['legId']! as String)
            .set(row);
      }
      return firestore;
    }

    test(
      'lists the hotel, soonest first, with counts from the clock',
      () async {
        final firestore = await seeded(
          access(
            duties: {'hotelDesk': hour},
            hotelScoped: {'hotelDesk__h1': hour},
          ),
        );
        final roster = await repository(
          firestore,
        ).watchDepartures('p1', 'h1', 'u1').first;
        expect(roster.hotelName, 'Palace');
        expect(roster.rows.map((row) => row.legId), ['b', 'd', 'a', 'c', 'e']);
        expect(roster.checkedOut, 1);
        expect(roster.leavingSoon, 1);
        expect(roster.lateCheckouts, 1);
        expect(
          roster.leaving.map((row) => row.state),
          isNot(contains(ProgramDepartureState.left)),
        );
      },
    );

    test('another hotel and a missing duty are denied', () async {
      final firestore = await seeded(
        access(
          duties: {'hotelDesk': hour},
          hotelScoped: {'hotelDesk__h2': hour},
        ),
      );
      await expectLater(
        repository(firestore).watchDepartures('p1', 'h1', 'u1'),
        emitsError(isA<PermissionException>()),
      );
    });

    test(
      'an expired hotel desk duty stops the desk with no new snapshot',
      () async {
        final firestore = await seeded(
          access(
            duties: {'hotelDesk': past},
            hotelAll: {'hotelDesk': past},
            expiresAt: past,
          ),
        );
        await expectLater(
          repository(firestore).watchDepartures('p1', 'h1', 'u1'),
          emitsError(isA<PermissionException>()),
        );
      },
    );
  });

  group('trips and hotel inbound', () {
    Map<String, Object?> trip(
      String id, {
      required int departed,
      String status = 'enRoute',
      String pickup = 'pp1',
      String hotel = 'h1',
    }) => {
      'programId': 'p1',
      'organizerId': 'o1',
      'tripId': id,
      'pickupPointId': pickup,
      'destinationHotelId': hotel,
      'pickupKey': pickup,
      'hotelKey': hotel,
      'destinationLabel': 'Palace',
      'vehicleClassId': 'van',
      'plateDisplay': 'RJ 14',
      'vendorId': null,
      'vendorName': 'Shree',
      'kind': 'guestTransfer',
      'status': status,
      'passengerCount': 3,
      'departedAtMillis': departed,
      'arrivedAtMillis': null,
      'voidReason': null,
      'manifestSource': 'dispatchSnapshot',
      'vehicleClassLabel': 'Van',
      'guestNames': <String>['Meera'],
      'revision': 1,
      'version': 1,
    };

    test('trips list newest first within the trip routes', () async {
      final firestore = await withAccess(access(tripRoutes: {'pp1|*': hour}));
      for (final row in [
        trip('t1', departed: 100),
        trip('t2', departed: 300),
        trip('t3', departed: 200, status: 'arrived'),
        trip('t4', departed: 400, pickup: 'pp2'),
      ]) {
        await firestore
            .collection('programTripViews')
            .doc(row['tripId']! as String)
            .set(row);
      }
      final list = await repository(firestore).watchTrips('p1', 'u1').first;
      expect(list.trips.map((trip) => trip.tripId), ['t2', 't3', 't1']);
      expect(list.nextCursor, isNull);
    });

    test(
      'the hotel inbound board joins en-route cars and expected guests',
      () async {
        final firestore = await withAccess(
          access(
            duties: {'hotelDesk': hour},
            hotelScoped: {'hotelDesk__h1': hour},
          ),
        );
        await firestore
            .collection('programResourceViews')
            .doc('p1__hotel__h1')
            .set({'label': 'Palace'});
        for (final row in [
          trip('t1', departed: 100),
          trip('t2', departed: 200, status: 'arrived'),
          trip('t3', departed: 300, hotel: 'h2'),
        ]) {
          await firestore
              .collection('programTripViews')
              .doc(row['tripId']! as String)
              .set(row);
        }
        for (final leg in [('l2', 200), ('l1', 100)]) {
          await firestore
              .collection('programHotelInboundViews')
              .doc(leg.$1)
              .set({
                'programId': 'p1',
                'organizerId': 'o1',
                'legId': leg.$1,
                'hotelId': 'h1',
                'guestDisplayName': 'Guest ${leg.$1}',
                'partyLabel': null,
                'passengers': 2,
                'curbAtMillis': leg.$2,
                'readiness': 'expected',
                'version': 1,
              });
        }
        final inbound = await repository(
          firestore,
        ).watchHotelInbound('p1', 'h1', 'u1').first;
        expect(inbound.hotelName, 'Palace');
        expect(inbound.trips.map((trip) => trip.tripId), ['t1']);
        expect(inbound.expectedLegs.map((leg) => leg.legId), ['l1', 'l2']);
      },
    );
  });

  group('vendors', () {
    test('dispatchers read the vendors bound to the programme', () async {
      final firestore = await withAccess(
        access(duties: {'transportDispatcher': hour}),
      );
      for (final (id, name) in [('v2', 'Zed Cabs'), ('v1', 'Shree')]) {
        await firestore.collection('programVendorViews').doc('p1__$id').set({
          'programId': 'p1',
          'organizerId': 'o1',
          'vendorId': id,
          'name': name,
          'active': true,
          'version': 1,
        });
      }
      final vendors = await repository(
        firestore,
      ).watchVendors('p1', 'u1').first;
      expect(vendors.map((vendor) => vendor.name), ['Shree', 'Zed Cabs']);
      expect(vendors.every((vendor) => vendor.boundToProgram), isTrue);
    });

    test('without the dispatcher duty the vendors are denied', () async {
      final firestore = await withAccess(access(duties: {'hotelDesk': hour}));
      await expectLater(
        repository(firestore).watchVendors('p1', 'u1'),
        emitsError(isA<PermissionException>()),
      );
    });
  });

  group('access routes', () {
    test('a view written before routes carries none', () {
      final map = access()
        ..remove('arrivalRoutes')
        ..remove('tripRoutes');
      final view = ProgramAccessView.fromMap(map);
      expect(view.liveArrivalRoutes(now), isEmpty);
      expect(view.liveTripRoutes(now), isEmpty);
    });

    test('live routes drop at their instant and the owner reaches all', () {
      final view = ProgramAccessView.fromMap(
        access(arrivalRoutes: {'pp1|h1': hour, '*|h2': past}),
      );
      expect(view.liveArrivalRoutes(now), [(pickup: 'pp1', hotel: 'h1')]);
      expect(view.liveKeys(now), contains('arrivalRoute:pp1|h1'));
      expect(
        ProgramAccessView.fromMap(
          access(role: 'manager'),
        ).liveArrivalRoutes(now),
        [(pickup: '*', hotel: '*')],
      );
    });
  });
}
