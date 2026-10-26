import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/format_utils.dart';
import 'package:catch_dating_app/core/labelled.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/image_uploads/domain/photo_upload_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/user_profile/domain/profile_photo.dart';
import 'package:catch_dating_app/user_profile/domain/profile_photo_policy.dart';
import 'package:catch_dating_app/user_profile/domain/profile_prompts.dart';
import 'package:catch_dating_app/user_profile/domain/profile_validation.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_inline_edit_patch_factory.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_inline_height_editor.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart'
    show AutofillHints, IconData, TextCapitalization, TextInputType, ValueKey;
import 'package:flutter/services.dart' show FilteringTextInputFormatter;

class SelfProfileEditTabState {
  const SelfProfileEditTabState({
    required this.user,
    required this.photoGrid,
    required this.completedPromptCount,
    required this.promptSlots,
    required this.basicRows,
    required this.aboutRows,
    required this.runningRows,
    required this.lifestyleRows,
  });

  factory SelfProfileEditTabState.fromProfile({
    required AppLocalizations l10n,
    required UserProfile user,
    required DateTime today,
    required PhotoUploadState uploadState,
  }) {
    final promptAnswers = normalizeProfilePromptAnswers(user.profilePrompts);
    const patchFactory = SelfProfileInlineEditPatchFactory();
    return SelfProfileEditTabState(
      user: user,
      photoGrid: SelfProfilePhotoGridState.fromProfile(
        user: user,
        uploadState: uploadState,
      ),
      completedPromptCount: promptAnswers
          .where((prompt) => prompt.answer.trim().isNotEmpty)
          .length,
      promptSlots: List<SelfProfilePromptSlotState>.generate(
        maxProfilePromptAnswers,
        (index) {
          final answer = index < promptAnswers.length
              ? promptAnswers[index]
              : null;
          final usedPromptIds = {
            for (final prompt in promptAnswers)
              if (prompt.promptId != answer?.promptId) prompt.promptId,
          };
          final definition = _profilePromptDefinitionForSlot(
            index: index,
            answer: answer,
            usedPromptIds: usedPromptIds,
          );
          final currentPromptId = answer?.promptId ?? definition.id;
          return SelfProfilePromptSlotState(
            index: index,
            definition: definition,
            answer: answer,
            usedPromptIds: usedPromptIds,
            fieldName: 'profilePrompt-$index',
            availablePromptIds: _availableProfilePromptIds(
              usedPromptIds: usedPromptIds,
              currentPromptId: currentPromptId,
            ),
          );
        },
        growable: false,
      ),
      basicRows: _basicRows(
        l10n: l10n,
        user: user,
        today: today,
        patchFactory: patchFactory,
      ),
      aboutRows: _aboutRows(l10n: l10n, user: user, patchFactory: patchFactory),
      runningRows: _runningRows(
        l10n: l10n,
        user: user,
        patchFactory: patchFactory,
      ),
      lifestyleRows: _lifestyleRows(
        l10n: l10n,
        user: user,
        patchFactory: patchFactory,
      ),
    );
  }

  final UserProfile user;
  final SelfProfilePhotoGridState photoGrid;
  final int completedPromptCount;
  final List<SelfProfilePromptSlotState> promptSlots;
  final List<CatchFormRowDescriptor<UpdateUserProfilePatch>> basicRows;
  final List<CatchFormRowDescriptor<UpdateUserProfilePatch>> aboutRows;
  final List<SelfProfileFieldRowDescriptor> runningRows;
  final List<SelfProfileFieldRowDescriptor> lifestyleRows;

  List<CatchFormRowDescriptor<UpdateUserProfilePatch>> get aboutSectionRows => [
    ...basicRows,
    ...aboutRows,
  ];
}

typedef SelfProfileSingleChoiceFieldRowMapper<R> =
    R Function<T extends Labelled>(
      SelfProfileSingleChoiceFieldRowDescriptor<T> descriptor,
    );

typedef SelfProfileMultiChoiceFieldRowMapper<R> =
    R Function<T extends Labelled>(
      SelfProfileMultiChoiceFieldRowDescriptor<T> descriptor,
    );

sealed class SelfProfileFieldRowDescriptor {
  const SelfProfileFieldRowDescriptor({
    required this.id,
    required this.icon,
    required this.label,
    required this.contract,
  });

  final String id;
  final IconData icon;
  final String label;
  final CatchContractFieldConstraints contract;

  R map<R>({
    required SelfProfileSingleChoiceFieldRowMapper<R> singleChoice,
    required SelfProfileMultiChoiceFieldRowMapper<R> multiChoice,
    required R Function(SelfProfileRangeFieldRowDescriptor descriptor) range,
  });
}

class SelfProfileSingleChoiceFieldRowDescriptor<T extends Labelled>
    extends SelfProfileFieldRowDescriptor {
  const SelfProfileSingleChoiceFieldRowDescriptor({
    required super.id,
    required super.icon,
    required super.label,
    required this.values,
    required this.value,
    required this.fieldName,
    required this.contractValue,
    required this.patchForValue,
    required super.contract,
    this.emptyValueText,
    this.allowEmptySelection = true,
    this.showOptionalLabel = false,
  });

  final List<T> values;
  final T? value;
  final String fieldName;
  final String Function(T value) contractValue;
  final UpdateUserProfilePatch Function(T? value) patchForValue;
  final String? emptyValueText;
  final bool allowEmptySelection;
  final bool showOptionalLabel;

  @override
  R map<R>({
    required SelfProfileSingleChoiceFieldRowMapper<R> singleChoice,
    required SelfProfileMultiChoiceFieldRowMapper<R> multiChoice,
    required R Function(SelfProfileRangeFieldRowDescriptor descriptor) range,
  }) {
    return singleChoice<T>(this);
  }
}

class SelfProfileMultiChoiceFieldRowDescriptor<T extends Labelled>
    extends SelfProfileFieldRowDescriptor {
  const SelfProfileMultiChoiceFieldRowDescriptor({
    required super.id,
    required super.icon,
    required super.label,
    required this.values,
    required this.selected,
    required this.fieldName,
    required this.contractValue,
    required this.patchForValues,
    required super.contract,
    this.emptyValueText,
    this.patchForLatestProfile,
    this.isAddAffordanceWhenEmpty = true,
    this.allowEmptySelection = true,
    this.showOptionalLabel = false,
  });

  final List<T> values;
  final List<T> selected;
  final String fieldName;
  final String Function(T value) contractValue;
  final String? emptyValueText;
  final UpdateUserProfilePatch Function(List<T> values) patchForValues;
  final UpdateUserProfilePatch Function(UserProfile user, List<T> values)?
  patchForLatestProfile;
  final bool isAddAffordanceWhenEmpty;
  final bool allowEmptySelection;
  final bool showOptionalLabel;

  @override
  R map<R>({
    required SelfProfileSingleChoiceFieldRowMapper<R> singleChoice,
    required SelfProfileMultiChoiceFieldRowMapper<R> multiChoice,
    required R Function(SelfProfileRangeFieldRowDescriptor descriptor) range,
  }) {
    return multiChoice<T>(this);
  }
}

class SelfProfileRangeFieldRowDescriptor extends SelfProfileFieldRowDescriptor {
  const SelfProfileRangeFieldRowDescriptor({
    required super.id,
    required super.icon,
    required super.label,
    required this.value,
    required this.currentMin,
    required this.currentMax,
    required this.sliderMin,
    required this.sliderMax,
    required this.divisions,
    required this.labelText,
    required this.patchForRange,
    required super.contract,
    required this.maximumContract,
    this.patchForLatestProfile,
    this.saveEndValue,
    this.savedCurrentMax,
  });

  final String value;
  final int currentMin;
  final int currentMax;
  final double sliderMin;
  final double sliderMax;
  final int divisions;
  final String Function(double) labelText;
  final int Function(int)? saveEndValue;
  final int? savedCurrentMax;
  final UpdateUserProfilePatch Function(int min, int max) patchForRange;
  final CatchContractFieldConstraints maximumContract;
  final UpdateUserProfilePatch Function(UserProfile user, int min, int max)?
  patchForLatestProfile;

  @override
  R map<R>({
    required SelfProfileSingleChoiceFieldRowMapper<R> singleChoice,
    required SelfProfileMultiChoiceFieldRowMapper<R> multiChoice,
    required R Function(SelfProfileRangeFieldRowDescriptor descriptor) range,
  }) {
    return range(this);
  }
}

List<CatchFormRowDescriptor<UpdateUserProfilePatch>> _basicRows({
  required AppLocalizations l10n,
  required UserProfile user,
  required DateTime today,
  required SelfProfileInlineEditPatchFactory patchFactory,
}) {
  return [
    CatchFormTextRow<UpdateUserProfilePatch>(
      validationCopy: catchFormValidationCopy(l10n),
      id: 'displayName',
      icon: CatchIcons.person,
      label: l10n.userProfileSelfProfileEditTabStateLabelDisplayName,
      currentValue: user.publicDisplayName,
      currentFieldValue: user.displayName.trim().isEmpty
          ? null
          : user.displayName.trim(),
      fieldName: l10n.userProfileSelfProfileEditTabStateVisiblecopyDisplayname,
      patchForValue: patchFactory.displayName,
      contract: CatchContractConstraints.updateUserProfilePatchDisplayName,
      textCapitalization: TextCapitalization.words,
      autofillHints: const [AutofillHints.nickname],
      validator: validateRequiredDisplayName,
      toFieldValue: (value) => value.trim(),
    ),
    if (user.dateOfBirth case final birthday?)
      CatchFormReadRow<UpdateUserProfilePatch>(
        id: 'dateOfBirth',
        icon: CatchIcons.birthday,
        label: l10n.userProfileSelfProfileEditTabStateLabelDateOfBirth,
        body: l10n
            .userProfileSelfProfileEditTabStateBodyPadleftPadleft2YearAgeon(
              padLeft: birthday.day.toString().padLeft(2, '0'),
              padLeft2: birthday.month.toString().padLeft(2, '0'),
              year: birthday.year,
              ageOn: user.ageOn(today)!,
            ),
      ),
    if (user.gender case final gender?)
      CatchFormReadRow<UpdateUserProfilePatch>(
        id: 'gender',
        icon: CatchIcons.genders,
        label: l10n.userProfileSelfProfileEditTabStateLabelGender,
        body: gender.label,
      ),
    // Phone is the OTP identity credential; editing requires Auth
    // re-verification before Firestore can safely change.
    CatchFormReadRow<UpdateUserProfilePatch>(
      id: 'phoneNumber',
      icon: CatchIcons.phone,
      label: l10n.userProfileSelfProfileEditTabStateLabelPhone,
      body: user.phoneNumber,
    ),
    CatchFormTextRow<UpdateUserProfilePatch>(
      validationCopy: catchFormValidationCopy(l10n),
      id: 'email',
      icon: CatchIcons.email,
      label: l10n.userProfileSelfProfileEditTabStateLabelEmail,
      currentValue: user.email,
      fieldName: l10n.userProfileSelfProfileEditTabStateVisiblecopyEmaile69bb2,
      patchForValue: patchFactory.email,
      contract: CatchContractConstraints.updateUserProfilePatchEmail,
      keyboardType: TextInputType.emailAddress,
      textCapitalization: TextCapitalization.none,
      autofillHints: const [AutofillHints.email],
      validator: validateOptionalEmail,
    ),
    CatchFormTextRow<UpdateUserProfilePatch>(
      validationCopy: catchFormValidationCopy(l10n),
      id: 'instagramHandle',
      icon: CatchIcons.handle,
      label: l10n.userProfileSelfProfileEditTabStateLabelInstagram,
      currentValue: user.instagramHandle ?? '',
      currentFieldValue: user.instagramHandle,
      fieldName: l10n
          .userProfileSelfProfileEditTabStateVisiblecopyInstagramhandle71eebb,
      patchForValue: patchFactory.instagramHandle,
      contract: CatchContractConstraints.updateUserProfilePatchInstagramHandle,
      keyboardType: TextInputType.text,
      textCapitalization: TextCapitalization.none,
      validator: validateOptionalInstagramHandle,
      normalizeInput: normalizeInstagramHandle,
      // Remove the optional prefix before the contract length limiter runs.
      inputFormatters: [FilteringTextInputFormatter.deny(RegExp(r'^@'))],
      toFieldValue: (value) {
        final handle = normalizeInstagramHandle(value);
        return handle.isEmpty ? null : handle;
      },
    ),
    CatchFormCustomRow<UpdateUserProfilePatch>(
      id: 'height',
      icon: CatchIcons.height,
      label: l10n.userProfileSelfProfileEditTabStateLabelHeight,
      contract: CatchContractConstraints.updateUserProfilePatchHeight,
      build: (context, scope) {
        final value = user.height != null
            ? l10n.userProfileSelfProfileEditTabStateVisiblecopyHeightCm(
                height: user.height!,
              )
            : l10n.userProfileSelfProfileEditTabStateVisiblecopyHeight;
        return ProfileInlineHeightEditor(
          key: const ValueKey('inline-height-editor'),
          icon: CatchIcons.height,
          label: l10n.userProfileSelfProfileEditTabStateLabelHeight,
          value: value,
          currentValue: user.height,
          isExpanded: scope.isExpanded,
          isAddAffordance: user.height == null,
          patchForValue: patchFactory.height,
          savePatch: scope.save,
          onTap: scope.toggle,
          onSaved: scope.collapse,
          onCancel: scope.collapse,
        );
      },
    ),
  ];
}

List<CatchFormRowDescriptor<UpdateUserProfilePatch>> _aboutRows({
  required AppLocalizations l10n,
  required UserProfile user,
  required SelfProfileInlineEditPatchFactory patchFactory,
}) {
  return [
    CatchFormSingleChoiceRow<UpdateUserProfilePatch, CityOption>(
      itemLabel: (value) => value.label,
      id: 'city',
      icon: CatchIcons.location,
      label: l10n.userProfileSelfProfileEditTabStateLabelCity,
      values: defaultCityOptions
          .where((city) => city.profileSelectable)
          .toList(growable: false),
      value: cityOptionByName(user.city),
      fieldName: l10n.userProfileSelfProfileEditTabStateVisiblecopyCity,
      contractValue: (value) => value.effectiveMarketId,
      patchForValue: patchFactory.city,
      contract: CatchContractConstraints.updateUserProfilePatchCity,
    ),
    CatchFormTextRow<UpdateUserProfilePatch>(
      validationCopy: catchFormValidationCopy(l10n),
      id: 'occupation',
      icon: CatchIcons.work,
      label: l10n.userProfileSelfProfileEditTabStateLabelJobTitle,
      currentValue: user.occupation ?? '',
      currentFieldValue: user.occupation,
      toFieldValue: (value) => value.trim().isEmpty ? null : value.trim(),
      fieldName: l10n.userProfileSelfProfileEditTabStateVisiblecopyOccupation,
      patchForValue: patchFactory.occupation,
      contract: CatchContractConstraints.updateUserProfilePatchOccupation,
      validator: (value) => validateOptionalProfileShortText(
        value,
        label: l10n.userProfileSelfProfileEditTabStateLabelJobTitle,
      ),
    ),
    CatchFormTextRow<UpdateUserProfilePatch>(
      validationCopy: catchFormValidationCopy(l10n),
      id: 'company',
      icon: CatchIcons.business,
      label: l10n.userProfileSelfProfileEditTabStateLabelCompany,
      currentValue: user.company ?? '',
      currentFieldValue: user.company,
      toFieldValue: (value) => value.trim().isEmpty ? null : value.trim(),
      fieldName:
          l10n.userProfileSelfProfileEditTabStateVisiblecopyCompanyfd8aec,
      patchForValue: patchFactory.company,
      contract: CatchContractConstraints.updateUserProfilePatchCompany,
      validator: (value) => validateOptionalProfileShortText(
        value,
        label: l10n.userProfileSelfProfileEditTabStateLabelCompany,
      ),
    ),
    CatchFormSingleChoiceRow<UpdateUserProfilePatch, EducationLevel>(
      itemLabel: (value) => value.label,
      id: 'education',
      icon: CatchIcons.education,
      label: l10n.userProfileSelfProfileEditTabStateLabelEducation,
      values: EducationLevel.values,
      value: user.education,
      fieldName: l10n.userProfileSelfProfileEditTabStateVisiblecopyEducation,
      contractValue: (value) => value.name,
      patchForValue: patchFactory.education,
      contract: CatchContractConstraints.updateUserProfilePatchEducation,
    ),
    CatchFormSingleChoiceRow<UpdateUserProfilePatch, Religion>(
      itemLabel: (value) => value.label,
      id: 'religion',
      icon: CatchIcons.support,
      label: l10n.userProfileSelfProfileEditTabStateLabelReligion,
      values: Religion.values,
      value: user.religion,
      fieldName: l10n.userProfileSelfProfileEditTabStateVisiblecopyReligion,
      contractValue: (value) => value.name,
      patchForValue: patchFactory.religion,
      contract: CatchContractConstraints.updateUserProfilePatchReligion,
      showOptionalLabel: true,
    ),
    CatchFormMultiChoiceRow<UpdateUserProfilePatch, Language>(
      itemLabel: (value) => value.label,
      id: 'languages',
      icon: CatchIcons.web,
      label: l10n.userProfileSelfProfileEditTabStateLabelLanguages,
      values: Language.values,
      selected: user.languages,
      fieldName: l10n.userProfileSelfProfileEditTabStateVisiblecopyLanguages,
      contractValue: (value) => value.name,
      contract: CatchContractConstraints.updateUserProfilePatchLanguages,
      patchForValues: patchFactory.languages,
    ),
    CatchFormSingleChoiceRow<UpdateUserProfilePatch, RelationshipGoal>(
      itemLabel: (value) => value.label,
      id: 'relationshipGoal',
      icon: CatchIcons.like,
      label: l10n.userProfileSelfProfileEditTabStateLabelLookingFor,
      values: RelationshipGoal.values,
      value: user.relationshipGoal,
      fieldName:
          l10n.userProfileSelfProfileEditTabStateVisiblecopyRelationshipgoal,
      contractValue: (value) => value.name,
      patchForValue: patchFactory.relationshipGoal,
      contract: CatchContractConstraints.updateUserProfilePatchRelationshipGoal,
    ),
  ];
}

List<SelfProfileFieldRowDescriptor> _runningRows({
  required AppLocalizations l10n,
  required UserProfile user,
  required SelfProfileInlineEditPatchFactory patchFactory,
}) {
  return [
    SelfProfileRangeFieldRowDescriptor(
      id: 'pace-range',
      icon: CatchIcons.pace,
      label: l10n.userProfileSelfProfileEditTabStateLabelPaceRange,
      value: formatPaceRange(user.paceMinSecsPerKm, user.paceMaxSecsPerKm),
      currentMin: user.paceMinSecsPerKm,
      currentMax: user.paceMaxSecsPerKm,
      sliderMin: 240,
      sliderMax: 540,
      divisions: 20,
      labelText: (v) =>
          l10n.userProfileSelfProfileEditTabStateVisiblecopyFormatpaceKm(
            formatPace: formatPace(v.round()),
          ),
      patchForRange: (min, max) => patchFactory.paceRange(user, min, max),
      patchForLatestProfile: patchFactory.paceRange,
      contract: CatchContractConstraints
          .updateUserProfilePatchActivityPreferencesRunningPaceMinSecsPerKm,
      maximumContract: CatchContractConstraints
          .updateUserProfilePatchActivityPreferencesRunningPaceMaxSecsPerKm,
    ),
    SelfProfileMultiChoiceFieldRowDescriptor<PreferredDistance>(
      id: 'preferredDistances',
      icon: CatchIcons.measure,
      label: l10n.userProfileSelfProfileEditTabStateLabelPreferredDistances,
      values: PreferredDistance.values,
      selected: user.preferredDistances,
      fieldName:
          l10n.userProfileSelfProfileEditTabStateVisiblecopyPreferreddistances,
      contractValue: (value) => value.name,
      contract: CatchContractConstraints
          .updateUserProfilePatchActivityPreferencesRunningPreferredDistances,
      patchForValues: (values) => patchFactory.preferredDistances(user, values),
      patchForLatestProfile: patchFactory.preferredDistances,
    ),
    SelfProfileMultiChoiceFieldRowDescriptor<RunReason>(
      id: 'runningReasons',
      icon: CatchIcons.activity,
      label: l10n.userProfileSelfProfileEditTabStateLabelWhyIEvent,
      values: RunReason.values,
      selected: user.runningReasons,
      fieldName:
          l10n.userProfileSelfProfileEditTabStateVisiblecopyRunningreasons,
      contractValue: (value) => value.name,
      contract: CatchContractConstraints
          .updateUserProfilePatchActivityPreferencesRunningRunningReasons,
      patchForValues: (values) => patchFactory.runningReasons(user, values),
      patchForLatestProfile: patchFactory.runningReasons,
    ),
    SelfProfileMultiChoiceFieldRowDescriptor<PreferredRunTime>(
      id: 'preferredRunTimes',
      icon: CatchIcons.twilight,
      label: l10n.userProfileSelfProfileEditTabStateLabelFavoriteEventTimes,
      values: PreferredRunTime.values,
      selected: user.preferredRunTimes,
      fieldName:
          l10n.userProfileSelfProfileEditTabStateVisiblecopyPreferredruntimes,
      contractValue: (value) => value.name,
      contract: CatchContractConstraints
          .updateUserProfilePatchActivityPreferencesRunningPreferredRunTimes,
      patchForValues: (values) => patchFactory.preferredRunTimes(user, values),
      patchForLatestProfile: patchFactory.preferredRunTimes,
    ),
  ];
}

List<SelfProfileFieldRowDescriptor> _lifestyleRows({
  required AppLocalizations l10n,
  required UserProfile user,
  required SelfProfileInlineEditPatchFactory patchFactory,
}) {
  return [
    SelfProfileSingleChoiceFieldRowDescriptor<DrinkingHabit>(
      id: 'drinking',
      icon: CatchIcons.drinks,
      label: l10n.userProfileSelfProfileEditTabStateLabelDrinking,
      values: DrinkingHabit.values,
      value: user.drinking,
      fieldName: l10n.userProfileSelfProfileEditTabStateVisiblecopyDrinking,
      contractValue: (value) => value.name,
      contract: CatchContractConstraints.updateUserProfilePatchDrinking,
      patchForValue: patchFactory.drinking,
    ),
    SelfProfileSingleChoiceFieldRowDescriptor<SmokingHabit>(
      id: 'smoking',
      icon: CatchIcons.smokeFree,
      label: l10n.userProfileSelfProfileEditTabStateLabelSmoking,
      values: SmokingHabit.values,
      value: user.smoking,
      fieldName: l10n.userProfileSelfProfileEditTabStateVisiblecopySmoking,
      contractValue: (value) => value.name,
      contract: CatchContractConstraints.updateUserProfilePatchSmoking,
      patchForValue: patchFactory.smoking,
    ),
    SelfProfileSingleChoiceFieldRowDescriptor<WorkoutFrequency>(
      id: 'workout',
      icon: CatchIcons.fitness,
      label: l10n.userProfileSelfProfileEditTabStateLabelWorkout,
      values: WorkoutFrequency.values,
      value: user.workout,
      fieldName: l10n.userProfileSelfProfileEditTabStateVisiblecopyWorkout,
      contractValue: (value) => value.name,
      contract: CatchContractConstraints.updateUserProfilePatchWorkout,
      patchForValue: patchFactory.workout,
    ),
    SelfProfileSingleChoiceFieldRowDescriptor<DietaryPreference>(
      id: 'diet',
      icon: CatchIcons.dining,
      label: l10n.userProfileSelfProfileEditTabStateLabelDiet,
      values: DietaryPreference.values,
      value: user.diet,
      fieldName: l10n.userProfileSelfProfileEditTabStateVisiblecopyDiet,
      contractValue: (value) => value.name,
      contract: CatchContractConstraints.updateUserProfilePatchDiet,
      patchForValue: patchFactory.diet,
    ),
    SelfProfileSingleChoiceFieldRowDescriptor<ChildrenStatus>(
      id: 'children',
      icon: CatchIcons.kids,
      label: l10n.userProfileSelfProfileEditTabStateLabelChildren,
      values: ChildrenStatus.values,
      value: user.children,
      fieldName: l10n.userProfileSelfProfileEditTabStateVisiblecopyChildren,
      contractValue: (value) => value.name,
      contract: CatchContractConstraints.updateUserProfilePatchChildren,
      patchForValue: patchFactory.children,
    ),
  ];
}

class SelfProfilePhotoGridState {
  const SelfProfilePhotoGridState({
    required this.profilePhotos,
    required this.loadingIndices,
    required this.canDeletePhotos,
  });

  factory SelfProfilePhotoGridState.fromProfile({
    required UserProfile user,
    required PhotoUploadState uploadState,
  }) {
    final profilePhotos = user.effectiveProfilePhotos;
    return SelfProfilePhotoGridState(
      profilePhotos: profilePhotos,
      loadingIndices: uploadState.loadingIndices,
      canDeletePhotos: profilePhotos.length > minimumProfilePhotoCount,
    );
  }

  final List<ProfilePhoto> profilePhotos;
  final Set<int> loadingIndices;
  final bool canDeletePhotos;
}

class SelfProfilePromptSlotState {
  const SelfProfilePromptSlotState({
    required this.index,
    required this.definition,
    required this.answer,
    required this.usedPromptIds,
    required this.fieldName,
    required this.availablePromptIds,
  });

  final int index;
  final ProfilePromptDefinition definition;
  final ProfilePromptAnswer? answer;
  final Set<String> usedPromptIds;
  final String fieldName;
  final List<String> availablePromptIds;

  String get displayText => answer?.answer ?? '';
  String? get currentPromptId => answer?.promptId;
  bool get isAddAffordance => displayText.isEmpty;
}

ProfilePromptDefinition _profilePromptDefinitionForSlot({
  required int index,
  required ProfilePromptAnswer? answer,
  required Set<String> usedPromptIds,
}) {
  final promptId = answer?.promptId;
  if (promptId != null) return profilePromptDefinition(promptId);
  final defaultPromptId = index < defaultProfilePromptIds.length
      ? defaultProfilePromptIds[index]
      : null;
  if (defaultPromptId != null && !usedPromptIds.contains(defaultPromptId)) {
    return profilePromptDefinition(defaultPromptId);
  }
  return profilePromptCatalog.firstWhere(
    (definition) => !usedPromptIds.contains(definition.id),
    orElse: () => profilePromptCatalog.first,
  );
}

List<String> _availableProfilePromptIds({
  required Set<String> usedPromptIds,
  required String currentPromptId,
}) {
  final ids = <String>[
    if (!profilePromptCatalog.any(
      (definition) => definition.id == currentPromptId,
    ))
      currentPromptId,
    for (final definition in profilePromptCatalog)
      if (!usedPromptIds.contains(definition.id) ||
          definition.id == currentPromptId)
        definition.id,
  ];
  return ids.isNotEmpty ? ids : <String>[profilePromptCatalog.first.id];
}
