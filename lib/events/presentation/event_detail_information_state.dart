import 'dart:collection';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/foundation.dart';

enum EventDetailFactKind {
  admission,
  waitlist,
  pricing,
  requirements,
  experience,
  attendance,
  cancellation,
}

enum EventDetailFactIcon {
  openSignup,
  inviteOnly,
  hostApproval,
  cohortCaps,
  balancedBooking,
  membersOnly,
  waitlist,
  pricing,
  requirements,
  activity,
  attendance,
  cancellation,
}

@immutable
class EventDetailFactRow {
  const EventDetailFactRow._({
    required this.kind,
    required this.icon,
    required this.title,
    required this.body,
  });

  final EventDetailFactKind kind;
  final EventDetailFactIcon icon;
  final String title;
  final String body;
}

/// The complete, non-overlapping information contract for Event Detail.
///
/// Construction stays private so feature widgets cannot place a policy fact in
/// the wrong section, repeat it in two sections, or reintroduce settlement copy.
@immutable
class EventDetailInformationState {
  EventDetailInformationState._checked({
    required this.activityKind,
    required List<EventDetailFactRow> signUpRows,
    required List<EventDetailFactRow> goodToKnowRows,
  }) : signUpRows = UnmodifiableListView(signUpRows),
       goodToKnowRows = UnmodifiableListView(goodToKnowRows) {
    _validateRows(
      rows: this.signUpRows,
      allowedKinds: _signUpKinds,
      sectionName: 'How sign-ups work',
      maximumRowCount: 3,
    );
    _validateRows(
      rows: this.goodToKnowRows,
      allowedKinds: _goodToKnowKinds,
      sectionName: 'Good to know',
      maximumRowCount: 4,
    );

    final allKinds = <EventDetailFactKind>{};
    for (final row in [...this.signUpRows, ...this.goodToKnowRows]) {
      if (!allKinds.add(row.kind)) {
        throw ArgumentError.value(
          row.kind,
          'rows',
          'Event Detail facts must appear exactly once',
        );
      }
    }
  }

  final ActivityKind activityKind;
  final UnmodifiableListView<EventDetailFactRow> signUpRows;
  final UnmodifiableListView<EventDetailFactRow> goodToKnowRows;

  static const _signUpKinds = <EventDetailFactKind>{
    EventDetailFactKind.admission,
    EventDetailFactKind.waitlist,
    EventDetailFactKind.pricing,
  };

  static const _goodToKnowKinds = <EventDetailFactKind>{
    EventDetailFactKind.requirements,
    EventDetailFactKind.experience,
    EventDetailFactKind.attendance,
    EventDetailFactKind.cancellation,
  };

  static void _validateRows({
    required List<EventDetailFactRow> rows,
    required Set<EventDetailFactKind> allowedKinds,
    required String sectionName,
    required int maximumRowCount,
  }) {
    if (rows.isEmpty) {
      throw ArgumentError('$sectionName must contain at least one fact');
    }
    if (rows.length > maximumRowCount) {
      throw ArgumentError.value(
        rows.length,
        'rows',
        '$sectionName supports at most $maximumRowCount facts',
      );
    }

    final kinds = <EventDetailFactKind>{};
    for (final row in rows) {
      if (!allowedKinds.contains(row.kind)) {
        throw ArgumentError.value(
          row.kind,
          'rows',
          '$sectionName does not own this fact',
        );
      }
      if (!kinds.add(row.kind)) {
        throw ArgumentError.value(
          row.kind,
          'rows',
          '$sectionName cannot repeat a fact',
        );
      }
      if (row.title.trim().isEmpty || row.body.trim().isEmpty) {
        throw ArgumentError('$sectionName facts require a title and body');
      }
    }
  }
}

EventDetailInformationState eventDetailInformationStateFrom({
  required Event event,
  required AppLocalizations l10n,
}) {
  final policy = event.effectiveEventPolicy;
  final signUpRows = <EventDetailFactRow>[
    _admissionRow(policy.admissionPolicy, l10n),
    ..._waitlistRows(policy.admissionPolicy.waitlistPolicy, l10n),
    ..._pricingRows(
      policy.pricingPolicy,
      currencyCode: event.currency,
      l10n: l10n,
    ),
  ];
  final goodToKnowRows = <EventDetailFactRow>[
    if (event.hasRequirements)
      EventDetailFactRow._(
        kind: EventDetailFactKind.requirements,
        icon: EventDetailFactIcon.requirements,
        title: l10n.eventsRequirementsRowTextRequirements,
        body: event.constraints.requirementLabels.join(' · '),
      ),
    EventDetailFactRow._(
      kind: EventDetailFactKind.experience,
      icon: EventDetailFactIcon.activity,
      title: _activityExpectationTitle(event, l10n),
      body: _activityExpectationBody(event, l10n),
    ),
    EventDetailFactRow._(
      kind: EventDetailFactKind.attendance,
      icon: EventDetailFactIcon.attendance,
      title: l10n.eventsEventDetailOverviewSectionTitleAttendanceMatters,
      body: l10n.eventsEventDetailOverviewSectionBodyCheckInOrHost,
    ),
    EventDetailFactRow._(
      kind: EventDetailFactKind.cancellation,
      icon: EventDetailFactIcon.cancellation,
      title:
          event.status == EventLifecycleStatus.cancelled &&
              (event.cancellationReason?.trim().isNotEmpty ?? false)
          ? l10n.eventsEventDetailScreenStateLabelEventCancelled
          : _isGuaranteedFree(policy.pricingPolicy)
          ? l10n.eventsEventDetailInformationStateTitlePlansChange
          : l10n.eventsEventDetailOverviewSectionTitleTitleCancellation(
              title: policy.cancellationPolicy.title,
            ),
      body:
          event.status == EventLifecycleStatus.cancelled &&
              (event.cancellationReason?.trim().isNotEmpty ?? false)
          ? event.cancellationReason!.trim()
          : _isGuaranteedFree(policy.pricingPolicy)
          ? l10n.eventsEventDetailInformationStateBodyReleaseYourSpotEarly
          : policy.cancellationPolicy.attendeeSummary,
    ),
  ];

  return EventDetailInformationState._checked(
    activityKind: event.activityKind,
    signUpRows: signUpRows,
    goodToKnowRows: goodToKnowRows,
  );
}

EventDetailFactRow _admissionRow(
  EventAdmissionPolicy policy,
  AppLocalizations l10n,
) {
  return switch (policy.format) {
    EventAdmissionFormat.open => EventDetailFactRow._(
      kind: EventDetailFactKind.admission,
      icon: EventDetailFactIcon.openSignup,
      title: l10n.eventsEventDetailDesignPrimitivesVisiblecopyOpenSignUp,
      body: l10n
          .eventsEventDetailDesignPrimitivesVisiblecopyNoApprovalNeededRsvp(
            capacityLimit: policy.capacityLimit,
          ),
    ),
    EventAdmissionFormat.inviteOnly => EventDetailFactRow._(
      kind: EventDetailFactKind.admission,
      icon: EventDetailFactIcon.inviteOnly,
      title: l10n.eventsEventDetailDesignPrimitivesVisiblecopyInviteOnly,
      body:
          l10n.eventsEventDetailDesignPrimitivesVisiblecopyOnlyAttendeesWithThe,
    ),
    EventAdmissionFormat.manualApproval => EventDetailFactRow._(
      kind: EventDetailFactKind.admission,
      icon: EventDetailFactIcon.hostApproval,
      title: l10n.eventsEventDetailDesignPrimitivesVisiblecopyHostApproval,
      body: l10n.eventsEventDetailDesignPrimitivesVisiblecopyRequestASpotFirst,
    ),
    EventAdmissionFormat.fixedCohortCaps => EventDetailFactRow._(
      kind: EventDetailFactKind.admission,
      icon: EventDetailFactIcon.cohortCaps,
      title: l10n.eventsEventDetailDesignPrimitivesVisiblecopyCohortCaps,
      body: l10n
          .eventsEventDetailDesignPrimitivesVisiblecopyBookWithinTotalCapacity,
    ),
    EventAdmissionFormat.balancedRatio => EventDetailFactRow._(
      kind: EventDetailFactKind.admission,
      icon: EventDetailFactIcon.balancedBooking,
      title: l10n.eventsEventDetailDesignPrimitivesVisiblecopyBalancedSingles,
      body:
          l10n.eventsEventDetailDesignPrimitivesVisiblecopyStraightMenAndWomen,
    ),
    EventAdmissionFormat.membersOnly => EventDetailFactRow._(
      kind: EventDetailFactKind.admission,
      icon: EventDetailFactIcon.membersOnly,
      title: l10n.eventsEventDetailDesignPrimitivesVisiblecopyMembersOnly,
      body: l10n
          .eventsEventDetailDesignPrimitivesVisiblecopyOnlyActiveOrganizerMembers,
    ),
  };
}

List<EventDetailFactRow> _waitlistRows(
  EventWaitlistPolicy policy,
  AppLocalizations l10n,
) {
  return switch (policy.mode) {
    EventWaitlistMode.disabled => const <EventDetailFactRow>[],
    EventWaitlistMode.rankedOffer => <EventDetailFactRow>[
      EventDetailFactRow._(
        kind: EventDetailFactKind.waitlist,
        icon: EventDetailFactIcon.waitlist,
        title: l10n.eventsEventDetailDesignPrimitivesTitleIfItFillsA,
        body: l10n.eventsEventDetailDesignPrimitivesDetailSpotsFreeUpIn,
      ),
    ],
    EventWaitlistMode.broadcastFirstComeFirstServed => <EventDetailFactRow>[
      EventDetailFactRow._(
        kind: EventDetailFactKind.waitlist,
        icon: EventDetailFactIcon.waitlist,
        title: l10n.eventsEventDetailInformationStateTitleIfItFillsSpotsReopen,
        body:
            l10n.eventsEventDetailInformationStateBodyEligiblePeopleAreNotified,
      ),
    ],
    EventWaitlistMode.manualReview => <EventDetailFactRow>[
      EventDetailFactRow._(
        kind: EventDetailFactKind.waitlist,
        icon: EventDetailFactIcon.waitlist,
        title: l10n.eventsEventDetailInformationStateTitleHostManagedWaitlist,
        body: l10n
            .eventsEventDetailInformationStateBodyTheHostReviewsWaitingRequests,
      ),
    ],
  };
}

List<EventDetailFactRow> _pricingRows(
  EventPricingPolicy policy, {
  required String currencyCode,
  required AppLocalizations l10n,
}) {
  final demandRules = policy.demandPricingRules
      .where(
        (rule) =>
            rule.stepAdjustment.inPaise != 0 || rule.maxAdjustment.inPaise != 0,
      )
      .toList(growable: false);
  final hasCohortAdjustments = policy.cohortAdjustments.values.any(
    (adjustment) => adjustment.inPaise != 0,
  );

  if (demandRules.isEmpty && !hasCohortAdjustments) {
    return const <EventDetailFactRow>[];
  }

  final isSingleDemandRule = demandRules.length == 1 && !hasCohortAdjustments;
  final body = isSingleDemandRule
      ? l10n.eventsEventDetailOverviewSectionVisiblecopyPriceCanIncreaseBy(
          step: EventFormatters.priceInPaise(
            demandRules.single.stepAdjustment.inPaise,
            currencyCode: currencyCode,
          ),
          max: EventFormatters.priceInPaise(
            demandRules.single.maxAdjustment.inPaise,
            currencyCode: currencyCode,
          ),
        )
      : l10n.eventsEventDetailOverviewSectionVisiblecopyPriceCanChangeBased;

  return <EventDetailFactRow>[
    EventDetailFactRow._(
      kind: EventDetailFactKind.pricing,
      icon: EventDetailFactIcon.pricing,
      title: isSingleDemandRule
          ? l10n.eventsEventDetailOverviewSectionTitleDemandPricing
          : l10n.eventsEventDetailInformationStateTitleVariablePricing,
      body: body,
    ),
  ];
}

bool _isGuaranteedFree(EventPricingPolicy policy) {
  return policy.basePrice.isFree &&
      policy.cohortAdjustments.values.every((amount) => amount.isFree) &&
      policy.demandPricingRules.every(
        (rule) => rule.stepAdjustment.isFree && rule.maxAdjustment.isFree,
      );
}

String _activityExpectationTitle(Event event, AppLocalizations l10n) {
  if (event.eventFormat.isDistanceBased) {
    return l10n
        .eventsEventDetailOverviewSectionVisiblecopyTostringasfixedKmTolowercaseTolowercase2(
          toStringAsFixed: event.distanceKm.toStringAsFixed(1),
          toLowerCase: event.pace.label.toLowerCase(),
          toLowerCase2: event.eventFormat.label.toLowerCase(),
        );
  }
  return event.eventFormat.label;
}

String _activityExpectationBody(Event event, AppLocalizations l10n) {
  return switch (event.eventFormat.interactionModel) {
    EventInteractionModel.pacePods =>
      l10n.eventsEventDetailOverviewSectionVisiblecopyArriveReadyForThe,
    EventInteractionModel.pairedRotations =>
      l10n.eventsEventDetailOverviewSectionVisiblecopyExpectPairedOrCourt,
    EventInteractionModel.teamRotations =>
      l10n.eventsEventDetailOverviewSectionVisiblecopyExpectTeamStructureAnd,
    EventInteractionModel.seatedTable =>
      l10n.eventsEventDetailOverviewSectionVisiblecopyExpectASeatedFormat,
    EventInteractionModel.freeFormMixer =>
      l10n.eventsEventDetailOverviewSectionVisiblecopyExpectALooserSocial,
    EventInteractionModel.hostLedProgram =>
      l10n.eventsEventDetailOverviewSectionVisiblecopyExpectAHostLed,
    EventInteractionModel.openFormat =>
      l10n.eventsEventDetailOverviewSectionVisiblecopyExpectTheHostTo,
  };
}
