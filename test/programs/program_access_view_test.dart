import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final start = DateTime.utc(2026, 11, 20, 10);
  DateTime at(int minutes) => start.add(Duration(minutes: minutes));
  int ms(DateTime value) => value.millisecondsSinceEpoch;

  Map<Object?, Object?> raw({
    String role = 'staff',
    String status = 'active',
    int? activeFrom,
    int? expiresAt,
    Map<String, int>? duties,
    Map<String, int>? pickupScoped,
    Map<String, int>? hotelAll,
    Map<String, int>? workFunction,
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'uid': 'u1',
    'ownerUid': 'owner',
    'role': role,
    'status': status,
    'activeFromMillis': activeFrom ?? 0,
    'expiresAtMillis': role == 'manager' ? null : expiresAt ?? ms(at(120)),
    'duties': duties ?? {'airportGreeter': ms(at(60))},
    'pickupAll': <String, int>{},
    'pickupScoped': pickupScoped ?? {'airportGreeter__pp1': ms(at(60))},
    'hotelAll': hotelAll ?? <String, int>{},
    'hotelScoped': <String, int>{},
    'functionAll': <String, int>{},
    'functionScoped': <String, int>{},
    'workPickup': {'pp1': ms(at(60))},
    'workHotel': <String, int>{},
    'workFunction': workFunction ?? <String, int>{},
    'assignments': <Map<String, Object?>>[],
    'grantExpiresAtMillis': null,
    'revision': 3,
    'version': 1,
  };

  ProgramAccessView view([Map<Object?, Object?>? map]) =>
      ProgramAccessView.fromMap(map ?? raw());

  group('ProgramAccessView', () {
    test('a duty is held until its own instant, not the grant\'s', () {
      final staff = view();
      expect(staff.holdsDuty(ProgramStaffDuty.airportGreeter, at(59)), isTrue);
      expect(staff.holdsDuty(ProgramStaffDuty.airportGreeter, at(60)), isFalse);
      // The grant is still live at +60, but no duty is.
      expect(staff.isLiveAt(at(60)), isTrue);
      expect(staff.holdsDuty(ProgramStaffDuty.hotelDesk, at(1)), isFalse);
    });

    test('a scoped duty covers only its named station', () {
      final staff = view();
      expect(
        staff.coversPickup(ProgramStaffDuty.airportGreeter, 'pp1', at(1)),
        isTrue,
      );
      expect(
        staff.coversPickup(ProgramStaffDuty.airportGreeter, 'pp2', at(1)),
        isFalse,
      );
      expect(staff.listsPickup('pp1', at(1)), isTrue);
      expect(staff.listsPickup('pp2', at(1)), isFalse);
    });

    test('an all-scope assignment covers any id until it ends', () {
      final staff = view(
        raw(
          duties: {'hotelDesk': ms(at(30))},
          hotelAll: {'hotelDesk': ms(at(30))},
        ),
      );
      expect(staff.coversHotel(ProgramStaffDuty.hotelDesk, 'h9', at(29)), true);
      expect(
        staff.coversHotel(ProgramStaffDuty.hotelDesk, 'h9', at(30)),
        false,
      );
    });

    test('the owner holds every duty with no end', () {
      final owner = view(raw(role: 'manager'));
      expect(owner.isManager, isTrue);
      expect(owner.holdsDuty(ProgramStaffDuty.programAdmin, at(100000)), true);
      expect(
        owner.coversFunction(ProgramStaffDuty.functionLead, 'any', at(5000)),
        isTrue,
      );
      expect(owner.listsHotel('any', at(5000)), isTrue);
    });

    test('an organizer manager holds setup authority, never a duty', () {
      final setupOnly = view({
        ...raw(status: 'inactive', duties: {}, pickupScoped: {}),
        'expiresAtMillis': null,
        'organizerManager': true,
        'revision': 0,
      });
      expect(setupOnly.organizerManager, isTrue);
      expect(setupOnly.isLiveAt(at(1)), isFalse);
      expect(
        setupOnly.holdsDuty(ProgramStaffDuty.communications, at(1)),
        false,
      );
      expect(setupOnly.holdsSetup(at(100000)), isTrue);
      expect(setupOnly.listsSetup(at(100000)), isTrue);
      expect(setupOnly.liveKeys(at(1)), {'organizerManager'});
      expect(setupOnly.denialAt(at(1)), ProgramAccessDenial.notGranted);
      // Views written before the flag read as no organizer management.
      expect(view().organizerManager, isFalse);
      // A programme administration duty opens the detail but lists nothing.
      final admin = view(raw(duties: {'programAdmin': ms(at(60))}));
      expect(admin.holdsSetup(at(59)), isTrue);
      expect(admin.holdsSetup(at(60)), isFalse);
      expect(admin.listsSetup(at(1)), isFalse);
      // The creator holds both, with no end.
      final owner = view(raw(role: 'manager'));
      expect(owner.holdsSetup(at(100000)), isTrue);
      expect(owner.listsSetup(at(100000)), isTrue);
      expect(view().holdsSetup(at(1)), isFalse);
    });

    test('revoked, expired and not-yet-approved views deny with a reason', () {
      expect(
        view(raw(status: 'inactive')).denialAt(at(1)),
        ProgramAccessDenial.revoked,
      );
      expect(view().denialAt(at(120)), ProgramAccessDenial.expired);
      expect(
        view(raw(activeFrom: ms(at(10)))).denialAt(at(5)),
        ProgramAccessDenial.notYetActive,
      );
      expect(view().denialAt(at(1)), isNull);
      // A denied view holds nothing, however its duties read.
      expect(
        view(
          raw(status: 'inactive'),
        ).holdsDuty(ProgramStaffDuty.airportGreeter, at(1)),
        isFalse,
      );
    });

    test('the next change is the earliest approval or expiry still ahead', () {
      final staff = view(raw(activeFrom: ms(at(10))));
      expect(staff.nextChangeAfter(at(0))!.isAtSameMomentAs(at(10)), isTrue);
      expect(staff.nextChangeAfter(at(10))!.isAtSameMomentAs(at(60)), isTrue);
      expect(staff.nextChangeAfter(at(60))!.isAtSameMomentAs(at(120)), isTrue);
      expect(staff.nextChangeAfter(at(120)), isNull);
      expect(view(raw(role: 'manager')).nextChangeAfter(at(0)), isNull);
    });

    test('parsing rejects a view missing a map', () {
      final broken = raw()..remove('workPickup');
      expect(() => ProgramAccessView.fromMap(broken), throwsFormatException);
    });
  });

  group('ProgramAccessTracker', () {
    test('the epoch rises when authority narrows, never when it widens', () {
      final tracker = ProgramAccessTracker('p1');
      final first = tracker.evaluate(view(), at(1));
      expect(first.epoch, 0);
      expect(first.isLive, isTrue);

      final widened = tracker.evaluate(
        view(
          raw(duties: {'airportGreeter': ms(at(60)), 'hotelDesk': ms(at(60))}),
        ),
        at(2),
      );
      expect(widened.epoch, 0);

      final narrowed = tracker.evaluate(view(), at(3));
      expect(narrowed.epoch, 1);
      expect(narrowed.isLive, isTrue);
    });

    test('a duty ending by the clock alone bumps the epoch', () {
      final tracker = ProgramAccessTracker('p1');
      final staff = view();
      expect(tracker.evaluate(staff, at(59)).epoch, 0);
      expect(tracker.evaluate(staff, at(60)).epoch, 1);
    });

    test('losing organizer management bumps the epoch', () {
      final tracker = ProgramAccessTracker('p1');
      final managing = view({
        ...raw(status: 'inactive'),
        'organizerManager': true,
      });
      final first = tracker.evaluate(managing, at(1));
      expect(first.liveKeys, {'organizerManager'});
      expect(first.isLive, isFalse, reason: 'no duty is live');
      final second = tracker.evaluate(view(raw(status: 'inactive')), at(2));
      expect(second.epoch, greaterThan(first.epoch));
    });

    test('revocation and a missing view deny and bump', () {
      final tracker = ProgramAccessTracker('p1');
      expect(tracker.evaluate(view(), at(1)).isLive, isTrue);
      final revoked = tracker.evaluate(view(raw(status: 'inactive')), at(2));
      expect(revoked.denial, ProgramAccessDenial.revoked);
      expect(revoked.epoch, 1);
      final gone = tracker.evaluate(null, at(3));
      expect(gone.denial, ProgramAccessDenial.notGranted);
      expect(gone.view, isNull);
    });

    test('an exact re-delivery changes nothing', () {
      final tracker = ProgramAccessTracker('p1');
      final first = tracker.evaluate(view(), at(1));
      final again = tracker.evaluate(view(), at(2));
      expect(again.epoch, first.epoch);
      expect(again.liveKeys, first.liveKeys);
    });
  });
}
