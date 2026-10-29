import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_host_guests_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_departure_fixtures.dart';
import 'event_assistance_departure_session_fixtures.dart';
import 'event_assistance_host_guests_fixtures.dart';

void main() {
  late DepartureSessionHarness h;
  setUp(() async {
    h = DepartureSessionHarness();
    await h.load();
  });
  tearDown(() => h.dispose());

  test(
    'one pending save freezes all controls and deduplicates submissions',
    () async {
      final session = h.session;
      final editor = h.editor();
      editor.selectDestination(departureStop);
      final first = editor.submit();
      expect(identical(first, editor.submit()), isTrue);
      expect(h.repository.changes, hasLength(1));
      expect(h.form(session).phase, EventDepartureFormPhase.submitting);
      expect(h.form(session).canEdit, isFalse);
      expect(h.form(session).canReload, isFalse);
      expect(h.state(session).canDismiss, isFalse);
      editor.selectRoster([]);
      editor.setCheckpoint(null);
      expect(h.form(session).selection, isNull);
      h.repository.completeConfirmation(0);
      final result = await first;
      expect(h.form(session).phase, EventDepartureFormPhase.saved);
      expect(h.form(session).canReload, isFalse);
      expect(await editor.submit(), same(result));
      expect(h.repository.changes, hasLength(1));
    },
  );

  test(
    'ambiguous failure retries the exact reviewed roster and checkpoint',
    () async {
      final session = h.session;
      final editor = h.editor();
      editor.selectDestination(departureStop);
      editor.selectRoster(['guest-2', 'guest-1']);
      final review = editor.reviewRoster();
      h.repository.completeReview(0);
      await review;
      editor.setCheckpoint(
        AssistanceDepartureCheckpointRequest(
          responsibleOperatorId: departureActor,
          dueAt: departureNow + 1000,
        ),
      );
      final first = editor.submit();
      final failure = expectLater(first, throwsA(isA<NetworkException>()));
      h.repository.confirmations.single.completeError(
        const NetworkException('deadline-exceeded', 'Unknown result'),
      );
      await failure;
      expect(h.form(session).phase, EventDepartureFormPhase.retryRequired);
      expect(h.form(session).canEdit, isFalse);
      expect(h.form(session).canReload, isFalse);
      editor.selectRoster(null);
      editor.setCheckpoint(null);
      final retry = editor.submit();
      expect(h.repository.changes[1], same(h.repository.changes[0]));
      expect(h.repository.changes[1].roster!.attendeeIds, [
        'guest-1',
        'guest-2',
      ]);
      expect(h.repository.changes[1].checkpoint!.dueAt, departureNow + 1000);
      expect(h.repository.reviews, hasLength(1));
      h.repository.completeConfirmation(1, replayed: true);
      await retry;
      expect(h.form(session).result!.operationRevision, 1);
      expect(h.form(session).result!.view.revision, 2);
    },
  );

  test(
    'conflict cannot rebase or retry until the host loads a new review',
    () async {
      final session = h.session;
      final editor = h.editor();
      editor.selectDestination(departureStop);
      final first = editor.submit();
      final failure = expectLater(
        first,
        throwsA(isA<BackendOperationException>()),
      );
      h.repository.confirmations.single.completeError(
        const BackendOperationException(
          code: 'aborted',
          message: 'Another operator moved the group',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'confirm departure',
          ),
        ),
      );
      await failure;
      expect(h.form(session).phase, EventDepartureFormPhase.refreshRequired);
      await expectLater(editor.submit(), throwsA(isA<ValidationException>()));
      expect(h.repository.changes, hasLength(1));
      h.container
          .read(eventAssistanceDepartureProvider(departureScope()).notifier)
          .reload();
      await h.container.pump();
      await h.repository.waitForReads(2);
      h.repository.completeRead(
        1,
        response: departureResponse(revision: 4, freshness: 'current'),
      );
      await h.container.pump();
      final fresh = h.session;
      final next = h.editor();
      expect(h.form(fresh).destination, isNull);
      next.selectDestination(departureStop);
      final second = next.submit();
      expect(h.repository.changes[1].snapshot.revision, 4);
      expect(
        h.repository.changes[1].operationId,
        isNot(h.repository.changes[0].operationId),
      );
      h.repository.completeConfirmation(1);
      await second;
    },
  );

  test(
    'success refreshes group progress and existing Host assistance reads',
    () async {
      final guests = eventAssistanceHostGuestsProvider(hostGuestsSelection());
      h.container.listen(guests, (_, _) {});
      await h.container.pump();
      expect(h.guests.reads, hasLength(1));
      final editor = h.editor()..selectDestination(departureStop);
      final first = editor.submit();
      h.repository.completeConfirmation(0);
      await first;
      await h.repository.waitForReads(2);
      await h.container.pump();
      expect(h.guests.reads, hasLength(2));
      expect(h.repository.reads[1].scope, departureScope());
    },
  );

  test(
    'account switch during save prevents success and never exposes the old form',
    () async {
      final session = h.session;
      final editor = h.editor()..selectDestination(departureStop);
      final first = editor.submit();
      await h.signIn('other-manager');
      expect(h.state(session), isA<EventDepartureFormIdle>());
      final failure = expectLater(
        first,
        throwsA(isA<BackendOperationException>()),
      );
      h.repository.completeConfirmation(0);
      await failure;
      expect(h.state(session), isA<EventDepartureFormIdle>());
      expect(
        h.repository.reads,
        hasLength(2),
        reason: 'no invalidation of the new account',
      );
    },
  );

  test(
    'switching away and back cannot revive or retry an old decision',
    () async {
      final session = h.session;
      final editor = h.editor()..selectDestination(departureStop);
      final first = editor.submit();
      final failure = expectLater(first, throwsA(isA<NetworkException>()));
      h.repository.confirmations.single.completeError(
        const NetworkException('unavailable', 'Unknown result'),
      );
      await failure;
      await h.signIn('other-manager');
      await h.signIn();
      h.repository.completeRead(2);
      await h.container.pump();
      expect(h.state(session), isA<EventDepartureFormIdle>());
      await expectLater(
        editor.submit(),
        throwsA(isA<BackendOperationException>()),
      );
      expect(h.repository.changes, hasLength(1));
      final fresh = h.session;
      h.editor();
      expect(h.form(fresh).phase, EventDepartureFormPhase.choosing);
      expect(h.form(fresh).destination, isNull);
    },
  );

  test(
    'a refreshed page preserves the unresolved departure until receipt',
    () async {
      final old = h.session;
      final editor = h.editor()..selectDestination(departureStop);
      final first = editor.submit();
      h.container
          .read(eventAssistanceDepartureProvider(departureScope()).notifier)
          .reload();
      await h.container.pump();
      await h.repository.waitForReads(2);
      h.repository.completeRead(1);
      await h.container.pump();
      final fresh = h.session;
      final next = h.editor();
      next.selectDestination(departureStop);
      next.selectRoster([]);
      h.repository.completeConfirmation(0);
      await first;
      expect(h.form(old).phase, EventDepartureFormPhase.saved);
      expect(identical(next, editor), isTrue);
      expect(h.form(fresh).session, same(old));
      expect(h.form(fresh).phase, EventDepartureFormPhase.saved);
      expect(h.form(fresh).selection, isNull);
      expect(h.repository.changes, hasLength(1));
    },
  );
}
