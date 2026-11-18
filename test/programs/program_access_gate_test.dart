import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_access_gate.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final start = DateTime.utc(2026, 11, 20, 10);
  DateTime at(int minutes) => start.add(Duration(minutes: minutes));
  int ms(DateTime value) => value.millisecondsSinceEpoch;

  Map<Object?, Object?> raw({
    String status = 'active',
    required int dutyEnds,
    int? grantEnds,
    String role = 'staff',
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'uid': 'u1',
    'ownerUid': 'owner',
    'role': role,
    'status': status,
    'activeFromMillis': 0,
    'expiresAtMillis': role == 'manager' ? null : grantEnds ?? dutyEnds,
    'duties': {'functionLead': dutyEnds},
    'pickupAll': <String, int>{},
    'pickupScoped': <String, int>{},
    'hotelAll': <String, int>{},
    'hotelScoped': <String, int>{},
    'functionAll': {'functionLead': dutyEnds},
    'functionScoped': <String, int>{},
    'workPickup': <String, int>{},
    'workHotel': <String, int>{},
    'workFunction': {ProgramAccessView.allKey: dutyEnds},
    'revision': 1,
    'version': 1,
  };

  /// The access listener the repository builds, over a controllable view
  /// stream and a clock that follows fake time.
  ({
    StreamController<ProgramAccessView?> views,
    Stream<ProgramAccessState> state,
  })
  access(FakeAsync async, {void Function()? onCancel}) {
    // ignore: close_sinks
    final views = StreamController<ProgramAccessView?>(onCancel: onCancel);
    final clock = AppClock.custom(() => start.add(async.elapsed));
    final tracker = ProgramAccessTracker('p1');
    return (
      views: views,
      state: clockedListener<ProgramAccessView?, ProgramAccessState>(
        views.stream,
        clock: clock,
        build: (view, now) => tracker.evaluate(view, now),
        nextRebuildAt: (state) =>
            state.view?.nextChangeAfter(state.evaluatedAt),
      ),
    );
  }

  const needs = {'duty:functionLead'};

  group('gateByProgramAccess', () {
    test('rows show while the duty holds and stop at its expiry', () {
      fakeAsync((async) {
        final access0 = access(async);
        // ignore: close_sinks
        final rows = StreamController<String>.broadcast();
        final seen = <Object>[];
        var opened = 0;
        gateByProgramAccess<String>(
          access: access0.state,
          data: () {
            opened++;
            return rows.stream;
          },
          needs: needs,
        ).listen(seen.add, onError: seen.add);

        access0.views.add(ProgramAccessView.fromMap(raw(dutyEnds: ms(at(30)))));
        async.flushMicrotasks();
        rows.add('cached roster');
        async.flushMicrotasks();
        expect(seen, ['cached roster']);
        expect(opened, 1);

        // No snapshot arrives; the clock alone reaches the duty's end.
        async.elapse(const Duration(minutes: 30));
        async.flushMicrotasks();
        expect(seen.last, isA<PermissionException>());
        expect(rows.hasListener, isFalse, reason: 'the data listener closes');

        // Rows still arriving from the old source are not shown.
        rows.add('stale row');
        async.flushMicrotasks();
        expect(seen, ['cached roster', isA<PermissionException>()]);
      });
    });

    test('a revoked view hides rows at once and reopens a fresh listener', () {
      fakeAsync((async) {
        final access0 = access(async);
        final seen = <Object>[];
        var opened = 0;
        gateByProgramAccess<String>(
          access: access0.state,
          data: () => Stream.value('roster ${++opened}'),
          needs: needs,
        ).listen(seen.add, onError: seen.add);

        access0.views.add(ProgramAccessView.fromMap(raw(dutyEnds: ms(at(90)))));
        async.flushMicrotasks();
        expect(seen, ['roster 1']);

        access0.views.add(
          ProgramAccessView.fromMap(
            raw(status: 'inactive', dutyEnds: ms(at(90))),
          ),
        );
        async.flushMicrotasks();
        expect(seen.last, isA<PermissionException>());

        // Access returns: a new listener delivers current rows, not old ones.
        access0.views.add(ProgramAccessView.fromMap(raw(dutyEnds: ms(at(90)))));
        async.flushMicrotasks();
        expect(seen.last, 'roster 2');
        expect(opened, 2);
      });
    });

    test('a narrowed view reopens the listener; a widened one does not', () {
      fakeAsync((async) {
        final access0 = access(async);
        var opened = 0;
        gateByProgramAccess<String>(
          access: access0.state,
          data: () {
            opened++;
            return const Stream<String>.empty();
          },
          needs: needs,
        ).listen((_) {}, onError: (_) {});

        access0.views.add(ProgramAccessView.fromMap(raw(dutyEnds: ms(at(90)))));
        async.flushMicrotasks();
        expect(opened, 1);

        // Same authority again, later: nothing narrowed.
        access0.views.add(ProgramAccessView.fromMap(raw(dutyEnds: ms(at(90)))));
        async.flushMicrotasks();
        expect(opened, 1);

        // An unrelated duty disappears: authority narrowed, rows recaptured.
        final extra = raw(dutyEnds: ms(at(90)));
        (extra['duties']! as Map)['hotelDesk'] = ms(at(90));
        access0.views.add(ProgramAccessView.fromMap(extra));
        async.flushMicrotasks();
        expect(opened, 1, reason: 'widening keeps the running listener');
        access0.views.add(ProgramAccessView.fromMap(raw(dutyEnds: ms(at(90)))));
        async.flushMicrotasks();
        expect(opened, 2, reason: 'narrowing starts a fresh listener');
      });
    });

    test('a missing view, or a duty the account never held, shows nothing', () {
      fakeAsync((async) {
        final access0 = access(async);
        final seen = <Object>[];
        var opened = 0;
        gateByProgramAccess<String>(
          access: access0.state,
          data: () {
            opened++;
            return Stream.value('row');
          },
          needs: {'duty:hotelDesk'},
        ).listen(seen.add, onError: seen.add);

        access0.views.add(null);
        async.flushMicrotasks();
        expect(seen.single, isA<PermissionException>());

        access0.views.add(ProgramAccessView.fromMap(raw(dutyEnds: ms(at(90)))));
        async.flushMicrotasks();
        expect(opened, 0);
        expect(seen, hasLength(1), reason: 'denial is reported once');
      });
    });

    test('the programme owner passes any need, with no end', () {
      fakeAsync((async) {
        final access0 = access(async);
        final seen = <Object>[];
        gateByProgramAccess<String>(
          access: access0.state,
          data: () => Stream.value('row'),
          needs: {'duty:programAdmin', 'hotel:hotelDesk__h1'},
        ).listen(seen.add, onError: seen.add);
        access0.views.add(
          ProgramAccessView.fromMap(raw(role: 'manager', dutyEnds: 1)),
        );
        async.flushMicrotasks();
        async.elapse(const Duration(days: 30));
        expect(seen, ['row']);
      });
    });

    test('cancelling closes both listeners', () {
      fakeAsync((async) {
        var viewsCancelled = false;
        final access0 = access(async, onCancel: () => viewsCancelled = true);
        // ignore: close_sinks
        final rows = StreamController<String>.broadcast();
        final subscription = gateByProgramAccess<String>(
          access: access0.state,
          data: () => rows.stream,
          needs: needs,
        ).listen((_) {});
        access0.views.add(ProgramAccessView.fromMap(raw(dutyEnds: ms(at(90)))));
        async.flushMicrotasks();
        expect(rows.hasListener, isTrue);
        unawaited(subscription.cancel());
        async.elapse(const Duration(seconds: 1));
        expect(rows.hasListener, isFalse);
        expect(viewsCancelled, isTrue);
      });
    });
  });
}
