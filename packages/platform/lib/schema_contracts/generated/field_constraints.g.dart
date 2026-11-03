// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

import 'package:catch_ui/catch_ui.dart' show CatchContractFieldConstraints;

/// App-owned field constraints for the schema fields that app forms bind to,
/// as declared in contracts/forms/field_constraint_bindings.json.

abstract final class CatchContractConstraints {
  static const accessApplicationDocumentAvailabilityWindows = CatchContractFieldConstraints(
    path: 'accessApplicationDocument.availabilityWindows',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['weekdayMornings', 'weekdayEvenings', 'saturdayMornings', 'saturdayEvenings', 'sundayMornings', 'sundayEvenings'],
    minItems: 1,
    maxItems: 6,
    uniqueItems: true,
  );

  static const accessApplicationDocumentCity = CatchContractFieldConstraints(
    path: 'accessApplicationDocument.city',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
  );

  static const accessApplicationDocumentEventTypes = CatchContractFieldConstraints(
    path: 'accessApplicationDocument.eventTypes',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['runClub', 'walkingSocial', 'coffee', 'boardGames', 'fitnessClass', 'food', 'culture'],
    minItems: 1,
    maxItems: 7,
    uniqueItems: true,
  );

  static const accessApplicationDocumentInstagramHandle = CatchContractFieldConstraints(
    path: 'accessApplicationDocument.instagramHandle',
    maxLength: 30,
    valueTypes: <String>['string'],
    pattern: '^[A-Za-z0-9._]{0,30}\$',
  );

  static const accessApplicationDocumentInviteCode = CatchContractFieldConstraints(
    path: 'accessApplicationDocument.inviteCode',
    maxLength: 64,
    valueTypes: <String>['string'],
    pattern: '^[A-Za-z0-9_-]*\$',
  );

  static const accessApplicationDocumentReferralSource = CatchContractFieldConstraints(
    path: 'accessApplicationDocument.referralSource',
    maxLength: 240,
    valueTypes: <String>['string'],
  );

  static const accessApplicationDocumentRole = CatchContractFieldConstraints(
    path: 'accessApplicationDocument.role',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['member', 'host', 'both'],
  );

  static const accessApplicationDocumentWantsToHost = CatchContractFieldConstraints(
    path: 'accessApplicationDocument.wantsToHost',
    required: true,
    valueTypes: <String>['boolean'],
  );

  static const accessApplicationDocumentWhyCatch = CatchContractFieldConstraints(
    path: 'accessApplicationDocument.whyCatch',
    maxLength: 1000,
    minLength: 12,
    valueTypes: <String>['string'],
  );

  static const addOrganizerHostCallablePayloadPhoneNumber = CatchContractFieldConstraints(
    path: 'addOrganizerHostCallablePayload.phoneNumber',
    maxLength: 32,
    minLength: 6,
    required: true,
    valueTypes: <String>['string'],
  );

  static const applyProgramFunctionInvitationsCallablePayloadInvitationMode = CatchContractFieldConstraints(
    path: 'applyProgramFunctionInvitationsCallablePayload.invitationMode',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['allGuests', 'selectedGuests'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileChildren = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.children',
    valueTypes: <String>['string'],
    enumValues: <String>['dontHave', 'haveWantMore', 'haveNoMore', 'wantSomeday', 'dontWant'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileCity = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.city',
    maxLength: 120,
    minLength: 1,
    valueTypes: <String>['string'],
    pattern: '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
  );

  static const claimParticipantFormProfileCallablePayloadProfileCompany = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.company',
    maxLength: 120,
    valueTypes: <String>['string'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileDateOfBirth = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.dateOfBirth',
    required: true,
    valueTypes: <String>['string'],
    format: 'date',
  );

  static const claimParticipantFormProfileCallablePayloadProfileDiet = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.diet',
    valueTypes: <String>['string'],
    enumValues: <String>['omnivore', 'vegetarian', 'vegan', 'jain', 'other'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileDisplayName = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.displayName',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
    pattern: '.*\\S.*',
  );

  static const claimParticipantFormProfileCallablePayloadProfileDrinking = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.drinking',
    valueTypes: <String>['string'],
    enumValues: <String>['never', 'socially', 'often'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileEducation = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.education',
    valueTypes: <String>['string'],
    enumValues: <String>['highSchool', 'someCollege', 'bachelors', 'masters', 'phd', 'tradeSchool', 'other'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileEmail = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.email',
    maxLength: 320,
    valueTypes: <String>['string'],
    format: 'email',
  );

  static const claimParticipantFormProfileCallablePayloadProfileFirstName = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.firstName',
    maxLength: 80,
    valueTypes: <String>['string'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileGender = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.gender',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['man', 'woman', 'nonBinary', 'other'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileHeight = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.height',
    valueTypes: <String>['integer'],
    minimum: 120,
    maximum: 220,
  );

  static const claimParticipantFormProfileCallablePayloadProfileInstagramHandle = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.instagramHandle',
    maxLength: 30,
    minLength: 1,
    valueTypes: <String>['string'],
    pattern: '^[A-Za-z0-9._]{1,30}\$',
  );

  static const claimParticipantFormProfileCallablePayloadProfileInterestedInGenders = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.interestedInGenders',
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['man', 'woman', 'nonBinary', 'other'],
    minItems: 0,
    maxItems: 8,
    uniqueItems: true,
  );

  static const claimParticipantFormProfileCallablePayloadProfileInterestedInGendersItems = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.interestedInGenders.items',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['man', 'woman', 'nonBinary', 'other'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileLanguages = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.languages',
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['english', 'hindi', 'marathi', 'tamil', 'telugu', 'kannada', 'bengali', 'gujarati', 'punjabi', 'malayalam', 'odia', 'other'],
    maxItems: 20,
    uniqueItems: true,
  );

  static const claimParticipantFormProfileCallablePayloadProfileLanguagesItems = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.languages.items',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['english', 'hindi', 'marathi', 'tamil', 'telugu', 'kannada', 'bengali', 'gujarati', 'punjabi', 'malayalam', 'odia', 'other'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileLastName = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.lastName',
    maxLength: 80,
    valueTypes: <String>['string'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileName = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.name',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileOccupation = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.occupation',
    maxLength: 120,
    valueTypes: <String>['string'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileRelationshipGoal = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.relationshipGoal',
    valueTypes: <String>['string'],
    enumValues: <String>['relationship', 'casual', 'marriage', 'friendship', 'unsure'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileReligion = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.religion',
    valueTypes: <String>['string'],
    enumValues: <String>['hindu', 'muslim', 'christian', 'sikh', 'jain', 'buddhist', 'other', 'nonReligious'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileSmoking = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.smoking',
    valueTypes: <String>['string'],
    enumValues: <String>['never', 'occasionally', 'often'],
  );

  static const claimParticipantFormProfileCallablePayloadProfileWorkout = CatchContractFieldConstraints(
    path: 'claimParticipantFormProfileCallablePayload.profile.workout',
    valueTypes: <String>['string'],
    enumValues: <String>['never', 'sometimes', 'often', 'everyday'],
  );

  static const configureEventAssignmentFeaturesCallablePayloadRulesItemsKind = CatchContractFieldConstraints(
    path: 'configureEventAssignmentFeaturesCallablePayload.rules.items.kind',
    required: true,
    enumValues: <String>['category', 'set', 'number', 'ordinal'],
  );

  static const configureEventAssignmentFeaturesCallablePayloadRulesItemsMaximum = CatchContractFieldConstraints(
    path: 'configureEventAssignmentFeaturesCallablePayload.rules.items.maximum',
    valueTypes: <String>['number'],
  );

  static const configureEventAssignmentFeaturesCallablePayloadRulesItemsMinimum = CatchContractFieldConstraints(
    path: 'configureEventAssignmentFeaturesCallablePayload.rules.items.minimum',
    valueTypes: <String>['number'],
  );

  static const configureEventAssignmentFeaturesCallablePayloadRulesItemsMode = CatchContractFieldConstraints(
    path: 'configureEventAssignmentFeaturesCallablePayload.rules.items.mode',
    required: true,
    enumValues: <String>['preferSimilar', 'preferDifferent', 'balanceAcrossGroups'],
  );

  static const configureEventAssignmentFeaturesCallablePayloadRulesItemsWeight = CatchContractFieldConstraints(
    path: 'configureEventAssignmentFeaturesCallablePayload.rules.items.weight',
    required: true,
    valueTypes: <String>['number'],
    minimum: 0,
    maximum: 100,
  );

  static const configureEventOfferPreferencesCallablePayloadIntentsCurrencyValue = CatchContractFieldConstraints(
    path: 'configureEventOfferPreferencesCallablePayload.intents.currency.value',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[A-Z]{3}\$',
  );

  static const configureEventOfferPreferencesCallablePayloadIntentsExpectedAmountMinorValue = CatchContractFieldConstraints(
    path: 'configureEventOfferPreferencesCallablePayload.intents.expectedAmountMinor.value',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 100000000,
  );

  static const configureEventOfferPreferencesCallablePayloadIntentsOfferValidityMinutesValue = CatchContractFieldConstraints(
    path: 'configureEventOfferPreferencesCallablePayload.intents.offerValidityMinutes.value',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 5,
    maximum: 10080,
  );

  static const configureEventOfferPreferencesCallablePayloadIntentsPaymentInstructionsValue = CatchContractFieldConstraints(
    path: 'configureEventOfferPreferencesCallablePayload.intents.paymentInstructions.value',
    maxLength: 1000,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const configureEventOfferPreferencesCallablePayloadIntentsReusablePaymentPageValueReusableForEvents = CatchContractFieldConstraints(
    path: 'configureEventOfferPreferencesCallablePayload.intents.reusablePaymentPage.value.reusableForEvents',
    required: true,
    valueTypes: <String>['boolean'],
  );

  static const configureEventOfferPreferencesCallablePayloadIntentsReusablePaymentPageValueUrl = CatchContractFieldConstraints(
    path: 'configureEventOfferPreferencesCallablePayload.intents.reusablePaymentPage.value.url',
    maxLength: 2048,
    required: true,
    valueTypes: <String>['string'],
    format: 'uri',
  );

  static const confirmEventAssistanceDepartureCallablePayloadCommandPayloadCheckpointRequestDueAt = CatchContractFieldConstraints(
    path: 'confirmEventAssistanceDepartureCallablePayload.command.payload.checkpointRequest.dueAt',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 9007199254740991,
  );

  static const controlEventRehearsalCallablePayloadStaffDecisionDuty = CatchContractFieldConstraints(
    path: 'controlEventRehearsalCallablePayload.staff.decision.duty',
    required: true,
    enumValues: <String>['lead', 'pacer', 'sweep'],
  );

  static const controlEventRehearsalCallablePayloadStaffDecisionExpiresAtMillis = CatchContractFieldConstraints(
    path: 'controlEventRehearsalCallablePayload.staff.decision.expiresAtMillis',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 9007199254740991,
  );

  static const controlEventRehearsalCallablePayloadStaffDisplayName = CatchContractFieldConstraints(
    path: 'controlEventRehearsalCallablePayload.staff.displayName',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const controlEventRehearsalCallablePayloadStaffGroupId = CatchContractFieldConstraints(
    path: 'controlEventRehearsalCallablePayload.staff.groupId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createChatMessageClientWriteDataText = CatchContractFieldConstraints(
    path: 'createChatMessageClientWrite.data.text',
    maxLength: 2000,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createEventCallablePayloadCapacityLimit = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.capacityLimit',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 1000,
  );

  static const createEventCallablePayloadConstraintsMaxAge = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.constraints.maxAge',
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 120,
  );

  static const createEventCallablePayloadConstraintsMaxMen = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.constraints.maxMen',
    valueTypes: <String>['integer'],
    minimum: 0,
  );

  static const createEventCallablePayloadConstraintsMaxWomen = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.constraints.maxWomen',
    valueTypes: <String>['integer'],
    minimum: 0,
  );

  static const createEventCallablePayloadConstraintsMinAge = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.constraints.minAge',
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 120,
  );

  static const createEventCallablePayloadDescription = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.description',
    maxLength: 2000,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createEventCallablePayloadDistanceKm = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.distanceKm',
    required: true,
    valueTypes: <String>['number'],
    minimum: 0,
    maximum: 100,
  );

  static const createEventCallablePayloadEventFormatActivityDetailsPublicDetailsAccessibility = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventFormat.activityDetails.publicDetails.accessibility',
    maxLength: 2000,
    valueTypes: <String>['string'],
  );

  static const createEventCallablePayloadEventFormatActivityDetailsPublicDetailsIncluded = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventFormat.activityDetails.publicDetails.included',
    maxLength: 2000,
    valueTypes: <String>['string'],
  );

  static const createEventCallablePayloadEventFormatActivityDetailsRoutePlanGroupStrategy = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventFormat.activityDetails.routePlan.groupStrategy',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['together', 'paceGroups', 'selfDirected'],
  );

  static const createEventCallablePayloadEventFormatActivityDetailsRoutePlanLiveTrackingPolicyMode = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventFormat.activityDetails.routePlan.liveTrackingPolicy.mode',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['disabled', 'hostOnly', 'authorizedOperators'],
  );

  static const createEventCallablePayloadEventFormatActivityDetailsRoutePlanMovementMode = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventFormat.activityDetails.routePlan.movementMode',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['run', 'walk', 'ride', 'mixed'],
  );

  static const createEventCallablePayloadEventFormatActivityDetailsRoutePlanPaceGroups = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventFormat.activityDetails.routePlan.paceGroups',
    valueTypes: <String>['array'],
    itemValueTypes: <String>['object'],
    maxItems: 12,
  );

  static const createEventCallablePayloadEventFormatActivityDetailsRoutePlanRoleKinds = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventFormat.activityDetails.routePlan.roleKinds',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['routeLead', 'sweep', 'pacer', 'stopHost', 'marshal', 'photographer'],
    minItems: 1,
    maxItems: 6,
    uniqueItems: true,
  );

  static const createEventCallablePayloadEventFormatActivityDetailsRoutePlanRouteShape = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventFormat.activityDetails.routePlan.routeShape',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['loop', 'outAndBack', 'pointToPoint'],
  );

  static const createEventCallablePayloadEventFormatActivityDetailsRoutePlanStopCadence = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventFormat.activityDetails.routePlan.stopCadence',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['continuous', 'flexibleStops', 'hostedStops'],
  );

  static const createEventCallablePayloadEventFormatActivityDetailsRoutePlanStopKinds = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventFormat.activityDetails.routePlan.stopKinds',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['water', 'regroup', 'venue', 'photoSpot', 'viewpoint', 'hazard', 'turnaround'],
    minItems: 1,
    maxItems: 7,
    uniqueItems: true,
  );

  static const createEventCallablePayloadEventFormatActivityKind = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventFormat.activityKind',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['socialRun', 'running', 'walking', 'pickleball', 'padel', 'tennis', 'badminton', 'cycling', 'spinClass', 'yoga', 'strengthTraining', 'pubQuiz', 'barCrawl', 'dinner', 'singlesMixer', 'openActivity'],
  );

  static const createEventCallablePayloadEventFormatCustomActivityLabel = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventFormat.customActivityLabel',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createEventCallablePayloadEventFormatInteractionModel = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventFormat.interactionModel',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['pacePods', 'pairedRotations', 'teamRotations', 'seatedTable', 'freeFormMixer', 'hostLedProgram', 'openFormat'],
  );

  static const createEventCallablePayloadEventPolicyAdmissionCrossPathsPairInventoryEnabled = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventPolicy.admission.crossPathsPairInventory.enabled',
    required: true,
    valueTypes: <String>['boolean'],
  );

  static const createEventCallablePayloadEventPolicyAdmissionCrossPathsPairInventoryReservedPairCapacity = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventPolicy.admission.crossPathsPairInventory.reservedPairCapacity',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 100,
  );

  static const createEventCallablePayloadEventPolicyAdmissionFormat = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventPolicy.admission.format',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['open', 'inviteOnly', 'manualApproval', 'fixedCohortCaps', 'balancedRatio', 'membersOnly'],
  );

  static const createEventCallablePayloadEventPolicyCancellationPolicyId = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventPolicy.cancellation.policyId',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['notApplicable', 'flexible', 'standard', 'strict'],
  );

  static const createEventCallablePayloadEventPolicyPricingDemandPricingRulesItemsMaxAdjustmentInPaise = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventPolicy.pricing.demandPricingRules.items.maxAdjustmentInPaise',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 100000000,
  );

  static const createEventCallablePayloadEventPolicyPricingDemandPricingRulesItemsStepAdjustmentInPaise = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.eventPolicy.pricing.demandPricingRules.items.stepAdjustmentInPaise',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 100000000,
  );

  static const createEventCallablePayloadExternalOriginExternalEventId = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.externalOrigin.externalEventId',
    maxLength: 240,
    valueTypes: <String>['string'],
  );

  static const createEventCallablePayloadExternalOriginExternalEventUrl = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.externalOrigin.externalEventUrl',
    maxLength: 2048,
    valueTypes: <String>['string'],
    format: 'uri',
  );

  static const createEventCallablePayloadExternalOriginProvider = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.externalOrigin.provider',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['generic', 'luma', 'eventbrite', 'partiful', 'posh', 'bookmyshow', 'district', 'sortmyscene', 'airbnb'],
  );

  static const createEventCallablePayloadItineraryItemsDescription = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.itinerary.items.description',
    maxLength: 500,
    valueTypes: <String>['string'],
  );

  static const createEventCallablePayloadItineraryItemsDurationMinutes = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.itinerary.items.durationMinutes',
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 1440,
  );

  static const createEventCallablePayloadItineraryItemsKind = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.itinerary.items.kind',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['gather', 'activity', 'stop', 'break', 'transition', 'finish'],
  );

  static const createEventCallablePayloadItineraryItemsOffsetMinutes = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.itinerary.items.offsetMinutes',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 1440,
  );

  static const createEventCallablePayloadItineraryItemsRouteDistanceMeters = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.itinerary.items.routeDistanceMeters',
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 1000000,
  );

  static const createEventCallablePayloadItineraryItemsTitle = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.itinerary.items.title',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createEventCallablePayloadLocationDetails = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.locationDetails',
    maxLength: 1000,
    valueTypes: <String>['string'],
  );

  static const createEventCallablePayloadMeetingPoint = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.meetingPoint',
    maxLength: 240,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createEventCallablePayloadName = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.name',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createEventCallablePayloadPace = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.pace',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['easy', 'moderate', 'fast', 'competitive'],
  );

  static const createEventCallablePayloadPriceInPaise = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.priceInPaise',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 100000000,
  );

  static const createEventCallablePayloadPrivateAccessInviteCode = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.privateAccess.inviteCode',
    maxLength: 64,
    minLength: 4,
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[A-Za-z0-9_-]+\$',
  );

  static const createEventCallablePayloadRuntimeWalkInPolicy = CatchContractFieldConstraints(
    path: 'createEventCallablePayload.runtimeWalkInPolicy',
    valueTypes: <String>['string'],
    enumValues: <String>['deny', 'hostApproval', 'autoCreate'],
  );

  static const createEventInviteLinkCallablePayloadLabel = CatchContractFieldConstraints(
    path: 'createEventInviteLinkCallablePayload.label',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createEventInviteLinkCallablePayloadSource = CatchContractFieldConstraints(
    path: 'createEventInviteLinkCallablePayload.source',
    maxLength: 80,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const createEventRehearsalCallablePayloadActorCount = CatchContractFieldConstraints(
    path: 'createEventRehearsalCallablePayload.actorCount',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 2,
    maximum: 50,
  );

  static const createEventReviewCallablePayloadComment = CatchContractFieldConstraints(
    path: 'createEventReviewCallablePayload.comment',
    maxLength: 1000,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createOrganizerCallablePayloadArea = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.area',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createOrganizerCallablePayloadDescription = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.description',
    maxLength: 2000,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createOrganizerCallablePayloadEmail = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.email',
    maxLength: 320,
    valueTypes: <String>['string'],
  );

  static const createOrganizerCallablePayloadHostDefaultsEventPolicyAdmissionPreset = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.hostDefaults.eventPolicy.admissionPreset',
    valueTypes: <String>['string'],
    enumValues: <String>['openCapacity', 'inviteOnly', 'balancedSingles', 'fixedCohortCaps'],
  );

  static const createOrganizerCallablePayloadHostDefaultsEventPolicyCancellationPolicyId = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.hostDefaults.eventPolicy.cancellationPolicyId',
    valueTypes: <String>['string'],
    enumValues: <String>['flexible', 'standard', 'strict'],
  );

  static const createOrganizerCallablePayloadHostDefaultsEventPolicyDynamicPricingEnabled = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.hostDefaults.eventPolicy.dynamicPricingEnabled',
    valueTypes: <String>['boolean'],
  );

  static const createOrganizerCallablePayloadHostDefaultsEventPolicyDynamicPricingMaxInPaise = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.hostDefaults.eventPolicy.dynamicPricingMaxInPaise',
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 100000000,
  );

  static const createOrganizerCallablePayloadHostDefaultsEventPolicyDynamicPricingStepInPaise = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.hostDefaults.eventPolicy.dynamicPricingStepInPaise',
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 100000000,
  );

  static const createOrganizerCallablePayloadHostDefaultsEventPolicyMaxAge = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.hostDefaults.eventPolicy.maxAge',
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 120,
  );

  static const createOrganizerCallablePayloadHostDefaultsEventPolicyMaxMen = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.hostDefaults.eventPolicy.maxMen',
    valueTypes: <String>['integer'],
    minimum: 0,
  );

  static const createOrganizerCallablePayloadHostDefaultsEventPolicyMaxWomen = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.hostDefaults.eventPolicy.maxWomen',
    valueTypes: <String>['integer'],
    minimum: 0,
  );

  static const createOrganizerCallablePayloadHostDefaultsEventPolicyMinAge = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.hostDefaults.eventPolicy.minAge',
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 120,
  );

  static const createOrganizerCallablePayloadHostDefaultsEventSuccessEnabled = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.hostDefaults.eventSuccess.enabled',
    valueTypes: <String>['boolean'],
  );

  static const createOrganizerCallablePayloadHostDefaultsPrimaryActivityKind = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.hostDefaults.primaryActivityKind',
    valueTypes: <String>['string'],
    enumValues: <String>['socialRun', 'running', 'walking', 'pickleball', 'padel', 'tennis', 'badminton', 'cycling', 'spinClass', 'yoga', 'strengthTraining', 'pubQuiz', 'barCrawl', 'dinner', 'singlesMixer', 'openActivity'],
  );

  static const createOrganizerCallablePayloadInstagramHandle = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.instagramHandle',
    maxLength: 320,
    valueTypes: <String>['string'],
  );

  static const createOrganizerCallablePayloadLocation = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.location',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
  );

  static const createOrganizerCallablePayloadName = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.name',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createOrganizerCallablePayloadOrganizerType = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.organizerType',
    valueTypes: <String>['string'],
    enumValues: <String>['club', 'community', 'individual', 'eventProducer', 'venue', 'brand'],
  );

  static const createOrganizerCallablePayloadPhoneNumber = CatchContractFieldConstraints(
    path: 'createOrganizerCallablePayload.phoneNumber',
    maxLength: 320,
    valueTypes: <String>['string'],
  );

  static const createOrganizerContactCallablePayloadDisplayName = CatchContractFieldConstraints(
    path: 'createOrganizerContactCallablePayload.displayName',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createOrganizerContactCallablePayloadEmail = CatchContractFieldConstraints(
    path: 'createOrganizerContactCallablePayload.email',
    maxLength: 320,
    valueTypes: <String>['string'],
    format: 'email',
  );

  static const createOrganizerContactCallablePayloadInitialNote = CatchContractFieldConstraints(
    path: 'createOrganizerContactCallablePayload.initialNote',
    maxLength: 2000,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createOrganizerContactCallablePayloadPhoneE164 = CatchContractFieldConstraints(
    path: 'createOrganizerContactCallablePayload.phoneE164',
    valueTypes: <String>['string'],
    pattern: '^\\+[1-9][0-9]{7,14}\$',
  );

  static const createOrganizerContactNoteCallablePayloadBody = CatchContractFieldConstraints(
    path: 'createOrganizerContactNoteCallablePayload.body',
    maxLength: 2000,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createOrganizerFormAutomationCallablePayloadActionsItemsCampaignId = CatchContractFieldConstraints(
    path: 'createOrganizerFormAutomationCallablePayload.actions.items.campaignId',
    maxLength: 180,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const createOrganizerFormAutomationCallablePayloadActionsItemsEventId = CatchContractFieldConstraints(
    path: 'createOrganizerFormAutomationCallablePayload.actions.items.eventId',
    maxLength: 180,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const createOrganizerFormAutomationCallablePayloadActionsItemsKind = CatchContractFieldConstraints(
    path: 'createOrganizerFormAutomationCallablePayload.actions.items.kind',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['notifyTeam', 'addOrganizerTag', 'createCrmContact', 'addApplicationQueue', 'proposeEventAttendee', 'signedWebhook', 'campaignHandoff'],
  );

  static const createOrganizerFormAutomationCallablePayloadActionsItemsTagId = CatchContractFieldConstraints(
    path: 'createOrganizerFormAutomationCallablePayload.actions.items.tagId',
    maxLength: 80,
    valueTypes: <String>['string'],
  );

  static const createOrganizerFormAutomationCallablePayloadActionsItemsWebhookUrl = CatchContractFieldConstraints(
    path: 'createOrganizerFormAutomationCallablePayload.actions.items.webhookUrl',
    maxLength: 2000,
    valueTypes: <String>['string'],
    format: 'uri',
  );

  static const createOrganizerFormAutomationCallablePayloadEnabled = CatchContractFieldConstraints(
    path: 'createOrganizerFormAutomationCallablePayload.enabled',
    required: true,
    valueTypes: <String>['boolean'],
  );

  static const createOrganizerFormAutomationCallablePayloadName = CatchContractFieldConstraints(
    path: 'createOrganizerFormAutomationCallablePayload.name',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createOrganizerFormAutomationCallablePayloadTrigger = CatchContractFieldConstraints(
    path: 'createOrganizerFormAutomationCallablePayload.trigger',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['responseSubmitted', 'responseWithdrawn', 'answerMatches', 'applicationAccepted', 'eventAttended'],
  );

  static const createOrganizerFormShareLinkCallablePayloadLabel = CatchContractFieldConstraints(
    path: 'createOrganizerFormShareLinkCallablePayload.label',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createOrganizerFormShareLinkCallablePayloadSource = CatchContractFieldConstraints(
    path: 'createOrganizerFormShareLinkCallablePayload.source',
    maxLength: 120,
    valueTypes: <String>['string'],
  );

  static const createOrganizerPostCallablePayloadText = CatchContractFieldConstraints(
    path: 'createOrganizerPostCallablePayload.text',
    maxLength: 500,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createOrganizerProgramCallablePayloadKind = CatchContractFieldConstraints(
    path: 'createOrganizerProgramCallablePayload.kind',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['wedding', 'corporate', 'social', 'other'],
  );

  static const createOrganizerProgramCallablePayloadStartsAtMillis = CatchContractFieldConstraints(
    path: 'createOrganizerProgramCallablePayload.startsAtMillis',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 9007199254740991,
  );

  static const createOrganizerProgramCallablePayloadTimezone = CatchContractFieldConstraints(
    path: 'createOrganizerProgramCallablePayload.timezone',
    maxLength: 60,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createOrganizerProgramCallablePayloadTitle = CatchContractFieldConstraints(
    path: 'createOrganizerProgramCallablePayload.title',
    maxLength: 140,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createProfileDecisionClientWriteDataComment = CatchContractFieldConstraints(
    path: 'createProfileDecisionClientWrite.data.comment',
    maxLength: 240,
    valueTypes: <String>['string'],
  );

  static const createProgramWalkInCallablePayloadDisplayName = CatchContractFieldConstraints(
    path: 'createProgramWalkInCallablePayload.displayName',
    maxLength: 140,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createProgramWalkInCallablePayloadPartySize = CatchContractFieldConstraints(
    path: 'createProgramWalkInCallablePayload.partySize',
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 20,
  );

  static const createRazorpayHostPaymentAccountCallablePayloadBankAccountNumber = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.bankAccountNumber',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[0-9]{5,20}\$',
  );

  static const createRazorpayHostPaymentAccountCallablePayloadBeneficiaryName = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.beneficiaryName',
    maxLength: 120,
    minLength: 2,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createRazorpayHostPaymentAccountCallablePayloadBusinessModel = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.businessModel',
    maxLength: 255,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createRazorpayHostPaymentAccountCallablePayloadBusinessPan = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.businessPan',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[A-Z]{5}[0-9]{4}[A-Z]\$',
  );

  static const createRazorpayHostPaymentAccountCallablePayloadBusinessType = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.businessType',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['individual', 'proprietorship', 'partnership', 'private_limited', 'public_limited', 'llp', 'trust', 'society', 'ngo'],
  );

  static const createRazorpayHostPaymentAccountCallablePayloadContactName = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.contactName',
    maxLength: 255,
    minLength: 4,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createRazorpayHostPaymentAccountCallablePayloadEmail = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.email',
    maxLength: 132,
    required: true,
    valueTypes: <String>['string'],
    format: 'email',
  );

  static const createRazorpayHostPaymentAccountCallablePayloadIfscCode = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.ifscCode',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[A-Z]{4}0[A-Z0-9]{6}\$',
  );

  static const createRazorpayHostPaymentAccountCallablePayloadLegalBusinessName = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.legalBusinessName',
    maxLength: 200,
    minLength: 4,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createRazorpayHostPaymentAccountCallablePayloadPhone = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.phone',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[+]?[0-9]{8,15}\$',
  );

  static const createRazorpayHostPaymentAccountCallablePayloadStakeholderEmail = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.stakeholderEmail',
    maxLength: 132,
    required: true,
    valueTypes: <String>['string'],
    format: 'email',
  );

  static const createRazorpayHostPaymentAccountCallablePayloadStakeholderIsDirector = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.stakeholderIsDirector',
    required: true,
    valueTypes: <String>['boolean'],
  );

  static const createRazorpayHostPaymentAccountCallablePayloadStakeholderIsExecutive = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.stakeholderIsExecutive',
    required: true,
    valueTypes: <String>['boolean'],
  );

  static const createRazorpayHostPaymentAccountCallablePayloadStakeholderName = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.stakeholderName',
    maxLength: 255,
    minLength: 2,
    required: true,
    valueTypes: <String>['string'],
  );

  static const createRazorpayHostPaymentAccountCallablePayloadStakeholderOwnershipPercent = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.stakeholderOwnershipPercent',
    required: true,
    valueTypes: <String>['number'],
    minimum: 0,
    maximum: 100,
  );

  static const createRazorpayHostPaymentAccountCallablePayloadStakeholderPan = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.stakeholderPan',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[A-Z]{5}[0-9]{4}[A-Z]\$',
  );

  static const createRazorpayHostPaymentAccountCallablePayloadStakeholderPhone = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.stakeholderPhone',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[+]?[0-9]{8,15}\$',
  );

  static const createRazorpayHostPaymentAccountCallablePayloadTermsAccepted = CatchContractFieldConstraints(
    path: 'createRazorpayHostPaymentAccountCallablePayload.termsAccepted',
    required: true,
    valueTypes: <String>['boolean'],
  );

  static const eventAssistanceLateJoinInputPolicyDestinationLateEntry = CatchContractFieldConstraints(
    path: 'eventAssistanceLateJoinInput.policy.destination.lateEntry',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['allowed', 'hostDecision', 'closed'],
  );

  static const eventAssistanceLateJoinInputPolicyDestinationPermittedCheckpointIds = CatchContractFieldConstraints(
    path: 'eventAssistanceLateJoinInput.policy.destination.permittedCheckpointIds',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    minItems: 1,
    maxItems: 1000,
    uniqueItems: true,
  );

  static const eventAssistanceLateJoinInputPolicyDestinationPermittedStopIds = CatchContractFieldConstraints(
    path: 'eventAssistanceLateJoinInput.policy.destination.permittedStopIds',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    minItems: 1,
    maxItems: 1000,
    uniqueItems: true,
  );

  static const eventAssistanceLateJoinInputPolicyMaxMessagesPerEpisode = CatchContractFieldConstraints(
    path: 'eventAssistanceLateJoinInput.policy.maxMessagesPerEpisode',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 100,
  );

  static const eventAssistanceLateJoinInputPolicyMinimumMinutesBetweenMessages = CatchContractFieldConstraints(
    path: 'eventAssistanceLateJoinInput.policy.minimumMinutesBetweenMessages',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 1440,
  );

  static const eventAssistanceLateJoinInputPolicyUnanswered = CatchContractFieldConstraints(
    path: 'eventAssistanceLateJoinInput.policy.unanswered',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['keepUnknownUntilCutoff', 'hostReviewAtDeadline'],
  );

  static const eventDocumentItinerary = CatchContractFieldConstraints(
    path: 'eventDocument.itinerary',
    valueTypes: <String>['array'],
    itemValueTypes: <String>['object'],
    maxItems: 40,
  );

  static const eventDocumentItineraryItemsDescription = CatchContractFieldConstraints(
    path: 'eventDocument.itinerary.items.description',
    maxLength: 500,
    valueTypes: <String>['string'],
  );

  static const eventDocumentItineraryItemsDurationMinutes = CatchContractFieldConstraints(
    path: 'eventDocument.itinerary.items.durationMinutes',
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 1440,
  );

  static const eventDocumentItineraryItemsId = CatchContractFieldConstraints(
    path: 'eventDocument.itinerary.items.id',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[A-Za-z0-9_-]+\$',
  );

  static const eventDocumentItineraryItemsOffsetMinutes = CatchContractFieldConstraints(
    path: 'eventDocument.itinerary.items.offsetMinutes',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 1440,
  );

  static const eventDocumentItineraryItemsRouteDistanceMeters = CatchContractFieldConstraints(
    path: 'eventDocument.itinerary.items.routeDistanceMeters',
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 1000000,
  );

  static const eventDocumentItineraryItemsTitle = CatchContractFieldConstraints(
    path: 'eventDocument.itinerary.items.title',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const eventDocumentMeetingLocationAddress = CatchContractFieldConstraints(
    path: 'eventDocument.meetingLocation.address',
    maxLength: 500,
    valueTypes: <String>['string'],
  );

  static const eventDocumentMeetingLocationLatitude = CatchContractFieldConstraints(
    path: 'eventDocument.meetingLocation.latitude',
    required: true,
    valueTypes: <String>['number'],
    minimum: -90,
    maximum: 90,
  );

  static const eventDocumentMeetingLocationLongitude = CatchContractFieldConstraints(
    path: 'eventDocument.meetingLocation.longitude',
    required: true,
    valueTypes: <String>['number'],
    minimum: -180,
    maximum: 180,
  );

  static const eventDocumentMeetingLocationName = CatchContractFieldConstraints(
    path: 'eventDocument.meetingLocation.name',
    maxLength: 240,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const eventDocumentMeetingLocationNotes = CatchContractFieldConstraints(
    path: 'eventDocument.meetingLocation.notes',
    maxLength: 1000,
    valueTypes: <String>['string'],
  );

  static const eventDocumentMeetingLocationPlaceId = CatchContractFieldConstraints(
    path: 'eventDocument.meetingLocation.placeId',
    maxLength: 256,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const eventSuccessFeedbackDocumentPrivateNote = CatchContractFieldConstraints(
    path: 'eventSuccessFeedbackDocument.privateNote',
    maxLength: 500,
    valueTypes: <String>['string'],
  );

  static const eventSuccessFeedbackDocumentSafetyConcern = CatchContractFieldConstraints(
    path: 'eventSuccessFeedbackDocument.safetyConcern',
    required: true,
    valueTypes: <String>['boolean'],
  );

  static const eventSuccessPlanDocumentAttendeePrompt = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.attendeePrompt',
    maxLength: 300,
    valueTypes: <String>['string'],
  );

  static const eventSuccessPlanDocumentConversationGraphConsentMode = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.conversationGraphConsentMode',
    valueTypes: <String>['string'],
    enumValues: <String>['optIn', 'optOut'],
  );

  static const eventSuccessPlanDocumentHostGoal = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.hostGoal',
    maxLength: 300,
    required: true,
    valueTypes: <String>['string'],
  );

  static const eventSuccessPlanDocumentQuestionnaireConfigCustomQuestionsItemsOptionsItemsLabel = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.questionnaireConfig.customQuestions.items.options.items.label',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const eventSuccessPlanDocumentQuestionnaireConfigCustomQuestionsItemsPrompt = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.questionnaireConfig.customQuestions.items.prompt',
    maxLength: 140,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const eventSuccessPlanDocumentQuestionnaireConfigCustomTitle = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.questionnaireConfig.customTitle',
    maxLength: 80,
    valueTypes: <String>['string'],
  );

  static const eventSuccessPlanDocumentQuestionnaireConfigTemplateId = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.questionnaireConfig.templateId',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const eventSuccessPlanDocumentStructureConfigBalanceActivityAttributes = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.structureConfig.balanceActivityAttributes',
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['paceBand', 'skillBand', 'roleBand'],
    maxItems: 8,
    uniqueItems: true,
  );

  static const eventSuccessPlanDocumentStructureConfigClusterActivityAttributes = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.structureConfig.clusterActivityAttributes',
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['paceBand', 'skillBand', 'roleBand'],
    maxItems: 8,
    uniqueItems: true,
  );

  static const eventSuccessPlanDocumentStructureConfigMaxPairMeetings = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.structureConfig.maxPairMeetings',
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 10,
  );

  static const eventSuccessPlanDocumentStructureConfigRevealCountdownSeconds = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.structureConfig.revealCountdownSeconds',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 60,
  );

  static const eventSuccessPlanDocumentStructureConfigRotationIntervalMinutes = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.structureConfig.rotationIntervalMinutes',
    valueTypes: <String>['integer'],
    minimum: 5,
    maximum: 180,
  );

  static const eventSuccessPlanDocumentStructureConfigRotationRepeatStrategy = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.structureConfig.rotationRepeatStrategy',
    valueTypes: <String>['string'],
    enumValues: <String>['avoid', 'allowWhenExhausted'],
  );

  static const eventSuccessPlanDocumentStructureConfigUnitCount = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.structureConfig.unitCount',
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 200,
  );

  static const eventSuccessPlanDocumentStructureConfigUnitKind = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.structureConfig.unitKind',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['wholeGroup', 'pods', 'pairs', 'teams', 'tables'],
  );

  static const eventSuccessPlanDocumentStructureConfigUnitSize = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.structureConfig.unitSize',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 1000,
  );

  static const eventSuccessPlanDocumentTargetAttendeeCount = CatchContractFieldConstraints(
    path: 'eventSuccessPlanDocument.targetAttendeeCount',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 1000,
  );

  static const eventSuccessSpatialActionCallablePayloadScope = CatchContractFieldConstraints(
    path: 'eventSuccessSpatialActionCallablePayload.scope',
    valueTypes: <String>['string'],
    enumValues: <String>['thisRound', 'pinned'],
  );

  static const eventSuccessWingmanRequestDocumentNote = CatchContractFieldConstraints(
    path: 'eventSuccessWingmanRequestDocument.note',
    maxLength: 240,
    valueTypes: <String>['string'],
  );

  static const exploreSearchCallablePayloadQuery = CatchContractFieldConstraints(
    path: 'exploreSearchCallablePayload.query',
    maxLength: 120,
    minLength: 2,
    required: true,
    valueTypes: <String>['string'],
  );

  static const grantEventStaffCallablePayloadPhoneNumber = CatchContractFieldConstraints(
    path: 'grantEventStaffCallablePayload.phoneNumber',
    maxLength: 32,
    minLength: 8,
    required: true,
    valueTypes: <String>['string'],
  );

  static const grantProgramStaffCallablePayloadPhoneNumber = CatchContractFieldConstraints(
    path: 'grantProgramStaffCallablePayload.phoneNumber',
    maxLength: 32,
    minLength: 4,
    required: true,
    valueTypes: <String>['string'],
  );

  static const hostAnalyticsQueryCallablePayloadRangePreset = CatchContractFieldConstraints(
    path: 'hostAnalyticsQueryCallablePayload.rangePreset',
    valueTypes: <String>['string'],
    enumValues: <String>['7d', '30d', '90d', '12m', 'month', 'custom'],
  );

  static const hostProfileDocumentBio = CatchContractFieldConstraints(
    path: 'hostProfileDocument.bio',
    maxLength: 500,
    valueTypes: <String>['string'],
  );

  static const hostProfileDocumentDisplayName = CatchContractFieldConstraints(
    path: 'hostProfileDocument.displayName',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
    pattern: '.*\\S.*',
  );

  static const hostProfileDocumentRoleTitle = CatchContractFieldConstraints(
    path: 'hostProfileDocument.roleTitle',
    maxLength: 80,
    valueTypes: <String>['string'],
  );

  static const importEventAttendeesCallablePayloadRowsItemsDisplayName = CatchContractFieldConstraints(
    path: 'importEventAttendeesCallablePayload.rows.items.displayName',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const importEventAttendeesCallablePayloadRowsItemsEmail = CatchContractFieldConstraints(
    path: 'importEventAttendeesCallablePayload.rows.items.email',
    maxLength: 320,
    valueTypes: <String>['string'],
  );

  static const importEventAttendeesCallablePayloadRowsItemsPhone = CatchContractFieldConstraints(
    path: 'importEventAttendeesCallablePayload.rows.items.phone',
    maxLength: 40,
    valueTypes: <String>['string'],
  );

  static const inviteProgramStaffCallablePayloadDisplayName = CatchContractFieldConstraints(
    path: 'inviteProgramStaffCallablePayload.displayName',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const listOrganizerContactsCallablePayloadQuery = CatchContractFieldConstraints(
    path: 'listOrganizerContactsCallablePayload.query',
    maxLength: 120,
    valueTypes: <String>['string'],
  );

  static const listOrganizerFormResponsesCallablePayloadAnswerFilters = CatchContractFieldConstraints(
    path: 'listOrganizerFormResponsesCallablePayload.answerFilters',
    valueTypes: <String>['array'],
    itemValueTypes: <String>['object'],
    maxItems: 5,
  );

  static const listOrganizerFormResponsesCallablePayloadAnswerFiltersItemsValues = CatchContractFieldConstraints(
    path: 'listOrganizerFormResponsesCallablePayload.answerFilters.items.values',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    minItems: 1,
    maxItems: 20,
    uniqueItems: true,
  );

  static const listOrganizerFormResponsesCallablePayloadQuery = CatchContractFieldConstraints(
    path: 'listOrganizerFormResponsesCallablePayload.query',
    maxLength: 160,
    valueTypes: <String>['string'],
  );

  static const listOrganizerFormsCallablePayloadQuery = CatchContractFieldConstraints(
    path: 'listOrganizerFormsCallablePayload.query',
    maxLength: 120,
    valueTypes: <String>['string'],
  );

  static const listOrganizerLumaEventsCallablePayloadApiKey = CatchContractFieldConstraints(
    path: 'listOrganizerLumaEventsCallablePayload.apiKey',
    maxLength: 512,
    minLength: 16,
    required: true,
    valueTypes: <String>['string'],
  );

  static const listPrivateEventSetupsCallablePayloadScope = CatchContractFieldConstraints(
    path: 'listPrivateEventSetupsCallablePayload.scope',
    valueTypes: <String>['string'],
    enumValues: <String>['upcoming', 'past', 'cancelled'],
  );

  static const manageEventMembershipRulesCallablePayloadEarlyAccessHours = CatchContractFieldConstraints(
    path: 'manageEventMembershipRulesCallablePayload.earlyAccessHours',
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 168,
  );

  static const manageEventMembershipRulesCallablePayloadMemberPriceOverridesItemsPercentOff = CatchContractFieldConstraints(
    path: 'manageEventMembershipRulesCallablePayload.memberPriceOverrides.items.percentOff',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 100,
  );

  static const manageEventMembershipRulesCallablePayloadMembersOnly = CatchContractFieldConstraints(
    path: 'manageEventMembershipRulesCallablePayload.membersOnly',
    required: true,
    valueTypes: <String>['boolean'],
  );

  static const manageHostMembershipCheckoutCallablePayloadInterval = CatchContractFieldConstraints(
    path: 'manageHostMembershipCheckoutCallablePayload.interval',
    required: true,
    enumValues: <String>['monthly', 'annual'],
  );

  static const manageHostMembershipPlansCallablePayloadPlanBenefitsItemsPercentOff = CatchContractFieldConstraints(
    path: 'manageHostMembershipPlansCallablePayload.plan.benefits.items.percentOff',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 100,
  );

  static const manageHostMembershipPlansCallablePayloadPlanBenefitsItemsType = CatchContractFieldConstraints(
    path: 'manageHostMembershipPlansCallablePayload.plan.benefits.items.type',
    required: true,
  );

  static const manageHostMembershipPlansCallablePayloadPlanDescription = CatchContractFieldConstraints(
    path: 'manageHostMembershipPlansCallablePayload.plan.description',
    maxLength: 500,
    required: true,
    valueTypes: <String>['string'],
  );

  static const manageHostMembershipPlansCallablePayloadPlanLimitsMaxUpcomingMemberPricedBookings = CatchContractFieldConstraints(
    path: 'manageHostMembershipPlansCallablePayload.plan.limits.maxUpcomingMemberPricedBookings',
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 20,
  );

  static const manageHostMembershipPlansCallablePayloadPlanMemberCap = CatchContractFieldConstraints(
    path: 'manageHostMembershipPlansCallablePayload.plan.memberCap',
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 100000,
  );

  static const manageHostMembershipPlansCallablePayloadPlanName = CatchContractFieldConstraints(
    path: 'manageHostMembershipPlansCallablePayload.plan.name',
    maxLength: 60,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const manageHostMembershipPlansCallablePayloadPlanPerksItems = CatchContractFieldConstraints(
    path: 'manageHostMembershipPlansCallablePayload.plan.perks.items',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const manageHostMembershipPlansCallablePayloadPlanPricesAnnualAmountPaise = CatchContractFieldConstraints(
    path: 'manageHostMembershipPlansCallablePayload.plan.prices.annual.amountPaise',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1000,
    maximum: 1500000,
  );

  static const manageHostMembershipPlansCallablePayloadPlanPricesMonthlyAmountPaise = CatchContractFieldConstraints(
    path: 'manageHostMembershipPlansCallablePayload.plan.prices.monthly.amountPaise',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1000,
    maximum: 1500000,
  );

  static const manageHostMembershipPlansCallablePayloadPlanTrialDays = CatchContractFieldConstraints(
    path: 'manageHostMembershipPlansCallablePayload.plan.trialDays',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 30,
  );

  static const mobileFormStateAuthOtpCode = CatchContractFieldConstraints(
    path: 'mobileFormState.authOtpCode',
    maxLength: 6,
    minLength: 6,
    required: true,
    valueTypes: <String>['string'],
    pattern: '^\\d{6}\$',
  );

  static const mobileFormStateChatsInboxSearchQuery = CatchContractFieldConstraints(
    path: 'mobileFormState.chatsInboxSearchQuery',
    maxLength: 120,
    valueTypes: <String>['string'],
  );

  static const mobileFormStateEventCohortCapsEnabled = CatchContractFieldConstraints(
    path: 'mobileFormState.eventCohortCapsEnabled',
    valueTypes: <String>['boolean'],
  );

  static const mobileFormStateEventDurationMinutes = CatchContractFieldConstraints(
    path: 'mobileFormState.eventDurationMinutes',
    valueTypes: <String>['integer'],
    minimum: 30,
    maximum: 240,
    multipleOf: 15,
  );

  static const mobileFormStateEventDynamicPricingEnabled = CatchContractFieldConstraints(
    path: 'mobileFormState.eventDynamicPricingEnabled',
    valueTypes: <String>['boolean'],
  );

  static const mobileFormStateEventSuccessLiveCardIncluded = CatchContractFieldConstraints(
    path: 'mobileFormState.eventSuccessLiveCardIncluded',
    valueTypes: <String>['boolean'],
  );

  static const mobileFormStateEventSuccessModuleSelected = CatchContractFieldConstraints(
    path: 'mobileFormState.eventSuccessModuleSelected',
    valueTypes: <String>['boolean'],
  );

  static const mobileFormStateEventSuccessQuestionnaireMode = CatchContractFieldConstraints(
    path: 'mobileFormState.eventSuccessQuestionnaireMode',
    valueTypes: <String>['string'],
    enumValues: <String>['off', 'cluesOnly', 'cluesAndPairing'],
  );

  static const mobileFormStateExploreActivityTag = CatchContractFieldConstraints(
    path: 'mobileFormState.exploreActivityTag',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const mobileFormStateExploreArea = CatchContractFieldConstraints(
    path: 'mobileFormState.exploreArea',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const mobileFormStateExploreDistanceFilter = CatchContractFieldConstraints(
    path: 'mobileFormState.exploreDistanceFilter',
    valueTypes: <String>['string'],
    enumValues: <String>['any', 'oneKm', 'threeKm', 'fiveKm', 'tenKm'],
  );

  static const mobileFormStateExploreHighRatedOnly = CatchContractFieldConstraints(
    path: 'mobileFormState.exploreHighRatedOnly',
    valueTypes: <String>['boolean'],
  );

  static const mobileFormStateExploreJoinedOnly = CatchContractFieldConstraints(
    path: 'mobileFormState.exploreJoinedOnly',
    valueTypes: <String>['boolean'],
  );

  static const mobileFormStateHostBroadcastTemplate = CatchContractFieldConstraints(
    path: 'mobileFormState.hostBroadcastTemplate',
    valueTypes: <String>['string'],
    enumValues: <String>['reminder', 'meetingPoint', 'change'],
  );

  static const mobileFormStateHostInboxAudienceSegment = CatchContractFieldConstraints(
    path: 'mobileFormState.hostInboxAudienceSegment',
    valueTypes: <String>['string'],
    enumValues: <String>['booked', 'prospective'],
  );

  static const mobileFormStateHostRosterFilter = CatchContractFieldConstraints(
    path: 'mobileFormState.hostRosterFilter',
    valueTypes: <String>['string'],
    enumValues: <String>['all', 'booked', 'waitlist', 'slots', 'requests', 'due', 'checkedIn', 'attended', 'noShow'],
  );

  static const mobileFormStateHostRosterSearchQuery = CatchContractFieldConstraints(
    path: 'mobileFormState.hostRosterSearchQuery',
    maxLength: 120,
    valueTypes: <String>['string'],
  );

  static const mobileFormStateOnboardingDateOfBirthText = CatchContractFieldConstraints(
    path: 'mobileFormState.onboardingDateOfBirthText',
    maxLength: 11,
    valueTypes: <String>['string'],
    pattern: '^(?:\\d{2} [A-Z][a-z]{2} \\d{4})?\$',
  );

  static const mobileFormStateSuvbotTesterPhoneNumber = CatchContractFieldConstraints(
    path: 'mobileFormState.suvbotTesterPhoneNumber',
    maxLength: 32,
    minLength: 6,
    required: true,
    valueTypes: <String>['string'],
  );

  static const mutateOrganizerContactCallablePayloadDisplayNameOverride = CatchContractFieldConstraints(
    path: 'mutateOrganizerContactCallablePayload.displayNameOverride',
    maxLength: 120,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const mutateOrganizerContactCallablePayloadEmail = CatchContractFieldConstraints(
    path: 'mutateOrganizerContactCallablePayload.email',
    maxLength: 320,
    valueTypes: <String>['string'],
    format: 'email',
  );

  static const mutateOrganizerContactCallablePayloadManualTagsItems = CatchContractFieldConstraints(
    path: 'mutateOrganizerContactCallablePayload.manualTags.items',
    maxLength: 40,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const mutateOrganizerContactCallablePayloadPhoneE164 = CatchContractFieldConstraints(
    path: 'mutateOrganizerContactCallablePayload.phoneE164',
    valueTypes: <String>['string'],
    pattern: '^\\+[1-9][0-9]{7,14}\$',
  );

  static const mutateOrganizerContactCallablePayloadWhatsappAdminSuppressed = CatchContractFieldConstraints(
    path: 'mutateOrganizerContactCallablePayload.whatsappAdminSuppressed',
    valueTypes: <String>['boolean'],
  );

  static const mutateOrganizerContactNoteCallablePayloadBody = CatchContractFieldConstraints(
    path: 'mutateOrganizerContactNoteCallablePayload.body',
    maxLength: 2000,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const onboardingDraftDocumentFirstName = CatchContractFieldConstraints(
    path: 'onboardingDraftDocument.firstName',
    maxLength: 80,
    valueTypes: <String>['string'],
  );

  static const onboardingDraftDocumentGender = CatchContractFieldConstraints(
    path: 'onboardingDraftDocument.gender',
    valueTypes: <String>['string'],
    enumValues: <String>['man', 'woman', 'nonBinary', 'other'],
  );

  static const onboardingDraftDocumentInterestedInGenders = CatchContractFieldConstraints(
    path: 'onboardingDraftDocument.interestedInGenders',
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['man', 'woman', 'nonBinary', 'other'],
    uniqueItems: true,
  );

  static const onboardingDraftDocumentLastName = CatchContractFieldConstraints(
    path: 'onboardingDraftDocument.lastName',
    maxLength: 80,
    valueTypes: <String>['string'],
  );

  static const onboardingDraftDocumentPhoneNumber = CatchContractFieldConstraints(
    path: 'onboardingDraftDocument.phoneNumber',
    maxLength: 32,
    valueTypes: <String>['string'],
  );

  static const organizerFormDraftDocumentDefinitionAppearancePreset = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.appearance.preset',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['editorial', 'minimal', 'activity'],
  );

  static const organizerFormDraftDocumentDefinitionCompletionActionKind = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.completion.actionKind',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['none', 'externalUrl', 'event', 'eventRuntime'],
  );

  static const organizerFormDraftDocumentDefinitionIdentityPolicy = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.identityPolicy',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['anonymous', 'emailVerified', 'phoneVerified', 'emailOrPhoneVerified', 'catchAccount'],
  );

  static const organizerFormDraftDocumentDefinitionLogicRulesItemsAction = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.logicRules.items.action',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['showQuestion', 'hideQuestion', 'showSection', 'hideSection', 'routeToSection', 'finish'],
  );

  static const organizerFormDraftDocumentDefinitionLogicRulesItemsConditionsItemsExpectedValuesItems = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.logicRules.items.conditions.items.expectedValues.items',
    required: true,
    valueTypes: <String>['string', 'number', 'boolean'],
  );

  static const organizerFormDraftDocumentDefinitionLogicRulesItemsConditionsItemsOperator = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.logicRules.items.conditions.items.operator',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['equals', 'notEquals', 'contains', 'notContains', 'greaterThan', 'lessThan', 'answered', 'notAnswered'],
  );

  static const organizerFormDraftDocumentDefinitionLogicRulesItemsConditionsItemsQuestionId = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.logicRules.items.conditions.items.questionId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const organizerFormDraftDocumentDefinitionLogicRulesItemsTargetQuestionId = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.logicRules.items.targetQuestionId',
    maxLength: 180,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const organizerFormDraftDocumentDefinitionLogicRulesItemsTargetSectionId = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.logicRules.items.targetSectionId',
    maxLength: 180,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const organizerFormDraftDocumentDefinitionMessagingConsentCatchMarketingWhatsapp = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.messagingConsent.catchMarketingWhatsapp',
    valueTypes: <String>['boolean'],
  );

  static const organizerFormDraftDocumentDefinitionMessagingConsentCatchWhatsapp = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.messagingConsent.catchWhatsapp',
    required: true,
    valueTypes: <String>['boolean'],
  );

  static const organizerFormDraftDocumentDefinitionMessagingConsentOrganizerMarketingWhatsapp = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.messagingConsent.organizerMarketingWhatsapp',
    valueTypes: <String>['boolean'],
  );

  static const organizerFormDraftDocumentDefinitionMessagingConsentOrganizerOperationsWhatsapp = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.messagingConsent.organizerOperationsWhatsapp',
    valueTypes: <String>['boolean'],
  );

  static const organizerFormDraftDocumentDefinitionMessagingConsentOrganizerWhatsapp = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.messagingConsent.organizerWhatsapp',
    required: true,
    valueTypes: <String>['boolean'],
  );

  static const organizerFormDraftDocumentDefinitionPaymentConnectionId = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.payment.connectionId',
    maxLength: 180,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const organizerFormDraftDocumentDefinitionPaymentDescription = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.payment.description',
    maxLength: 160,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const organizerFormDraftDocumentDefinitionPaymentRefundPolicy = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.payment.refundPolicy',
    maxLength: 1000,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const organizerFormDraftDocumentDefinitionPurpose = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.purpose',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['application', 'registration', 'intake', 'waiver', 'feedback', 'survey'],
  );

  static const organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsAnswerDestination = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.sections.items.questions.items.answerDestination',
    valueTypes: <String>['string'],
    enumValues: <String>['organizerOnly', 'catchProfile', 'organizerCard'],
  );

  static const organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsHostPresentation = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.sections.items.questions.items.hostPresentation',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['detailOnly', 'filterable', 'sortable'],
  );

  static const organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsKind = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.sections.items.questions.items.kind',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['shortText', 'longText', 'singleChoice', 'multiChoice', 'date', 'phone', 'email', 'url', 'number', 'boolean', 'file', 'acknowledgement', 'signature'],
  );

  static const organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsPrefillPolicy = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.sections.items.questions.items.prefillPolicy',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['never', 'participantReviewRequired'],
  );

  static const organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsPrivacyClass = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.sections.items.questions.items.privacyClass',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['contact', 'profile', 'sensitive', 'organizerCustom'],
  );

  static const organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsValidationPatternPreset = CatchContractFieldConstraints(
    path: 'organizerFormDraftDocument.definition.sections.items.questions.items.validation.patternPreset',
    valueTypes: <String>['string'],
    enumValues: <String>['lettersAndSpaces', 'alphanumeric', 'postalCode', 'handle'],
  );

  static const organizerFormVersionDocumentDefinitionSectionsItemsQuestionsItemsOptions = CatchContractFieldConstraints(
    path: 'organizerFormVersionDocument.definition.sections.items.questions.items.options',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['object'],
    maxItems: 100,
  );

  static const overrideEventSuccessGroupsCallablePayloadRoundsItemsGroupsItemsLabel = CatchContractFieldConstraints(
    path: 'overrideEventSuccessGroupsCallablePayload.rounds.items.groups.items.label',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const overrideEventSuccessGroupsCallablePayloadRoundsItemsGroupsItemsParticipantUidsItems = CatchContractFieldConstraints(
    path: 'overrideEventSuccessGroupsCallablePayload.rounds.items.groups.items.participantUids.items',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const overrideEventSuccessRotationsCallablePayloadRoundsItemsPairingsItemsUidA = CatchContractFieldConstraints(
    path: 'overrideEventSuccessRotationsCallablePayload.rounds.items.pairings.items.uidA',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const overrideEventSuccessRotationsCallablePayloadRoundsItemsPairingsItemsUidB = CatchContractFieldConstraints(
    path: 'overrideEventSuccessRotationsCallablePayload.rounds.items.pairings.items.uidB',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const photoPromptAnswerPromptId = CatchContractFieldConstraints(
    path: 'photoPromptAnswer.promptId',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const placesAutocompleteCallablePayloadInput = CatchContractFieldConstraints(
    path: 'placesAutocompleteCallablePayload.input',
    maxLength: 120,
    minLength: 2,
    required: true,
    valueTypes: <String>['string'],
  );

  static const profilePromptAnswerAnswer = CatchContractFieldConstraints(
    path: 'profilePromptAnswer.answer',
    maxLength: 300,
    required: true,
    valueTypes: <String>['string'],
  );

  static const profilePromptAnswerPromptId = CatchContractFieldConstraints(
    path: 'profilePromptAnswer.promptId',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const programAccessCallableResponseActorRole = CatchContractFieldConstraints(
    path: 'programAccessCallableResponse.actorRole',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['manager', 'staff'],
  );

  static const programAccessCallableResponseDutiesItemsDuty = CatchContractFieldConstraints(
    path: 'programAccessCallableResponse.duties.items.duty',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['programAdmin', 'programCoordinator', 'guestRelations', 'communications', 'functionCheckIn', 'functionLead', 'airportGreeter', 'hotelDesk', 'transportDispatcher', 'reconciliationViewer', 'stakeholderViewer'],
  );

  static const programAccessCallableResponseKind = CatchContractFieldConstraints(
    path: 'programAccessCallableResponse.kind',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['wedding', 'corporate', 'social', 'other'],
  );

  static const programAccessCallableResponseStatus = CatchContractFieldConstraints(
    path: 'programAccessCallableResponse.status',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['draft', 'active', 'completed', 'archived'],
  );

  static const programAccessCallableResponseVehicleClassesItemsCapabilitiesItems = CatchContractFieldConstraints(
    path: 'programAccessCallableResponse.vehicleClasses.items.capabilities.items',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['wheelchairAccessible', 'extraLuggage', 'childSeat'],
  );

  static const programArrivalsRosterCallableResponseRowsItemsCurbSource = CatchContractFieldConstraints(
    path: 'programArrivalsRosterCallableResponse.rows.items.curbSource',
    valueTypes: <String>['string'],
    enumValues: <String>['ready', 'manual', 'actualLanding', 'estimatedLanding', 'scheduledLanding'],
  );

  static const programArrivalsRosterCallableResponseRowsItemsFlightStatus = CatchContractFieldConstraints(
    path: 'programArrivalsRosterCallableResponse.rows.items.flightStatus',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['scheduled', 'enroute', 'landed', 'delayed', 'cancelled', 'diverted', 'unknown'],
  );

  static const programArrivalsRosterCallableResponseRowsItemsReadiness = CatchContractFieldConstraints(
    path: 'programArrivalsRosterCallableResponse.rows.items.readiness',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['expected', 'ready', 'dispatched', 'arrived', 'disrupted', 'noShow'],
  );

  static const programArrivalsRosterCallableResponseRowsItemsUnavailableReason = CatchContractFieldConstraints(
    path: 'programArrivalsRosterCallableResponse.rows.items.unavailableReason',
    valueTypes: <String>['string'],
    enumValues: <String>['cancelled', 'diverted', 'missingTiming'],
  );

  static const programHotelInboundCallableResponseExpectedLegsItemsReadiness = CatchContractFieldConstraints(
    path: 'programHotelInboundCallableResponse.expectedLegs.items.readiness',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['expected', 'ready', 'dispatched', 'arrived', 'disrupted', 'noShow'],
  );

  static const programHotelInboundCallableResponseTripsItemsManifestSource = CatchContractFieldConstraints(
    path: 'programHotelInboundCallableResponse.trips.items.manifestSource',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['dispatchSnapshot', 'currentRecords'],
  );

  static const programLodgingConfigDocumentDemandItemsBeds = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.demand.items.beds',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 100,
  );

  static const programLodgingConfigDocumentDemandItemsGuestId = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.demand.items.guestId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentDemandItemsRequiredFeaturesItems = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.demand.items.requiredFeatures.items',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentGroupParentsItemsId = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.groupParents.items.id',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentGroupParentsItemsParentIds = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.groupParents.items.parentIds',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    maxItems: 20,
    uniqueItems: true,
  );

  static const programLodgingConfigDocumentInventoryItemsAvailabilityItemsArrival = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.inventory.items.availability.items.arrival',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^\\d{4}-\\d{2}-\\d{2}\$',
  );

  static const programLodgingConfigDocumentInventoryItemsAvailabilityItemsDeparture = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.inventory.items.availability.items.departure',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^\\d{4}-\\d{2}-\\d{2}\$',
  );

  static const programLodgingConfigDocumentInventoryItemsContractId = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.inventory.items.contractId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentInventoryItemsId = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.inventory.items.id',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentLabelsItemsRoomLabel = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.labels.items.roomLabel',
    maxLength: 40,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentPartiesItemsConfirmed = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.parties.items.confirmed',
    required: true,
    valueTypes: <String>['boolean'],
  );

  static const programLodgingConfigDocumentPartiesItemsGuestIds = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.parties.items.guestIds',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    minItems: 1,
    maxItems: 100,
    uniqueItems: true,
  );

  static const programLodgingConfigDocumentPartiesItemsId = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.parties.items.id',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentPartiesItemsPinHotelId = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.parties.items.pin.hotelId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentPartiesItemsPinInventoryId = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.parties.items.pin.inventoryId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentPartiesItemsPinZoneId = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.parties.items.pin.zoneId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentPartiesItemsPriority = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.parties.items.priority',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 1000000,
  );

  static const programLodgingConfigDocumentPartiesItemsRequiredRoomType = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.parties.items.requiredRoomType',
    maxLength: 80,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentRoomsItemsBeds = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.rooms.items.beds',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 100,
  );

  static const programLodgingConfigDocumentRoomsItemsBuilding = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.rooms.items.building',
    maxLength: 80,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentRoomsItemsFloor = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.rooms.items.floor',
    maxLength: 80,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentRoomsItemsMaxOccupants = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.rooms.items.maxOccupants',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 100,
  );

  static const programLodgingConfigDocumentRoomsItemsResourceIds = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.rooms.items.resourceIds',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    minItems: 1,
    maxItems: 100,
    uniqueItems: true,
  );

  static const programLodgingConfigDocumentRoomsItemsRoomType = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.rooms.items.roomType',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentRoomsItemsVerifiedFeaturesItems = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.rooms.items.verifiedFeatures.items',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentRoomsItemsWing = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.rooms.items.wing',
    maxLength: 80,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const programLodgingConfigDocumentRoomsItemsZoneId = CatchContractFieldConstraints(
    path: 'programLodgingConfigDocument.rooms.items.zoneId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const programStaffListCallableResponseMembersItemsStatus = CatchContractFieldConstraints(
    path: 'programStaffListCallableResponse.members.items.status',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['active', 'expired', 'revoked', 'approvalRequired'],
  );

  static const programTransportPlanCallableResponseGroupsItemsReadiness = CatchContractFieldConstraints(
    path: 'programTransportPlanCallableResponse.groups.items.readiness',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['expected', 'ready'],
  );

  static const programTransportPlanCallableResponseUnassignedItemsReason = CatchContractFieldConstraints(
    path: 'programTransportPlanCallableResponse.unassigned.items.reason',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['missingTime', 'noSuitableVehicle', 'missingScope'],
  );

  static const programTripListCallableResponseTripsItemsManifestSource = CatchContractFieldConstraints(
    path: 'programTripListCallableResponse.trips.items.manifestSource',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['dispatchSnapshot', 'currentRecords'],
  );

  static const programTripListCallableResponseTripsItemsStatus = CatchContractFieldConstraints(
    path: 'programTripListCallableResponse.trips.items.status',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['enRoute', 'arrived', 'cancelled', 'voided'],
  );

  static const reassignEventAssistanceCheckpointReporterCallablePayloadCommandPayloadResponsibleOperatorId = CatchContractFieldConstraints(
    path: 'reassignEventAssistanceCheckpointReporterCallablePayload.command.payload.responsibleOperatorId',
    maxLength: 128,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[^/]+\$',
  );

  static const recordEventAssistanceCheckpointCallablePayloadCommandPayloadCorrectionReason = CatchContractFieldConstraints(
    path: 'recordEventAssistanceCheckpointCallablePayload.command.payload.correctionReason',
    maxLength: 500,
    minLength: 1,
    valueTypes: <String>['string'],
    pattern: '\\S',
  );

  static const recordEventSuccessUnitOutcomesCallablePayloadEntriesItemsRank = CatchContractFieldConstraints(
    path: 'recordEventSuccessUnitOutcomesCallablePayload.entries.items.rank',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 200,
  );

  static const recordEventSuccessUnitOutcomesCallablePayloadEntriesItemsScore = CatchContractFieldConstraints(
    path: 'recordEventSuccessUnitOutcomesCallablePayload.entries.items.score',
    required: true,
    valueTypes: <String>['number'],
    minimum: -1000000,
    maximum: 1000000,
  );

  static const recordOrganizerContactOutreachCallablePayloadNote = CatchContractFieldConstraints(
    path: 'recordOrganizerContactOutreachCallablePayload.note',
    maxLength: 500,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const recordProgramDoorJournalCallablePayloadOperationsItemsPartySize = CatchContractFieldConstraints(
    path: 'recordProgramDoorJournalCallablePayload.operations.items.partySize',
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 20,
  );

  static const recordProgramFunctionRsvpCallablePayloadRsvpStatus = CatchContractFieldConstraints(
    path: 'recordProgramFunctionRsvpCallablePayload.rsvpStatus',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['pending', 'attending', 'declined', 'maybe'],
  );

  static const resolveEventAssistanceCaseCallablePayloadCommandPayloadOwner = CatchContractFieldConstraints(
    path: 'resolveEventAssistanceCaseCallablePayload.command.payload.owner',
    maxLength: 160,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
  );

  static const reviewOrganizerApplicationCallablePayloadReviewNote = CatchContractFieldConstraints(
    path: 'reviewOrganizerApplicationCallablePayload.reviewNote',
    maxLength: 2000,
    valueTypes: <String>['string'],
  );

  static const sendEventBroadcastCallablePayloadAudience = CatchContractFieldConstraints(
    path: 'sendEventBroadcastCallablePayload.audience',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['booked', 'prospective', 'everyone'],
  );

  static const sendEventBroadcastCallablePayloadBody = CatchContractFieldConstraints(
    path: 'sendEventBroadcastCallablePayload.body',
    maxLength: 500,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const sendEventChatMessageCallablePayloadText = CatchContractFieldConstraints(
    path: 'sendEventChatMessageCallablePayload.text',
    maxLength: 2000,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const sendOrganizerWhatsappReplyCallablePayloadBody = CatchContractFieldConstraints(
    path: 'sendOrganizerWhatsappReplyCallablePayload.body',
    maxLength: 4096,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const sendOrganizerWhatsappTestCallablePayloadToE164 = CatchContractFieldConstraints(
    path: 'sendOrganizerWhatsappTestCallablePayload.toE164',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^\\+[1-9][0-9]{7,14}\$',
  );

  static const setCrossPathsEventConsentCallablePayloadEnabled = CatchContractFieldConstraints(
    path: 'setCrossPathsEventConsentCallablePayload.enabled',
    required: true,
    valueTypes: <String>['boolean'],
  );

  static const setEventAssistanceCheckpointCloseoutCallablePayloadCommandPayloadReason = CatchContractFieldConstraints(
    path: 'setEventAssistanceCheckpointCloseoutCallablePayload.command.payload.reason',
    maxLength: 500,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
    pattern: '\\S',
  );

  static const setEventAssistanceRuntimeConfigCallablePayloadCommandConfigurationOptionsDeliveryPolicyMaxAttempts = CatchContractFieldConstraints(
    path: 'setEventAssistanceRuntimeConfigCallablePayload.command.configuration.options.deliveryPolicy.maxAttempts',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 6,
  );

  static const setEventAssistanceRuntimeConfigCallablePayloadCommandConfigurationOptionsDeliveryPolicyMaxAttemptsPerRoute = CatchContractFieldConstraints(
    path: 'setEventAssistanceRuntimeConfigCallablePayload.command.configuration.options.deliveryPolicy.maxAttemptsPerRoute',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 3,
  );

  static const setEventAssistanceRuntimeConfigCallablePayloadCommandConfigurationOptionsDeliveryPolicyMinimumRetrySeconds = CatchContractFieldConstraints(
    path: 'setEventAssistanceRuntimeConfigCallablePayload.command.configuration.options.deliveryPolicy.minimumRetrySeconds',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 3600,
  );

  static const setEventSuccessAccountabilityResolutionCallablePayloadResolution = CatchContractFieldConstraints(
    path: 'setEventSuccessAccountabilityResolutionCallablePayload.resolution',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['returned', 'departed', 'unresolved'],
  );

  static const setOrganizerTrackingSettingsCallablePayloadEnabled = CatchContractFieldConstraints(
    path: 'setOrganizerTrackingSettingsCallablePayload.enabled',
    required: true,
    valueTypes: <String>['boolean'],
  );

  static const setOrganizerTrackingSettingsCallablePayloadGoogleMeasurementId = CatchContractFieldConstraints(
    path: 'setOrganizerTrackingSettingsCallablePayload.googleMeasurementId',
    valueTypes: <String>['string'],
    pattern: '^G-[A-Z0-9]{4,20}\$',
  );

  static const setOrganizerTrackingSettingsCallablePayloadMetaPixelId = CatchContractFieldConstraints(
    path: 'setOrganizerTrackingSettingsCallablePayload.metaPixelId',
    valueTypes: <String>['string'],
    pattern: '^[0-9]{5,20}\$',
  );

  static const setReviewResponseCallablePayloadMessage = CatchContractFieldConstraints(
    path: 'setReviewResponseCallablePayload.message',
    maxLength: 1000,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const transferEventAssistanceGroupCallablePayloadCommandPayloadDecisionExpiresAtMillis = CatchContractFieldConstraints(
    path: 'transferEventAssistanceGroupCallablePayload.command.payload.decision.expiresAtMillis',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 9007199254740991,
  );

  static const transferEventAssistanceGroupCallablePayloadCommandPayloadDecisionGroupId = CatchContractFieldConstraints(
    path: 'transferEventAssistanceGroupCallablePayload.command.payload.decision.groupId',
    maxLength: 160,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
  );

  static const transferEventAssistanceGroupCallablePayloadCommandPayloadDecisionReceivingOperatorId = CatchContractFieldConstraints(
    path: 'transferEventAssistanceGroupCallablePayload.command.payload.decision.receivingOperatorId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const transferEventAssistanceGroupCallablePayloadCommandPayloadDecisionTo = CatchContractFieldConstraints(
    path: 'transferEventAssistanceGroupCallablePayload.command.payload.decision.to',
    maxLength: 160,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
  );

  static const updateEventCallablePayloadFieldsCapacityLimit = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.capacityLimit',
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 1000,
  );

  static const updateEventCallablePayloadFieldsConstraintsMaxAge = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.constraints.maxAge',
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 120,
  );

  static const updateEventCallablePayloadFieldsConstraintsMaxMen = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.constraints.maxMen',
    valueTypes: <String>['integer'],
    minimum: 0,
  );

  static const updateEventCallablePayloadFieldsConstraintsMaxWomen = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.constraints.maxWomen',
    valueTypes: <String>['integer'],
    minimum: 0,
  );

  static const updateEventCallablePayloadFieldsConstraintsMinAge = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.constraints.minAge',
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 120,
  );

  static const updateEventCallablePayloadFieldsDescription = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.description',
    maxLength: 2000,
    valueTypes: <String>['string'],
  );

  static const updateEventCallablePayloadFieldsDistanceKm = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.distanceKm',
    valueTypes: <String>['number'],
    minimum: 0,
    maximum: 100,
  );

  static const updateEventCallablePayloadFieldsEventPolicyAdmissionFormat = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.eventPolicy.admission.format',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['open', 'inviteOnly', 'manualApproval', 'fixedCohortCaps', 'balancedRatio', 'membersOnly'],
  );

  static const updateEventCallablePayloadFieldsEventPolicyCancellationPolicyId = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.eventPolicy.cancellation.policyId',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['notApplicable', 'flexible', 'standard', 'strict'],
  );

  static const updateEventCallablePayloadFieldsEventPolicyPricingDemandPricingRulesItemsMaxAdjustmentInPaise = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.eventPolicy.pricing.demandPricingRules.items.maxAdjustmentInPaise',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 100000000,
  );

  static const updateEventCallablePayloadFieldsEventPolicyPricingDemandPricingRulesItemsStepAdjustmentInPaise = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.eventPolicy.pricing.demandPricingRules.items.stepAdjustmentInPaise',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 100000000,
  );

  static const updateEventCallablePayloadFieldsLocationDetails = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.locationDetails',
    maxLength: 1000,
    valueTypes: <String>['string'],
  );

  static const updateEventCallablePayloadFieldsMeetingPoint = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.meetingPoint',
    maxLength: 240,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const updateEventCallablePayloadFieldsName = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.name',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const updateEventCallablePayloadFieldsPace = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.pace',
    valueTypes: <String>['string'],
    enumValues: <String>['easy', 'moderate', 'fast', 'competitive'],
  );

  static const updateEventCallablePayloadFieldsPriceInPaise = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.priceInPaise',
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 100000000,
  );

  static const updateEventCallablePayloadFieldsPrivateAccessInviteCode = CatchContractFieldConstraints(
    path: 'updateEventCallablePayload.fields.privateAccess.inviteCode',
    maxLength: 64,
    minLength: 4,
    valueTypes: <String>['string'],
    pattern: '^[A-Za-z0-9_-]+\$',
  );

  static const updateEventRehearsalSetupCallablePayloadSetupAttendeePrompt = CatchContractFieldConstraints(
    path: 'updateEventRehearsalSetupCallablePayload.setup.attendeePrompt',
    maxLength: 320,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const updateEventRehearsalSetupCallablePayloadSetupDurationMinutes = CatchContractFieldConstraints(
    path: 'updateEventRehearsalSetupCallablePayload.setup.durationMinutes',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 30,
    maximum: 360,
  );

  static const updateEventRehearsalSetupCallablePayloadSetupHostGoal = CatchContractFieldConstraints(
    path: 'updateEventRehearsalSetupCallablePayload.setup.hostGoal',
    maxLength: 300,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const updateEventRehearsalSetupCallablePayloadSetupLocationName = CatchContractFieldConstraints(
    path: 'updateEventRehearsalSetupCallablePayload.setup.locationName',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const updateEventRehearsalSetupCallablePayloadSetupModuleIds = CatchContractFieldConstraints(
    path: 'updateEventRehearsalSetupCallablePayload.setup.moduleIds',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['arrival', 'firstHello', 'pods', 'rotations', 'conversationCues', 'reveal', 'afterglow', 'accountability'],
    minItems: 1,
    maxItems: 8,
    uniqueItems: true,
  );

  static const updateEventRehearsalSetupCallablePayloadSetupTitle = CatchContractFieldConstraints(
    path: 'updateEventRehearsalSetupCallablePayload.setup.title',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const updateOrganizerCallablePayloadFieldsArea = CatchContractFieldConstraints(
    path: 'updateOrganizerCallablePayload.fields.area',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const updateOrganizerCallablePayloadFieldsDescription = CatchContractFieldConstraints(
    path: 'updateOrganizerCallablePayload.fields.description',
    maxLength: 2000,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const updateOrganizerCallablePayloadFieldsEmail = CatchContractFieldConstraints(
    path: 'updateOrganizerCallablePayload.fields.email',
    maxLength: 320,
    valueTypes: <String>['string'],
  );

  static const updateOrganizerCallablePayloadFieldsInstagramHandle = CatchContractFieldConstraints(
    path: 'updateOrganizerCallablePayload.fields.instagramHandle',
    maxLength: 320,
    valueTypes: <String>['string'],
  );

  static const updateOrganizerCallablePayloadFieldsLocation = CatchContractFieldConstraints(
    path: 'updateOrganizerCallablePayload.fields.location',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
  );

  static const updateOrganizerCallablePayloadFieldsName = CatchContractFieldConstraints(
    path: 'updateOrganizerCallablePayload.fields.name',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const updateOrganizerCallablePayloadFieldsOrganizerType = CatchContractFieldConstraints(
    path: 'updateOrganizerCallablePayload.fields.organizerType',
    valueTypes: <String>['string'],
    enumValues: <String>['club', 'community', 'individual', 'eventProducer', 'venue', 'brand'],
  );

  static const updateOrganizerCallablePayloadFieldsPhoneNumber = CatchContractFieldConstraints(
    path: 'updateOrganizerCallablePayload.fields.phoneNumber',
    maxLength: 320,
    valueTypes: <String>['string'],
  );

  static const updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsCancellationPolicyId = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.details.admissionTerms.cancellationPolicyId',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['notApplicable', 'flexible', 'standard', 'strict'],
  );

  static const updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsCapacityLimit = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.details.admissionTerms.capacityLimit',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 1000,
  );

  static const updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsCurrency = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.details.admissionTerms.currency',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[A-Z]{3}\$',
  );

  static const updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsPriceInPaise = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.details.admissionTerms.priceInPaise',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 100000000,
  );

  static const updatePrivateEventDetailsCallablePayloadDetailsDescription = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.details.description',
    maxLength: 2000,
    valueTypes: <String>['string'],
  );

  static const updatePrivateEventDetailsCallablePayloadDetailsDistanceKm = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.details.distanceKm',
    valueTypes: <String>['number'],
    minimum: 0,
    maximum: 100,
  );

  static const updatePrivateEventDetailsCallablePayloadDetailsDurationMinutesValue = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.details.durationMinutes.value',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 15,
    maximum: 240,
  );

  static const updatePrivateEventDetailsCallablePayloadDetailsEventFormatValueCustomActivityLabel = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.details.eventFormat.value.customActivityLabel',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const updatePrivateEventDetailsCallablePayloadDetailsEventPhotos = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.details.eventPhotos',
    valueTypes: <String>['array'],
    itemValueTypes: <String>['object'],
  );

  static const updatePrivateEventDetailsCallablePayloadDetailsPace = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.details.pace',
    valueTypes: <String>['string'],
    enumValues: <String>['easy', 'moderate', 'fast', 'competitive'],
  );

  static const updatePrivateEventDetailsCallablePayloadDetailsVenueValueName = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.details.venue.value.name',
    maxLength: 240,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const updatePrivateEventDetailsCallablePayloadEventId = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.eventId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const updatePrivateEventDetailsCallablePayloadExpectedSetupRevision = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.expectedSetupRevision',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 999999999,
  );

  static const updatePrivateEventDetailsCallablePayloadRequestId = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.requestId',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[A-Za-z0-9][A-Za-z0-9_-]{7,127}\$',
  );

  static const updatePrivateEventDetailsCallablePayloadReviewedDefaultsHash = CatchContractFieldConstraints(
    path: 'updatePrivateEventDetailsCallablePayload.reviewedDefaultsHash',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[a-f0-9]{64}\$',
  );

  static const updateUserProfilePatchActivityPreferencesRunningPaceMaxSecsPerKm = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.activityPreferences.running.paceMaxSecsPerKm',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
  );

  static const updateUserProfilePatchActivityPreferencesRunningPaceMinSecsPerKm = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.activityPreferences.running.paceMinSecsPerKm',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
  );

  static const updateUserProfilePatchActivityPreferencesRunningPreferredDistances = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.activityPreferences.running.preferredDistances',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['fiveK', 'tenK', 'halfMarathon', 'marathon'],
    maxItems: 12,
    uniqueItems: true,
  );

  static const updateUserProfilePatchActivityPreferencesRunningPreferredRunTimes = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.activityPreferences.running.preferredRunTimes',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['earlyMorning', 'morning', 'afternoon', 'evening', 'night'],
    maxItems: 8,
    uniqueItems: true,
  );

  static const updateUserProfilePatchActivityPreferencesRunningRunningReasons = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.activityPreferences.running.runningReasons',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['fitness', 'community', 'mindfulness', 'challenge', 'weightLoss', 'raceTraining', 'social'],
    maxItems: 12,
    uniqueItems: true,
  );

  static const updateUserProfilePatchChildren = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.children',
    valueTypes: <String>['string'],
    enumValues: <String>['dontHave', 'haveWantMore', 'haveNoMore', 'wantSomeday', 'dontWant'],
  );

  static const updateUserProfilePatchCity = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.city',
    maxLength: 120,
    minLength: 1,
    valueTypes: <String>['string'],
    pattern: '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
  );

  static const updateUserProfilePatchCompany = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.company',
    maxLength: 120,
    valueTypes: <String>['string'],
  );

  static const updateUserProfilePatchDiet = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.diet',
    valueTypes: <String>['string'],
    enumValues: <String>['omnivore', 'vegetarian', 'vegan', 'jain', 'other'],
  );

  static const updateUserProfilePatchDisplayName = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.displayName',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
    pattern: '.*\\S.*',
  );

  static const updateUserProfilePatchDrinking = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.drinking',
    valueTypes: <String>['string'],
    enumValues: <String>['never', 'socially', 'often'],
  );

  static const updateUserProfilePatchEducation = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.education',
    valueTypes: <String>['string'],
    enumValues: <String>['highSchool', 'someCollege', 'bachelors', 'masters', 'phd', 'tradeSchool', 'other'],
  );

  static const updateUserProfilePatchEmail = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.email',
    maxLength: 320,
    valueTypes: <String>['string'],
    format: 'email',
  );

  static const updateUserProfilePatchHeight = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.height',
    valueTypes: <String>['integer'],
    minimum: 120,
    maximum: 220,
  );

  static const updateUserProfilePatchInstagramHandle = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.instagramHandle',
    maxLength: 30,
    minLength: 1,
    valueTypes: <String>['string'],
    pattern: '^[A-Za-z0-9._]{1,30}\$',
  );

  static const updateUserProfilePatchInterestedInGenders = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.interestedInGenders',
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['man', 'woman', 'nonBinary', 'other'],
    minItems: 1,
    maxItems: 8,
    uniqueItems: true,
  );

  static const updateUserProfilePatchLanguages = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.languages',
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    itemEnumValues: <String>['english', 'hindi', 'marathi', 'tamil', 'telugu', 'kannada', 'bengali', 'gujarati', 'punjabi', 'malayalam', 'odia', 'other'],
    maxItems: 20,
    uniqueItems: true,
  );

  static const updateUserProfilePatchMaxAgePreference = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.maxAgePreference',
    valueTypes: <String>['integer'],
    minimum: 18,
    maximum: 99,
  );

  static const updateUserProfilePatchMinAgePreference = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.minAgePreference',
    valueTypes: <String>['integer'],
    minimum: 18,
    maximum: 99,
  );

  static const updateUserProfilePatchOccupation = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.occupation',
    maxLength: 120,
    valueTypes: <String>['string'],
  );

  static const updateUserProfilePatchPrefsCrossPathsInvitations = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.prefsCrossPathsInvitations',
    valueTypes: <String>['boolean'],
  );

  static const updateUserProfilePatchPrefsEventReminders = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.prefsEventReminders',
    valueTypes: <String>['boolean'],
  );

  static const updateUserProfilePatchPrefsMessages = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.prefsMessages',
    valueTypes: <String>['boolean'],
  );

  static const updateUserProfilePatchPrefsNewCatches = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.prefsNewCatches',
    valueTypes: <String>['boolean'],
  );

  static const updateUserProfilePatchPrefsOrganizerUpdates = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.prefsOrganizerUpdates',
    valueTypes: <String>['boolean'],
  );

  static const updateUserProfilePatchPrefsRunStatusUpdates = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.prefsRunStatusUpdates',
    valueTypes: <String>['boolean'],
  );

  static const updateUserProfilePatchPrefsShowInCrossPaths = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.prefsShowInCrossPaths',
    valueTypes: <String>['boolean'],
  );

  static const updateUserProfilePatchPrefsShowOnMap = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.prefsShowOnMap',
    valueTypes: <String>['boolean'],
  );

  static const updateUserProfilePatchPrefsWeeklyDigest = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.prefsWeeklyDigest',
    valueTypes: <String>['boolean'],
  );

  static const updateUserProfilePatchRelationshipGoal = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.relationshipGoal',
    valueTypes: <String>['string'],
    enumValues: <String>['relationship', 'casual', 'marriage', 'friendship', 'unsure'],
  );

  static const updateUserProfilePatchReligion = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.religion',
    valueTypes: <String>['string'],
    enumValues: <String>['hindu', 'muslim', 'christian', 'sikh', 'jain', 'buddhist', 'other', 'nonReligious'],
  );

  static const updateUserProfilePatchSmoking = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.smoking',
    valueTypes: <String>['string'],
    enumValues: <String>['never', 'occasionally', 'often'],
  );

  static const updateUserProfilePatchWorkout = CatchContractFieldConstraints(
    path: 'updateUserProfilePatch.workout',
    valueTypes: <String>['string'],
    enumValues: <String>['never', 'sometimes', 'often', 'everyday'],
  );

  static const upsertEventSuccessLayoutCallablePayloadLabel = CatchContractFieldConstraints(
    path: 'upsertEventSuccessLayoutCallablePayload.label',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertEventSuccessLayoutCallablePayloadUnits = CatchContractFieldConstraints(
    path: 'upsertEventSuccessLayoutCallablePayload.units',
    required: true,
    valueTypes: <String>['array'],
    itemValueTypes: <String>['object'],
    minItems: 1,
    maxItems: 200,
  );

  static const upsertEventSuccessLayoutCallablePayloadUnitsItemsCapacity = CatchContractFieldConstraints(
    path: 'upsertEventSuccessLayoutCallablePayload.units.items.capacity',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 1000,
  );

  static const upsertEventSuccessLayoutCallablePayloadUnitsItemsGridX = CatchContractFieldConstraints(
    path: 'upsertEventSuccessLayoutCallablePayload.units.items.gridX',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 199,
  );

  static const upsertEventSuccessLayoutCallablePayloadUnitsItemsShape = CatchContractFieldConstraints(
    path: 'upsertEventSuccessLayoutCallablePayload.units.items.shape',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['round', 'rect', 'row', 'court', 'zone'],
  );

  static const upsertOrganizerCampaignCallablePayloadEventId = CatchContractFieldConstraints(
    path: 'upsertOrganizerCampaignCallablePayload.eventId',
    maxLength: 180,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerCampaignCallablePayloadInviteDestinationKind = CatchContractFieldConstraints(
    path: 'upsertOrganizerCampaignCallablePayload.inviteDestinationKind',
    valueTypes: <String>['string'],
    enumValues: <String>['catchEvent', 'eventRuntime', 'externalBooking', 'marketingLanding'],
  );

  static const upsertOrganizerCampaignCallablePayloadMessageClass = CatchContractFieldConstraints(
    path: 'upsertOrganizerCampaignCallablePayload.messageClass',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['eventFollowUp', 'organizerUpdate', 'organizerPromotion'],
  );

  static const upsertOrganizerCampaignCallablePayloadName = CatchContractFieldConstraints(
    path: 'upsertOrganizerCampaignCallablePayload.name',
    maxLength: 120,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerCampaignCallablePayloadSavedAudienceId = CatchContractFieldConstraints(
    path: 'upsertOrganizerCampaignCallablePayload.savedAudienceId',
    maxLength: 180,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerCampaignCallablePayloadTemplateId = CatchContractFieldConstraints(
    path: 'upsertOrganizerCampaignCallablePayload.templateId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerMomentCallablePayloadActionConnectionId = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.action.connectionId',
    maxLength: 180,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerMomentCallablePayloadActionDuty = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.action.duty',
    maxLength: 80,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerMomentCallablePayloadActionKind = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.action.kind',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['sendTemplate', 'push', 'staffAttention'],
  );

  static const upsertOrganizerMomentCallablePayloadActionNotificationType = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.action.notificationType',
    maxLength: 80,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerMomentCallablePayloadActionPreferenceKey = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.action.preferenceKey',
    maxLength: 80,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerMomentCallablePayloadActionSeverity = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.action.severity',
    valueTypes: <String>['string'],
    enumValues: <String>['info', 'warning', 'urgent'],
  );

  static const upsertOrganizerMomentCallablePayloadActionTemplateId = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.action.templateId',
    maxLength: 180,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerMomentCallablePayloadActionTitleTemplate = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.action.titleTemplate',
    maxLength: 200,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerMomentCallablePayloadAudienceDuty = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.audience.duty',
    maxLength: 80,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerMomentCallablePayloadAudienceFunctionId = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.audience.functionId',
    maxLength: 180,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerMomentCallablePayloadAudienceHouseholdDedupe = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.audience.householdDedupe',
    valueTypes: <String>['boolean'],
  );

  static const upsertOrganizerMomentCallablePayloadAudienceKind = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.audience.kind',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['subject', 'eventParticipants', 'functionGuests', 'households', 'staffDuty'],
  );

  static const upsertOrganizerMomentCallablePayloadAudienceRsvpItems = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.audience.rsvp.items',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['attending', 'maybe'],
  );

  static const upsertOrganizerMomentCallablePayloadAudienceRsvpPendingOnly = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.audience.rsvpPendingOnly',
    valueTypes: <String>['boolean'],
  );

  static const upsertOrganizerMomentCallablePayloadAudienceTravelTimeLead = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.audience.travelTimeLead',
    valueTypes: <String>['boolean'],
  );

  static const upsertOrganizerMomentCallablePayloadInitiationAnchorId = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.initiation.anchorId',
    maxLength: 180,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerMomentCallablePayloadInitiationAnchorKind = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.initiation.anchorKind',
    valueTypes: <String>['string'],
    enumValues: <String>['scopeStart', 'scopeEnd', 'functionStart', 'functionEnd', 'rsvpDeadline', 'travelLegTime'],
  );

  static const upsertOrganizerMomentCallablePayloadInitiationFunctionId = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.initiation.functionId',
    maxLength: 180,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerMomentCallablePayloadInitiationKind = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.initiation.kind',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['manual', 'scheduled', 'anchored', 'triggered'],
  );

  static const upsertOrganizerMomentCallablePayloadInitiationOffsetMinutes = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.initiation.offsetMinutes',
    valueTypes: <String>['integer'],
    minimum: -43200,
    maximum: 43200,
  );

  static const upsertOrganizerMomentCallablePayloadInitiationTriggerKind = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.initiation.triggerKind',
    valueTypes: <String>['string'],
    enumValues: <String>['lateArrivalAtHotel', 'flightDisrupted', 'formAutomation'],
  );

  static const upsertOrganizerMomentCallablePayloadName = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.name',
    maxLength: 140,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerMomentCallablePayloadSense = CatchContractFieldConstraints(
    path: 'upsertOrganizerMomentCallablePayload.sense',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['individual', 'audience'],
  );

  static const upsertOrganizerSavedAudienceCallablePayloadDefinitionJoin = CatchContractFieldConstraints(
    path: 'upsertOrganizerSavedAudienceCallablePayload.definition.join',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['all', 'any'],
  );

  static const upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsCurrency = CatchContractFieldConstraints(
    path: 'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.currency',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[A-Z]{3}\$',
  );

  static const upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsDays = CatchContractFieldConstraints(
    path: 'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.days',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 1,
    maximum: 3650,
  );

  static const upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsEventCount = CatchContractFieldConstraints(
    path: 'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.eventCount',
    required: true,
    valueTypes: <String>['integer'],
    minimum: 0,
    maximum: 10000,
  );

  static const upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsEventId = CatchContractFieldConstraints(
    path: 'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.eventId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsFormId = CatchContractFieldConstraints(
    path: 'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.formId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsKind = CatchContractFieldConstraints(
    path: 'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.kind',
    required: true,
  );

  static const upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsManualTagId = CatchContractFieldConstraints(
    path: 'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.manualTagId',
    required: true,
    valueTypes: <String>['string'],
    pattern: '^[a-f0-9]{32}\$',
  );

  static const upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsOperator = CatchContractFieldConstraints(
    path: 'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.operator',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['atLeast', 'atMost'],
  );

  static const upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsQuestionId = CatchContractFieldConstraints(
    path: 'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.questionId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsReviewStatus = CatchContractFieldConstraints(
    path: 'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.reviewStatus',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['submitted', 'inReview', 'approved', 'waitlisted', 'declined'],
  );

  static const upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsSegmentId = CatchContractFieldConstraints(
    path: 'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.segmentId',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['new_to_organizer', 'past_attendee', 'first_time_attendee', 'repeat_attendee', 'regular', 'lapsed_regular', 'reliable_attendee', 'needs_confirmation', 'advocate', 'high_impact_advocate', 'whatsapp_reachable', 'sms_reachable', 'active_member', 'lapsed_member', 'member_no_recent_attendance', 'frequent_non_member'],
  );

  static const upsertOrganizerSavedAudienceCallablePayloadName = CatchContractFieldConstraints(
    path: 'upsertOrganizerSavedAudienceCallablePayload.name',
    maxLength: 80,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertProgramFunctionCallablePayloadName = CatchContractFieldConstraints(
    path: 'upsertProgramFunctionCallablePayload.name',
    maxLength: 140,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertProgramFunctionCallablePayloadStatus = CatchContractFieldConstraints(
    path: 'upsertProgramFunctionCallablePayload.status',
    valueTypes: <String>['string'],
    enumValues: <String>['scheduled', 'completed', 'cancelled'],
  );

  static const upsertProgramFunctionCallablePayloadVenueName = CatchContractFieldConstraints(
    path: 'upsertProgramFunctionCallablePayload.venueName',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertProgramFunctionCallablePayloadVenueNotes = CatchContractFieldConstraints(
    path: 'upsertProgramFunctionCallablePayload.venueNotes',
    maxLength: 500,
    valueTypes: <String>['string'],
  );

  static const upsertProgramGuestCallablePayloadDisplayName = CatchContractFieldConstraints(
    path: 'upsertProgramGuestCallablePayload.displayName',
    maxLength: 140,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertProgramGuestCallablePayloadEmail = CatchContractFieldConstraints(
    path: 'upsertProgramGuestCallablePayload.email',
    maxLength: 320,
    valueTypes: <String>['string'],
  );

  static const upsertProgramGuestCallablePayloadGroupIds = CatchContractFieldConstraints(
    path: 'upsertProgramGuestCallablePayload.groupIds',
    valueTypes: <String>['array'],
    itemValueTypes: <String>['string'],
    maxItems: 20,
    uniqueItems: true,
  );

  static const upsertProgramGuestCallablePayloadGuestId = CatchContractFieldConstraints(
    path: 'upsertProgramGuestCallablePayload.guestId',
    maxLength: 180,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertProgramGuestCallablePayloadPhoneE164 = CatchContractFieldConstraints(
    path: 'upsertProgramGuestCallablePayload.phoneE164',
    maxLength: 20,
    valueTypes: <String>['string'],
  );

  static const upsertProgramGuestGroupCallablePayloadDimension = CatchContractFieldConstraints(
    path: 'upsertProgramGuestGroupCallablePayload.dimension',
    maxLength: 60,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertProgramGuestGroupCallablePayloadHotelId = CatchContractFieldConstraints(
    path: 'upsertProgramGuestGroupCallablePayload.hotelId',
    maxLength: 180,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const upsertProgramGuestGroupCallablePayloadLabel = CatchContractFieldConstraints(
    path: 'upsertProgramGuestGroupCallablePayload.label',
    maxLength: 140,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertProgramHotelCallablePayloadActive = CatchContractFieldConstraints(
    path: 'upsertProgramHotelCallablePayload.active',
    valueTypes: <String>['boolean'],
  );

  static const upsertProgramHotelCallablePayloadAddress = CatchContractFieldConstraints(
    path: 'upsertProgramHotelCallablePayload.address',
    maxLength: 300,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertProgramHotelCallablePayloadName = CatchContractFieldConstraints(
    path: 'upsertProgramHotelCallablePayload.name',
    maxLength: 140,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertProgramHotelCallablePayloadNotes = CatchContractFieldConstraints(
    path: 'upsertProgramHotelCallablePayload.notes',
    maxLength: 500,
    valueTypes: <String>['string'],
  );

  static const upsertProgramHotelCallablePayloadReceptionContact = CatchContractFieldConstraints(
    path: 'upsertProgramHotelCallablePayload.receptionContact',
    maxLength: 140,
    valueTypes: <String>['string'],
  );

  static const upsertProgramPickupPointCallablePayloadActive = CatchContractFieldConstraints(
    path: 'upsertProgramPickupPointCallablePayload.active',
    valueTypes: <String>['boolean'],
  );

  static const upsertProgramPickupPointCallablePayloadIataCode = CatchContractFieldConstraints(
    path: 'upsertProgramPickupPointCallablePayload.iataCode',
    valueTypes: <String>['string'],
    pattern: '^[A-Z]{3}\$',
  );

  static const upsertProgramPickupPointCallablePayloadInstructions = CatchContractFieldConstraints(
    path: 'upsertProgramPickupPointCallablePayload.instructions',
    maxLength: 500,
    valueTypes: <String>['string'],
  );

  static const upsertProgramPickupPointCallablePayloadKind = CatchContractFieldConstraints(
    path: 'upsertProgramPickupPointCallablePayload.kind',
    required: true,
    valueTypes: <String>['string'],
    enumValues: <String>['airport', 'railway', 'venue', 'other'],
  );

  static const upsertProgramPickupPointCallablePayloadLabel = CatchContractFieldConstraints(
    path: 'upsertProgramPickupPointCallablePayload.label',
    maxLength: 140,
    minLength: 1,
    required: true,
    valueTypes: <String>['string'],
  );

  static const upsertProgramPickupPointCallablePayloadMeetingZone = CatchContractFieldConstraints(
    path: 'upsertProgramPickupPointCallablePayload.meetingZone',
    maxLength: 140,
    valueTypes: <String>['string'],
  );

  static const upsertProgramPickupPointCallablePayloadTerminal = CatchContractFieldConstraints(
    path: 'upsertProgramPickupPointCallablePayload.terminal',
    maxLength: 40,
    valueTypes: <String>['string'],
  );

  static const upsertProgramStayCallablePayloadRoomLabel = CatchContractFieldConstraints(
    path: 'upsertProgramStayCallablePayload.roomLabel',
    maxLength: 40,
    minLength: 1,
    valueTypes: <String>['string'],
  );

  static const userAnalyticsQueryCallablePayloadRangePreset = CatchContractFieldConstraints(
    path: 'userAnalyticsQueryCallablePayload.rangePreset',
    valueTypes: <String>['string'],
    enumValues: <String>['7d', '30d', '90d', 'month', 'custom'],
  );

  static const all = <String, CatchContractFieldConstraints>{
    'accessApplicationDocument.availabilityWindows': accessApplicationDocumentAvailabilityWindows,
    'accessApplicationDocument.city': accessApplicationDocumentCity,
    'accessApplicationDocument.eventTypes': accessApplicationDocumentEventTypes,
    'accessApplicationDocument.instagramHandle': accessApplicationDocumentInstagramHandle,
    'accessApplicationDocument.inviteCode': accessApplicationDocumentInviteCode,
    'accessApplicationDocument.referralSource': accessApplicationDocumentReferralSource,
    'accessApplicationDocument.role': accessApplicationDocumentRole,
    'accessApplicationDocument.wantsToHost': accessApplicationDocumentWantsToHost,
    'accessApplicationDocument.whyCatch': accessApplicationDocumentWhyCatch,
    'addOrganizerHostCallablePayload.phoneNumber': addOrganizerHostCallablePayloadPhoneNumber,
    'applyProgramFunctionInvitationsCallablePayload.invitationMode': applyProgramFunctionInvitationsCallablePayloadInvitationMode,
    'claimParticipantFormProfileCallablePayload.profile.children': claimParticipantFormProfileCallablePayloadProfileChildren,
    'claimParticipantFormProfileCallablePayload.profile.city': claimParticipantFormProfileCallablePayloadProfileCity,
    'claimParticipantFormProfileCallablePayload.profile.company': claimParticipantFormProfileCallablePayloadProfileCompany,
    'claimParticipantFormProfileCallablePayload.profile.dateOfBirth': claimParticipantFormProfileCallablePayloadProfileDateOfBirth,
    'claimParticipantFormProfileCallablePayload.profile.diet': claimParticipantFormProfileCallablePayloadProfileDiet,
    'claimParticipantFormProfileCallablePayload.profile.displayName': claimParticipantFormProfileCallablePayloadProfileDisplayName,
    'claimParticipantFormProfileCallablePayload.profile.drinking': claimParticipantFormProfileCallablePayloadProfileDrinking,
    'claimParticipantFormProfileCallablePayload.profile.education': claimParticipantFormProfileCallablePayloadProfileEducation,
    'claimParticipantFormProfileCallablePayload.profile.email': claimParticipantFormProfileCallablePayloadProfileEmail,
    'claimParticipantFormProfileCallablePayload.profile.firstName': claimParticipantFormProfileCallablePayloadProfileFirstName,
    'claimParticipantFormProfileCallablePayload.profile.gender': claimParticipantFormProfileCallablePayloadProfileGender,
    'claimParticipantFormProfileCallablePayload.profile.height': claimParticipantFormProfileCallablePayloadProfileHeight,
    'claimParticipantFormProfileCallablePayload.profile.instagramHandle': claimParticipantFormProfileCallablePayloadProfileInstagramHandle,
    'claimParticipantFormProfileCallablePayload.profile.interestedInGenders': claimParticipantFormProfileCallablePayloadProfileInterestedInGenders,
    'claimParticipantFormProfileCallablePayload.profile.interestedInGenders.items': claimParticipantFormProfileCallablePayloadProfileInterestedInGendersItems,
    'claimParticipantFormProfileCallablePayload.profile.languages': claimParticipantFormProfileCallablePayloadProfileLanguages,
    'claimParticipantFormProfileCallablePayload.profile.languages.items': claimParticipantFormProfileCallablePayloadProfileLanguagesItems,
    'claimParticipantFormProfileCallablePayload.profile.lastName': claimParticipantFormProfileCallablePayloadProfileLastName,
    'claimParticipantFormProfileCallablePayload.profile.name': claimParticipantFormProfileCallablePayloadProfileName,
    'claimParticipantFormProfileCallablePayload.profile.occupation': claimParticipantFormProfileCallablePayloadProfileOccupation,
    'claimParticipantFormProfileCallablePayload.profile.relationshipGoal': claimParticipantFormProfileCallablePayloadProfileRelationshipGoal,
    'claimParticipantFormProfileCallablePayload.profile.religion': claimParticipantFormProfileCallablePayloadProfileReligion,
    'claimParticipantFormProfileCallablePayload.profile.smoking': claimParticipantFormProfileCallablePayloadProfileSmoking,
    'claimParticipantFormProfileCallablePayload.profile.workout': claimParticipantFormProfileCallablePayloadProfileWorkout,
    'configureEventAssignmentFeaturesCallablePayload.rules.items.kind': configureEventAssignmentFeaturesCallablePayloadRulesItemsKind,
    'configureEventAssignmentFeaturesCallablePayload.rules.items.maximum': configureEventAssignmentFeaturesCallablePayloadRulesItemsMaximum,
    'configureEventAssignmentFeaturesCallablePayload.rules.items.minimum': configureEventAssignmentFeaturesCallablePayloadRulesItemsMinimum,
    'configureEventAssignmentFeaturesCallablePayload.rules.items.mode': configureEventAssignmentFeaturesCallablePayloadRulesItemsMode,
    'configureEventAssignmentFeaturesCallablePayload.rules.items.weight': configureEventAssignmentFeaturesCallablePayloadRulesItemsWeight,
    'configureEventOfferPreferencesCallablePayload.intents.currency.value': configureEventOfferPreferencesCallablePayloadIntentsCurrencyValue,
    'configureEventOfferPreferencesCallablePayload.intents.expectedAmountMinor.value': configureEventOfferPreferencesCallablePayloadIntentsExpectedAmountMinorValue,
    'configureEventOfferPreferencesCallablePayload.intents.offerValidityMinutes.value': configureEventOfferPreferencesCallablePayloadIntentsOfferValidityMinutesValue,
    'configureEventOfferPreferencesCallablePayload.intents.paymentInstructions.value': configureEventOfferPreferencesCallablePayloadIntentsPaymentInstructionsValue,
    'configureEventOfferPreferencesCallablePayload.intents.reusablePaymentPage.value.reusableForEvents': configureEventOfferPreferencesCallablePayloadIntentsReusablePaymentPageValueReusableForEvents,
    'configureEventOfferPreferencesCallablePayload.intents.reusablePaymentPage.value.url': configureEventOfferPreferencesCallablePayloadIntentsReusablePaymentPageValueUrl,
    'confirmEventAssistanceDepartureCallablePayload.command.payload.checkpointRequest.dueAt': confirmEventAssistanceDepartureCallablePayloadCommandPayloadCheckpointRequestDueAt,
    'controlEventRehearsalCallablePayload.staff.decision.duty': controlEventRehearsalCallablePayloadStaffDecisionDuty,
    'controlEventRehearsalCallablePayload.staff.decision.expiresAtMillis': controlEventRehearsalCallablePayloadStaffDecisionExpiresAtMillis,
    'controlEventRehearsalCallablePayload.staff.displayName': controlEventRehearsalCallablePayloadStaffDisplayName,
    'controlEventRehearsalCallablePayload.staff.groupId': controlEventRehearsalCallablePayloadStaffGroupId,
    'createChatMessageClientWrite.data.text': createChatMessageClientWriteDataText,
    'createEventCallablePayload.capacityLimit': createEventCallablePayloadCapacityLimit,
    'createEventCallablePayload.constraints.maxAge': createEventCallablePayloadConstraintsMaxAge,
    'createEventCallablePayload.constraints.maxMen': createEventCallablePayloadConstraintsMaxMen,
    'createEventCallablePayload.constraints.maxWomen': createEventCallablePayloadConstraintsMaxWomen,
    'createEventCallablePayload.constraints.minAge': createEventCallablePayloadConstraintsMinAge,
    'createEventCallablePayload.description': createEventCallablePayloadDescription,
    'createEventCallablePayload.distanceKm': createEventCallablePayloadDistanceKm,
    'createEventCallablePayload.eventFormat.activityDetails.publicDetails.accessibility': createEventCallablePayloadEventFormatActivityDetailsPublicDetailsAccessibility,
    'createEventCallablePayload.eventFormat.activityDetails.publicDetails.included': createEventCallablePayloadEventFormatActivityDetailsPublicDetailsIncluded,
    'createEventCallablePayload.eventFormat.activityDetails.routePlan.groupStrategy': createEventCallablePayloadEventFormatActivityDetailsRoutePlanGroupStrategy,
    'createEventCallablePayload.eventFormat.activityDetails.routePlan.liveTrackingPolicy.mode': createEventCallablePayloadEventFormatActivityDetailsRoutePlanLiveTrackingPolicyMode,
    'createEventCallablePayload.eventFormat.activityDetails.routePlan.movementMode': createEventCallablePayloadEventFormatActivityDetailsRoutePlanMovementMode,
    'createEventCallablePayload.eventFormat.activityDetails.routePlan.paceGroups': createEventCallablePayloadEventFormatActivityDetailsRoutePlanPaceGroups,
    'createEventCallablePayload.eventFormat.activityDetails.routePlan.roleKinds': createEventCallablePayloadEventFormatActivityDetailsRoutePlanRoleKinds,
    'createEventCallablePayload.eventFormat.activityDetails.routePlan.routeShape': createEventCallablePayloadEventFormatActivityDetailsRoutePlanRouteShape,
    'createEventCallablePayload.eventFormat.activityDetails.routePlan.stopCadence': createEventCallablePayloadEventFormatActivityDetailsRoutePlanStopCadence,
    'createEventCallablePayload.eventFormat.activityDetails.routePlan.stopKinds': createEventCallablePayloadEventFormatActivityDetailsRoutePlanStopKinds,
    'createEventCallablePayload.eventFormat.activityKind': createEventCallablePayloadEventFormatActivityKind,
    'createEventCallablePayload.eventFormat.customActivityLabel': createEventCallablePayloadEventFormatCustomActivityLabel,
    'createEventCallablePayload.eventFormat.interactionModel': createEventCallablePayloadEventFormatInteractionModel,
    'createEventCallablePayload.eventPolicy.admission.crossPathsPairInventory.enabled': createEventCallablePayloadEventPolicyAdmissionCrossPathsPairInventoryEnabled,
    'createEventCallablePayload.eventPolicy.admission.crossPathsPairInventory.reservedPairCapacity': createEventCallablePayloadEventPolicyAdmissionCrossPathsPairInventoryReservedPairCapacity,
    'createEventCallablePayload.eventPolicy.admission.format': createEventCallablePayloadEventPolicyAdmissionFormat,
    'createEventCallablePayload.eventPolicy.cancellation.policyId': createEventCallablePayloadEventPolicyCancellationPolicyId,
    'createEventCallablePayload.eventPolicy.pricing.demandPricingRules.items.maxAdjustmentInPaise': createEventCallablePayloadEventPolicyPricingDemandPricingRulesItemsMaxAdjustmentInPaise,
    'createEventCallablePayload.eventPolicy.pricing.demandPricingRules.items.stepAdjustmentInPaise': createEventCallablePayloadEventPolicyPricingDemandPricingRulesItemsStepAdjustmentInPaise,
    'createEventCallablePayload.externalOrigin.externalEventId': createEventCallablePayloadExternalOriginExternalEventId,
    'createEventCallablePayload.externalOrigin.externalEventUrl': createEventCallablePayloadExternalOriginExternalEventUrl,
    'createEventCallablePayload.externalOrigin.provider': createEventCallablePayloadExternalOriginProvider,
    'createEventCallablePayload.itinerary.items.description': createEventCallablePayloadItineraryItemsDescription,
    'createEventCallablePayload.itinerary.items.durationMinutes': createEventCallablePayloadItineraryItemsDurationMinutes,
    'createEventCallablePayload.itinerary.items.kind': createEventCallablePayloadItineraryItemsKind,
    'createEventCallablePayload.itinerary.items.offsetMinutes': createEventCallablePayloadItineraryItemsOffsetMinutes,
    'createEventCallablePayload.itinerary.items.routeDistanceMeters': createEventCallablePayloadItineraryItemsRouteDistanceMeters,
    'createEventCallablePayload.itinerary.items.title': createEventCallablePayloadItineraryItemsTitle,
    'createEventCallablePayload.locationDetails': createEventCallablePayloadLocationDetails,
    'createEventCallablePayload.meetingPoint': createEventCallablePayloadMeetingPoint,
    'createEventCallablePayload.name': createEventCallablePayloadName,
    'createEventCallablePayload.pace': createEventCallablePayloadPace,
    'createEventCallablePayload.priceInPaise': createEventCallablePayloadPriceInPaise,
    'createEventCallablePayload.privateAccess.inviteCode': createEventCallablePayloadPrivateAccessInviteCode,
    'createEventCallablePayload.runtimeWalkInPolicy': createEventCallablePayloadRuntimeWalkInPolicy,
    'createEventInviteLinkCallablePayload.label': createEventInviteLinkCallablePayloadLabel,
    'createEventInviteLinkCallablePayload.source': createEventInviteLinkCallablePayloadSource,
    'createEventRehearsalCallablePayload.actorCount': createEventRehearsalCallablePayloadActorCount,
    'createEventReviewCallablePayload.comment': createEventReviewCallablePayloadComment,
    'createOrganizerCallablePayload.area': createOrganizerCallablePayloadArea,
    'createOrganizerCallablePayload.description': createOrganizerCallablePayloadDescription,
    'createOrganizerCallablePayload.email': createOrganizerCallablePayloadEmail,
    'createOrganizerCallablePayload.hostDefaults.eventPolicy.admissionPreset': createOrganizerCallablePayloadHostDefaultsEventPolicyAdmissionPreset,
    'createOrganizerCallablePayload.hostDefaults.eventPolicy.cancellationPolicyId': createOrganizerCallablePayloadHostDefaultsEventPolicyCancellationPolicyId,
    'createOrganizerCallablePayload.hostDefaults.eventPolicy.dynamicPricingEnabled': createOrganizerCallablePayloadHostDefaultsEventPolicyDynamicPricingEnabled,
    'createOrganizerCallablePayload.hostDefaults.eventPolicy.dynamicPricingMaxInPaise': createOrganizerCallablePayloadHostDefaultsEventPolicyDynamicPricingMaxInPaise,
    'createOrganizerCallablePayload.hostDefaults.eventPolicy.dynamicPricingStepInPaise': createOrganizerCallablePayloadHostDefaultsEventPolicyDynamicPricingStepInPaise,
    'createOrganizerCallablePayload.hostDefaults.eventPolicy.maxAge': createOrganizerCallablePayloadHostDefaultsEventPolicyMaxAge,
    'createOrganizerCallablePayload.hostDefaults.eventPolicy.maxMen': createOrganizerCallablePayloadHostDefaultsEventPolicyMaxMen,
    'createOrganizerCallablePayload.hostDefaults.eventPolicy.maxWomen': createOrganizerCallablePayloadHostDefaultsEventPolicyMaxWomen,
    'createOrganizerCallablePayload.hostDefaults.eventPolicy.minAge': createOrganizerCallablePayloadHostDefaultsEventPolicyMinAge,
    'createOrganizerCallablePayload.hostDefaults.eventSuccess.enabled': createOrganizerCallablePayloadHostDefaultsEventSuccessEnabled,
    'createOrganizerCallablePayload.hostDefaults.primaryActivityKind': createOrganizerCallablePayloadHostDefaultsPrimaryActivityKind,
    'createOrganizerCallablePayload.instagramHandle': createOrganizerCallablePayloadInstagramHandle,
    'createOrganizerCallablePayload.location': createOrganizerCallablePayloadLocation,
    'createOrganizerCallablePayload.name': createOrganizerCallablePayloadName,
    'createOrganizerCallablePayload.organizerType': createOrganizerCallablePayloadOrganizerType,
    'createOrganizerCallablePayload.phoneNumber': createOrganizerCallablePayloadPhoneNumber,
    'createOrganizerContactCallablePayload.displayName': createOrganizerContactCallablePayloadDisplayName,
    'createOrganizerContactCallablePayload.email': createOrganizerContactCallablePayloadEmail,
    'createOrganizerContactCallablePayload.initialNote': createOrganizerContactCallablePayloadInitialNote,
    'createOrganizerContactCallablePayload.phoneE164': createOrganizerContactCallablePayloadPhoneE164,
    'createOrganizerContactNoteCallablePayload.body': createOrganizerContactNoteCallablePayloadBody,
    'createOrganizerFormAutomationCallablePayload.actions.items.campaignId': createOrganizerFormAutomationCallablePayloadActionsItemsCampaignId,
    'createOrganizerFormAutomationCallablePayload.actions.items.eventId': createOrganizerFormAutomationCallablePayloadActionsItemsEventId,
    'createOrganizerFormAutomationCallablePayload.actions.items.kind': createOrganizerFormAutomationCallablePayloadActionsItemsKind,
    'createOrganizerFormAutomationCallablePayload.actions.items.tagId': createOrganizerFormAutomationCallablePayloadActionsItemsTagId,
    'createOrganizerFormAutomationCallablePayload.actions.items.webhookUrl': createOrganizerFormAutomationCallablePayloadActionsItemsWebhookUrl,
    'createOrganizerFormAutomationCallablePayload.enabled': createOrganizerFormAutomationCallablePayloadEnabled,
    'createOrganizerFormAutomationCallablePayload.name': createOrganizerFormAutomationCallablePayloadName,
    'createOrganizerFormAutomationCallablePayload.trigger': createOrganizerFormAutomationCallablePayloadTrigger,
    'createOrganizerFormShareLinkCallablePayload.label': createOrganizerFormShareLinkCallablePayloadLabel,
    'createOrganizerFormShareLinkCallablePayload.source': createOrganizerFormShareLinkCallablePayloadSource,
    'createOrganizerPostCallablePayload.text': createOrganizerPostCallablePayloadText,
    'createOrganizerProgramCallablePayload.kind': createOrganizerProgramCallablePayloadKind,
    'createOrganizerProgramCallablePayload.startsAtMillis': createOrganizerProgramCallablePayloadStartsAtMillis,
    'createOrganizerProgramCallablePayload.timezone': createOrganizerProgramCallablePayloadTimezone,
    'createOrganizerProgramCallablePayload.title': createOrganizerProgramCallablePayloadTitle,
    'createProfileDecisionClientWrite.data.comment': createProfileDecisionClientWriteDataComment,
    'createProgramWalkInCallablePayload.displayName': createProgramWalkInCallablePayloadDisplayName,
    'createProgramWalkInCallablePayload.partySize': createProgramWalkInCallablePayloadPartySize,
    'createRazorpayHostPaymentAccountCallablePayload.bankAccountNumber': createRazorpayHostPaymentAccountCallablePayloadBankAccountNumber,
    'createRazorpayHostPaymentAccountCallablePayload.beneficiaryName': createRazorpayHostPaymentAccountCallablePayloadBeneficiaryName,
    'createRazorpayHostPaymentAccountCallablePayload.businessModel': createRazorpayHostPaymentAccountCallablePayloadBusinessModel,
    'createRazorpayHostPaymentAccountCallablePayload.businessPan': createRazorpayHostPaymentAccountCallablePayloadBusinessPan,
    'createRazorpayHostPaymentAccountCallablePayload.businessType': createRazorpayHostPaymentAccountCallablePayloadBusinessType,
    'createRazorpayHostPaymentAccountCallablePayload.contactName': createRazorpayHostPaymentAccountCallablePayloadContactName,
    'createRazorpayHostPaymentAccountCallablePayload.email': createRazorpayHostPaymentAccountCallablePayloadEmail,
    'createRazorpayHostPaymentAccountCallablePayload.ifscCode': createRazorpayHostPaymentAccountCallablePayloadIfscCode,
    'createRazorpayHostPaymentAccountCallablePayload.legalBusinessName': createRazorpayHostPaymentAccountCallablePayloadLegalBusinessName,
    'createRazorpayHostPaymentAccountCallablePayload.phone': createRazorpayHostPaymentAccountCallablePayloadPhone,
    'createRazorpayHostPaymentAccountCallablePayload.stakeholderEmail': createRazorpayHostPaymentAccountCallablePayloadStakeholderEmail,
    'createRazorpayHostPaymentAccountCallablePayload.stakeholderIsDirector': createRazorpayHostPaymentAccountCallablePayloadStakeholderIsDirector,
    'createRazorpayHostPaymentAccountCallablePayload.stakeholderIsExecutive': createRazorpayHostPaymentAccountCallablePayloadStakeholderIsExecutive,
    'createRazorpayHostPaymentAccountCallablePayload.stakeholderName': createRazorpayHostPaymentAccountCallablePayloadStakeholderName,
    'createRazorpayHostPaymentAccountCallablePayload.stakeholderOwnershipPercent': createRazorpayHostPaymentAccountCallablePayloadStakeholderOwnershipPercent,
    'createRazorpayHostPaymentAccountCallablePayload.stakeholderPan': createRazorpayHostPaymentAccountCallablePayloadStakeholderPan,
    'createRazorpayHostPaymentAccountCallablePayload.stakeholderPhone': createRazorpayHostPaymentAccountCallablePayloadStakeholderPhone,
    'createRazorpayHostPaymentAccountCallablePayload.termsAccepted': createRazorpayHostPaymentAccountCallablePayloadTermsAccepted,
    'eventAssistanceLateJoinInput.policy.destination.lateEntry': eventAssistanceLateJoinInputPolicyDestinationLateEntry,
    'eventAssistanceLateJoinInput.policy.destination.permittedCheckpointIds': eventAssistanceLateJoinInputPolicyDestinationPermittedCheckpointIds,
    'eventAssistanceLateJoinInput.policy.destination.permittedStopIds': eventAssistanceLateJoinInputPolicyDestinationPermittedStopIds,
    'eventAssistanceLateJoinInput.policy.maxMessagesPerEpisode': eventAssistanceLateJoinInputPolicyMaxMessagesPerEpisode,
    'eventAssistanceLateJoinInput.policy.minimumMinutesBetweenMessages': eventAssistanceLateJoinInputPolicyMinimumMinutesBetweenMessages,
    'eventAssistanceLateJoinInput.policy.unanswered': eventAssistanceLateJoinInputPolicyUnanswered,
    'eventDocument.itinerary': eventDocumentItinerary,
    'eventDocument.itinerary.items.description': eventDocumentItineraryItemsDescription,
    'eventDocument.itinerary.items.durationMinutes': eventDocumentItineraryItemsDurationMinutes,
    'eventDocument.itinerary.items.id': eventDocumentItineraryItemsId,
    'eventDocument.itinerary.items.offsetMinutes': eventDocumentItineraryItemsOffsetMinutes,
    'eventDocument.itinerary.items.routeDistanceMeters': eventDocumentItineraryItemsRouteDistanceMeters,
    'eventDocument.itinerary.items.title': eventDocumentItineraryItemsTitle,
    'eventDocument.meetingLocation.address': eventDocumentMeetingLocationAddress,
    'eventDocument.meetingLocation.latitude': eventDocumentMeetingLocationLatitude,
    'eventDocument.meetingLocation.longitude': eventDocumentMeetingLocationLongitude,
    'eventDocument.meetingLocation.name': eventDocumentMeetingLocationName,
    'eventDocument.meetingLocation.notes': eventDocumentMeetingLocationNotes,
    'eventDocument.meetingLocation.placeId': eventDocumentMeetingLocationPlaceId,
    'eventSuccessFeedbackDocument.privateNote': eventSuccessFeedbackDocumentPrivateNote,
    'eventSuccessFeedbackDocument.safetyConcern': eventSuccessFeedbackDocumentSafetyConcern,
    'eventSuccessPlanDocument.attendeePrompt': eventSuccessPlanDocumentAttendeePrompt,
    'eventSuccessPlanDocument.conversationGraphConsentMode': eventSuccessPlanDocumentConversationGraphConsentMode,
    'eventSuccessPlanDocument.hostGoal': eventSuccessPlanDocumentHostGoal,
    'eventSuccessPlanDocument.questionnaireConfig.customQuestions.items.options.items.label': eventSuccessPlanDocumentQuestionnaireConfigCustomQuestionsItemsOptionsItemsLabel,
    'eventSuccessPlanDocument.questionnaireConfig.customQuestions.items.prompt': eventSuccessPlanDocumentQuestionnaireConfigCustomQuestionsItemsPrompt,
    'eventSuccessPlanDocument.questionnaireConfig.customTitle': eventSuccessPlanDocumentQuestionnaireConfigCustomTitle,
    'eventSuccessPlanDocument.questionnaireConfig.templateId': eventSuccessPlanDocumentQuestionnaireConfigTemplateId,
    'eventSuccessPlanDocument.structureConfig.balanceActivityAttributes': eventSuccessPlanDocumentStructureConfigBalanceActivityAttributes,
    'eventSuccessPlanDocument.structureConfig.clusterActivityAttributes': eventSuccessPlanDocumentStructureConfigClusterActivityAttributes,
    'eventSuccessPlanDocument.structureConfig.maxPairMeetings': eventSuccessPlanDocumentStructureConfigMaxPairMeetings,
    'eventSuccessPlanDocument.structureConfig.revealCountdownSeconds': eventSuccessPlanDocumentStructureConfigRevealCountdownSeconds,
    'eventSuccessPlanDocument.structureConfig.rotationIntervalMinutes': eventSuccessPlanDocumentStructureConfigRotationIntervalMinutes,
    'eventSuccessPlanDocument.structureConfig.rotationRepeatStrategy': eventSuccessPlanDocumentStructureConfigRotationRepeatStrategy,
    'eventSuccessPlanDocument.structureConfig.unitCount': eventSuccessPlanDocumentStructureConfigUnitCount,
    'eventSuccessPlanDocument.structureConfig.unitKind': eventSuccessPlanDocumentStructureConfigUnitKind,
    'eventSuccessPlanDocument.structureConfig.unitSize': eventSuccessPlanDocumentStructureConfigUnitSize,
    'eventSuccessPlanDocument.targetAttendeeCount': eventSuccessPlanDocumentTargetAttendeeCount,
    'eventSuccessSpatialActionCallablePayload.scope': eventSuccessSpatialActionCallablePayloadScope,
    'eventSuccessWingmanRequestDocument.note': eventSuccessWingmanRequestDocumentNote,
    'exploreSearchCallablePayload.query': exploreSearchCallablePayloadQuery,
    'grantEventStaffCallablePayload.phoneNumber': grantEventStaffCallablePayloadPhoneNumber,
    'grantProgramStaffCallablePayload.phoneNumber': grantProgramStaffCallablePayloadPhoneNumber,
    'hostAnalyticsQueryCallablePayload.rangePreset': hostAnalyticsQueryCallablePayloadRangePreset,
    'hostProfileDocument.bio': hostProfileDocumentBio,
    'hostProfileDocument.displayName': hostProfileDocumentDisplayName,
    'hostProfileDocument.roleTitle': hostProfileDocumentRoleTitle,
    'importEventAttendeesCallablePayload.rows.items.displayName': importEventAttendeesCallablePayloadRowsItemsDisplayName,
    'importEventAttendeesCallablePayload.rows.items.email': importEventAttendeesCallablePayloadRowsItemsEmail,
    'importEventAttendeesCallablePayload.rows.items.phone': importEventAttendeesCallablePayloadRowsItemsPhone,
    'inviteProgramStaffCallablePayload.displayName': inviteProgramStaffCallablePayloadDisplayName,
    'listOrganizerContactsCallablePayload.query': listOrganizerContactsCallablePayloadQuery,
    'listOrganizerFormResponsesCallablePayload.answerFilters': listOrganizerFormResponsesCallablePayloadAnswerFilters,
    'listOrganizerFormResponsesCallablePayload.answerFilters.items.values': listOrganizerFormResponsesCallablePayloadAnswerFiltersItemsValues,
    'listOrganizerFormResponsesCallablePayload.query': listOrganizerFormResponsesCallablePayloadQuery,
    'listOrganizerFormsCallablePayload.query': listOrganizerFormsCallablePayloadQuery,
    'listOrganizerLumaEventsCallablePayload.apiKey': listOrganizerLumaEventsCallablePayloadApiKey,
    'listPrivateEventSetupsCallablePayload.scope': listPrivateEventSetupsCallablePayloadScope,
    'manageEventMembershipRulesCallablePayload.earlyAccessHours': manageEventMembershipRulesCallablePayloadEarlyAccessHours,
    'manageEventMembershipRulesCallablePayload.memberPriceOverrides.items.percentOff': manageEventMembershipRulesCallablePayloadMemberPriceOverridesItemsPercentOff,
    'manageEventMembershipRulesCallablePayload.membersOnly': manageEventMembershipRulesCallablePayloadMembersOnly,
    'manageHostMembershipCheckoutCallablePayload.interval': manageHostMembershipCheckoutCallablePayloadInterval,
    'manageHostMembershipPlansCallablePayload.plan.benefits.items.percentOff': manageHostMembershipPlansCallablePayloadPlanBenefitsItemsPercentOff,
    'manageHostMembershipPlansCallablePayload.plan.benefits.items.type': manageHostMembershipPlansCallablePayloadPlanBenefitsItemsType,
    'manageHostMembershipPlansCallablePayload.plan.description': manageHostMembershipPlansCallablePayloadPlanDescription,
    'manageHostMembershipPlansCallablePayload.plan.limits.maxUpcomingMemberPricedBookings': manageHostMembershipPlansCallablePayloadPlanLimitsMaxUpcomingMemberPricedBookings,
    'manageHostMembershipPlansCallablePayload.plan.memberCap': manageHostMembershipPlansCallablePayloadPlanMemberCap,
    'manageHostMembershipPlansCallablePayload.plan.name': manageHostMembershipPlansCallablePayloadPlanName,
    'manageHostMembershipPlansCallablePayload.plan.perks.items': manageHostMembershipPlansCallablePayloadPlanPerksItems,
    'manageHostMembershipPlansCallablePayload.plan.prices.annual.amountPaise': manageHostMembershipPlansCallablePayloadPlanPricesAnnualAmountPaise,
    'manageHostMembershipPlansCallablePayload.plan.prices.monthly.amountPaise': manageHostMembershipPlansCallablePayloadPlanPricesMonthlyAmountPaise,
    'manageHostMembershipPlansCallablePayload.plan.trialDays': manageHostMembershipPlansCallablePayloadPlanTrialDays,
    'mobileFormState.authOtpCode': mobileFormStateAuthOtpCode,
    'mobileFormState.chatsInboxSearchQuery': mobileFormStateChatsInboxSearchQuery,
    'mobileFormState.eventCohortCapsEnabled': mobileFormStateEventCohortCapsEnabled,
    'mobileFormState.eventDurationMinutes': mobileFormStateEventDurationMinutes,
    'mobileFormState.eventDynamicPricingEnabled': mobileFormStateEventDynamicPricingEnabled,
    'mobileFormState.eventSuccessLiveCardIncluded': mobileFormStateEventSuccessLiveCardIncluded,
    'mobileFormState.eventSuccessModuleSelected': mobileFormStateEventSuccessModuleSelected,
    'mobileFormState.eventSuccessQuestionnaireMode': mobileFormStateEventSuccessQuestionnaireMode,
    'mobileFormState.exploreActivityTag': mobileFormStateExploreActivityTag,
    'mobileFormState.exploreArea': mobileFormStateExploreArea,
    'mobileFormState.exploreDistanceFilter': mobileFormStateExploreDistanceFilter,
    'mobileFormState.exploreHighRatedOnly': mobileFormStateExploreHighRatedOnly,
    'mobileFormState.exploreJoinedOnly': mobileFormStateExploreJoinedOnly,
    'mobileFormState.hostBroadcastTemplate': mobileFormStateHostBroadcastTemplate,
    'mobileFormState.hostInboxAudienceSegment': mobileFormStateHostInboxAudienceSegment,
    'mobileFormState.hostRosterFilter': mobileFormStateHostRosterFilter,
    'mobileFormState.hostRosterSearchQuery': mobileFormStateHostRosterSearchQuery,
    'mobileFormState.onboardingDateOfBirthText': mobileFormStateOnboardingDateOfBirthText,
    'mobileFormState.suvbotTesterPhoneNumber': mobileFormStateSuvbotTesterPhoneNumber,
    'mutateOrganizerContactCallablePayload.displayNameOverride': mutateOrganizerContactCallablePayloadDisplayNameOverride,
    'mutateOrganizerContactCallablePayload.email': mutateOrganizerContactCallablePayloadEmail,
    'mutateOrganizerContactCallablePayload.manualTags.items': mutateOrganizerContactCallablePayloadManualTagsItems,
    'mutateOrganizerContactCallablePayload.phoneE164': mutateOrganizerContactCallablePayloadPhoneE164,
    'mutateOrganizerContactCallablePayload.whatsappAdminSuppressed': mutateOrganizerContactCallablePayloadWhatsappAdminSuppressed,
    'mutateOrganizerContactNoteCallablePayload.body': mutateOrganizerContactNoteCallablePayloadBody,
    'onboardingDraftDocument.firstName': onboardingDraftDocumentFirstName,
    'onboardingDraftDocument.gender': onboardingDraftDocumentGender,
    'onboardingDraftDocument.interestedInGenders': onboardingDraftDocumentInterestedInGenders,
    'onboardingDraftDocument.lastName': onboardingDraftDocumentLastName,
    'onboardingDraftDocument.phoneNumber': onboardingDraftDocumentPhoneNumber,
    'organizerFormDraftDocument.definition.appearance.preset': organizerFormDraftDocumentDefinitionAppearancePreset,
    'organizerFormDraftDocument.definition.completion.actionKind': organizerFormDraftDocumentDefinitionCompletionActionKind,
    'organizerFormDraftDocument.definition.identityPolicy': organizerFormDraftDocumentDefinitionIdentityPolicy,
    'organizerFormDraftDocument.definition.logicRules.items.action': organizerFormDraftDocumentDefinitionLogicRulesItemsAction,
    'organizerFormDraftDocument.definition.logicRules.items.conditions.items.expectedValues.items': organizerFormDraftDocumentDefinitionLogicRulesItemsConditionsItemsExpectedValuesItems,
    'organizerFormDraftDocument.definition.logicRules.items.conditions.items.operator': organizerFormDraftDocumentDefinitionLogicRulesItemsConditionsItemsOperator,
    'organizerFormDraftDocument.definition.logicRules.items.conditions.items.questionId': organizerFormDraftDocumentDefinitionLogicRulesItemsConditionsItemsQuestionId,
    'organizerFormDraftDocument.definition.logicRules.items.targetQuestionId': organizerFormDraftDocumentDefinitionLogicRulesItemsTargetQuestionId,
    'organizerFormDraftDocument.definition.logicRules.items.targetSectionId': organizerFormDraftDocumentDefinitionLogicRulesItemsTargetSectionId,
    'organizerFormDraftDocument.definition.messagingConsent.catchMarketingWhatsapp': organizerFormDraftDocumentDefinitionMessagingConsentCatchMarketingWhatsapp,
    'organizerFormDraftDocument.definition.messagingConsent.catchWhatsapp': organizerFormDraftDocumentDefinitionMessagingConsentCatchWhatsapp,
    'organizerFormDraftDocument.definition.messagingConsent.organizerMarketingWhatsapp': organizerFormDraftDocumentDefinitionMessagingConsentOrganizerMarketingWhatsapp,
    'organizerFormDraftDocument.definition.messagingConsent.organizerOperationsWhatsapp': organizerFormDraftDocumentDefinitionMessagingConsentOrganizerOperationsWhatsapp,
    'organizerFormDraftDocument.definition.messagingConsent.organizerWhatsapp': organizerFormDraftDocumentDefinitionMessagingConsentOrganizerWhatsapp,
    'organizerFormDraftDocument.definition.payment.connectionId': organizerFormDraftDocumentDefinitionPaymentConnectionId,
    'organizerFormDraftDocument.definition.payment.description': organizerFormDraftDocumentDefinitionPaymentDescription,
    'organizerFormDraftDocument.definition.payment.refundPolicy': organizerFormDraftDocumentDefinitionPaymentRefundPolicy,
    'organizerFormDraftDocument.definition.purpose': organizerFormDraftDocumentDefinitionPurpose,
    'organizerFormDraftDocument.definition.sections.items.questions.items.answerDestination': organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsAnswerDestination,
    'organizerFormDraftDocument.definition.sections.items.questions.items.hostPresentation': organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsHostPresentation,
    'organizerFormDraftDocument.definition.sections.items.questions.items.kind': organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsKind,
    'organizerFormDraftDocument.definition.sections.items.questions.items.prefillPolicy': organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsPrefillPolicy,
    'organizerFormDraftDocument.definition.sections.items.questions.items.privacyClass': organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsPrivacyClass,
    'organizerFormDraftDocument.definition.sections.items.questions.items.validation.patternPreset': organizerFormDraftDocumentDefinitionSectionsItemsQuestionsItemsValidationPatternPreset,
    'organizerFormVersionDocument.definition.sections.items.questions.items.options': organizerFormVersionDocumentDefinitionSectionsItemsQuestionsItemsOptions,
    'overrideEventSuccessGroupsCallablePayload.rounds.items.groups.items.label': overrideEventSuccessGroupsCallablePayloadRoundsItemsGroupsItemsLabel,
    'overrideEventSuccessGroupsCallablePayload.rounds.items.groups.items.participantUids.items': overrideEventSuccessGroupsCallablePayloadRoundsItemsGroupsItemsParticipantUidsItems,
    'overrideEventSuccessRotationsCallablePayload.rounds.items.pairings.items.uidA': overrideEventSuccessRotationsCallablePayloadRoundsItemsPairingsItemsUidA,
    'overrideEventSuccessRotationsCallablePayload.rounds.items.pairings.items.uidB': overrideEventSuccessRotationsCallablePayloadRoundsItemsPairingsItemsUidB,
    'photoPromptAnswer.promptId': photoPromptAnswerPromptId,
    'placesAutocompleteCallablePayload.input': placesAutocompleteCallablePayloadInput,
    'profilePromptAnswer.answer': profilePromptAnswerAnswer,
    'profilePromptAnswer.promptId': profilePromptAnswerPromptId,
    'programAccessCallableResponse.actorRole': programAccessCallableResponseActorRole,
    'programAccessCallableResponse.duties.items.duty': programAccessCallableResponseDutiesItemsDuty,
    'programAccessCallableResponse.kind': programAccessCallableResponseKind,
    'programAccessCallableResponse.status': programAccessCallableResponseStatus,
    'programAccessCallableResponse.vehicleClasses.items.capabilities.items': programAccessCallableResponseVehicleClassesItemsCapabilitiesItems,
    'programArrivalsRosterCallableResponse.rows.items.curbSource': programArrivalsRosterCallableResponseRowsItemsCurbSource,
    'programArrivalsRosterCallableResponse.rows.items.flightStatus': programArrivalsRosterCallableResponseRowsItemsFlightStatus,
    'programArrivalsRosterCallableResponse.rows.items.readiness': programArrivalsRosterCallableResponseRowsItemsReadiness,
    'programArrivalsRosterCallableResponse.rows.items.unavailableReason': programArrivalsRosterCallableResponseRowsItemsUnavailableReason,
    'programHotelInboundCallableResponse.expectedLegs.items.readiness': programHotelInboundCallableResponseExpectedLegsItemsReadiness,
    'programHotelInboundCallableResponse.trips.items.manifestSource': programHotelInboundCallableResponseTripsItemsManifestSource,
    'programLodgingConfigDocument.demand.items.beds': programLodgingConfigDocumentDemandItemsBeds,
    'programLodgingConfigDocument.demand.items.guestId': programLodgingConfigDocumentDemandItemsGuestId,
    'programLodgingConfigDocument.demand.items.requiredFeatures.items': programLodgingConfigDocumentDemandItemsRequiredFeaturesItems,
    'programLodgingConfigDocument.groupParents.items.id': programLodgingConfigDocumentGroupParentsItemsId,
    'programLodgingConfigDocument.groupParents.items.parentIds': programLodgingConfigDocumentGroupParentsItemsParentIds,
    'programLodgingConfigDocument.inventory.items.availability.items.arrival': programLodgingConfigDocumentInventoryItemsAvailabilityItemsArrival,
    'programLodgingConfigDocument.inventory.items.availability.items.departure': programLodgingConfigDocumentInventoryItemsAvailabilityItemsDeparture,
    'programLodgingConfigDocument.inventory.items.contractId': programLodgingConfigDocumentInventoryItemsContractId,
    'programLodgingConfigDocument.inventory.items.id': programLodgingConfigDocumentInventoryItemsId,
    'programLodgingConfigDocument.labels.items.roomLabel': programLodgingConfigDocumentLabelsItemsRoomLabel,
    'programLodgingConfigDocument.parties.items.confirmed': programLodgingConfigDocumentPartiesItemsConfirmed,
    'programLodgingConfigDocument.parties.items.guestIds': programLodgingConfigDocumentPartiesItemsGuestIds,
    'programLodgingConfigDocument.parties.items.id': programLodgingConfigDocumentPartiesItemsId,
    'programLodgingConfigDocument.parties.items.pin.hotelId': programLodgingConfigDocumentPartiesItemsPinHotelId,
    'programLodgingConfigDocument.parties.items.pin.inventoryId': programLodgingConfigDocumentPartiesItemsPinInventoryId,
    'programLodgingConfigDocument.parties.items.pin.zoneId': programLodgingConfigDocumentPartiesItemsPinZoneId,
    'programLodgingConfigDocument.parties.items.priority': programLodgingConfigDocumentPartiesItemsPriority,
    'programLodgingConfigDocument.parties.items.requiredRoomType': programLodgingConfigDocumentPartiesItemsRequiredRoomType,
    'programLodgingConfigDocument.rooms.items.beds': programLodgingConfigDocumentRoomsItemsBeds,
    'programLodgingConfigDocument.rooms.items.building': programLodgingConfigDocumentRoomsItemsBuilding,
    'programLodgingConfigDocument.rooms.items.floor': programLodgingConfigDocumentRoomsItemsFloor,
    'programLodgingConfigDocument.rooms.items.maxOccupants': programLodgingConfigDocumentRoomsItemsMaxOccupants,
    'programLodgingConfigDocument.rooms.items.resourceIds': programLodgingConfigDocumentRoomsItemsResourceIds,
    'programLodgingConfigDocument.rooms.items.roomType': programLodgingConfigDocumentRoomsItemsRoomType,
    'programLodgingConfigDocument.rooms.items.verifiedFeatures.items': programLodgingConfigDocumentRoomsItemsVerifiedFeaturesItems,
    'programLodgingConfigDocument.rooms.items.wing': programLodgingConfigDocumentRoomsItemsWing,
    'programLodgingConfigDocument.rooms.items.zoneId': programLodgingConfigDocumentRoomsItemsZoneId,
    'programStaffListCallableResponse.members.items.status': programStaffListCallableResponseMembersItemsStatus,
    'programTransportPlanCallableResponse.groups.items.readiness': programTransportPlanCallableResponseGroupsItemsReadiness,
    'programTransportPlanCallableResponse.unassigned.items.reason': programTransportPlanCallableResponseUnassignedItemsReason,
    'programTripListCallableResponse.trips.items.manifestSource': programTripListCallableResponseTripsItemsManifestSource,
    'programTripListCallableResponse.trips.items.status': programTripListCallableResponseTripsItemsStatus,
    'reassignEventAssistanceCheckpointReporterCallablePayload.command.payload.responsibleOperatorId': reassignEventAssistanceCheckpointReporterCallablePayloadCommandPayloadResponsibleOperatorId,
    'recordEventAssistanceCheckpointCallablePayload.command.payload.correctionReason': recordEventAssistanceCheckpointCallablePayloadCommandPayloadCorrectionReason,
    'recordEventSuccessUnitOutcomesCallablePayload.entries.items.rank': recordEventSuccessUnitOutcomesCallablePayloadEntriesItemsRank,
    'recordEventSuccessUnitOutcomesCallablePayload.entries.items.score': recordEventSuccessUnitOutcomesCallablePayloadEntriesItemsScore,
    'recordOrganizerContactOutreachCallablePayload.note': recordOrganizerContactOutreachCallablePayloadNote,
    'recordProgramDoorJournalCallablePayload.operations.items.partySize': recordProgramDoorJournalCallablePayloadOperationsItemsPartySize,
    'recordProgramFunctionRsvpCallablePayload.rsvpStatus': recordProgramFunctionRsvpCallablePayloadRsvpStatus,
    'resolveEventAssistanceCaseCallablePayload.command.payload.owner': resolveEventAssistanceCaseCallablePayloadCommandPayloadOwner,
    'reviewOrganizerApplicationCallablePayload.reviewNote': reviewOrganizerApplicationCallablePayloadReviewNote,
    'sendEventBroadcastCallablePayload.audience': sendEventBroadcastCallablePayloadAudience,
    'sendEventBroadcastCallablePayload.body': sendEventBroadcastCallablePayloadBody,
    'sendEventChatMessageCallablePayload.text': sendEventChatMessageCallablePayloadText,
    'sendOrganizerWhatsappReplyCallablePayload.body': sendOrganizerWhatsappReplyCallablePayloadBody,
    'sendOrganizerWhatsappTestCallablePayload.toE164': sendOrganizerWhatsappTestCallablePayloadToE164,
    'setCrossPathsEventConsentCallablePayload.enabled': setCrossPathsEventConsentCallablePayloadEnabled,
    'setEventAssistanceCheckpointCloseoutCallablePayload.command.payload.reason': setEventAssistanceCheckpointCloseoutCallablePayloadCommandPayloadReason,
    'setEventAssistanceRuntimeConfigCallablePayload.command.configuration.options.deliveryPolicy.maxAttempts': setEventAssistanceRuntimeConfigCallablePayloadCommandConfigurationOptionsDeliveryPolicyMaxAttempts,
    'setEventAssistanceRuntimeConfigCallablePayload.command.configuration.options.deliveryPolicy.maxAttemptsPerRoute': setEventAssistanceRuntimeConfigCallablePayloadCommandConfigurationOptionsDeliveryPolicyMaxAttemptsPerRoute,
    'setEventAssistanceRuntimeConfigCallablePayload.command.configuration.options.deliveryPolicy.minimumRetrySeconds': setEventAssistanceRuntimeConfigCallablePayloadCommandConfigurationOptionsDeliveryPolicyMinimumRetrySeconds,
    'setEventSuccessAccountabilityResolutionCallablePayload.resolution': setEventSuccessAccountabilityResolutionCallablePayloadResolution,
    'setOrganizerTrackingSettingsCallablePayload.enabled': setOrganizerTrackingSettingsCallablePayloadEnabled,
    'setOrganizerTrackingSettingsCallablePayload.googleMeasurementId': setOrganizerTrackingSettingsCallablePayloadGoogleMeasurementId,
    'setOrganizerTrackingSettingsCallablePayload.metaPixelId': setOrganizerTrackingSettingsCallablePayloadMetaPixelId,
    'setReviewResponseCallablePayload.message': setReviewResponseCallablePayloadMessage,
    'transferEventAssistanceGroupCallablePayload.command.payload.decision.expiresAtMillis': transferEventAssistanceGroupCallablePayloadCommandPayloadDecisionExpiresAtMillis,
    'transferEventAssistanceGroupCallablePayload.command.payload.decision.groupId': transferEventAssistanceGroupCallablePayloadCommandPayloadDecisionGroupId,
    'transferEventAssistanceGroupCallablePayload.command.payload.decision.receivingOperatorId': transferEventAssistanceGroupCallablePayloadCommandPayloadDecisionReceivingOperatorId,
    'transferEventAssistanceGroupCallablePayload.command.payload.decision.to': transferEventAssistanceGroupCallablePayloadCommandPayloadDecisionTo,
    'updateEventCallablePayload.fields.capacityLimit': updateEventCallablePayloadFieldsCapacityLimit,
    'updateEventCallablePayload.fields.constraints.maxAge': updateEventCallablePayloadFieldsConstraintsMaxAge,
    'updateEventCallablePayload.fields.constraints.maxMen': updateEventCallablePayloadFieldsConstraintsMaxMen,
    'updateEventCallablePayload.fields.constraints.maxWomen': updateEventCallablePayloadFieldsConstraintsMaxWomen,
    'updateEventCallablePayload.fields.constraints.minAge': updateEventCallablePayloadFieldsConstraintsMinAge,
    'updateEventCallablePayload.fields.description': updateEventCallablePayloadFieldsDescription,
    'updateEventCallablePayload.fields.distanceKm': updateEventCallablePayloadFieldsDistanceKm,
    'updateEventCallablePayload.fields.eventPolicy.admission.format': updateEventCallablePayloadFieldsEventPolicyAdmissionFormat,
    'updateEventCallablePayload.fields.eventPolicy.cancellation.policyId': updateEventCallablePayloadFieldsEventPolicyCancellationPolicyId,
    'updateEventCallablePayload.fields.eventPolicy.pricing.demandPricingRules.items.maxAdjustmentInPaise': updateEventCallablePayloadFieldsEventPolicyPricingDemandPricingRulesItemsMaxAdjustmentInPaise,
    'updateEventCallablePayload.fields.eventPolicy.pricing.demandPricingRules.items.stepAdjustmentInPaise': updateEventCallablePayloadFieldsEventPolicyPricingDemandPricingRulesItemsStepAdjustmentInPaise,
    'updateEventCallablePayload.fields.locationDetails': updateEventCallablePayloadFieldsLocationDetails,
    'updateEventCallablePayload.fields.meetingPoint': updateEventCallablePayloadFieldsMeetingPoint,
    'updateEventCallablePayload.fields.name': updateEventCallablePayloadFieldsName,
    'updateEventCallablePayload.fields.pace': updateEventCallablePayloadFieldsPace,
    'updateEventCallablePayload.fields.priceInPaise': updateEventCallablePayloadFieldsPriceInPaise,
    'updateEventCallablePayload.fields.privateAccess.inviteCode': updateEventCallablePayloadFieldsPrivateAccessInviteCode,
    'updateEventRehearsalSetupCallablePayload.setup.attendeePrompt': updateEventRehearsalSetupCallablePayloadSetupAttendeePrompt,
    'updateEventRehearsalSetupCallablePayload.setup.durationMinutes': updateEventRehearsalSetupCallablePayloadSetupDurationMinutes,
    'updateEventRehearsalSetupCallablePayload.setup.hostGoal': updateEventRehearsalSetupCallablePayloadSetupHostGoal,
    'updateEventRehearsalSetupCallablePayload.setup.locationName': updateEventRehearsalSetupCallablePayloadSetupLocationName,
    'updateEventRehearsalSetupCallablePayload.setup.moduleIds': updateEventRehearsalSetupCallablePayloadSetupModuleIds,
    'updateEventRehearsalSetupCallablePayload.setup.title': updateEventRehearsalSetupCallablePayloadSetupTitle,
    'updateOrganizerCallablePayload.fields.area': updateOrganizerCallablePayloadFieldsArea,
    'updateOrganizerCallablePayload.fields.description': updateOrganizerCallablePayloadFieldsDescription,
    'updateOrganizerCallablePayload.fields.email': updateOrganizerCallablePayloadFieldsEmail,
    'updateOrganizerCallablePayload.fields.instagramHandle': updateOrganizerCallablePayloadFieldsInstagramHandle,
    'updateOrganizerCallablePayload.fields.location': updateOrganizerCallablePayloadFieldsLocation,
    'updateOrganizerCallablePayload.fields.name': updateOrganizerCallablePayloadFieldsName,
    'updateOrganizerCallablePayload.fields.organizerType': updateOrganizerCallablePayloadFieldsOrganizerType,
    'updateOrganizerCallablePayload.fields.phoneNumber': updateOrganizerCallablePayloadFieldsPhoneNumber,
    'updatePrivateEventDetailsCallablePayload.details.admissionTerms.cancellationPolicyId': updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsCancellationPolicyId,
    'updatePrivateEventDetailsCallablePayload.details.admissionTerms.capacityLimit': updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsCapacityLimit,
    'updatePrivateEventDetailsCallablePayload.details.admissionTerms.currency': updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsCurrency,
    'updatePrivateEventDetailsCallablePayload.details.admissionTerms.priceInPaise': updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsPriceInPaise,
    'updatePrivateEventDetailsCallablePayload.details.description': updatePrivateEventDetailsCallablePayloadDetailsDescription,
    'updatePrivateEventDetailsCallablePayload.details.distanceKm': updatePrivateEventDetailsCallablePayloadDetailsDistanceKm,
    'updatePrivateEventDetailsCallablePayload.details.durationMinutes.value': updatePrivateEventDetailsCallablePayloadDetailsDurationMinutesValue,
    'updatePrivateEventDetailsCallablePayload.details.eventFormat.value.customActivityLabel': updatePrivateEventDetailsCallablePayloadDetailsEventFormatValueCustomActivityLabel,
    'updatePrivateEventDetailsCallablePayload.details.eventPhotos': updatePrivateEventDetailsCallablePayloadDetailsEventPhotos,
    'updatePrivateEventDetailsCallablePayload.details.pace': updatePrivateEventDetailsCallablePayloadDetailsPace,
    'updatePrivateEventDetailsCallablePayload.details.venue.value.name': updatePrivateEventDetailsCallablePayloadDetailsVenueValueName,
    'updatePrivateEventDetailsCallablePayload.eventId': updatePrivateEventDetailsCallablePayloadEventId,
    'updatePrivateEventDetailsCallablePayload.expectedSetupRevision': updatePrivateEventDetailsCallablePayloadExpectedSetupRevision,
    'updatePrivateEventDetailsCallablePayload.requestId': updatePrivateEventDetailsCallablePayloadRequestId,
    'updatePrivateEventDetailsCallablePayload.reviewedDefaultsHash': updatePrivateEventDetailsCallablePayloadReviewedDefaultsHash,
    'updateUserProfilePatch.activityPreferences.running.paceMaxSecsPerKm': updateUserProfilePatchActivityPreferencesRunningPaceMaxSecsPerKm,
    'updateUserProfilePatch.activityPreferences.running.paceMinSecsPerKm': updateUserProfilePatchActivityPreferencesRunningPaceMinSecsPerKm,
    'updateUserProfilePatch.activityPreferences.running.preferredDistances': updateUserProfilePatchActivityPreferencesRunningPreferredDistances,
    'updateUserProfilePatch.activityPreferences.running.preferredRunTimes': updateUserProfilePatchActivityPreferencesRunningPreferredRunTimes,
    'updateUserProfilePatch.activityPreferences.running.runningReasons': updateUserProfilePatchActivityPreferencesRunningRunningReasons,
    'updateUserProfilePatch.children': updateUserProfilePatchChildren,
    'updateUserProfilePatch.city': updateUserProfilePatchCity,
    'updateUserProfilePatch.company': updateUserProfilePatchCompany,
    'updateUserProfilePatch.diet': updateUserProfilePatchDiet,
    'updateUserProfilePatch.displayName': updateUserProfilePatchDisplayName,
    'updateUserProfilePatch.drinking': updateUserProfilePatchDrinking,
    'updateUserProfilePatch.education': updateUserProfilePatchEducation,
    'updateUserProfilePatch.email': updateUserProfilePatchEmail,
    'updateUserProfilePatch.height': updateUserProfilePatchHeight,
    'updateUserProfilePatch.instagramHandle': updateUserProfilePatchInstagramHandle,
    'updateUserProfilePatch.interestedInGenders': updateUserProfilePatchInterestedInGenders,
    'updateUserProfilePatch.languages': updateUserProfilePatchLanguages,
    'updateUserProfilePatch.maxAgePreference': updateUserProfilePatchMaxAgePreference,
    'updateUserProfilePatch.minAgePreference': updateUserProfilePatchMinAgePreference,
    'updateUserProfilePatch.occupation': updateUserProfilePatchOccupation,
    'updateUserProfilePatch.prefsCrossPathsInvitations': updateUserProfilePatchPrefsCrossPathsInvitations,
    'updateUserProfilePatch.prefsEventReminders': updateUserProfilePatchPrefsEventReminders,
    'updateUserProfilePatch.prefsMessages': updateUserProfilePatchPrefsMessages,
    'updateUserProfilePatch.prefsNewCatches': updateUserProfilePatchPrefsNewCatches,
    'updateUserProfilePatch.prefsOrganizerUpdates': updateUserProfilePatchPrefsOrganizerUpdates,
    'updateUserProfilePatch.prefsRunStatusUpdates': updateUserProfilePatchPrefsRunStatusUpdates,
    'updateUserProfilePatch.prefsShowInCrossPaths': updateUserProfilePatchPrefsShowInCrossPaths,
    'updateUserProfilePatch.prefsShowOnMap': updateUserProfilePatchPrefsShowOnMap,
    'updateUserProfilePatch.prefsWeeklyDigest': updateUserProfilePatchPrefsWeeklyDigest,
    'updateUserProfilePatch.relationshipGoal': updateUserProfilePatchRelationshipGoal,
    'updateUserProfilePatch.religion': updateUserProfilePatchReligion,
    'updateUserProfilePatch.smoking': updateUserProfilePatchSmoking,
    'updateUserProfilePatch.workout': updateUserProfilePatchWorkout,
    'upsertEventSuccessLayoutCallablePayload.label': upsertEventSuccessLayoutCallablePayloadLabel,
    'upsertEventSuccessLayoutCallablePayload.units': upsertEventSuccessLayoutCallablePayloadUnits,
    'upsertEventSuccessLayoutCallablePayload.units.items.capacity': upsertEventSuccessLayoutCallablePayloadUnitsItemsCapacity,
    'upsertEventSuccessLayoutCallablePayload.units.items.gridX': upsertEventSuccessLayoutCallablePayloadUnitsItemsGridX,
    'upsertEventSuccessLayoutCallablePayload.units.items.shape': upsertEventSuccessLayoutCallablePayloadUnitsItemsShape,
    'upsertOrganizerCampaignCallablePayload.eventId': upsertOrganizerCampaignCallablePayloadEventId,
    'upsertOrganizerCampaignCallablePayload.inviteDestinationKind': upsertOrganizerCampaignCallablePayloadInviteDestinationKind,
    'upsertOrganizerCampaignCallablePayload.messageClass': upsertOrganizerCampaignCallablePayloadMessageClass,
    'upsertOrganizerCampaignCallablePayload.name': upsertOrganizerCampaignCallablePayloadName,
    'upsertOrganizerCampaignCallablePayload.savedAudienceId': upsertOrganizerCampaignCallablePayloadSavedAudienceId,
    'upsertOrganizerCampaignCallablePayload.templateId': upsertOrganizerCampaignCallablePayloadTemplateId,
    'upsertOrganizerMomentCallablePayload.action.connectionId': upsertOrganizerMomentCallablePayloadActionConnectionId,
    'upsertOrganizerMomentCallablePayload.action.duty': upsertOrganizerMomentCallablePayloadActionDuty,
    'upsertOrganizerMomentCallablePayload.action.kind': upsertOrganizerMomentCallablePayloadActionKind,
    'upsertOrganizerMomentCallablePayload.action.notificationType': upsertOrganizerMomentCallablePayloadActionNotificationType,
    'upsertOrganizerMomentCallablePayload.action.preferenceKey': upsertOrganizerMomentCallablePayloadActionPreferenceKey,
    'upsertOrganizerMomentCallablePayload.action.severity': upsertOrganizerMomentCallablePayloadActionSeverity,
    'upsertOrganizerMomentCallablePayload.action.templateId': upsertOrganizerMomentCallablePayloadActionTemplateId,
    'upsertOrganizerMomentCallablePayload.action.titleTemplate': upsertOrganizerMomentCallablePayloadActionTitleTemplate,
    'upsertOrganizerMomentCallablePayload.audience.duty': upsertOrganizerMomentCallablePayloadAudienceDuty,
    'upsertOrganizerMomentCallablePayload.audience.functionId': upsertOrganizerMomentCallablePayloadAudienceFunctionId,
    'upsertOrganizerMomentCallablePayload.audience.householdDedupe': upsertOrganizerMomentCallablePayloadAudienceHouseholdDedupe,
    'upsertOrganizerMomentCallablePayload.audience.kind': upsertOrganizerMomentCallablePayloadAudienceKind,
    'upsertOrganizerMomentCallablePayload.audience.rsvp.items': upsertOrganizerMomentCallablePayloadAudienceRsvpItems,
    'upsertOrganizerMomentCallablePayload.audience.rsvpPendingOnly': upsertOrganizerMomentCallablePayloadAudienceRsvpPendingOnly,
    'upsertOrganizerMomentCallablePayload.audience.travelTimeLead': upsertOrganizerMomentCallablePayloadAudienceTravelTimeLead,
    'upsertOrganizerMomentCallablePayload.initiation.anchorId': upsertOrganizerMomentCallablePayloadInitiationAnchorId,
    'upsertOrganizerMomentCallablePayload.initiation.anchorKind': upsertOrganizerMomentCallablePayloadInitiationAnchorKind,
    'upsertOrganizerMomentCallablePayload.initiation.functionId': upsertOrganizerMomentCallablePayloadInitiationFunctionId,
    'upsertOrganizerMomentCallablePayload.initiation.kind': upsertOrganizerMomentCallablePayloadInitiationKind,
    'upsertOrganizerMomentCallablePayload.initiation.offsetMinutes': upsertOrganizerMomentCallablePayloadInitiationOffsetMinutes,
    'upsertOrganizerMomentCallablePayload.initiation.triggerKind': upsertOrganizerMomentCallablePayloadInitiationTriggerKind,
    'upsertOrganizerMomentCallablePayload.name': upsertOrganizerMomentCallablePayloadName,
    'upsertOrganizerMomentCallablePayload.sense': upsertOrganizerMomentCallablePayloadSense,
    'upsertOrganizerSavedAudienceCallablePayload.definition.join': upsertOrganizerSavedAudienceCallablePayloadDefinitionJoin,
    'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.currency': upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsCurrency,
    'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.days': upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsDays,
    'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.eventCount': upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsEventCount,
    'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.eventId': upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsEventId,
    'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.formId': upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsFormId,
    'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.kind': upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsKind,
    'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.manualTagId': upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsManualTagId,
    'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.operator': upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsOperator,
    'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.questionId': upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsQuestionId,
    'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.reviewStatus': upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsReviewStatus,
    'upsertOrganizerSavedAudienceCallablePayload.definition.predicates.items.segmentId': upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsSegmentId,
    'upsertOrganizerSavedAudienceCallablePayload.name': upsertOrganizerSavedAudienceCallablePayloadName,
    'upsertProgramFunctionCallablePayload.name': upsertProgramFunctionCallablePayloadName,
    'upsertProgramFunctionCallablePayload.status': upsertProgramFunctionCallablePayloadStatus,
    'upsertProgramFunctionCallablePayload.venueName': upsertProgramFunctionCallablePayloadVenueName,
    'upsertProgramFunctionCallablePayload.venueNotes': upsertProgramFunctionCallablePayloadVenueNotes,
    'upsertProgramGuestCallablePayload.displayName': upsertProgramGuestCallablePayloadDisplayName,
    'upsertProgramGuestCallablePayload.email': upsertProgramGuestCallablePayloadEmail,
    'upsertProgramGuestCallablePayload.groupIds': upsertProgramGuestCallablePayloadGroupIds,
    'upsertProgramGuestCallablePayload.guestId': upsertProgramGuestCallablePayloadGuestId,
    'upsertProgramGuestCallablePayload.phoneE164': upsertProgramGuestCallablePayloadPhoneE164,
    'upsertProgramGuestGroupCallablePayload.dimension': upsertProgramGuestGroupCallablePayloadDimension,
    'upsertProgramGuestGroupCallablePayload.hotelId': upsertProgramGuestGroupCallablePayloadHotelId,
    'upsertProgramGuestGroupCallablePayload.label': upsertProgramGuestGroupCallablePayloadLabel,
    'upsertProgramHotelCallablePayload.active': upsertProgramHotelCallablePayloadActive,
    'upsertProgramHotelCallablePayload.address': upsertProgramHotelCallablePayloadAddress,
    'upsertProgramHotelCallablePayload.name': upsertProgramHotelCallablePayloadName,
    'upsertProgramHotelCallablePayload.notes': upsertProgramHotelCallablePayloadNotes,
    'upsertProgramHotelCallablePayload.receptionContact': upsertProgramHotelCallablePayloadReceptionContact,
    'upsertProgramPickupPointCallablePayload.active': upsertProgramPickupPointCallablePayloadActive,
    'upsertProgramPickupPointCallablePayload.iataCode': upsertProgramPickupPointCallablePayloadIataCode,
    'upsertProgramPickupPointCallablePayload.instructions': upsertProgramPickupPointCallablePayloadInstructions,
    'upsertProgramPickupPointCallablePayload.kind': upsertProgramPickupPointCallablePayloadKind,
    'upsertProgramPickupPointCallablePayload.label': upsertProgramPickupPointCallablePayloadLabel,
    'upsertProgramPickupPointCallablePayload.meetingZone': upsertProgramPickupPointCallablePayloadMeetingZone,
    'upsertProgramPickupPointCallablePayload.terminal': upsertProgramPickupPointCallablePayloadTerminal,
    'upsertProgramStayCallablePayload.roomLabel': upsertProgramStayCallablePayloadRoomLabel,
    'userAnalyticsQueryCallablePayload.rangePreset': userAnalyticsQueryCallablePayloadRangePreset,
  };
}
