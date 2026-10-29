import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_editor.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_departure_fixtures.dart';
import 'event_assistance_departure_session_fixtures.dart';

void main() {
  late DepartureSessionHarness h;
  setUp(() async {
    h = DepartureSessionHarness();
    final raw = departureResponse();
    (departureRawView(raw)['destinations']! as List).add({
      'alternativeId': 'alternative:${'e' * 64}',
      'target': departureMeeting.toJson(),
      'label': 'Meeting point',
      'location': {
        'name': 'Meeting point',
        'latitude': 12.9,
        'longitude': 77.6,
      },
    });
    await h.load(response: raw);
  });
  tearDown(() => h.dispose());

  test('no destination or roster is inferred from opening the form', () async {
    final session = h.session;
    final editor = h.editor();
    expect(h.form(session).destination, isNull);
    expect(h.form(session).selection, isNull);
    expect(h.form(session).canSubmit, isFalse);
    await expectLater(editor.submit(), throwsA(isA<ValidationException>()));
    expect(h.repository.changes, isEmpty);
    editor.selectDestination(departureStop);
    expect(h.form(session).canSubmit, isTrue);
    final pending = editor.submit();
    expect(
      (h.repository.changes.single.command['payload']! as Map).containsKey(
        'departureRoster',
      ),
      isFalse,
    );
    h.repository.completeConfirmation(0);
    await pending;
  });

  test(
    'a reviewed empty roster remains explicit and enables checkpoint setup',
    () async {
      final session = h.session;
      final editor = h.editor();
      editor.selectDestination(departureStop);
      editor.selectRoster([]);
      expect(h.form(session).needsRosterReview, isTrue);
      expect(h.form(session).canSubmit, isFalse);
      expect(h.form(session).canConfigureCheckpoint, isFalse);
      final review = editor.reviewRoster();
      expect(identical(review, editor.reviewRoster()), isTrue);
      expect(h.repository.reviews, hasLength(1));
      expect(h.form(session).canEdit, isFalse);
      expect(
        h.state(session).canDismiss,
        isTrue,
        reason: 'review has no effects',
      );
      editor.selectRoster(null);
      expect(h.form(session).selection, isNotNull);
      h.repository.completeReview(0);
      await review;
      expect(h.form(session).roster!.attendeeIds, isEmpty);
      expect(h.form(session).canSubmit, isTrue);
      expect(h.form(session).canConfigureCheckpoint, isTrue);
      editor.setCheckpoint(
        AssistanceDepartureCheckpointRequest(
          responsibleOperatorId: departureActor,
          dueAt: departureNow + 1000,
        ),
      );
      final save = editor.submit();
      expect(h.repository.changes.single.roster!.attendeeIds, isEmpty);
      expect(
        h.repository.changes.single.checkpoint!.dueAt,
        departureNow + 1000,
      );
      h.repository.completeConfirmation(0);
      await save;
    },
  );

  test(
    'changing selected people invalidates roster review and checkpoint',
    () async {
      final session = h.session;
      final editor = h.editor();
      editor.selectDestination(departureStop);
      editor.selectRoster(['guest-1']);
      final review = editor.reviewRoster();
      h.repository.completeReview(0);
      await review;
      editor.setCheckpoint(
        AssistanceDepartureCheckpointRequest(
          responsibleOperatorId: departureActor,
          dueAt: departureNow + 1000,
        ),
      );
      editor.selectRoster(['guest-2']);
      expect(h.form(session).roster, isNull);
      expect(h.form(session).checkpoint, isNull);
      expect(h.form(session).canSubmit, isFalse);
      await expectLater(editor.submit(), throwsA(isA<ValidationException>()));
      expect(h.repository.changes, isEmpty);
      editor.selectRoster(null);
      expect(h.form(session).selection, isNull);
      expect(h.form(session).canSubmit, isTrue);
    },
  );

  test(
    'changing destination clears its checkpoint but preserves roster review',
    () async {
      final session = h.session;
      final editor = h.editor();
      editor.selectDestination(departureStop);
      editor.selectRoster(['guest-1']);
      final review = editor.reviewRoster();
      h.repository.completeReview(0);
      final roster = await review;
      editor.setCheckpoint(
        AssistanceDepartureCheckpointRequest(
          responsibleOperatorId: departureActor,
          dueAt: departureNow + 1000,
        ),
      );
      editor.selectDestination(departureMeeting);
      expect(h.form(session).checkpoint, isNull);
      expect(identical(h.form(session).roster, roster), isTrue);
      expect(h.form(session).canConfigureCheckpoint, isFalse);
      expect(
        () => editor.setCheckpoint(
          AssistanceDepartureCheckpointRequest(
            responsibleOperatorId: departureActor,
            dueAt: departureNow + 1000,
          ),
        ),
        throwsA(isA<ValidationException>()),
      );
    },
  );

  test(
    'roster network failure allows retry without creating a departure',
    () async {
      final session = h.session;
      final editor = h.editor();
      editor.selectDestination(departureStop);
      editor.selectRoster(['guest-1']);
      final pending = editor.reviewRoster();
      final failure = expectLater(pending, throwsA(isA<NetworkException>()));
      h.repository.reviews.single.pending.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await failure;
      expect(h.form(session).phase, EventDepartureFormPhase.choosing);
      expect(h.form(session).needsRosterReview, isTrue);
      expect(h.form(session).error, isA<NetworkException>());
      final retry = editor.reviewRoster();
      expect(h.repository.reviews, hasLength(2));
      h.repository.completeReview(1);
      await retry;
      expect(h.form(session).canSubmit, isTrue);
      expect(h.repository.changes, isEmpty);
    },
  );

  test(
    'a failed roster refresh cannot fall back to the previous review',
    () async {
      final session = h.session;
      final editor = h.editor();
      editor.selectDestination(departureStop);
      editor.selectRoster(['guest-1']);
      final first = editor.reviewRoster();
      h.repository.completeReview(0);
      await first;
      editor.setCheckpoint(
        AssistanceDepartureCheckpointRequest(
          responsibleOperatorId: departureActor,
          dueAt: departureNow + 1000,
        ),
      );
      final refresh = editor.reviewRoster();
      expect(h.form(session).roster, isNull);
      expect(h.form(session).checkpoint, isNull);
      final failure = expectLater(refresh, throwsA(isA<NetworkException>()));
      h.repository.reviews[1].pending.completeError(
        const NetworkException('unavailable', 'Offline'),
      );
      await failure;
      expect(h.form(session).needsRosterReview, isTrue);
      expect(h.form(session).canSubmit, isFalse);
      expect(h.form(session).checkpoint, isNull);
      expect(h.repository.changes, isEmpty);
    },
  );

  test(
    'roster conflict requires new progress review without dropping selected people',
    () async {
      final session = h.session;
      final editor = h.editor();
      editor.selectDestination(departureStop);
      editor.selectRoster(['guest-1']);
      final pending = editor.reviewRoster();
      final failure = expectLater(
        pending,
        throwsA(isA<BackendOperationException>()),
      );
      h.repository.reviews.single.pending.completeError(
        const BackendOperationException(
          code: 'failed-precondition',
          message: 'Roster changed',
          context: BackendErrorContext(
            service: BackendService.functions,
            action: 'review departure roster',
          ),
        ),
      );
      await failure;
      expect(h.form(session).phase, EventDepartureFormPhase.refreshRequired);
      expect(h.form(session).selection!.attendeeIds, ['guest-1']);
      expect(h.form(session).canSubmit, isFalse);
      expect(h.form(session).canReload, isTrue);
    },
  );

  test(
    'an account switch during review removes the form and rejects completion',
    () async {
      final session = h.session;
      final editor = h.editor();
      editor.selectRoster(['guest-1']);
      final pending = editor.reviewRoster();
      await h.signIn('another-manager');
      expect(h.state(session), isA<EventDepartureFormIdle>());
      final failure = expectLater(
        pending,
        throwsA(isA<BackendOperationException>()),
      );
      h.repository.completeReview(0);
      await failure;
      expect(h.state(session), isA<EventDepartureFormIdle>());
      expect(h.repository.changes, isEmpty);
    },
  );
}
