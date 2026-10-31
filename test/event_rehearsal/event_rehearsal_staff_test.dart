import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_checkpoint_request.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_accountability.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_staff_change.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';

Map<String, Object?> sample(String name) =>
    (jsonDecode(
              File(
                'test/event_rehearsal/fixtures/staff_reviews.json',
              ).readAsStringSync(),
            )
            as Map)[name]
        as Map<String, Object?>;
EventRehearsalBootstrap snapshot(String name) =>
    EventRehearsalBootstrap.fromCallableData(sample(name));
const pacer = 'practice-staff:pacer',
    sweep = 'practice-staff:sweep',
    receiver = 'practice-staff:receiver';

void main() {
  final schema = JsonSchema.create(
    contractSchema('ControlEventRehearsalCallablePayload'),
  );
  test('native reads the backend staff, movement and handover lifecycle', () {
    for (final name in [
      'manager',
      'pacer',
      'sweep',
      'sweepDeparted',
      'sweepReported',
      'receiving',
      'sending',
      'accepted',
      'oldGroup',
      'expired',
    ]) {
      final s = snapshot(name);
      expect(s.staffReview!.hostUid, 'host-1', reason: name);
      expect(
        s.staffReview!.groups.keys,
        containsAll(['event:whole', 'easy', 'fast']),
      );
      expect(s.membershipReviews!.rows.length, 2);
    }
    final p = snapshot('pacer');
    expect(p.movementReview!.canConfirm, isTrue);
    expect(p.staffReview!.canAssign, isFalse);
    expect(
      p.membershipReviews!.rows.first.facts.actions,
      contains(AssistanceMembershipAction.propose),
    );
    final tail = snapshot('sweepDeparted');
    expect(tail.movementReview!.canConfirm, isFalse);
    expect(tail.movementReview!.canReport, isTrue);
    expect(tail.membershipReviews!.rows.first.facts.actions, isEmpty);
    expect(
      tail.accountabilityReviews!.rows.first,
      isA<RehearsalActionableAccountability>(),
    );
    expect(
      snapshot(
        'expired',
      ).staffReview!.groups.values.every((g) => g.permissions.isEmpty),
      isTrue,
    );
    expect(
      snapshot('expired').accountabilityReviews!.rows.every(
        (r) => r is RehearsalObservedAccountability,
      ),
      isTrue,
    );
  });
  test('the receiving pacer gains visit scope only after acceptance', () {
    final pending = snapshot('receiving');
    expect(
      pending.membershipReviews!.rows.first.facts.actions,
      containsAll([
        AssistanceMembershipAction.accept,
        AssistanceMembershipAction.reject,
      ]),
    );
    expect(
      pending.accountabilityReviews!.rows.first,
      isA<RehearsalObservedAccountability>(),
    );
    final accepted = snapshot('accepted');
    expect(accepted.accountabilityReviews!.rows.first.groupId, 'fast');
    expect(
      accepted.accountabilityReviews!.rows.first,
      isA<RehearsalActionableAccountability>(),
    );
    expect(
      snapshot('oldGroup').accountabilityReviews!.rows.first,
      isA<RehearsalObservedAccountability>(),
    );
  });
  test('role commands retain scope and match the generated callable union', () {
    final s = snapshot('sweepDeparted');
    final movement = RehearsalMovementChange(
      command: RehearsalRecordCheckpoint(
        snapshot: s.movementReview!,
        observation: AssistanceCheckpointObservation(['actor-01']),
      ),
      clientActionId: 'practice_report',
    );
    final visit = RehearsalAssistanceChange(
      snapshot: s,
      command: RehearsalResolveAccountability(
        snapshot:
            s.accountabilityReviews!.rows.first
                as RehearsalActionableAccountability,
        disposition: AssistanceVisitDisposition.departed,
      ),
      clientActionId: 'practice_visit',
    );
    final receiving = snapshot('receiving');
    final transfer = RehearsalAssistanceChange(
      snapshot: receiving,
      command: RehearsalTransferGroup(
        snapshot: receiving.membershipReviews!.rows.first,
        decision: const AssistanceAcceptGroup(),
      ),
      clientActionId: 'practice_accept',
    );
    for (final wire in [movement.toJson(), visit.toJson(), transfer.toJson()]) {
      expect(schema.validate(wire).isValid, isTrue, reason: '$wire');
      expect(wire['practiceOperatorId'], isNotNull);
    }
    expect(visit.toJson()['assistance'], containsPair('groupId', 'easy'));
    expect(transfer.toJson()['practiceOperatorId'], receiver);
    expect(
      () => RehearsalConfirmDeparture(
        snapshot: s.movementReview!,
        destination: s.movementReview!.destinations.first.target,
      ),
      throwsFormatException,
    );
    expect(
      () => RehearsalManageCheckpoint(
        snapshot: s.movementReview!,
        decision: ReassignCheckpointReporter(
          reporterId: pacer,
          reason: 'Change the reporter',
        ),
      ),
      throwsFormatException,
    );
    expect(
      () => RehearsalAssistanceChange(
        snapshot: s,
        command: RehearsalPauseAutomation(actorId: s.actors.first.actorId),
        clientActionId: 'practice_message',
      ),
      throwsFormatException,
    );
  });
  test('a receiving operator must cover the specific target group', () {
    final s = snapshot('pacer');
    expect(
      () => RehearsalTransferGroup(
        snapshot: s.membershipReviews!.rows.first,
        decision: const AssistanceProposeGroup(
          groupId: 'fast',
          receivingOperatorId: pacer,
          expiresAt: 61000,
        ),
      ),
      throwsFormatException,
    );
  });
  test('the full staff roster fits the native reader and response schema', () {
    final raw = sample('fullStaff');
    final full = EventRehearsalBootstrap.fromCallableData(raw);
    expect(full.staffReview!.operators.length, 50);
    expect(full.membershipReviews!.rows.first.receivingOperatorIds.length, 52);
    final properties =
        contractSchema('EventRehearsalBootstrapCallableResponse')['properties']
            as Map;
    final membershipSchema = JsonSchema.create(properties['membershipReviews']);
    expect(membershipSchema.validate(raw['membershipReviews']).isValid, isTrue);
  });
  test('a reporter needs duty strictly beyond the departure deadline', () {
    final r = snapshot('manager').movementReview!;
    RehearsalConfirmDeparture confirm(int dueAt) => RehearsalConfirmDeparture(
      snapshot: r,
      destination: r.destinations.first.target,
      roster: EventAssistanceDepartureRosterSelection(
        r.candidates.map((m) => m.attendeeId),
      ),
      checkpoint: AssistanceDepartureCheckpointRequest(
        responsibleOperatorId: sweep,
        dueAt: dueAt,
      ),
    );
    expect(() => confirm(3601000), throwsFormatException);
    expect(
      schema
          .validate(
            RehearsalMovementChange(
              command: confirm(3600999),
              clientActionId: 'practice_departure',
            ).toJson(),
          )
          .isValid,
      isTrue,
    );
  });
  test(
    'a practiced pacer may take reporting responsibility but cannot delegate',
    () {
      final r = snapshot('pacer').movementReview!;
      RehearsalConfirmDeparture confirm(String reporter) =>
          RehearsalConfirmDeparture(
            snapshot: r,
            destination: r.destinations.first.target,
            roster: EventAssistanceDepartureRosterSelection(
              r.candidates.map((m) => m.attendeeId),
            ),
            checkpoint: AssistanceDepartureCheckpointRequest(
              responsibleOperatorId: reporter,
              dueAt: 61000,
            ),
          );
      expect(() => confirm(sweep), throwsFormatException);
      expect(
        schema
            .validate(
              RehearsalMovementChange(
                command: confirm(pacer),
                clientActionId: 'practice_departure',
              ).toJson(),
            )
            .isValid,
        isTrue,
      );
    },
  );
  test('staff identity, expiry and permissions cannot drift independently', () {
    for (final damage in <void Function(Map<String, Object?>)>[
      (m) => m['actorUid'] = 'host-1',
      (m) => m['practiceOperatorId'] = 'host-1',
      (m) => m['clockId'] = 'clock:${'f' * 64}',
      (m) => m['canAssign'] = true,
      (m) => staffList(m, ['groups', 1, 'permissions']).add('confirmDeparture'),
      (m) => staffObject(m, ['groups', 1])['validUntil'] = 0,
      (m) => staffList(m, ['groups']).removeLast(),
      (m) => staffList(m, ['operators']).add(staffList(m, ['operators'])[0]),
      (m) => staffDuty(m, sweep)['expiresAtMillis'] = 1000,
    ]) {
      final raw = sample('sweep');
      damage(raw['staffReview'] as Map<String, Object?>);
      expect(
        () => EventRehearsalBootstrap.fromCallableData(raw),
        throwsFormatException,
      );
    }
    final badVisit = sample('receiving');
    staffObject(badVisit, ['accountabilityReviews', 'rows', 0])['canResolve'] =
        true;
    expect(
      () => EventRehearsalBootstrap.fromCallableData(badVisit),
      throwsFormatException,
    );
    final badMembership = sample('sweep');
    staffObject(badMembership, ['membershipReviews', 'rows', 0])['actions'] = [
      'propose',
    ];
    expect(
      () => EventRehearsalBootstrap.fromCallableData(badMembership),
      throwsFormatException,
    );
  });
  test(
    'movement lookup keys include the practice role and verify the real Host',
    () {
      final s = snapshot('sweep');
      final r = s.movementReview!;
      final manager = RehearsalMovementSelection(scope: r.scope);
      expect(r.selection, isNot(manager));
      expect(r.selection.practiceOperatorId, sweep);
      final raw = sample('sweep')['movementReview'];
      expect(
        RehearsalMovementReview.fromJson(
          raw,
          session: s.session,
          actors: s.actors,
          selection: r.selection,
          expectedActorUid: 'host-1',
        ).hostUid,
        'host-1',
      );
      expect(
        () => RehearsalMovementReview.fromJson(
          raw,
          session: s.session,
          actors: s.actors,
          selection: manager,
          expectedActorUid: 'host-1',
        ),
        throwsFormatException,
      );
      expect(
        () => RehearsalMovementReview.fromJson(
          raw,
          session: s.session,
          actors: s.actors,
          selection: r.selection,
          expectedActorUid: sweep,
        ),
        throwsFormatException,
      );
      final reported = sample('sweepReported');
      final change = RehearsalMovementChange(
        command: RehearsalRecordCheckpoint(
          snapshot: snapshot('sweepDeparted').movementReview!,
          observation: AssistanceCheckpointObservation(['actor-01']),
        ),
        clientActionId: 'practice_report',
      );
      reported['actions'] = [
        {
          'clientActionId': 'practice_report',
          'actorId': null,
          'kind': 'control',
          'name': 'movement:recordCheckpoint',
          'runtimeRevision': change.snapshot.session.runtimeRevision + 1,
          'virtualNowMillis': change.snapshot.serverTime,
        },
      ];
      change.requireResult(EventRehearsalBootstrap.fromCallableData(reported));
      expect(
        () => change.requireResult(snapshot('manager')),
        throwsFormatException,
      );
    },
  );
  test('staff configuration uses live decisions and the rehearsal window', () {
    final staff = snapshot('manager').staffReview!;
    final change = RehearsalStaffChange(
      snapshot: staff,
      operatorId: 'practice-staff:new',
      displayName: '  New sweep  ',
      groupId: 'fast',
      clientActionId: 'practice_assign',
      decision: const AssistanceAssignGroupDuty(
        duty: AssistanceGroupDuty.sweep,
        expiresAt: 61000,
      ),
    );
    expect(change.displayName, 'New sweep');
    expect(schema.validate(change.toJson()).isValid, isTrue);
    final removal = RehearsalStaffChange(
      snapshot: staff,
      operatorId: sweep,
      displayName: 'Sweep',
      groupId: 'easy',
      clientActionId: 'practice_remove',
      decision: const AssistanceRemoveGroupDuty(),
    );
    expect(schema.validate(removal.toJson()).isValid, isTrue);
    expect(
      () => RehearsalStaffChange(
        snapshot: snapshot('sweep').staffReview!,
        operatorId: sweep,
        displayName: 'Sweep',
        groupId: 'easy',
        clientActionId: 'practice_remove',
        decision: const AssistanceRemoveGroupDuty(),
      ),
      throwsFormatException,
    );
    for (final (group, duty, expiry) in [
      ('event:whole', AssistanceGroupDuty.pacer, 61000),
      ('fast', AssistanceGroupDuty.lead, 1000),
      ('fast', AssistanceGroupDuty.lead, 86400000),
    ]) {
      expect(
        () => RehearsalStaffChange(
          snapshot: staff,
          operatorId: sweep,
          displayName: 'Sweep',
          groupId: group,
          clientActionId: 'practice_assign',
          decision: AssistanceAssignGroupDuty(duty: duty, expiresAt: expiry),
        ),
        throwsFormatException,
      );
    }
  });
  test('checkpoint closeout belongs to the named reporter or the Host', () {
    final tail = snapshot('sweepCanClose').movementReview!;
    expect(
      RehearsalManageCheckpoint(
        snapshot: tail,
        decision: CloseCheckpointRequest('Remaining guest departed'),
      ).kind,
      'setCheckpointCloseout',
    );
    expect(
      () => RehearsalManageCheckpoint(
        snapshot: snapshot('pacerCannotClose').movementReview!,
        decision: CloseCheckpointRequest('Remaining guest departed'),
      ),
      throwsFormatException,
    );
  });
  test('staff receipts bind the exact edit and preserve later removals', () {
    final before = snapshot('beforeStaffEdit').staffReview!;
    final change = RehearsalStaffChange(
      snapshot: before,
      operatorId: 'practice-staff:new',
      displayName: 'new',
      groupId: 'fast',
      clientActionId: 'practice_assign',
      decision: const AssistanceAssignGroupDuty(
        duty: AssistanceGroupDuty.sweep,
        expiresAt: 3601000,
      ),
    );
    Map<String, Object?> result(String name, RehearsalStaffChange change) {
      final raw = sample(name);
      raw['actions'] = [
        {
          'clientActionId': change.clientActionId,
          'actorId': null,
          'kind': 'control',
          'name':
              'staff:${change.decision is AssistanceAssignGroupDuty ? 'assign' : 'remove'}',
          'runtimeRevision': change.snapshot.session.runtimeRevision + 1,
          'virtualNowMillis': change.snapshot.serverTime,
        },
      ];
      return raw;
    }

    change.requireResult(
      EventRehearsalBootstrap.fromCallableData(result('staffAssigned', change)),
    );
    final replay = EventRehearsalBootstrap.fromCallableData(
      result('staffRemoved', change),
    );
    change.requireResult(replay);
    expect(
      replay.staffReview!.operators['practice-staff:new']!.duties,
      isEmpty,
    );
    final remove = RehearsalStaffChange(
      snapshot: snapshot('staffAssigned').staffReview!,
      operatorId: 'practice-staff:new',
      displayName: 'new',
      groupId: 'fast',
      clientActionId: 'practice_remove',
      decision: const AssistanceRemoveGroupDuty(),
    );
    remove.requireResult(
      EventRehearsalBootstrap.fromCallableData(result('staffRemoved', remove)),
    );
    for (final damage in <void Function(Map<String, Object?>)>[
      (m) =>
          staffObject(m, ['actions', 0])['clientActionId'] = 'foreign_request',
      (m) => staffObject(m, ['actions', 0])['name'] = 'staff:remove',
      (m) => staffDuty(
        staffObject(m, ['staffReview']),
        'practice-staff:new',
      )['expiresAtMillis'] = 3601001,
      (m) =>
          staffOperator(staffObject(m, ['staffReview']), pacer)['displayName'] =
              'Unrelated edit',
    ]) {
      final raw = result('staffAssigned', change);
      damage(raw);
      expect(
        () =>
            change.requireResult(EventRehearsalBootstrap.fromCallableData(raw)),
        throwsFormatException,
      );
    }
  });
}

Object? staffAt(Object? raw, List<Object> path) {
  for (final key in path) {
    raw = key is String
        ? (raw as Map<String, Object?>)[key]
        : (raw as List<Object?>)[key as int];
  }
  return raw;
}

Map<String, Object?> staffObject(Object? raw, List<Object> path) =>
    staffAt(raw, path) as Map<String, Object?>;
List<Object?> staffList(Object? raw, List<Object> path) =>
    staffAt(raw, path) as List<Object?>;
Map<String, Object?> staffOperator(Map<String, Object?> raw, String id) =>
    staffList(raw, [
      'operators',
    ]).cast<Map<String, Object?>>().singleWhere((o) => o['operatorId'] == id);
Map<String, Object?> staffDuty(Map<String, Object?> raw, String id) =>
    (staffOperator(raw, id)['duties'] as List<Object?>).first
        as Map<String, Object?>;
