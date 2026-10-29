import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/profiles/data/onboarding_draft_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/onboarding_draft.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_readiness.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_validation.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_profile_draft.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_step.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'onboarding_controller.freezed.dart';
part 'onboarding_controller.g.dart';

@freezed
abstract class OnboardingData with _$OnboardingData {
  const OnboardingData._();

  const factory OnboardingData({
    @Default(OnboardingStep.welcome) OnboardingStep step,
    @Default(false) bool phoneVerified,
    @Default(OnboardingProfileDraft()) OnboardingProfileDraft profileDraft,
    @Default(false) bool operationPending,
  }) = _OnboardingData;

  String get phoneNumber => profileDraft.phoneNumber;
  String get countryCode => profileDraft.countryCode;
  String get firstName => profileDraft.firstName;
  String get lastName => profileDraft.lastName;
  DateTime? get dateOfBirth => profileDraft.dateOfBirth;
  Gender? get gender => profileDraft.gender;
  List<Gender> get interestedInGenders => profileDraft.interestedInGenders;
  String? get instagramHandle => profileDraft.instagramHandle;
  List<ProfilePromptAnswer> get profilePrompts => profileDraft.profilePrompts;
}

/// **Pattern B: Flow controller with freezed state + Mutations**
///
/// - [OnboardingData] (freezed) holds multi-step form state that must survive
///   navigation between onboarding pages. This is why [keepAlive] is `true`.
/// - [Mutation]s ([saveProfileMutation], [completeMutation]) handle single-shot
///   async operations while the UI watches their lifecycle.
/// - The controller self-invalidates at the end of [complete] so its state
///   is freed once onboarding is done.
///
/// **When to use this pattern:** Multi-step flows where state must survive
/// navigation and a freezed data class captures the full form state.
// keepalive: onboarding state must survive step navigation until completion or
// explicit invalidation.
@Riverpod(keepAlive: true)
class OnboardingController extends _$OnboardingController {
  static const welcomeStep = OnboardingStep.welcome;
  static const nameDobStep = OnboardingStep.nameDob;
  static const genderInterestStep = OnboardingStep.genderInterest;
  static const instagramStep = OnboardingStep.instagram;
  static const photosStep = OnboardingStep.photos;
  static const promptsStep = OnboardingStep.prompts;
  static const runningPrefsStep = OnboardingStep.runningPrefs;

  static final saveProfileMutation = Mutation<void>();
  static final completeMutation = Mutation<void>();

  Future<void>? _saveProfileInFlight;
  Future<void>? _completionInFlight;
  final _editedProfileFields = <String>{};

  @override
  OnboardingData build() => const OnboardingData();

  Future<void> initStep({
    bool profileCompletionOnly = false,
    bool runPreferencesOnly = false,
    List<String>? eventRequirements,
  }) => syncEntryStep(
    profileCompletionOnly: profileCompletionOnly,
    runPreferencesOnly: runPreferencesOnly,
    eventRequirements: eventRequirements,
  );

  Future<void> syncEntryStep({
    bool profileCompletionOnly = false,
    bool runPreferencesOnly = false,
    List<String>? eventRequirements,
  }) async {
    final uid = ref.read(uidProvider).asData?.value;
    final profileAsync = ref.read(watchUserProfileProvider);

    if (uid == null) {
      _setStateIfChanged(state.copyWith(step: OnboardingStep.welcome));
      return;
    }

    // The router owns profile-read recovery. Do not resume a new-account draft
    // while the profile is unresolved, or treat a failed read as absence.
    if (profileAsync.isLoading ||
        (profileAsync.hasError && profileAsync.value == null)) {
      return;
    }
    final userProfile = profileAsync.value;

    _editedProfileFields.clear();
    final today = DateTime.now();
    if (runPreferencesOnly &&
        userProfile != null &&
        userProfile.hasBookingReadyIdentityOn(today)) {
      _setStateIfChanged(
        state.copyWith(
          step: OnboardingStep.runningPrefs,
          phoneVerified: true,
          profileDraft: _profileDraftFromUserProfile(userProfile),
        ),
      );
      return;
    }

    if (profileCompletionOnly &&
        userProfile != null &&
        userProfile.hasBookingReadyIdentityOn(today)) {
      _setStateIfChanged(
        state.copyWith(
          step: _firstMissingProfileStep(
            userProfile,
            eventRequirements: eventRequirements,
          ),
          phoneVerified: true,
          profileDraft: _profileDraftFromUserProfile(userProfile),
        ),
      );
      return;
    }

    // Try to resume from a persisted draft first (exact step tracking).
    final draft = await ref
        .read(onboardingDraftRepositoryProvider)
        .fetchDraft(uid: uid);
    if (draft != null) {
      if (_authPhoneNumber.isEmpty) {
        _setStateIfChanged(state.copyWith(step: OnboardingStep.welcome));
        return;
      }

      final migratedStepIndex = _migrateDraftStep(
        draft.step,
        draft.draftVersion,
      );
      final draftStep = OnboardingStep.fromIndex(migratedStepIndex);
      if (draftStep != null) {
        final entryStep = runPreferencesOnly
            ? OnboardingStep.runningPrefs
            : profileCompletionOnly
            ? draftStep
            : _bookingIdentityStepForDraft(draftStep);
        _setStateIfChanged(
          state.copyWith(
            step: entryStep,
            phoneVerified: entryStep.index >= OnboardingStep.nameDob.index,
            profileDraft: state.profileDraft.copyWith(
              firstName: draft.firstName,
              lastName: draft.lastName,
              dateOfBirth: draft.dateOfBirth,
              phoneNumber: draft.phoneNumber,
              countryCode: draft.countryCode,
              gender: draft.gender,
              interestedInGenders: draft.interestedInGenders,
              instagramHandle: draft.instagramHandle,
              profilePrompts: draft.profilePrompts,
            ),
          ),
        );
        return;
      }
    }

    // No draft — fall back to heuristic (also handles users who started
    // onboarding before the draft system was introduced).
    if (userProfile == null) {
      final phoneNumber = _authPhoneNumber;
      if (phoneNumber.isEmpty) {
        // Not signed in via phone — should re-enter auth.
        _setStateIfChanged(state.copyWith(step: OnboardingStep.welcome));
        return;
      }

      if (state.step.index > OnboardingStep.nameDob.index) {
        return;
      }

      final dialCode = _dialCodeFromPhoneNumber(phoneNumber);
      _setStateIfChanged(
        state.copyWith(
          step: OnboardingStep.nameDob,
          phoneVerified: true,
          profileDraft: state.profileDraft.copyWith(
            phoneNumber: _stripCountryCode(phoneNumber, dialCode),
            countryCode: dialCode,
          ),
        ),
      );
      return;
    }

    if (!userProfile.hasBookingReadyIdentityOn(today)) {
      _setStateIfChanged(
        state.copyWith(
          step: OnboardingStep.nameDob,
          phoneVerified: _authPhoneNumber.isNotEmpty,
          profileDraft: _profileDraftFromUserProfile(userProfile),
        ),
      );
    }
  }

  void goToStep(OnboardingStep step) {
    if (_hasPendingOperation) return;
    state = state.copyWith(step: step);
  }

  void goToStepAndSaveDraft(OnboardingStep step) {
    if (_hasPendingOperation) return;
    state = state.copyWith(step: step);
    _saveDraft();
  }

  // ── Profile creation ──────────────────────────────────────────────────────

  void setNameDob({
    required String firstName,
    required String lastName,
    required DateTime? dateOfBirth,
    required String phoneNumber,
    required String countryCode,
  }) {
    if (_hasPendingOperation) return;
    _editedProfileFields.add('dateOfBirth');
    state = state.copyWith(
      profileDraft: state.profileDraft.copyWith(
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: dateOfBirth,
        phoneNumber: phoneNumber,
        countryCode: countryCode,
      ),
    );
  }

  void setGenderInterest({
    required Gender gender,
    required List<Gender> interestedInGenders,
  }) {
    if (_saveProfileInFlight != null) return;
    _editedProfileFields.addAll(['gender', 'interestedInGenders']);
    state = state.copyWith(
      profileDraft: state.profileDraft.copyWith(
        gender: gender,
        interestedInGenders: interestedInGenders,
      ),
    );
  }

  void setInstagramHandle(String? handle) {
    state = state.copyWith(
      profileDraft: state.profileDraft.copyWith(instagramHandle: handle),
    );
  }

  void setProfilePrompts(List<ProfilePromptAnswer> prompts) {
    if (_completionInFlight != null) return;
    state = state.copyWith(
      profileDraft: state.profileDraft.copyWith(
        profilePrompts: normalizeProfilePromptAnswers(prompts),
      ),
    );
  }

  void advanceToGenderInterest({
    required String firstName,
    required String lastName,
    required DateTime? dateOfBirth,
    required String phoneNumber,
    required String countryCode,
  }) {
    setNameDob(
      firstName: firstName,
      lastName: lastName,
      dateOfBirth: dateOfBirth,
      phoneNumber: phoneNumber,
      countryCode: countryCode,
    );
    state = state.copyWith(step: OnboardingStep.genderInterest);
    _saveDraft();
    ref.read(appAnalyticsProvider).logEvent(AnalyticsEvents.onboardingStarted);
  }

  void advanceToPhotos({String? instagramHandle}) {
    setInstagramHandle(instagramHandle);
    state = state.copyWith(step: OnboardingStep.photos);
    _saveDraft();
  }

  void advanceToRunningPrefs({required List<ProfilePromptAnswer> prompts}) {
    setProfilePrompts(prompts);
    state = state.copyWith(step: OnboardingStep.runningPrefs);
    _saveDraft();
  }

  void clearSaveProfileErrorIfIdle() {
    if (_saveProfileInFlight != null) return;
    saveProfileMutation.reset(ref);
  }

  void clearCompleteErrorIfIdle() {
    if (_completionInFlight != null) return;
    completeMutation.reset(ref);
  }

  Future<void> saveProfile({
    bool socialIdentityOnly = false,
    List<String>? eventRequirements,
  }) {
    final existingRequest = _saveProfileInFlight;
    if (existingRequest != null) return existingRequest;

    _setOperationPending(true);
    late final Future<void> trackedRequest;
    trackedRequest =
        _saveProfile(
          socialIdentityOnly: socialIdentityOnly,
          eventRequirements: eventRequirements,
        ).whenComplete(() {
          if (identical(_saveProfileInFlight, trackedRequest)) {
            _saveProfileInFlight = null;
            _setOperationPending(false);
          }
        });
    _saveProfileInFlight = trackedRequest;
    return trackedRequest;
  }

  Future<void> _saveProfile({
    required bool socialIdentityOnly,
    List<String>? eventRequirements,
  }) async {
    final uid = requireSignedInUid(ref, action: 'save profile');
    final draft = _requireProfileDraft(
      socialIdentityOnly: socialIdentityOnly,
      eventRequirements: eventRequirements,
    );
    final verifiedPhoneNumber = _requireVerifiedAuthPhoneNumber(uid);

    if (socialIdentityOnly || eventRequirements != null) {
      final profile = ref.read(watchUserProfileProvider).asData?.value;
      if (profile == null || profile.uid != uid) {
        throw const DocumentNotFoundException('users/current');
      }
      await ref
          .read(userProfileRepositoryProvider)
          .updateUserProfile(
            uid: uid,
            patch: UpdateUserProfilePatch(
              dateOfBirth:
                  _editedProfileFields.contains('dateOfBirth') &&
                      (eventRequirements == null ||
                          eventRequirements.contains('ageRestricted'))
                  ? draft.dateOfBirth
                  : null,
              gender:
                  _editedProfileFields.contains('gender') &&
                      (eventRequirements == null ||
                          eventRequirements.contains('cohortRestricted'))
                  ? draft.gender
                  : null,
              interestedInGenders:
                  _editedProfileFields.contains('interestedInGenders') &&
                      (eventRequirements == null ||
                          eventRequirements.contains('cohortRestricted'))
                  ? draft.interestedInGenders
                  : null,
            ),
          );
      if (!ref.mounted ||
          ref.read(authRepositoryProvider).currentUser?.uid != uid) {
        return;
      }
      if (eventRequirements == null) {
        state = state.copyWith(
          step: profile.hasMinimumSocialPhotos
              ? OnboardingStep.prompts
              : OnboardingStep.photos,
        );
      }
      _editedProfileFields.clear();
      await _deleteDraftNow();
      return;
    }

    await ref
        .read(userProfileRepositoryProvider)
        .setUserProfile(
          userProfile: UserProfile(
            uid: uid,
            name: draft.fullName,
            firstName: draft.firstName.trim(),
            lastName: draft.lastName.trim(),
            displayName: draft.firstName.trim(),
            dateOfBirth: draft.dateOfBirth,
            gender: draft.gender,
            phoneNumber: verifiedPhoneNumber,
            countryCode: draft.countryCode,
            interestedInGenders: draft.interestedInGenders,
            instagramHandle: (draft.instagramHandle?.trim() ?? '').isEmpty
                ? null
                : draft.instagramHandle?.trim(),
            profilePrompts: draft.profilePrompts,
            profileComplete: false,
            prefsNewCatches: false,
            prefsRunStatusUpdates: false,
            prefsClubUpdates: false,
            prefsShowOnMap: false,
          ),
        );

    if (!ref.mounted ||
        ref.read(authRepositoryProvider).currentUser?.uid != uid) {
      return;
    }
    await _deleteDraftNow();
  }

  Future<void> completeSocialProfile({
    required List<ProfilePromptAnswer> prompts,
  }) => _trackCompletion(() => _completeSocialProfile(prompts: prompts));

  Future<void> _completeSocialProfile({
    required List<ProfilePromptAnswer> prompts,
  }) async {
    final userProfile = ref.read(watchUserProfileProvider).asData?.value;
    if (userProfile == null) {
      throw const DocumentNotFoundException('users/current');
    }
    final normalizedPrompts = normalizeProfilePromptAnswers(prompts);
    await ref
        .read(userProfileRepositoryProvider)
        .updateUserProfile(
          uid: userProfile.uid,
          patch: UpdateUserProfilePatch(
            profilePrompts: normalizedPrompts,
            profileComplete: true,
          ),
        );
    await _deleteDraftNow();
    ref
        .read(appAnalyticsProvider)
        .logEvent(AnalyticsEvents.onboardingCompleted);
    ref.invalidateSelf();
  }

  Future<void> completeRunPreferences({
    required int paceMinSecsPerKm,
    required int paceMaxSecsPerKm,
    required List<PreferredDistance> preferredDistances,
    required List<RunReason> runningReasons,
    required List<PreferredRunTime> preferredRunTimes,
  }) => _trackCompletion(
    () => _completeRunPreferences(
      paceMinSecsPerKm: paceMinSecsPerKm,
      paceMaxSecsPerKm: paceMaxSecsPerKm,
      preferredDistances: preferredDistances,
      runningReasons: runningReasons,
      preferredRunTimes: preferredRunTimes,
    ),
  );

  Future<void> _completeRunPreferences({
    required int paceMinSecsPerKm,
    required int paceMaxSecsPerKm,
    required List<PreferredDistance> preferredDistances,
    required List<RunReason> runningReasons,
    required List<PreferredRunTime> preferredRunTimes,
  }) async {
    final userProfile = ref.read(watchUserProfileProvider).asData?.value;
    if (userProfile == null) {
      throw const DocumentNotFoundException('users/current');
    }
    await ref
        .read(userProfileRepositoryProvider)
        .updateUserProfile(
          uid: userProfile.uid,
          patch: UpdateUserProfilePatch(
            activityPreferences: userProfile.activityPreferences.copyWith(
              running: RunningPreferences(
                paceMinSecsPerKm: paceMinSecsPerKm,
                paceMaxSecsPerKm: paceMaxSecsPerKm,
                preferredDistances: preferredDistances,
                runningReasons: runningReasons,
                preferredRunTimes: preferredRunTimes,
                version: currentRunPreferencesVersion,
              ),
            ),
          ),
        );
    await _deleteDraftNow();
    // The router will redirect away shortly.
    // Invalidate self so the keepAlive provider is disposed and its
    // state (including OnboardingData) is freed.
    ref
        .read(appAnalyticsProvider)
        .logEvent(AnalyticsEvents.onboardingCompleted);
    ref.invalidateSelf();
  }

  bool get _hasPendingOperation =>
      _saveProfileInFlight != null || _completionInFlight != null;

  Future<void> _trackCompletion(Future<void> Function() operation) {
    final existingRequest = _completionInFlight;
    if (existingRequest != null) return existingRequest;

    _setOperationPending(true);
    late final Future<void> trackedRequest;
    trackedRequest = operation().whenComplete(() {
      if (identical(_completionInFlight, trackedRequest)) {
        _completionInFlight = null;
        _setOperationPending(false);
      }
    });
    _completionInFlight = trackedRequest;
    return trackedRequest;
  }

  void _setOperationPending(bool pending) {
    if (!ref.mounted || state.operationPending == pending) return;
    state = state.copyWith(operationPending: pending);
  }

  OnboardingProfileDraft _requireProfileDraft({
    required bool socialIdentityOnly,
    List<String>? eventRequirements,
  }) {
    final draft = state.profileDraft.copyWith(
      firstName: state.firstName.trim(),
      lastName: state.lastName.trim(),
      phoneNumber: state.phoneNumber.trim(),
    );
    final capability = eventRequirements != null
        ? 'eventBooking'
        : socialIdentityOnly
        ? 'socialIdentity'
        : 'account';
    if (draft
            .missingFields(
              capability,
              today: DateTime.now(),
              eventRequirements: eventRequirements ?? const [],
            )
            .isNotEmpty ||
        validateOptionalDateOfBirth(draft.dateOfBirth, today: DateTime.now()) !=
            null) {
      throw const ValidationException(
        'Please complete the details required for this feature.',
        code: 'onboarding-incomplete-profile',
      );
    }
    return draft;
  }

  String get _authPhoneNumber =>
      ref.read(authRepositoryProvider).currentUser?.phoneNumber ?? '';

  String _requireVerifiedAuthPhoneNumber(String expectedUid) {
    if (ref.read(authRepositoryProvider).currentUser?.uid != expectedUid) {
      throw const SignInRequiredException('save profile');
    }
    if (!state.phoneVerified) {
      throw const ValidationException(
        'Please verify your phone number before continuing.',
        code: 'onboarding-phone-unverified',
      );
    }

    final phoneNumber = _authPhoneNumber.trim();
    if (phoneNumber.isEmpty) {
      throw const ValidationException(
        'Please verify your phone number before continuing.',
        code: 'onboarding-phone-unverified',
      );
    }
    return phoneNumber;
  }

  void _setStateIfChanged(OnboardingData nextState) {
    if (nextState == state) {
      return;
    }
    state = nextState;
  }

  int _migrateDraftStep(int storedStep, int draftVersion) {
    if (draftVersion >= 2) return storedStep;
    if (draftVersion == 1) return storedStep;
    // Legacy draft (version 0) with old 9-step indices:
    //   welcome(0), phone(1), otp(2), nameDob(3), genderInterest(4),
    //   instagram(5), photos(6), runningPrefs(7)
    // Version 1 removed phone/OTP:
    //   welcome(0), nameDob(1), genderInterest(2), instagram(3),
    //   photos(4), runningPrefs(5)
    // Version 2 inserts prompts at index 5. Legacy users who were already at
    // runningPrefs land on prompts so every new completed profile gets prompts.
    if (storedStep <= 0) return 0;
    if (storedStep <= 2) return 0; // phone/otp → welcome (re-enter auth)
    return storedStep - 2;
  }

  OnboardingStep _bookingIdentityStepForDraft(OnboardingStep draftStep) {
    if (draftStep.index > OnboardingStep.nameDob.index) {
      return OnboardingStep.nameDob;
    }
    return draftStep;
  }

  OnboardingStep _firstMissingProfileStep(
    UserProfile userProfile, {
    List<String>? eventRequirements,
  }) {
    final missing = _profileDraftFromUserProfile(userProfile).missingFields(
      eventRequirements != null ? 'eventBooking' : 'socialIdentity',
      today: DateTime.now(),
      eventRequirements: eventRequirements ?? const [],
    );
    if (missing.contains('dateOfBirth')) return OnboardingStep.nameDob;
    if (missing.isNotEmpty) return OnboardingStep.genderInterest;
    if (eventRequirements != null) return OnboardingStep.nameDob;
    if (!userProfile.hasMinimumSocialPhotos) return OnboardingStep.photos;
    return OnboardingStep.prompts;
  }

  OnboardingProfileDraft _profileDraftFromUserProfile(UserProfile userProfile) {
    final phoneNumber = _authPhoneNumber.trim().isNotEmpty
        ? _authPhoneNumber.trim()
        : userProfile.phoneNumber.trim();
    final countryCode = _dialCodeFromPhoneNumber(phoneNumber);
    final nameParts = userProfile.name.trim().split(RegExp(r'\s+'));
    final firstName = userProfile.firstName.trim().isNotEmpty
        ? userProfile.firstName.trim()
        : nameParts.firstOrNull ?? '';
    final lastName = userProfile.lastName.trim().isNotEmpty
        ? userProfile.lastName.trim()
        : nameParts.length > 1
        ? nameParts.skip(1).join(' ')
        : '';
    return OnboardingProfileDraft(
      firstName: firstName,
      lastName: lastName,
      dateOfBirth: userProfile.dateOfBirth,
      phoneNumber: _stripCountryCode(phoneNumber, countryCode),
      countryCode: countryCode,
      gender: userProfile.gender,
      interestedInGenders: userProfile.interestedInGenders,
      instagramHandle: userProfile.instagramHandle,
      profilePrompts: userProfile.profilePrompts,
    );
  }

  String _stripCountryCode(String phoneNumber, String countryCode) {
    if (phoneNumber.startsWith(countryCode)) {
      return phoneNumber.substring(countryCode.length);
    }
    return phoneNumber;
  }

  String _dialCodeFromPhoneNumber(String phoneNumber) {
    final normalized = phoneNumber.trim();
    final sortedDialCodes =
        supportedCountryMarkets.map((market) => market.dialCode).toList()
          ..sort((a, b) => b.length.compareTo(a.length));
    for (final dialCode in sortedDialCodes) {
      if (normalized.startsWith(dialCode)) return dialCode;
    }
    return state.countryCode;
  }

  void _saveDraft() {
    final uid = ref.read(uidProvider).asData?.value;
    if (uid == null) return;

    // Best-effort cache — a failed write is harmless; syncEntryStep falls
    // back to the existing heuristic on next launch.
    unawaited(
      ref
          .read(onboardingDraftRepositoryProvider)
          .saveDraft(
            uid: uid,
            draft: OnboardingDraft(
              step: state.step.index,
              draftVersion: 2,
              firstName: state.firstName,
              lastName: state.lastName,
              dateOfBirth: state.dateOfBirth,
              phoneNumber: state.phoneNumber,
              countryCode: state.countryCode,
              gender: state.gender,
              interestedInGenders: state.interestedInGenders,
              instagramHandle: state.instagramHandle,
              profilePrompts: state.profilePrompts,
            ),
          )
          .catchError((Object error, StackTrace stack) {
            ref
                .read(errorLoggerProvider)
                .logAppException(
                  normalizeBackendError(
                    error,
                    stackTrace: stack,
                    context: const BackendErrorContext(
                      service: BackendService.firestore,
                      action: 'save onboarding draft',
                      resource: 'onboarding_controller',
                    ),
                  ),
                );
          }),
    );
  }

  Future<void> _deleteDraftNow() async {
    final uid = ref.read(uidProvider).asData?.value;
    if (uid == null) return;

    try {
      await ref.read(onboardingDraftRepositoryProvider).deleteDraft(uid: uid);
    } catch (error, stack) {
      ref
          .read(errorLoggerProvider)
          .logAppException(
            normalizeBackendError(
              error,
              stackTrace: stack,
              context: const BackendErrorContext(
                service: BackendService.local,
                action: 'delete onboarding draft',
                resource: 'onboarding_controller',
              ),
            ),
          );
    }
  }
}
