part of '../event_policy.dart';

enum EventAdmissionFormat {
  open,
  inviteOnly,
  manualApproval,
  fixedCohortCaps,
  balancedRatio,
  membersOnly,
}

enum EventWaitlistMode {
  disabled,
  rankedOffer,
  broadcastFirstComeFirstServed,
  manualReview,
}

enum EventOutOfRatioCohortPolicy {
  admitWithinGeneralCapacity,
  waitlist,
  manualReview,
  reject,
}

enum EventPrivateAccessMode { none, inviteCode }

enum EventAdmissionDecisionType {
  admitted,
  waitlisted,
  manualReviewRequired,
  inviteRequired,
  membershipRequired,
  soldOut,
  cohortUnavailable,
}

enum EventAdmissionDecisionReason {
  capacityAvailable,
  capacityFull,
  inviteRequired,
  membershipRequired,
  manualApprovalRequired,
  cohortCapReached,
  balancedRatioLimitReached,
  outOfRatioCohortRequiresReview,
  outOfRatioCohortWaitlisted,
  outOfRatioCohortRejected,
}

class EventWaitlistPolicy {
  const EventWaitlistPolicy({
    this.mode = EventWaitlistMode.disabled,
    this.offerWindow = const Duration(minutes: 20),
  });

  const EventWaitlistPolicy.disabled()
    : mode = EventWaitlistMode.disabled,
      offerWindow = Duration.zero;

  const EventWaitlistPolicy.rankedOffer({
    this.offerWindow = const Duration(minutes: 20),
  }) : mode = EventWaitlistMode.rankedOffer;

  final EventWaitlistMode mode;
  final Duration offerWindow;

  bool get isEnabled => mode != EventWaitlistMode.disabled;

  factory EventWaitlistPolicy.fromJson(Map<String, dynamic> json) {
    return EventWaitlistPolicy(
      mode: _enumFromName(
        EventWaitlistMode.values,
        json['mode'],
        EventWaitlistMode.disabled,
      ),
      offerWindow: Duration(
        minutes: _intValue(json['offerWindowMinutes'], fallback: 20),
      ),
    );
  }

  Map<String, Object?> toJson() => {
    'mode': mode.name,
    'offerWindowMinutes': offerWindow.inMinutes,
  };
}

class EventPrivateAccessPolicy {
  const EventPrivateAccessPolicy({
    this.mode = EventPrivateAccessMode.none,
    this.inviteCodeHint,
    this.privateLinkEnabled = false,
  });

  const EventPrivateAccessPolicy.none()
    : mode = EventPrivateAccessMode.none,
      inviteCodeHint = null,
      privateLinkEnabled = false;

  const EventPrivateAccessPolicy.inviteCode({
    this.inviteCodeHint,
    this.privateLinkEnabled = true,
  }) : mode = EventPrivateAccessMode.inviteCode;

  final EventPrivateAccessMode mode;
  final String? inviteCodeHint;
  final bool privateLinkEnabled;

  bool get requiresInviteCode => mode == EventPrivateAccessMode.inviteCode;

  factory EventPrivateAccessPolicy.fromJson(Map<String, dynamic> json) {
    return EventPrivateAccessPolicy(
      mode: _enumFromName(
        EventPrivateAccessMode.values,
        json['mode'],
        EventPrivateAccessMode.none,
      ),
      inviteCodeHint: _stringValue(json['inviteCodeHint']),
      privateLinkEnabled: _boolValue(json['privateLinkEnabled']),
    );
  }

  Map<String, Object?> toJson() => {
    'mode': mode.name,
    'inviteCodeHint': inviteCodeHint,
    'privateLinkEnabled': privateLinkEnabled,
  };
}

class BalancedRatioPolicy {
  const BalancedRatioPolicy({
    required this.leftCohortId,
    required this.rightCohortId,
    this.maxSkew = 1,
    this.openingBufferPerCohort = 1,
    this.outOfRatioCohortPolicy = EventOutOfRatioCohortPolicy.manualReview,
  });

  final String leftCohortId;
  final String rightCohortId;
  final int maxSkew;
  final int openingBufferPerCohort;
  final EventOutOfRatioCohortPolicy outOfRatioCohortPolicy;

  bool appliesTo(String cohortId) =>
      cohortId == leftCohortId || cohortId == rightCohortId;

  String? counterpartFor(String cohortId) {
    if (cohortId == leftCohortId) return rightCohortId;
    if (cohortId == rightCohortId) return leftCohortId;
    return null;
  }

  bool allowsAdmission({
    required String cohortId,
    required EventRosterSnapshot roster,
  }) {
    final counterpartId = counterpartFor(cohortId);
    if (counterpartId == null) return false;

    final currentCount = roster.bookedCountFor(cohortId);
    final counterpartCount = roster.bookedCountFor(counterpartId);
    final nextCount = currentCount + 1;

    if (counterpartCount == 0 && currentCount < openingBufferPerCohort) {
      return true;
    }

    return nextCount <= counterpartCount + maxSkew;
  }

  factory BalancedRatioPolicy.fromJson(Map<String, dynamic> json) {
    return BalancedRatioPolicy(
      leftCohortId:
          _stringValue(json['leftCohortId']) ??
          EventCohortIds.menInterestedInWomen,
      rightCohortId:
          _stringValue(json['rightCohortId']) ??
          EventCohortIds.womenInterestedInMen,
      maxSkew: _intValue(json['maxSkew'], fallback: 1),
      openingBufferPerCohort: _intValue(
        json['openingBufferPerCohort'],
        fallback: 1,
      ),
      outOfRatioCohortPolicy: _enumFromName(
        EventOutOfRatioCohortPolicy.values,
        json['outOfRatioCohortPolicy'],
        EventOutOfRatioCohortPolicy.manualReview,
      ),
    );
  }

  Map<String, Object?> toJson() => {
    'leftCohortId': leftCohortId,
    'rightCohortId': rightCohortId,
    'maxSkew': maxSkew,
    'openingBufferPerCohort': openingBufferPerCohort,
    'outOfRatioCohortPolicy': outOfRatioCohortPolicy.name,
  };
}

class CrossPathsPairInventoryPolicy {
  const CrossPathsPairInventoryPolicy({
    this.enabled = false,
    this.reservedPairCapacity = 0,
    this.holdDuration = const Duration(minutes: 15),
  });

  const CrossPathsPairInventoryPolicy.disabled()
    : enabled = false,
      reservedPairCapacity = 0,
      holdDuration = const Duration(minutes: 15);

  final bool enabled;
  final int reservedPairCapacity;
  final Duration holdDuration;

  bool get isEnabled => enabled && reservedPairCapacity > 0;

  factory CrossPathsPairInventoryPolicy.fromJson(Map<String, dynamic> json) {
    final capacity = _intValue(json['reservedPairCapacity'], fallback: 0);
    return CrossPathsPairInventoryPolicy(
      enabled: _boolValue(json['enabled']) && capacity > 0,
      reservedPairCapacity: capacity.clamp(0, 100),
      holdDuration: Duration(
        minutes: _intValue(
          json['holdDurationMinutes'],
          fallback: 15,
        ).clamp(5, 30),
      ),
    );
  }

  Map<String, Object?> toJson() => {
    'enabled': isEnabled,
    'reservedPairCapacity': reservedPairCapacity,
    'holdDurationMinutes': holdDuration.inMinutes,
  };
}

class EventAdmissionPolicy {
  const EventAdmissionPolicy({
    required this.format,
    required this.capacityLimit,
    this.waitlistPolicy = const EventWaitlistPolicy.disabled(),
    this.inviteRequired = false,
    this.membershipRequired = false,
    this.manualApprovalRequired = false,
    this.approvedMembersSkipReview = false,
    this.privateAccessPolicy = const EventPrivateAccessPolicy.none(),
    this.cohortCapacityLimits = const {},
    this.balancedRatioPolicy,
    this.crossPathsPairInventory =
        const CrossPathsPairInventoryPolicy.disabled(),
  });

  const EventAdmissionPolicy.open({
    required int capacityLimit,
    EventWaitlistPolicy waitlistPolicy = const EventWaitlistPolicy.disabled(),
  }) : this(
         format: EventAdmissionFormat.open,
         capacityLimit: capacityLimit,
         waitlistPolicy: waitlistPolicy,
       );

  const EventAdmissionPolicy.inviteOnly({
    required int capacityLimit,
    EventWaitlistPolicy waitlistPolicy = const EventWaitlistPolicy.disabled(),
    EventPrivateAccessPolicy privateAccessPolicy =
        const EventPrivateAccessPolicy.inviteCode(),
  }) : this(
         format: EventAdmissionFormat.inviteOnly,
         capacityLimit: capacityLimit,
         inviteRequired: true,
         waitlistPolicy: waitlistPolicy,
         privateAccessPolicy: privateAccessPolicy,
       );

  const EventAdmissionPolicy.manualApproval({
    required int capacityLimit,
    bool approvedMembersSkipReview = false,
    EventWaitlistPolicy waitlistPolicy = const EventWaitlistPolicy.disabled(),
  }) : this(
         format: EventAdmissionFormat.manualApproval,
         capacityLimit: capacityLimit,
         manualApprovalRequired: true,
         approvedMembersSkipReview: approvedMembersSkipReview,
         waitlistPolicy: waitlistPolicy,
       );

  const EventAdmissionPolicy.membersOnly({
    required int capacityLimit,
    EventWaitlistPolicy waitlistPolicy = const EventWaitlistPolicy.disabled(),
  }) : this(
         format: EventAdmissionFormat.membersOnly,
         capacityLimit: capacityLimit,
         membershipRequired: true,
         waitlistPolicy: waitlistPolicy,
       );

  const EventAdmissionPolicy.fixedCohortCaps({
    required int capacityLimit,
    required Map<String, int> cohortCapacityLimits,
    EventWaitlistPolicy waitlistPolicy = const EventWaitlistPolicy.disabled(),
  }) : this(
         format: EventAdmissionFormat.fixedCohortCaps,
         capacityLimit: capacityLimit,
         cohortCapacityLimits: cohortCapacityLimits,
         waitlistPolicy: waitlistPolicy,
       );

  const EventAdmissionPolicy.balancedRatio({
    required int capacityLimit,
    required BalancedRatioPolicy balancedRatioPolicy,
    EventWaitlistPolicy waitlistPolicy = const EventWaitlistPolicy.disabled(),
  }) : this(
         format: EventAdmissionFormat.balancedRatio,
         capacityLimit: capacityLimit,
         balancedRatioPolicy: balancedRatioPolicy,
         waitlistPolicy: waitlistPolicy,
       );

  final EventAdmissionFormat format;
  final int capacityLimit;
  final EventWaitlistPolicy waitlistPolicy;
  final bool inviteRequired;
  final bool membershipRequired;
  final bool manualApprovalRequired;
  final bool approvedMembersSkipReview;
  final EventPrivateAccessPolicy privateAccessPolicy;
  final Map<String, int> cohortCapacityLimits;
  final BalancedRatioPolicy? balancedRatioPolicy;
  final CrossPathsPairInventoryPolicy crossPathsPairInventory;

  EventAdmissionPolicy withCrossPathsPairInventory(
    CrossPathsPairInventoryPolicy policy,
  ) => EventAdmissionPolicy(
    format: format,
    capacityLimit: capacityLimit,
    waitlistPolicy: waitlistPolicy,
    inviteRequired: inviteRequired,
    membershipRequired: membershipRequired,
    manualApprovalRequired: manualApprovalRequired,
    approvedMembersSkipReview: approvedMembersSkipReview,
    privateAccessPolicy: privateAccessPolicy,
    cohortCapacityLimits: cohortCapacityLimits,
    balancedRatioPolicy: balancedRatioPolicy,
    crossPathsPairInventory: policy,
  );

  factory EventAdmissionPolicy.fromJson(Map<String, dynamic> json) {
    return EventAdmissionPolicy(
      format: _enumFromName(
        EventAdmissionFormat.values,
        json['format'],
        EventAdmissionFormat.open,
      ),
      capacityLimit: _intValue(json['capacityLimit'], fallback: 1),
      waitlistPolicy: _mapValue(json['waitlistPolicy']) == null
          ? const EventWaitlistPolicy.disabled()
          : EventWaitlistPolicy.fromJson(_mapValue(json['waitlistPolicy'])!),
      inviteRequired: _boolValue(json['inviteRequired']),
      membershipRequired: _boolValue(json['membershipRequired']),
      manualApprovalRequired: _boolValue(json['manualApprovalRequired']),
      approvedMembersSkipReview: _boolValue(json['approvedMembersSkipReview']),
      privateAccessPolicy: _mapValue(json['privateAccessPolicy']) == null
          ? const EventPrivateAccessPolicy.none()
          : EventPrivateAccessPolicy.fromJson(
              _mapValue(json['privateAccessPolicy'])!,
            ),
      cohortCapacityLimits: _intMap(json['cohortCapacityLimits']),
      balancedRatioPolicy: _mapValue(json['balancedRatioPolicy']) == null
          ? null
          : BalancedRatioPolicy.fromJson(
              _mapValue(json['balancedRatioPolicy'])!,
            ),
      crossPathsPairInventory:
          _mapValue(json['crossPathsPairInventory']) == null
          ? const CrossPathsPairInventoryPolicy.disabled()
          : CrossPathsPairInventoryPolicy.fromJson(
              _mapValue(json['crossPathsPairInventory'])!,
            ),
    );
  }

  Map<String, Object?> toJson() => {
    'format': format.name,
    'capacityLimit': capacityLimit,
    'waitlistPolicy': waitlistPolicy.toJson(),
    'inviteRequired': inviteRequired,
    'membershipRequired': membershipRequired,
    'manualApprovalRequired': manualApprovalRequired,
    if (approvedMembersSkipReview) 'approvedMembersSkipReview': true,
    'privateAccessPolicy': privateAccessPolicy.toJson(),
    'cohortCapacityLimits': cohortCapacityLimits,
    'balancedRatioPolicy': balancedRatioPolicy?.toJson(),
    'crossPathsPairInventory': crossPathsPairInventory.toJson(),
  };
}
