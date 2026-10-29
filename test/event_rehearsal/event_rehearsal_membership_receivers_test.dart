import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_membership_change.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_membership_receivers.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final fixtures =
      jsonDecode(
            File(
              'test/event_rehearsal/fixtures/staff_reviews.json',
            ).readAsStringSync(),
          )
          as Map;
  EventRehearsalBootstrap snapshot(String name) =>
      EventRehearsalBootstrap.fromCallableData(fixtures[name]);
  test(
    'real backend role fixtures supply only valid named receiving choices',
    () {
      for (final name in [
        'manager',
        'pacer',
        'sending',
        'accepted',
        'fullStaff',
      ]) {
        final value = snapshot(name);
        final row = value.membershipReviews!.rows.first;
        final choices = rehearsalMembershipReceivers(value.session, row);
        if (name == 'sending') {
          expect(choices, isNull);
          continue;
        }
        expect(choices, isNotNull, reason: name);
        for (final receiver in choices!.receivers) {
          for (final group in receiver.groups.entries) {
            expect(group.value, greaterThan(row.facts.serverTime));
            expect(group.value, lessThanOrEqualTo(choices.expiresAt));
            if (group.key == row.facts.accepted?.groupId) continue;
            RehearsalTransferGroup(
              snapshot: row,
              decision: AssistanceProposeGroup(
                groupId: group.key,
                receivingOperatorId: receiver.operatorId,
                expiresAt: group.value,
              ),
            );
          }
        }
        if (name == 'manager') {
          expect(
            choices.receivers.map((r) => r.operatorId),
            isNot(contains('practice-staff:sweep')),
          );
          expect(
            choices.receivers
                .firstWhere((r) => r.operatorId == 'practice-staff:receiver')
                .displayName,
            isNotEmpty,
          );
        }
      }
      for (final name in ['sweep', 'expired', 'receiving']) {
        final value = snapshot(name);
        expect(
          rehearsalMembershipReceivers(
            value.session,
            value.membershipReviews!.rows.first,
          ),
          isNull,
        );
      }
    },
  );
  test('another review time cannot supply practice receiving choices', () {
    expect(
      () => rehearsalMembershipReceivers(
        snapshot('expired').session,
        snapshot('manager').membershipReviews!.rows.first,
      ),
      throwsFormatException,
    );
  });
}
