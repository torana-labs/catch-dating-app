import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/events/presentation/event_detail_information_state.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events_test_helpers.dart';

final _l10n = AppLocalizationsEn();

void main() {
  test('resolves each Event Detail fact into exactly one section', () {
    final state = eventDetailInformationStateFrom(
      event: buildEvent(),
      l10n: _l10n,
    );

    final allKinds = [
      ...state.signUpRows.map((row) => row.kind),
      ...state.goodToKnowRows.map((row) => row.kind),
    ];

    expect(allKinds.toSet(), hasLength(allKinds.length));
    expect(
      state.signUpRows.map((row) => row.kind),
      containsAll(<EventDetailFactKind>[
        EventDetailFactKind.admission,
        EventDetailFactKind.waitlist,
      ]),
    );
    expect(
      state.goodToKnowRows.map((row) => row.kind),
      containsAll(<EventDetailFactKind>[
        EventDetailFactKind.experience,
        EventDetailFactKind.attendance,
        EventDetailFactKind.cancellation,
      ]),
    );
    expect(
      [
        ...state.signUpRows,
        ...state.goodToKnowRows,
      ].map((row) => '${row.title} ${row.body}'.toLowerCase()).join(' '),
      isNot(contains('clawback')),
    );
  });

  test('caps sign-up facts at admission, waitlist, and variable pricing', () {
    final state = eventDetailInformationStateFrom(
      event: buildEvent(
        eventPolicy: EventPolicyBundle.demandPricedBalancedSinglesEvent(
          capacityLimit: 16,
          basePriceInPaise: 12000,
          stepAdjustmentInPaise: 1000,
          maxAdjustmentInPaise: 3000,
        ),
      ),
      l10n: _l10n,
    );

    expect(state.signUpRows, hasLength(3));
    expect(state.signUpRows.map((row) => row.kind), [
      EventDetailFactKind.admission,
      EventDetailFactKind.waitlist,
      EventDetailFactKind.pricing,
    ]);
  });

  test('waitlist copy follows the configured mode', () {
    EventPolicyBundle policyFor(EventWaitlistMode mode) => EventPolicyBundle(
      admissionPolicy: EventAdmissionPolicy.open(
        capacityLimit: 12,
        waitlistPolicy: EventWaitlistPolicy(mode: mode),
      ),
      pricingPolicy: const EventPricingPolicy.fixed(MoneyAmount.inPaise(0)),
    );

    final broadcast = eventDetailInformationStateFrom(
      event: buildEvent(
        eventPolicy: policyFor(EventWaitlistMode.broadcastFirstComeFirstServed),
      ),
      l10n: _l10n,
    );
    final manual = eventDetailInformationStateFrom(
      event: buildEvent(eventPolicy: policyFor(EventWaitlistMode.manualReview)),
      l10n: _l10n,
    );
    final disabled = eventDetailInformationStateFrom(
      event: buildEvent(eventPolicy: policyFor(EventWaitlistMode.disabled)),
      l10n: _l10n,
    );

    expect(broadcast.signUpRows.last.title, 'If it fills, spots reopen');
    expect(manual.signUpRows.last.title, 'Host-managed waitlist');
    expect(
      disabled.signUpRows.where(
        (row) => row.kind == EventDetailFactKind.waitlist,
      ),
      isEmpty,
    );
  });

  test('free events use release-the-spot copy instead of refund language', () {
    final free = eventDetailInformationStateFrom(
      event: buildEvent(),
      l10n: _l10n,
    );
    final paid = eventDetailInformationStateFrom(
      event: buildEvent(priceInPaise: 12000),
      l10n: _l10n,
    );

    final freeCancellation = free.goodToKnowRows.singleWhere(
      (row) => row.kind == EventDetailFactKind.cancellation,
    );
    final paidCancellation = paid.goodToKnowRows.singleWhere(
      (row) => row.kind == EventDetailFactKind.cancellation,
    );

    expect(freeCancellation.title, 'Plans change?');
    expect(freeCancellation.body, contains('Release your spot'));
    expect(freeCancellation.body.toLowerCase(), isNot(contains('refund')));
    expect(paidCancellation.body.toLowerCase(), contains('refund'));
  });
}
