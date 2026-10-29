import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_departure_fixtures.dart';
import 'event_assistance_departure_session_fixtures.dart';

void main() {
  late DepartureSessionHarness h;
  setUp(() async {
    h = DepartureSessionHarness();
    await h.load();
  });
  tearDown(() => h.dispose());

  Future<void> refresh() async {
    final index = h.repository.reads.length;
    h.container
        .read(eventAssistanceDepartureProvider(departureScope()).notifier)
        .reload();
    await h.container.pump();
    await h.repository.waitForReads(index + 1);
    h.repository.completeRead(index);
    await h.container.pump();
  }

  test('reentrant submitting notification shares the same future', () async {
    final editor = h.editor()..selectDestination(departureStop);
    Future<EventAssistanceGroupProgressResult>? reentrant;
    h.container.listen(
      eventAssistanceDepartureEditorProvider(departureScope()),
      (_, next) {
        if (next is EventDepartureForm &&
            next.phase == EventDepartureFormPhase.submitting) {
          reentrant = editor.submit();
        }
      },
    );
    final first = editor.submit();
    expect(reentrant, same(first));
    expect(h.repository.changes, hasLength(1));
    h.repository.completeConfirmation(0);
    await first;
  });

  test('reentrant roster-review notification shares the same future', () async {
    final editor = h.editor()..selectRoster(['guest-1']);
    Future<EventAssistanceDepartureRosterReview>? reentrant;
    h.container.listen(
      eventAssistanceDepartureEditorProvider(departureScope()),
      (_, next) {
        if (next is EventDepartureForm &&
            next.phase == EventDepartureFormPhase.reviewingRoster) {
          reentrant = editor.reviewRoster();
        }
      },
    );
    final first = editor.reviewRoster();
    expect(reentrant, same(first));
    expect(h.repository.reviews, hasLength(1));
    h.repository.completeReview(0);
    await first;
  });

  test(
    'unresolved save survives closure, query refresh and rate limiting',
    () async {
      final original = h.session;
      final editor = h.editor()..selectDestination(departureStop);
      final first = editor.submit();
      final failed = expectLater(first, throwsA(isA<NetworkException>()));
      h.repository.confirmations[0].completeError(
        const NetworkException('unavailable', 'Unknown result'),
      );
      await failed;
      editor.reload();
      expect(h.repository.reads, hasLength(1));
      await h.closeEditors();
      await refresh();
      final reopened = h.editor();
      expect(reopened, same(editor));
      expect(h.form(h.session).session, same(original));
      expect(h.form(h.session).canReload, isFalse);
      final retry = reopened.submit();
      final limited = expectLater(
        retry,
        throwsA(isA<BackendOperationException>()),
      );
      h.repository.confirmations[1].completeError(
        const BackendOperationException(
          code: 'resource-exhausted',
          message: 'Try later',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'confirm departure',
          ),
        ),
      );
      await limited;
      final last = reopened.submit();
      expect(
        h.repository.changes.every(
          (change) => identical(change, h.repository.changes.first),
        ),
        isTrue,
      );
      h.repository.completeConfirmation(2, replayed: true);
      await last;
      expect(h.form(original).phase, EventDepartureFormPhase.saved);
    },
  );

  test(
    'detached sign-out and same-UID return retire the unknown request',
    () async {
      final original = h.session;
      final editor = h.editor()..selectDestination(departureStop);
      final first = editor.submit();
      final failed = expectLater(first, throwsA(isA<NetworkException>()));
      h.repository.confirmations[0].completeError(
        const NetworkException('unavailable', 'Unknown result'),
      );
      await failed;
      await h.closeEditors();
      await h.signIn(null);
      await h.signIn();
      h.repository.completeRead(1);
      await h.container.pump();
      final fresh = h.editor();
      expect(
        () => fresh.open(original),
        throwsA(isA<BackendOperationException>()),
      );
      expect(h.form(h.session).action, isNull);
      expect(h.form(h.session).destination, isNull);
      expect(h.repository.changes, hasLength(1));
    },
  );

  test('detached account change rejects a late successful response', () async {
    final editor = h.editor()..selectDestination(departureStop);
    final first = editor.submit();
    final failed = expectLater(
      first,
      throwsA(isA<BackendOperationException>()),
    );
    await h.closeEditors();
    await h.signIn(null);
    await h.signIn();
    h.repository.completeRead(1);
    await h.container.pump();
    h.editor();
    h.repository.completeConfirmation(0);
    await failed;
    expect(h.form(h.session).phase, EventDepartureFormPhase.choosing);
    expect(h.form(h.session).result, isNull);
  });

  test('retired review cannot prepare a new departure', () async {
    final original = h.session;
    final editor = h.editor()..selectDestination(departureStop);
    await refresh();
    expect(original.isCurrent, isFalse);
    await expectLater(editor.submit(), throwsA(isA<ValidationException>()));
    expect(h.repository.changes, isEmpty);
    expect(h.form(original).phase, EventDepartureFormPhase.refreshRequired);
    expect(() => editor.open(original), throwsA(isA<ValidationException>()));
  });

  test(
    'roster review completing after a refresh cannot enable confirmation',
    () async {
      final original = h.session;
      final editor = h.editor()
        ..selectDestination(departureStop)
        ..selectRoster(['guest-1']);
      final first = editor.reviewRoster();
      final failed = expectLater(first, throwsA(isA<ValidationException>()));
      await refresh();
      editor.open(h.session);
      h.repository.completeReview(0);
      await failed;
      expect(h.form(original).phase, EventDepartureFormPhase.refreshRequired);
      expect(h.form(original).roster, isNull);
      expect(h.repository.changes, isEmpty);
    },
  );

  test(
    'malformed receipt remains unresolved and retries the original request',
    () async {
      final original = h.session;
      final editor = h.editor()..selectDestination(departureStop);
      final first = editor.submit();
      final failed = expectLater(first, throwsA(isA<FormatException>()));
      h.repository.confirmations[0].complete(
        parseDeparture(departureResponse()),
      );
      await failed;
      expect(h.form(original).phase, EventDepartureFormPhase.retryRequired);
      final retry = editor.submit();
      expect(h.repository.changes[1], same(h.repository.changes[0]));
      h.repository.completeConfirmation(1);
      await retry;
    },
  );
}
