import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy_defaults.dart';
import 'package:catch_dating_app/kernel/country_markets.dart';
import 'package:catch_dating_app/l10n/l10n.dart';

enum EventAdmissionPreset {
  openCapacity,
  inviteOnly,
  requestToJoin,
  requestToJoinMembersExempt,
  balancedSingles,
}

extension EventAdmissionPresetX on EventAdmissionPreset {
  bool get requiresReview =>
      this == EventAdmissionPreset.requestToJoin ||
      this == EventAdmissionPreset.requestToJoinMembersExempt;

  String label(AppLocalizations l10n) => switch (this) {
    EventAdmissionPreset.openCapacity =>
      l10n.hostsCreateEventPolicyStateLabelOpen,
    EventAdmissionPreset.inviteOnly =>
      l10n.hostsCreateEventPolicyStateLabelInvite,
    EventAdmissionPreset.requestToJoin =>
      l10n.hostsCreateEventPolicyStateLabelRequest,
    EventAdmissionPreset.requestToJoinMembersExempt =>
      l10n.hostsCreateEventPolicyStateLabelMembersSkipReview,
    EventAdmissionPreset.balancedSingles =>
      l10n.hostsCreateEventPolicyStateLabelBalanced,
  };

  String title(AppLocalizations l10n) => switch (this) {
    EventAdmissionPreset.openCapacity =>
      l10n.hostsCreateEventPolicyStateTitleOpenCapacity,
    EventAdmissionPreset.inviteOnly =>
      l10n.hostsCreateEventPolicyStateTitleInviteOnly,
    EventAdmissionPreset.requestToJoin =>
      l10n.hostsCreateEventPolicyStateTitleRequestToJoin,
    EventAdmissionPreset.requestToJoinMembersExempt =>
      l10n.hostsCreateEventPolicyStateTitleMembersSkipReview,
    EventAdmissionPreset.balancedSingles =>
      l10n.hostsCreateEventPolicyStateTitleBalancedSingles,
  };

  String description(AppLocalizations l10n) => switch (this) {
    EventAdmissionPreset.openCapacity =>
      l10n.hostsCreateEventPolicyStateDescriptionAnyoneEligibleCanBook,
    EventAdmissionPreset.inviteOnly =>
      l10n.hostsCreateEventPolicyStateDescriptionOnlyPeopleWithThe,
    EventAdmissionPreset.requestToJoin =>
      l10n.hostsCreateEventPolicyStateDescriptionPeopleRequestASpot,
    EventAdmissionPreset.requestToJoinMembersExempt =>
      l10n.hostsCreateEventPolicyStateDescriptionMembersSkipReview,
    EventAdmissionPreset.balancedSingles =>
      l10n.hostsCreateEventPolicyStateDescriptionStraightMenAndWomen,
  };
}

class CreateEventPolicyState {
  const CreateEventPolicyState({
    this.admissionPreset = EventAdmissionPreset.openCapacity,
    this.cohortCapsEnabled = false,
    this.dynamicPricingEnabled = false,
    this.crossPathsPairInventoryEnabled = false,
    this.cancellationPolicyId = EventCancellationPolicyId.standard,
  });

  factory CreateEventPolicyState.fromDefaults(EventPolicyDefaults defaults) {
    return CreateEventPolicyState(
      admissionPreset: admissionPresetFromDefault(defaults.admissionPreset),
      cohortCapsEnabled:
          defaults.admissionPreset ==
              EventAdmissionDefaultPreset.fixedCohortCaps ||
          defaults.maxMen != null ||
          defaults.maxWomen != null,
      dynamicPricingEnabled: defaults.dynamicPricingEnabled,
      cancellationPolicyId: defaults.cancellationPolicyId,
    );
  }

  factory CreateEventPolicyState.fromDraft({
    required String? admissionPreset,
    required String? cancellationPolicy,
    required String? maxMen,
    required String? maxWomen,
    required bool dynamicPricingEnabled,
    bool crossPathsPairInventoryEnabled = false,
  }) {
    return CreateEventPolicyState(
      admissionPreset: admissionPresetFromName(admissionPreset),
      cohortCapsEnabled:
          admissionPreset == 'fixedCohortCaps' ||
          maxMen != null ||
          maxWomen != null,
      dynamicPricingEnabled: dynamicPricingEnabled,
      crossPathsPairInventoryEnabled: crossPathsPairInventoryEnabled,
      cancellationPolicyId: cancellationPolicyFromName(cancellationPolicy),
    );
  }

  final EventAdmissionPreset admissionPreset;
  final bool cohortCapsEnabled;
  final bool dynamicPricingEnabled;
  final bool crossPathsPairInventoryEnabled;
  final EventCancellationPolicyId cancellationPolicyId;

  CreateEventPolicyState selectAdmissionPreset(EventAdmissionPreset preset) {
    return CreateEventPolicyState(
      admissionPreset: preset,
      cohortCapsEnabled: preset == EventAdmissionPreset.openCapacity
          ? cohortCapsEnabled
          : false,
      dynamicPricingEnabled: preset == EventAdmissionPreset.balancedSingles
          ? dynamicPricingEnabled
          : false,
      crossPathsPairInventoryEnabled: crossPathsPairInventoryEnabled,
      cancellationPolicyId: cancellationPolicyId,
    );
  }

  CreateEventPolicyState setCohortCapsEnabled(bool enabled) {
    return CreateEventPolicyState(
      admissionPreset: admissionPreset,
      cohortCapsEnabled: enabled,
      dynamicPricingEnabled: dynamicPricingEnabled,
      crossPathsPairInventoryEnabled: crossPathsPairInventoryEnabled,
      cancellationPolicyId: cancellationPolicyId,
    );
  }

  CreateEventPolicyState setDynamicPricingEnabled(bool enabled) {
    return CreateEventPolicyState(
      admissionPreset: admissionPreset,
      cohortCapsEnabled: cohortCapsEnabled,
      dynamicPricingEnabled: enabled,
      crossPathsPairInventoryEnabled: crossPathsPairInventoryEnabled,
      cancellationPolicyId: cancellationPolicyId,
    );
  }

  CreateEventPolicyState setCrossPathsPairInventoryEnabled(bool enabled) {
    return CreateEventPolicyState(
      admissionPreset: admissionPreset,
      cohortCapsEnabled: cohortCapsEnabled,
      dynamicPricingEnabled: dynamicPricingEnabled,
      crossPathsPairInventoryEnabled: enabled,
      cancellationPolicyId: cancellationPolicyId,
    );
  }

  CreateEventPolicyState setCancellationPolicy(
    EventCancellationPolicyId policyId,
  ) {
    return CreateEventPolicyState(
      admissionPreset: admissionPreset,
      cohortCapsEnabled: cohortCapsEnabled,
      dynamicPricingEnabled: dynamicPricingEnabled,
      crossPathsPairInventoryEnabled: crossPathsPairInventoryEnabled,
      cancellationPolicyId: policyId,
    );
  }

  String get draftAdmissionPresetName =>
      admissionPreset == EventAdmissionPreset.openCapacity && cohortCapsEnabled
      ? 'fixedCohortCaps'
      : admissionPreset.name;

  EventAdmissionDefaultPreset get admissionDefaultPreset {
    if (admissionPreset == EventAdmissionPreset.openCapacity &&
        cohortCapsEnabled) {
      return EventAdmissionDefaultPreset.fixedCohortCaps;
    }
    return switch (admissionPreset) {
      EventAdmissionPreset.openCapacity =>
        EventAdmissionDefaultPreset.openCapacity,
      EventAdmissionPreset.inviteOnly => EventAdmissionDefaultPreset.inviteOnly,
      EventAdmissionPreset.requestToJoin ||
      EventAdmissionPreset.requestToJoinMembersExempt =>
        EventAdmissionDefaultPreset.openCapacity,
      EventAdmissionPreset.balancedSingles =>
        EventAdmissionDefaultPreset.balancedSingles,
    };
  }

  EventPolicyDefaults defaultsFromFields({
    required String minAge,
    required String maxAge,
    required String maxMen,
    required String maxWomen,
    required String dynamicPricingStep,
    required String dynamicPricingMax,
    required String currencyCode,
  }) {
    return EventPolicyDefaults(
      admissionPreset: admissionDefaultPreset,
      minAge: int.tryParse(minAge.trim()) ?? 0,
      maxAge: int.tryParse(maxAge.trim()) ?? 99,
      maxMen: int.tryParse(maxMen.trim()),
      maxWomen: int.tryParse(maxWomen.trim()),
      dynamicPricingEnabled: dynamicPricingEnabled,
      dynamicPricingStepInPaise: currencyTextInMinorUnits(
        dynamicPricingStep,
        currencyCode: currencyCode,
      ),
      dynamicPricingMaxInPaise: currencyTextInMinorUnits(
        dynamicPricingMax,
        currencyCode: currencyCode,
      ),
      cancellationPolicyId: cancellationPolicyId,
    );
  }

  EventPolicyBundle eventPolicyFromFields({
    required String capacity,
    required String basePrice,
    required String inviteCode,
    required String minAge,
    required String maxAge,
    required String maxMen,
    required String maxWomen,
    required String dynamicPricingStep,
    required String dynamicPricingMax,
    required String currencyCode,
    String crossPathsPairCapacity = '0',
  }) {
    final capacityLimit = int.parse(capacity.trim());
    final basePriceInPaise = currencyTextInMinorUnits(
      basePrice,
      currencyCode: currencyCode,
    )!;
    final defaults = defaultsFromFields(
      minAge: minAge,
      maxAge: maxAge,
      maxMen: maxMen,
      maxWomen: maxWomen,
      dynamicPricingStep: dynamicPricingStep,
      dynamicPricingMax: dynamicPricingMax,
      currencyCode: currencyCode,
    );
    if (admissionPreset.requiresReview) {
      final policy = EventPolicyBundle.requestToJoinEvent(
        capacityLimit: capacityLimit,
        approvedMembersSkipReview:
            admissionPreset == EventAdmissionPreset.requestToJoinMembersExempt,
        basePriceInPaise: basePriceInPaise,
        cancellationPolicy: defaults.cancellationPolicy,
      );
      return _withPairInventory(policy, crossPathsPairCapacity);
    }
    final policy = defaults.toEventPolicyBundle(
      capacityLimit: capacityLimit,
      basePriceInPaise: basePriceInPaise,
      inviteCodeHint: inviteCodeHint(inviteCode),
    );
    return _withPairInventory(policy, crossPathsPairCapacity);
  }

  EventPolicyBundle _withPairInventory(
    EventPolicyBundle policy,
    String capacityText,
  ) {
    final reserved = crossPathsPairInventoryEnabled
        ? int.tryParse(capacityText.trim()) ?? 0
        : 0;
    return policy.withCrossPathsPairInventory(
      reservedPairCapacity: reserved.clamp(0, policy.capacityLimit),
    );
  }

  static EventAdmissionPreset admissionPresetFromName(String? name) {
    if (name == null) return EventAdmissionPreset.openCapacity;
    if (name == 'fixedCohortCaps') {
      return EventAdmissionPreset.openCapacity;
    }
    return EventAdmissionPreset.values.firstWhere(
      (preset) => preset.name == name,
      orElse: () => EventAdmissionPreset.openCapacity,
    );
  }

  static EventAdmissionPreset admissionPresetFromDefault(
    EventAdmissionDefaultPreset preset,
  ) {
    return switch (preset) {
      EventAdmissionDefaultPreset.openCapacity =>
        EventAdmissionPreset.openCapacity,
      EventAdmissionDefaultPreset.inviteOnly => EventAdmissionPreset.inviteOnly,
      EventAdmissionDefaultPreset.balancedSingles =>
        EventAdmissionPreset.balancedSingles,
      EventAdmissionDefaultPreset.fixedCohortCaps =>
        EventAdmissionPreset.openCapacity,
    };
  }

  static EventCancellationPolicyId cancellationPolicyFromName(String? name) {
    if (name == null) return EventCancellationPolicyId.standard;
    return EventCancellationPolicyId.values.firstWhere(
      (policyId) => policyId.name == name,
      orElse: () => EventCancellationPolicyId.standard,
    );
  }

  static String? inviteCodeHint(String inviteCode) {
    final code = inviteCode.trim();
    if (code.isEmpty) return null;
    if (code.length <= 4) return code;
    return '${code.substring(0, 2)}...${code.substring(code.length - 2)}';
  }

  static int? currencyTextInMinorUnits(
    String text, {
    required String currencyCode,
  }) => parseMajorCurrencyAmountToMinorUnits(text, currencyCode: currencyCode);

  static String minorUnitsText(int? value, {required String currencyCode}) =>
      minorCurrencyAmountInputText(value, currencyCode: currencyCode);
}

class CreateEventPolicyDefaultsFormState {
  const CreateEventPolicyDefaultsFormState({
    required this.policyState,
    required this.minAgeText,
    required this.maxAgeText,
    required this.maxMenText,
    required this.maxWomenText,
    required this.dynamicPricingStepText,
    required this.dynamicPricingMaxText,
  });

  factory CreateEventPolicyDefaultsFormState.fromDefaults(
    EventPolicyDefaults defaults, {
    required String currencyCode,
  }) {
    return CreateEventPolicyDefaultsFormState(
      policyState: CreateEventPolicyState.fromDefaults(defaults),
      minAgeText: defaults.minAge == 0 ? '' : defaults.minAge.toString(),
      maxAgeText: defaults.maxAge == 99 ? '' : defaults.maxAge.toString(),
      maxMenText: defaults.maxMen?.toString() ?? '',
      maxWomenText: defaults.maxWomen?.toString() ?? '',
      dynamicPricingStepText: CreateEventPolicyState.minorUnitsText(
        defaults.dynamicPricingStepInPaise,
        currencyCode: currencyCode,
      ),
      dynamicPricingMaxText: CreateEventPolicyState.minorUnitsText(
        defaults.dynamicPricingMaxInPaise,
        currencyCode: currencyCode,
      ),
    );
  }

  final CreateEventPolicyState policyState;
  final String minAgeText;
  final String maxAgeText;
  final String maxMenText;
  final String maxWomenText;
  final String dynamicPricingStepText;
  final String dynamicPricingMaxText;
}
