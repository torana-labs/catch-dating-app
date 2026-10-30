import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('client enum names match the generated callable contract', () {
    final contracts = <(List<Enum>, List<String>)>[
      (
        ProgramKind.values,
        CatchContractConstraints.programAccessCallableResponseKind.enumValues!,
      ),
      (
        ProgramStatus.values,
        CatchContractConstraints
            .programAccessCallableResponseStatus
            .enumValues!,
      ),
      (
        ProgramActorRole.values,
        CatchContractConstraints
            .programAccessCallableResponseActorRole
            .enumValues!,
      ),
      (
        ProgramStaffDuty.values,
        CatchContractConstraints
            .programAccessCallableResponseDutiesItemsDuty
            .enumValues!,
      ),
      (
        ProgramVehicleCapability.values,
        CatchContractConstraints
            .programAccessCallableResponseVehicleClassesItemsCapabilitiesItems
            .enumValues!,
      ),
      (
        TravelLegReadiness.values,
        CatchContractConstraints
            .programArrivalsRosterCallableResponseRowsItemsReadiness
            .enumValues!,
      ),
      (
        TravelLegReadiness.values,
        CatchContractConstraints
            .programHotelInboundCallableResponseExpectedLegsItemsReadiness
            .enumValues!,
      ),
      (
        TravelLegFlightStatus.values,
        CatchContractConstraints
            .programArrivalsRosterCallableResponseRowsItemsFlightStatus
            .enumValues!,
      ),
      (
        CurbSource.values,
        CatchContractConstraints
            .programArrivalsRosterCallableResponseRowsItemsCurbSource
            .enumValues!,
      ),
      (
        TimingUnavailableReason.values,
        CatchContractConstraints
            .programArrivalsRosterCallableResponseRowsItemsUnavailableReason
            .enumValues!,
      ),
      (
        TransportGroupReadiness.values,
        CatchContractConstraints
            .programTransportPlanCallableResponseGroupsItemsReadiness
            .enumValues!,
      ),
      (
        TransportUnassignedReason.values,
        CatchContractConstraints
            .programTransportPlanCallableResponseUnassignedItemsReason
            .enumValues!,
      ),
      (
        TransportTripStatus.values,
        CatchContractConstraints
            .programTripListCallableResponseTripsItemsStatus
            .enumValues!,
      ),
      (
        TransportManifestSource.values,
        CatchContractConstraints
            .programTripListCallableResponseTripsItemsManifestSource
            .enumValues!,
      ),
      (
        TransportManifestSource.values,
        CatchContractConstraints
            .programHotelInboundCallableResponseTripsItemsManifestSource
            .enumValues!,
      ),
      (
        ProgramStaffStatus.values,
        CatchContractConstraints
            .programStaffListCallableResponseMembersItemsStatus
            .enumValues!,
      ),
    ];
    for (final (values, contract) in contracts) {
      expect(values.map((value) => value.name), unorderedEquals(contract));
    }
  });

  test(
    'all supported program kinds and statuses parse through work access',
    () {
      for (final kind
          in CatchContractConstraints
              .programAccessCallableResponseKind
              .enumValues!) {
        for (final status
            in CatchContractConstraints
                .programAccessCallableResponseStatus
                .enumValues!) {
          final access = ProgramWorkAccess.fromCallableData({
            'programId': 'program',
            'organizerId': 'organizer',
            'title': 'Program',
            'kind': kind,
            'timezone': 'Asia/Kolkata',
            'status': status,
            'actorRole': 'manager',
            'duties': [],
            'grantExpiresAtMillis': null,
            'capabilities': [],
            'pickupPoints': [],
            'functions': [],
            'hotels': [],
            'vehicleClasses': [],
          });
          expect(access.kind.name, kind);
          expect(access.status.name, status);
        }
      }
    },
  );

  test('hotel projections accept the contract no-show readiness', () {
    final leg = HotelExpectedLeg.fromMap({
      'legId': 'leg',
      'guestDisplayName': 'Guest',
      'partyLabel': null,
      'passengers': 1,
      'curbAtMillis': null,
      'readiness': 'noShow',
    });
    expect(leg.readiness, TravelLegReadiness.noShow);
  });

  test(
    'numeric readers preserve exact integers and reject lossy coercions',
    () {
      for (final number in [0, 1, 1700000000000, 9007199254740991]) {
        expect(requiredInt({'revision': number}, 'revision'), number);
        expect(
          requiredInt({'revision': number.toDouble()}, 'revision'),
          number,
        );
      }
      for (final value in <Object?>[
        1.5,
        double.nan,
        double.infinity,
        double.negativeInfinity,
        9007199254740992,
        '7',
        null,
      ]) {
        expect(
          () => requiredInt({'revision': value}, 'revision'),
          throwsFormatException,
        );
      }
    },
  );

  test('missing projection expiry cannot become unlimited cached access', () {
    final payload = <String, Object?>{
      'programId': 'program',
      'pickupPointId': 'pickup',
      'generatedAtMillis': 1800000000000,
      'rows': [],
      'vehicleClasses': [],
    };
    expect(
      () => ProgramArrivalsRoster.fromCallableData(payload),
      throwsFormatException,
    );
    payload['accessExpiresAtMillis'] = null;
    expect(
      ProgramArrivalsRoster.fromCallableData(payload).accessExpiresAt,
      isNull,
    );
    payload['accessExpiresAtMillis'] = 1800000000100;
    expect(
      ProgramArrivalsRoster.fromCallableData(
        payload,
      ).accessExpiresAt?.millisecondsSinceEpoch,
      1800000000100,
    );
  });

  test('date readers reject fractions and out-of-range timestamps', () {
    expect(nullableDateTime(null), isNull);
    expect(
      nullableDateTime(1700000000000.0)?.millisecondsSinceEpoch,
      1700000000000,
    );
    for (final value in [1.5, double.nan, double.infinity, 8640000000000001]) {
      expect(() => nullableDateTime(value), throwsFormatException);
      expect(
        () => requiredDateTime({'at': value}, 'at'),
        throwsFormatException,
      );
    }
  });
}
