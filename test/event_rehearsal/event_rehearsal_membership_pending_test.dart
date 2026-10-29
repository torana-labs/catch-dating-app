import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_membership_controller.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_membership_controller_harness.dart';
import 'event_rehearsal_membership_fixtures.dart';
import 'event_rehearsal_movement_fixtures.dart';

const place = AssistancePlaceGroup('easy');
BackendOperationException backendError(String code) =>
    BackendOperationException(
      code: code,
      message: 'Practice response',
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'practice',
        resource: 'eventRehearsals',
      ),
    );

void main() {
  late RehearsalMembershipHarness h;
  setUp(() => h = RehearsalMembershipHarness());
  tearDown(() => h.dispose());

  test(
    'closure and refresh preserve the exact uncertain request and later membership',
    () async {
      final current = await h.review();
      final membership = h.row(current);
      final provider = eventRehearsalMembershipControllerProvider(
        membership.scope,
      );
      final subscription = h.container.listen(provider, (_, _) {});
      final actions = h.container.read(provider.notifier)
        ..open(current, membership)
        ..select(place);
      await h.fail(0, actions.submit());
      final original = h.repository.writes.single.change;
      final wire = original.toJson();
      subscription.close();
      await h.container.pump();
      expect(h.container.exists(provider), isTrue);
      h.container.read(h.query.notifier).reload();
      await h.container.pump();
      await h.completeRead(
        1,
        snapshot: practiceMembershipSnapshot(state: 'current'),
      );
      final fresh = h.container.read(h.query).requireValue;
      h.container.listen(provider, (_, _) {});
      final reopened = h.container.read(provider.notifier)
        ..open(fresh, h.row(fresh))
        ..select(const AssistanceLeaveGroup());
      expect(reopened, same(actions));
      expect(h.form(membership.scope).change, same(original));
      expect(h.form(membership.scope).canReload, isFalse);
      await expectLater(actions.submit(), throwsA(isA<ValidationException>()));
      final retry = actions.retry();
      expect(h.repository.writes.last.change, same(original));
      expect(h.repository.writes.last.change.toJson(), wire);
      h.confirm(1, later: true);
      final result = await retry;
      expect(
        result.membershipReviews!.rows.first.facts.accepted!.groupId,
        'tempo',
      );
      expect(
        result.membershipReviews!.rows.first.facts.episodeId,
        'episode:${'f' * 64}',
      );
      expect(h.form(membership.scope).phase, RehearsalMembershipPhase.saved);
    },
  );

  test('a callback can retry before the failed async stack unwinds', () async {
    final current = await h.review();
    final membership = h.row(current);
    final actions = h.editor(current)..select(place);
    Future<EventRehearsalBootstrap>? retry;
    h.container.listen(
      eventRehearsalMembershipControllerProvider(membership.scope),
      (_, next) {
        if (next is RehearsalMembershipForm && next.canRetry && retry == null) {
          retry = actions.retry();
        }
      },
    );
    await h.fail(0, actions.submit());
    expect(h.repository.writes, hasLength(2));
    expect(
      h.repository.writes.last.change,
      same(h.repository.writes.first.change),
    );
    h.confirm(1);
    await retry!;
    expect(h.form(membership.scope).phase, RehearsalMembershipPhase.saved);
  });

  test(
    'an unverified result retains the request rather than showing saved',
    () async {
      final current = await h.review();
      final membership = h.row(current);
      final actions = h.editor(current)..select(place);
      final check = expectLater(actions.submit(), throwsFormatException);
      h.repository.writes.single.result.complete(practiceMembershipSnapshot());
      await check;
      expect(h.form(membership.scope).canRetry, isTrue);
      final retry = actions.retry();
      expect(
        h.repository.writes.last.change,
        same(h.repository.writes.first.change),
      );
      h.confirm(1);
      await retry;
    },
  );

  test(
    'a definitive conflict releases the pending request for a fresh review',
    () async {
      final current = await h.review();
      final membership = h.row(current);
      final actions = h.editor(current)..select(place);
      await h.fail(0, actions.submit(), error: backendError('aborted'));
      expect(
        h.form(membership.scope).phase,
        RehearsalMembershipPhase.refreshRequired,
      );
      await expectLater(actions.retry(), throwsA(isA<ValidationException>()));
      await h.completeRead(1);
      final fresh = h.container.read(h.query).requireValue;
      actions.open(fresh, h.row(fresh));
      actions.select(place);
      final pending = actions.submit();
      expect(
        h.repository.writes.last.change.clientActionId,
        isNot(h.repository.writes.first.change.clientActionId),
      );
      h.confirm(1);
      await pending;
    },
  );

  test('a rate limit cannot erase an earlier uncertain decision', () async {
    final current = await h.review();
    final membership = h.row(current);
    final actions = h.editor(current)..select(place);
    await h.fail(0, actions.submit());
    final original = h.repository.writes.single.change;
    await h.fail(1, actions.retry(), error: backendError('resource-exhausted'));
    expect(h.form(membership.scope).canRetry, isTrue);
    final retry = actions.retry();
    expect(h.repository.writes.last.change, same(original));
    h.confirm(2, later: true);
    await retry;
  });

  test(
    'refresh during submission still accepts the matching receipt',
    () async {
      final current = await h.review();
      final membership = h.row(current);
      final actions = h.editor(current)..select(place);
      final pending = actions.submit();
      h.container.read(h.query.notifier).reload();
      await h.container.pump();
      expect(current.isCurrent, isFalse);
      h.confirm(0);
      await pending;
      expect(h.form(membership.scope).phase, RehearsalMembershipPhase.saved);
    },
  );

  for (final transition in ['signOut', 'switchBack', 'authError']) {
    test(
      'closed pending sheet revokes its request after $transition',
      () async {
        final current = await h.review();
        final membership = h.row(current);
        final provider = eventRehearsalMembershipControllerProvider(
          membership.scope,
        );
        final subscription = h.container.listen(provider, (_, _) {});
        final actions = h.container.read(provider.notifier)
          ..open(current, membership)
          ..select(place);
        await h.fail(0, actions.submit());
        subscription.close();
        await h.container.pump();
        expect(h.container.exists(provider), isTrue);
        switch (transition) {
          case 'switchBack':
            await h.signIn('host-2');
            await h.signIn('host-1');
          case 'authError':
            h.auth.addError(StateError('Authentication unavailable'));
            await h.container.pump();
          case 'signOut':
            await h.signIn(null);
        }
        await h.container.pump();
        h.container.listen(provider, (_, _) {});
        final reopened = h.container.read(provider.notifier);
        expect(
          h.container.read(provider),
          isNot(isA<RehearsalMembershipForm>()),
        );
        await expectLater(
          reopened.retry(),
          throwsA(same(rehearsalReviewSessionChanged)),
        );
        await expectLater(
          actions.submit(),
          throwsA(same(rehearsalReviewSessionChanged)),
        );
        await expectLater(
          actions.retry(),
          throwsA(same(rehearsalReviewSessionChanged)),
        );
        expect(h.repository.writes, hasLength(1));
      },
    );
  }

  for (final outcome in ['success', 'failure']) {
    test(
      'late $outcome cannot restore private state after an account change',
      () async {
        final current = await h.review();
        final membership = h.row(current);
        final actions = h.editor(current)..select(place);
        final pending = actions.submit();
        final check = expectLater(
          pending,
          throwsA(same(rehearsalReviewSessionChanged)),
        );
        await h.signIn(null);
        await h.signIn('host-1');
        if (outcome == 'success') {
          h.confirm(0);
        } else {
          h.repository.writes.single.result.completeError(
            backendError('permission-denied'),
          );
        }
        await check;
        expect(
          h.container.read(
            eventRehearsalMembershipControllerProvider(membership.scope),
          ),
          isNot(isA<RehearsalMembershipForm>()),
        );
        expect(h.repository.writes, hasLength(1));
      },
    );
  }
  test(
    'reset generation gets a distinct controller and cannot replace the old pending request',
    () async {
      final current = await h.review();
      final old = h.row(current);
      final actions = h.editor(current)..select(place);
      await h.fail(0, actions.submit());
      final original = h.repository.writes.single.change;
      final wire = practiceMembershipWire(runtimeRevision: 1, actionCount: 0);
      movementObjectAt(wire, ['session'])['setupRevision'] = 2;
      final reviewWire = wire.remove('membershipReviews');
      final session = EventRehearsalBootstrap.fromCallableData(wire).session;
      (reviewWire as Map<String, Object?>)['clockId'] = rehearsalMovementScope(
        session,
        'event:whole',
      ).clockId;
      wire['membershipReviews'] = reviewWire;
      h.container.read(h.query.notifier).reload();
      await h.container.pump();
      await h.completeRead(
        1,
        snapshot: EventRehearsalBootstrap.fromCallableData(wire),
      );
      final fresh = h.container.read(h.query).requireValue;
      final replacement = h.row(fresh);
      expect(replacement.scope, isNot(old.scope));
      expect(
        EventRehearsalMembershipController.mutationKey(fresh, replacement),
        isNot(EventRehearsalMembershipController.mutationKey(current, old)),
      );
      expect(
        () => actions.open(fresh, replacement),
        throwsA(isA<ValidationException>()),
      );
      expect(h.form(old.scope).change, same(original));
      final next = h.editor(fresh)..select(place);
      final pending = next.submit();
      expect(
        h.repository.writes.last.change.toJson()['expectedSetupRevision'],
        2,
      );
      h.confirm(1);
      await pending;
      await h.fail(2, actions.retry(), error: backendError('aborted'));
      expect(h.repository.writes.last.change, same(original));
      expect(h.form(old.scope).phase, RehearsalMembershipPhase.refreshRequired);
    },
  );
}
