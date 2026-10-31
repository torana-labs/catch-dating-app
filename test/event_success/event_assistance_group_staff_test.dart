import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff_change.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';
import 'event_assistance_group_staff_fixtures.dart';

void main() {
  Map<String, Object?> body(Map<String, Object?> wire) =>
      wire['view']! as Map<String, Object?>;
  final responseSchema = JsonSchema.create(
    contractSchema('EventAssistanceGroupStaffCallableResponse'),
  );
  final commandSchema = JsonSchema.create(
    contractSchema('SetEventAssistanceGroupStaffCallablePayload'),
  );

  test(
    'all canonical duty, status, outcome and decision variants are accounted for',
    () {
      final properties =
          contractSchema(
                'EventAssistanceGroupStaffCallableResponse',
              )['properties']!
              as Map;
      final view = (properties['view']! as Map)['properties']! as Map;
      expect(
        ((view['status']! as Map)['enum']! as List).toSet(),
        AssistanceGroupStaffStatus.values.map((v) => v.name).toSet(),
      );
      expect(
        (((view['availableDuties']! as Map)['items']! as Map)['enum']! as List)
            .toSet(),
        AssistanceGroupDuty.values.map((v) => v.name).toSet(),
      );
      expect(
        ((properties['outcome']! as Map)['enum']! as List).toSet(),
        AssistanceGroupStaffOutcome.values.map((v) => v.name).toSet(),
      );
      final command =
          contractSchema(
                'SetEventAssistanceGroupStaffCallablePayload',
              )['properties']!
              as Map;
      expect(
        ((command['decision']! as Map)['oneOf']! as List)
            .map(
              (v) =>
                  (((v as Map)['properties'] as Map)['kind'] as Map)['const'],
            )
            .toSet(),
        {'assign', 'remove'},
      );
    },
  );

  test(
    'lookup has explicit country code, stable equality and a redacted label',
    () {
      final formatted = EventAssistanceGroupStaffLookup(
        group: staffGroup,
        phoneNumber: '+91 (98765) 43210',
      );
      expect(formatted, staffLookup);
      expect(formatted.hashCode, staffLookup.hashCode);
      expect(formatted.toString(), contains('3210'));
      expect(formatted.toString(), isNot(contains('98765')));
      for (final phone in [
        '9876543210',
        '+00012345678',
        '+919876543210 extension 5',
        '+12',
        '+919876543210;',
      ]) {
        expect(
          () => EventAssistanceGroupStaffLookup(
            group: staffGroup,
            phoneNumber: phone,
          ),
          throwsFormatException,
        );
      }
    },
  );

  test(
    'current authority is separate from removable historical duty evidence',
    () {
      for (final status in AssistanceGroupStaffStatus.values) {
        final wire = staffWire(status: status.name);
        expect(responseSchema.validate(wire).isValid, isTrue);
        final view = staffResult(wire).view;
        expect(view.canRemove, status != AssistanceGroupStaffStatus.none);
        expect(
          view.currentDuty != null,
          status == AssistanceGroupStaffStatus.assigned,
        );
        expect(view.operatorExpiresAt, isNull);
      }
      final unconfigured = staffWire(status: 'sourceChanged');
      body(
        unconfigured,
      ).addAll({'availableDuties': <String>[], 'canAssign': false});
      expect(staffResult(unconfigured).view.canRemove, isTrue);
      final ended = staffWire(status: 'assigned');
      body(ended)['canAssign'] = false;
      expect(staffResult(ended).view.currentDuty, isNotNull);
    },
  );

  test('cross-scope, contradictory and malformed responses fail closed', () {
    final changes = <void Function(Map<String, Object?>)>[
      (v) => v['uid'] = '',
      (v) => v['phoneLastFour'] = '9999',
      (v) => v['groupId'] = 'tempo',
      (v) => v['context'] = {...staffGroup.context, 'mode': 'rehearsal'},
      (v) => v['revision'] = 1.5,
      (v) => v.remove('canAssign'),
      (v) => v['extra'] = true,
      (v) => v['availableDuties'] = ['lead', 'lead'],
      (v) => v['availableDuties'] = ['pacer'],
      (v) => v['status'] = 'none',
      (v) => v['duty'] = null,
      (v) => v['revision'] = 0,
      (v) => v['sourceHash'] = 'invalid',
      (v) => (v['duty']! as Map)['expiresAtMillis'] = 1000,
      (v) => (v['duty']! as Map)['grantedAtMillis'] = 1001,
      (v) => (v['duty']! as Map)['groupId'] = 'other',
      (v) => (v['duty']! as Map)['sourceHash'] = 'b' * 64,
      (v) => (v['duty']! as Map)['duty'] = 'organizer',
    ];
    for (final mutate in changes) {
      final wire = staffWire(status: 'assigned');
      mutate(body(wire));
      expect(() => staffResult(wire), throwsFormatException);
    }
  });

  test(
    'every available assignment and historical removal satisfies canonical wire contracts',
    () {
      final decisions = <AssistanceGroupStaffDecision>[
        for (final role in AssistanceGroupDuty.values)
          AssistanceAssignGroupDuty(duty: role, expiresAt: 8000),
        const AssistanceRemoveGroupDuty(),
      ];
      for (final decision in decisions) {
        final change = staffChange(
          view: staffView(status: 'assigned'),
          decision: decision,
        );
        expect(commandSchema.validate(change.toJson()).isValid, isTrue);
        final wire = staffAppliedWire(change);
        expect(responseSchema.validate(wire).isValid, isTrue);
        change.requireResult(staffResult(wire));
        final payload = change.toJson();
        (payload['decision']! as Map)['kind'] = 'grantEverything';
        expect(change.toJson()['decision'], isNot(payload['decision']));
      }
      for (final status in ['expired', 'revoked', 'sourceChanged']) {
        final change = staffChange(
          view: staffView(status: status),
          decision: const AssistanceRemoveGroupDuty(),
        );
        change.requireResult(staffResult(staffAppliedWire(change)));
      }
    },
  );

  test(
    'pacer is restricted to pace groups; unavailable, absent and expired choices cannot submit',
    () {
      final whole = EventAssistanceGroupStaffLookup(
        group: EventAssistanceGroupScope(
          organizerId: 'org-1',
          eventId: 'event-1',
          groupId: 'event:whole',
        ),
        phoneNumber: staffLookup.phoneNumber,
      );
      final view = staffResult(staffWire(lookup: whole), lookup: whole).view;
      expect(
        () => staffChange(
          view: view,
          decision: const AssistanceAssignGroupDuty(
            duty: AssistanceGroupDuty.pacer,
            expiresAt: 9000,
          ),
        ),
        throwsFormatException,
      );
      for (final expiry in [-1, 1000, 1209601001]) {
        expect(
          () => staffChange(
            decision: AssistanceAssignGroupDuty(
              duty: AssistanceGroupDuty.lead,
              expiresAt: expiry,
            ),
          ),
          throwsFormatException,
        );
      }
      expect(
        () => staffChange(decision: const AssistanceRemoveGroupDuty()),
        throwsFormatException,
      );
      final ended = staffWire()
        ..['view'] = {...body(staffWire()), 'canAssign': false};
      expect(
        () => staffChange(view: staffResult(ended).view),
        throwsFormatException,
      );
    },
  );

  test(
    'applied results prove selected duty, verified UID and unchanged operator access',
    () {
      final source = staffWire(status: 'assigned', operatorExpiry: 5000);
      final change = staffChange(view: staffResult(source).view);
      change.requireResult(staffResult(staffAppliedWire(change)));
      final mutations = <void Function(Map<String, Object?>)>[
        (w) => w['outcome'] = 'read',
        (w) => w['operationRevision'] = 3,
        (w) => body(w)['revision'] = 5,
        (w) => body(w)['uid'] = 'new-owner-of-phone',
        (w) => body(w)['operatorExpiresAtMillis'] = 9000,
        (w) => body(w)['operatorExpiresAtMillis'] = null,
        (w) => (body(w)['duty']! as Map)['duty'] = 'sweep',
        (w) => (body(w)['duty']! as Map)['grantedBy'] = 'other-manager',
        (w) => (body(w)['duty']! as Map)['grantedAtMillis'] = 1900,
        (w) => (body(w)['duty']! as Map)['expiresAtMillis'] = 8500,
      ];
      for (final mutate in mutations) {
        final wire = staffAppliedWire(change);
        mutate(wire);
        expect(
          () => change.requireResult(staffResult(wire)),
          throwsFormatException,
        );
      }
      final expiring = staffWire(status: 'assigned', operatorExpiry: 1500);
      final timedChange = staffChange(view: staffResult(expiring).view);
      final response = staffResult(staffAppliedWire(timedChange));
      timedChange.requireResult(response);
      expect(response.view.operatorExpiresAt, isNull);
    },
  );

  test(
    'replay keeps later current facts instead of restoring the original duty',
    () {
      final change = staffChange();
      for (final status in ['none', 'expired', 'revoked', 'sourceChanged']) {
        final wire = staffWire(status: status)
          ..addAll({'outcome': 'replayed', 'operationRevision': 1});
        body(wire).addAll({'revision': 6, 'serverTime': 3000});
        final replay = staffResult(wire);
        change.requireResult(replay);
        expect(replay.view.currentDuty, isNull);
        final foreign = (jsonDecode(jsonEncode(wire)) as Map)
            .cast<String, Object?>();
        body(foreign)['sourceHash'] = 'c' * 64;
        expect(
          () => change.requireResult(staffResult(foreign)),
          throwsFormatException,
        );
      }
    },
  );
}
