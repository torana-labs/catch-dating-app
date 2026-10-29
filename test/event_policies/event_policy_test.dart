import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const engine = EventPolicyEngine();
  const cohortResolver = EventCohortResolver();

  EventPolicyBundle bundle({
    required EventAdmissionPolicy admissionPolicy,
    EventPricingPolicy pricingPolicy = const EventPricingPolicy.fixed(
      MoneyAmount.inPaise(0),
    ),
  }) {
    return EventPolicyBundle(
      admissionPolicy: admissionPolicy,
      pricingPolicy: pricingPolicy,
    );
  }

  EventAdmissionDecision decide({
    required EventPolicyBundle policy,
    required EventAttendeeProfile attendee,
    EventRosterSnapshot roster = const EventRosterSnapshot(),
    bool hasValidInvite = false,
    bool isClubMember = false,
  }) {
    return engine.decideAdmission(
      policy: policy,
      request: EventAdmissionRequest(
        attendee: attendee,
        hasValidInvite: hasValidInvite,
        isClubMember: isClubMember,
      ),
      roster: roster,
    );
  }

  test('member review exemption is explicit and retains capacity gates', () {
    final policy = EventPolicyBundle.requestToJoinEvent(
      capacityLimit: 1,
      basePriceInPaise: 10000,
      approvedMembersSkipReview: true,
    );
    final attendee = _attendee(Gender.man, {Gender.woman});
    expect(
      decide(policy: policy, attendee: attendee).type,
      EventAdmissionDecisionType.manualReviewRequired,
    );
    expect(
      decide(policy: policy, attendee: attendee, isClubMember: true).type,
      EventAdmissionDecisionType.admitted,
    );
    expect(
      decide(
        policy: policy,
        attendee: attendee,
        isClubMember: true,
        roster: const EventRosterSnapshot(
          bookedCountsByCohort: {EventCohortIds.menInterestedInWomen: 1},
        ),
      ).isBookable,
      isFalse,
    );
    final restored = EventPolicyBundle.fromJson(policy.toJson());
    expect(restored.admissionPolicy.approvedMembersSkipReview, isTrue);
    final ordinary = EventPolicyBundle.requestToJoinEvent(
      capacityLimit: 1,
      basePriceInPaise: 0,
    );
    expect(
      decide(policy: ordinary, attendee: attendee, isClubMember: true).type,
      EventAdmissionDecisionType.manualReviewRequired,
    );
  });

  group('EventCohortResolver', () {
    test(
      'keeps straight-balanced cohorts separate from queer/open cohorts',
      () {
        expect(
          cohortResolver.resolve(_attendee(Gender.man, {Gender.woman})),
          EventCohort.menInterestedInWomen,
        );
        expect(
          cohortResolver.resolve(_attendee(Gender.woman, {Gender.man})),
          EventCohort.womenInterestedInMen,
        );
        expect(
          cohortResolver.resolve(
            _attendee(Gender.man, {Gender.man, Gender.woman}),
          ),
          EventCohort.queerOrOpen,
        );
        expect(
          cohortResolver.resolve(_attendee(Gender.nonBinary, {Gender.woman})),
          EventCohort.nonBinaryOrOther,
        );
      },
    );
  });

  group('EventPolicyEngine admission decisions', () {
    test('invite-only events require a valid invite before booking', () {
      final policy = bundle(
        admissionPolicy: const EventAdmissionPolicy.inviteOnly(
          capacityLimit: 8,
        ),
      );

      final blocked = decide(
        policy: policy,
        attendee: _attendee(Gender.man, {Gender.woman}),
      );
      final admitted = decide(
        policy: policy,
        attendee: _attendee(Gender.man, {Gender.woman}),
        hasValidInvite: true,
      );
      final full = decide(
        policy: policy,
        attendee: _attendee(Gender.woman, {Gender.man}),
        hasValidInvite: true,
        roster: const EventRosterSnapshot(
          bookedCountsByCohort: {EventCohortIds.menInterestedInWomen: 8},
        ),
      );

      expect(blocked.type, EventAdmissionDecisionType.inviteRequired);
      expect(blocked.reason, EventAdmissionDecisionReason.inviteRequired);
      expect(admitted.type, EventAdmissionDecisionType.admitted);
      expect(full.type, EventAdmissionDecisionType.soldOut);
    });

    test('capacity-only events can use ranked waitlist offers', () {
      final policy = bundle(
        admissionPolicy: const EventAdmissionPolicy.open(
          capacityLimit: 1,
          waitlistPolicy: EventWaitlistPolicy.rankedOffer(),
        ),
      );

      final decision = decide(
        policy: policy,
        attendee: _attendee(Gender.woman, {Gender.man}),
        roster: const EventRosterSnapshot(
          bookedCountsByCohort: {EventCohortIds.menInterestedInWomen: 1},
        ),
      );

      expect(decision.type, EventAdmissionDecisionType.waitlisted);
      expect(decision.reason, EventAdmissionDecisionReason.capacityFull);
      expect(decision.waitlistMode, EventWaitlistMode.rankedOffer);
    });

    test('reserved pair seats stay separate from general admission', () {
      final admission =
          const EventAdmissionPolicy.open(
            capacityLimit: 10,
            waitlistPolicy: EventWaitlistPolicy.rankedOffer(),
          ).withCrossPathsPairInventory(
            const CrossPathsPairInventoryPolicy(
              enabled: true,
              reservedPairCapacity: 2,
            ),
          );
      final policy = bundle(admissionPolicy: admission);

      final admitted = decide(
        policy: policy,
        attendee: _attendee(Gender.woman, {Gender.man}),
        roster: const EventRosterSnapshot(
          bookedCountsByCohort: {EventCohortIds.menInterestedInWomen: 8},
          crossPathsPairConfirmedCount: 2,
        ),
      );
      final generalPoolFull = decide(
        policy: policy,
        attendee: _attendee(Gender.woman, {Gender.man}),
        roster: const EventRosterSnapshot(
          bookedCountsByCohort: {EventCohortIds.menInterestedInWomen: 10},
          crossPathsPairConfirmedCount: 2,
        ),
      );

      expect(admitted.type, EventAdmissionDecisionType.admitted);
      expect(generalPoolFull.type, EventAdmissionDecisionType.waitlisted);
      expect(generalPoolFull.reason, EventAdmissionDecisionReason.capacityFull);
    });

    test('fixed cohort caps block only the capped cohort', () {
      final policy = bundle(
        admissionPolicy: const EventAdmissionPolicy.fixedCohortCaps(
          capacityLimit: 20,
          cohortCapacityLimits: {EventCohortIds.menInterestedInWomen: 10},
          waitlistPolicy: EventWaitlistPolicy.rankedOffer(),
        ),
      );
      const roster = EventRosterSnapshot(
        bookedCountsByCohort: {
          EventCohortIds.menInterestedInWomen: 10,
          EventCohortIds.womenInterestedInMen: 2,
        },
      );

      final capped = decide(
        policy: policy,
        attendee: _attendee(Gender.man, {Gender.woman}),
        roster: roster,
      );
      final admitted = decide(
        policy: policy,
        attendee: _attendee(Gender.woman, {Gender.man}),
        roster: roster,
      );

      expect(capped.type, EventAdmissionDecisionType.waitlisted);
      expect(capped.reason, EventAdmissionDecisionReason.cohortCapReached);
      expect(admitted.type, EventAdmissionDecisionType.admitted);
    });

    test('balanced ratio waitlists the overrepresented cohort', () {
      final policy = bundle(
        admissionPolicy: const EventAdmissionPolicy.balancedRatio(
          capacityLimit: 100,
          balancedRatioPolicy: BalancedRatioPolicy(
            leftCohortId: EventCohortIds.menInterestedInWomen,
            rightCohortId: EventCohortIds.womenInterestedInMen,
          ),
          waitlistPolicy: EventWaitlistPolicy.rankedOffer(),
        ),
      );
      const roster = EventRosterSnapshot(
        bookedCountsByCohort: {
          EventCohortIds.menInterestedInWomen: 11,
          EventCohortIds.womenInterestedInMen: 10,
        },
      );

      final manDecision = decide(
        policy: policy,
        attendee: _attendee(Gender.man, {Gender.woman}),
        roster: roster,
      );
      final womanDecision = decide(
        policy: policy,
        attendee: _attendee(Gender.woman, {Gender.man}),
        roster: roster,
      );

      expect(manDecision.type, EventAdmissionDecisionType.waitlisted);
      expect(
        manDecision.reason,
        EventAdmissionDecisionReason.balancedRatioLimitReached,
      );
      expect(womanDecision.type, EventAdmissionDecisionType.admitted);
    });

    test('balanced ratio can route out-of-ratio cohorts to review', () {
      final policy = bundle(
        admissionPolicy: const EventAdmissionPolicy.balancedRatio(
          capacityLimit: 100,
          balancedRatioPolicy: BalancedRatioPolicy(
            leftCohortId: EventCohortIds.menInterestedInWomen,
            rightCohortId: EventCohortIds.womenInterestedInMen,
          ),
        ),
      );

      final decision = decide(
        policy: policy,
        attendee: _attendee(Gender.nonBinary, {Gender.woman}),
      );

      expect(decision.type, EventAdmissionDecisionType.manualReviewRequired);
      expect(
        decision.reason,
        EventAdmissionDecisionReason.outOfRatioCohortRequiresReview,
      );
    });

    test(
      'manual approval events return review state after hard checks pass',
      () {
        final policy = bundle(
          admissionPolicy: const EventAdmissionPolicy.manualApproval(
            capacityLimit: 12,
          ),
        );

        final decision = decide(
          policy: policy,
          attendee: _attendee(Gender.woman, {Gender.man}),
        );

        expect(decision.type, EventAdmissionDecisionType.manualReviewRequired);
        expect(
          decision.reason,
          EventAdmissionDecisionReason.manualApprovalRequired,
        );
      },
    );
  });

  group('EventPricingPolicy', () {
    test('quotes cohort discounts and demand-based surcharges server-side', () {
      final policy = bundle(
        admissionPolicy: const EventAdmissionPolicy.open(capacityLimit: 100),
        pricingPolicy: const EventPricingPolicy(
          basePrice: MoneyAmount.inPaise(40000),
          cohortAdjustments: {
            EventCohortIds.womenInterestedInMen: MoneyAmount.inPaise(-10000),
          },
          demandPricingRules: [
            EventDemandPricingRule(
              pricedCohortId: EventCohortIds.menInterestedInWomen,
              balancingCohortId: EventCohortIds.womenInterestedInMen,
              demandStep: 5,
              stepAdjustment: MoneyAmount.inPaise(20000),
              maxAdjustment: MoneyAmount.inPaise(60000),
            ),
          ],
        ),
      );
      const roster = EventRosterSnapshot(
        bookedCountsByCohort: {
          EventCohortIds.menInterestedInWomen: 20,
          EventCohortIds.womenInterestedInMen: 10,
        },
        waitlistedCountsByCohort: {EventCohortIds.menInterestedInWomen: 4},
      );

      final manDecision = decide(
        policy: policy,
        attendee: _attendee(Gender.man, {Gender.woman}),
        roster: roster,
      );
      final womanDecision = decide(
        policy: policy,
        attendee: _attendee(Gender.woman, {Gender.man}),
        roster: roster,
      );

      expect(manDecision.priceQuote.basePrice.inPaise, 40000);
      expect(manDecision.priceQuote.demandAdjustment.inPaise, 60000);
      expect(manDecision.priceQuote.finalAmount.inPaise, 100000);
      expect(womanDecision.priceQuote.cohortAdjustment.inPaise, -10000);
      expect(womanDecision.priceQuote.finalAmount.inPaise, 30000);
    });
  });

  group('EventCancellationPolicy', () {
    test('uses bounded attendee cancellation windows', () {
      const policy = EventCancellationPolicy.standard();
      const paidAmount = MoneyAmount.inPaise(40000);

      final early = policy.quoteFor(
        const EventCancellationRequest(
          actor: EventCancellationActor.attendee,
          paidAmount: paidAmount,
          beforeStart: Duration(hours: 30),
        ),
      );
      final lateCredit = policy.quoteFor(
        const EventCancellationRequest(
          actor: EventCancellationActor.attendee,
          paidAmount: paidAmount,
          beforeStart: Duration(hours: 8),
        ),
      );
      final tooLate = policy.quoteFor(
        const EventCancellationRequest(
          actor: EventCancellationActor.attendee,
          paidAmount: paidAmount,
          beforeStart: Duration(hours: 2),
        ),
      );

      expect(early.remedy, EventCancellationRemedy.fullRefund);
      expect(early.refundAmount.inPaise, 40000);
      expect(lateCredit.remedy, EventCancellationRemedy.platformCredit);
      expect(lateCredit.creditAmount.inPaise, 20000);
      expect(tooLate.remedy, EventCancellationRemedy.noRefund);
    });

    test('host cancellations make attendees complete before host payout', () {
      const policy = EventCancellationPolicy.strict();

      final quote = policy.quoteFor(
        const EventCancellationRequest(
          actor: EventCancellationActor.host,
          paidAmount: MoneyAmount.inPaise(100000),
          beforeStart: Duration(hours: 1),
        ),
      );

      expect(
        quote.remedy,
        EventCancellationRemedy.platformMakesAttendeeComplete,
      );
      expect(quote.refundAmount.inPaise, 100000);
      expect(quote.creditAmount.inPaise, 0);
      expect(quote.userLabel, 'Made complete');
    });

    test('waitlisted attendees can leave without payment logic', () {
      const policy = EventCancellationPolicy.standard();

      final quote = policy.quoteFor(
        const EventCancellationRequest(
          actor: EventCancellationActor.attendee,
          paidAmount: MoneyAmount.inPaise(0),
          beforeStart: Duration.zero,
          isWaitlisted: true,
        ),
      );

      expect(quote.remedy, EventCancellationRemedy.waitlistRelease);
      expect(quote.userLabel, 'Free waitlist removal');
    });
  });

  test('free policy bundles derive no cancellation policy', () {
    final policy = bundle(
      admissionPolicy: const EventAdmissionPolicy.open(capacityLimit: 20),
    );

    expect(
      policy.cancellationPolicy.id,
      EventCancellationPolicyId.notApplicable,
    );
    expect(policy.hasCancellationPolicy, isFalse);
    expect(
      policy.settlementPolicy.hostPayoutTiming,
      EventHostPayoutTiming.afterEventCompletion,
    );
  });

  test('paid policy bundles keep the selected cancellation policy', () {
    final policy = bundle(
      admissionPolicy: const EventAdmissionPolicy.open(capacityLimit: 20),
      pricingPolicy: const EventPricingPolicy.fixed(MoneyAmount.inPaise(25000)),
    );

    expect(policy.cancellationPolicy.id, EventCancellationPolicyId.standard);
    expect(policy.hasCancellationPolicy, isTrue);
  });

  test('migration status flags the production policy snapshot', () {
    expect(
      eventPolicyEngineDevelopmentStatus,
      'production_migration_policy_snapshot_v1',
    );
  });
}

EventAttendeeProfile _attendee(Gender gender, Set<Gender> interestedIn) {
  return EventAttendeeProfile(
    uid: '${gender.name}-${interestedIn.map((g) => g.name).join('-')}',
    gender: gender,
    interestedInGenders: interestedIn,
  );
}
