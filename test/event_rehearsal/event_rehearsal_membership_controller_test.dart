import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_editor.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_membership_controller.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_membership_controller_harness.dart';
import 'event_rehearsal_membership_fixtures.dart';
import 'event_rehearsal_movement_fixtures.dart';

void main() {
  late RehearsalMembershipHarness h;
  setUp(() => h = RehearsalMembershipHarness());
  tearDown(() => h.dispose());
  for (final (state, uid, decision) in [
    ('uninitialized', 'host-1', const AssistancePlaceGroup('easy')),
    (
      'current',
      'host-1',
      const AssistanceProposeGroup(
        groupId: 'tempo',
        receivingOperatorId: 'host-2',
        expiresAt: 5000,
      ),
    ),
    ('pending', 'host-2', const AssistanceAcceptGroup()),
    ('pending', 'host-2', const AssistanceRejectGroup()),
    ('pending', 'host-1', const AssistanceCancelGroup()),
    ('current', 'host-1', const AssistanceLeaveGroup()),
  ]) {
    test(
      '${decision.action.name} freezes its reviewed decision and verifies the exact receipt',
      () async {
        final current = await h.review(state: state, uid: uid);
        final membership = h.row(current);
        final actions = h.editor(current);
        expect(h.form(membership.scope).canSubmit, isFalse);
        actions.select(decision);
        expect(h.form(membership.scope).canSubmit, isTrue);
        final selected = h.form(membership.scope).change!;
        expect(
          (selected.command as RehearsalTransferGroup).snapshot,
          same(membership),
        );
        expect(
          (selected.command as RehearsalTransferGroup).decision,
          same(decision),
        );
        final pending = actions.submit();
        actions.select(null);
        expect(actions.submit(), same(pending));
        expect(actions.retry(), same(pending));
        expect(h.form(membership.scope).change, same(selected));
        expect(h.form(membership.scope).canDismiss, isFalse);
        expect(h.repository.writes.single.change, same(selected));
        h.confirm(0);
        final result = await pending;
        expect(h.form(membership.scope).phase, RehearsalMembershipPhase.saved);
        expect(await actions.submit(), same(result));
        expect(h.repository.writes, hasLength(1));
        if (decision is AssistanceProposeGroup ||
            decision is AssistanceRejectGroup ||
            decision is AssistanceCancelGroup) {
          expect(
            result.membershipReviews!.rows.first.facts.accepted,
            membership.facts.accepted,
          );
        }
        if (decision is AssistanceAcceptGroup) {
          expect(
            result.membershipReviews!.rows.first.facts.accepted!.groupId,
            'tempo',
          );
        }
        if (decision is AssistanceLeaveGroup) {
          expect(result.membershipReviews!.rows.first.facts.accepted, isNull);
        }
      },
    );
  }

  test(
    'reentrant state callbacks cannot submit a second group decision',
    () async {
      final current = await h.review();
      final membership = h.row(current);
      final actions = h.editor(current)
        ..select(const AssistancePlaceGroup('easy'));
      Future<EventRehearsalBootstrap>? reentrant;
      h.container.listen(
        eventRehearsalMembershipControllerProvider(membership.scope),
        (_, next) {
          if (next is RehearsalMembershipForm &&
              next.phase == RehearsalMembershipPhase.submitting) {
            actions.select(const AssistancePlaceGroup('tempo'));
            reentrant = actions.submit();
          }
        },
      );
      final pending = actions.submit();
      expect(reentrant, same(pending));
      expect(h.repository.writes, hasLength(1));
      expect(
        ((h.repository.writes.single.change.command as RehearsalTransferGroup)
                    .decision
                as AssistancePlaceGroup)
            .groupId,
        'easy',
      );
      h.confirm(0);
      await pending;
    },
  );

  test(
    'invalid receiver, destination and deadline clear selection without dispatch',
    () async {
      final current = await h.review(state: 'current');
      final membership = h.row(current);
      final actions = h.editor(current);
      for (final decision in [
        const AssistanceProposeGroup(
          groupId: 'tempo',
          receivingOperatorId: 'unknown',
          expiresAt: 2000,
        ),
        const AssistanceProposeGroup(
          groupId: 'foreign',
          receivingOperatorId: 'host-2',
          expiresAt: 2000,
        ),
        const AssistanceProposeGroup(
          groupId: 'tempo',
          receivingOperatorId: 'host-2',
          expiresAt: 1000,
        ),
        const AssistanceProposeGroup(
          groupId: 'tempo',
          receivingOperatorId: 'host-2',
          expiresAt: 1801001,
        ),
        const AssistanceAcceptGroup(),
      ]) {
        actions.select(decision);
        expect(h.form(membership.scope).error, isA<FormatException>());
        expect(h.form(membership.scope).canSubmit, isFalse);
        expect(h.form(membership.scope).change, isNull);
      }
      expect(h.repository.writes, isEmpty);
    },
  );

  test(
    'rows from another snapshot and the generic editor cannot bypass membership review',
    () async {
      final current = await h.review();
      final membership = h.row(current);
      final actions = h.editor(current);
      expect(
        () => actions.open(
          current,
          practiceMembershipSnapshot().membershipReviews!.rows.first,
        ),
        throwsA(isA<ValidationException>()),
      );
      expect(
        () => actions.open(current, h.row(current, 1)),
        throwsA(isA<ValidationException>()),
      );
      final generic = eventRehearsalAssistanceEditorProvider(
        current.snapshot.session.id,
      );
      h.container.listen(generic, (_, _) {});
      h.container.read(generic.notifier).open(current);
      h.container
          .read(generic.notifier)
          .select(
            RehearsalTransferGroup(
              snapshot: membership,
              decision: const AssistancePlaceGroup('easy'),
            ),
          );
      expect(
        (h.container.read(generic) as RehearsalAssistanceForm).change,
        isNull,
      );
      expect(
        (h.container.read(generic) as RehearsalAssistanceForm).error,
        isA<ValidationException>(),
      );
      expect(h.repository.writes, isEmpty);
    },
  );

  test(
    'a receiver-specific projection from another account cannot be opened',
    () async {
      await h.signIn('host-1');
      await h.completeRead(
        0,
        snapshot: practiceMembershipSnapshot(state: 'pending', uid: 'host-2'),
      );
      final current = h.container.read(h.query).requireValue;
      expect(() => h.editor(current), throwsA(isA<ValidationException>()));
      expect(h.repository.writes, isEmpty);
    },
  );

  test('unavailable membership exposes no executable selection', () async {
    await h.signIn('host-1');
    await h.completeRead(
      0,
      snapshot: EventRehearsalBootstrap.fromCallableData(
        practiceMembershipWire(
          row: {
            ...practiceMembershipRow(),
            'availability': 'participationNotRecorded',
            'episodeId': null,
            'ready': false,
            'actions': <String>[],
          },
        ),
      ),
    );
    final current = h.container.read(h.query).requireValue;
    final membership = h.row(current);
    final actions = h.editor(current)
      ..select(const AssistancePlaceGroup('easy'));
    expect(h.form(membership.scope).canSelect, isFalse);
    expect(h.form(membership.scope).canReload, isTrue);
    await expectLater(actions.submit(), throwsA(isA<ValidationException>()));
    expect(h.repository.writes, isEmpty);
  });

  test('refresh fences first submission and stale selection', () async {
    final current = await h.review();
    final membership = h.row(current);
    final actions = h.editor(current)
      ..select(const AssistancePlaceGroup('easy'));
    h.container.read(h.query.notifier).reload();
    await h.container.pump();
    await expectLater(actions.submit(), throwsA(isA<ValidationException>()));
    expect(
      h.form(membership.scope).phase,
      RehearsalMembershipPhase.refreshRequired,
    );
    actions.select(const AssistancePlaceGroup('tempo'));
    expect(h.form(membership.scope).canSubmit, isFalse);
    expect(h.repository.writes, isEmpty);
  });

  test('pending and error state is independent for each guest', () async {
    final current = await h.review();
    final one = h.row(current), two = h.row(current, 1);
    final first = h.editor(current)..select(const AssistancePlaceGroup('easy'));
    final second = h.editor(current, 1)
      ..select(const AssistancePlaceGroup('tempo'));
    expect(EventRehearsalMembershipController.mutationKey(current, one), (
      scope: one.scope,
      account: current.account,
    ));
    expect(
      EventRehearsalMembershipController.mutationKey(current, one),
      isNot(EventRehearsalMembershipController.mutationKey(current, two)),
    );
    final a = first.submit();
    expect(h.form(two.scope).canSubmit, isTrue);
    final b = second.submit();
    expect(h.repository.writes.map((w) => w.change.command.actorId), [
      'actor-01',
      'actor-02',
    ]);
    await h.fail(0, a);
    expect(h.form(one.scope).canRetry, isTrue);
    expect(h.form(two.scope).phase, RehearsalMembershipPhase.submitting);
    h.confirm(1);
    await b;
    expect(h.form(two.scope).phase, RehearsalMembershipPhase.saved);
    expect(h.form(one.scope).canRetry, isTrue);
  });
  test(
    'completion retains explicit group cleanup without permitting a new placement',
    () async {
      final wire = practiceMembershipWire(state: 'current');
      movementObjectAt(wire, ['session'])['status'] = 'complete';
      for (final row in movementListAt(wire, ['membershipReviews', 'rows'])) {
        (row as Map<String, Object?>).addAll({
          'ready': false,
          'actions': <String>[],
        });
      }
      movementObjectAt(wire, ['membershipReviews', 'rows', 0])['actions'] = [
        'leave',
      ];
      await h.signIn('host-1');
      await h.completeRead(
        0,
        snapshot: EventRehearsalBootstrap.fromCallableData(wire),
      );
      final current = h.container.read(h.query).requireValue;
      final membership = h.row(current);
      final actions = h.editor(current)
        ..select(const AssistancePlaceGroup('tempo'));
      expect(h.form(membership.scope).canSubmit, isFalse);
      actions.select(const AssistanceLeaveGroup());
      expect(h.form(membership.scope).canSubmit, isTrue);
      final pending = actions.submit();
      h.confirm(0);
      final result = await pending;
      expect(result.session.status, EventRehearsalStatus.complete);
      expect(result.membershipReviews!.rows.first.facts.accepted, isNull);
    },
  );
}
