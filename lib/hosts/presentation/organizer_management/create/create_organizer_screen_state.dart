import 'dart:typed_data';

import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_controller.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/platform/media/ordered_photo_picker.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum HostOrganizerCreateCloseIntent { confirmUnsavedChanges, close }

enum HostOrganizerCreatePreviousIntent { previousStep, returnToSteps }

enum HostOrganizerCreatePrimaryIntent { nextStep, review, submit }

enum HostOrganizerCreateDraftRestoreIntent { retry }

@immutable
class HostOrganizerCreateDraftRestoreState {
  const HostOrganizerCreateDraftRestoreState({
    required this.isLoading,
    required this.error,
    required this.retryIntent,
  });

  factory HostOrganizerCreateDraftRestoreState.resolve({
    required bool enabled,
    required bool loadPending,
    required Object? loadError,
  }) {
    if (!enabled) {
      return const HostOrganizerCreateDraftRestoreState(
        isLoading: false,
        error: null,
        retryIntent: null,
      );
    }
    return HostOrganizerCreateDraftRestoreState(
      isLoading: loadPending,
      error: loadError,
      retryIntent: loadError == null
          ? null
          : HostOrganizerCreateDraftRestoreIntent.retry,
    );
  }

  final bool isLoading;
  final Object? error;
  final HostOrganizerCreateDraftRestoreIntent? retryIntent;

  bool get hasError => error != null;
}

@immutable
class HostOrganizerCreateFooterState {
  const HostOrganizerCreateFooterState({
    required this.isLastStep,
    required this.isLoading,
    required this.primaryEnabled,
    required this.primaryIntent,
    required this.previousIntent,
  });

  final bool isLastStep;
  final bool isLoading;
  final bool primaryEnabled;
  final HostOrganizerCreatePrimaryIntent primaryIntent;
  final HostOrganizerCreatePreviousIntent? previousIntent;
}

@immutable
class HostOrganizerCreateReviewState {
  const HostOrganizerCreateReviewState({required this.formReview});

  factory HostOrganizerCreateReviewState.resolve({
    required List<CatchFormStepSpec> activeSteps,
    required String name,
    required String? selectedCity,
    required String area,
    required String description,
  }) {
    final completion = <bool>[
      name.trim().isNotEmpty &&
          selectedCity?.trim().isNotEmpty == true &&
          area.trim().isNotEmpty,
      description.trim().isNotEmpty,
      true,
      true,
    ];
    final items = <CatchFormStepReviewItem>[
      for (var index = 0; index < activeSteps.length; index++)
        CatchFormStepReviewItem(
          index: index,
          title: activeSteps[index].title,
          status: activeSteps[index].optional
              ? CatchFormStepListStatus.optional
              : completion[index]
              ? CatchFormStepListStatus.complete
              : CatchFormStepListStatus.needsInformation,
        ),
    ];
    return HostOrganizerCreateReviewState(
      formReview: CatchFormReviewState(List.unmodifiable(items)),
    );
  }

  final CatchFormReviewState formReview;

  bool get canSubmit => formReview.canSubmit;
  int? get firstIncompleteStep => formReview.firstIncompleteStep;
  List<CatchFormStepReviewItem> get items => formReview.items;
}

@immutable
class HostOrganizerCreateMediaState {
  const HostOrganizerCreateMediaState({
    required this.enabled,
    required this.organizerPhotoPreviews,
    required this.existingCoverImageUrl,
    required this.profileImageBytes,
    required this.existingProfileImageUrl,
  });

  factory HostOrganizerCreateMediaState.resolve({
    required bool enabled,
    required List<OrderedPhotoPreview> organizerPhotoPreviews,
    required PickedOrganizerProfileImage? profileImage,
  }) {
    return HostOrganizerCreateMediaState(
      enabled: enabled,
      organizerPhotoPreviews: List.unmodifiable(organizerPhotoPreviews),
      existingCoverImageUrl: null,
      profileImageBytes: profileImage?.bytes,
      existingProfileImageUrl: null,
    );
  }

  final bool enabled;
  final List<OrderedPhotoPreview> organizerPhotoPreviews;
  final String? existingCoverImageUrl;
  final Uint8List? profileImageBytes;
  final String? existingProfileImageUrl;
}

@immutable
class HostOrganizerCreateFieldDisplayState {
  const HostOrganizerCreateFieldDisplayState({
    required this.detailsEnabled,
    required this.selectedCity,
    required this.rawCityName,
    required this.currencyCode,
  });

  factory HostOrganizerCreateFieldDisplayState.resolve({
    required String? selectedCityName,
    bool detailsEnabled = true,
  }) {
    return HostOrganizerCreateFieldDisplayState(
      detailsEnabled: detailsEnabled,
      selectedCity: cityOptionByName(selectedCityName),
      rawCityName: selectedCityName,
      currencyCode: currencyCodeForCityName(selectedCityName),
    );
  }

  final bool detailsEnabled;
  final CityOption? selectedCity;
  final String? rawCityName;
  final String currencyCode;
}

@immutable
class HostOrganizerCreateDraftRequest {
  const HostOrganizerCreateDraftRequest({
    required this.name,
    required this.area,
    required this.description,
    required this.organizerType,
    required this.location,
    required this.instagramHandle,
    required this.phoneNumber,
    required this.email,
    required this.hostDefaults,
  });

  factory HostOrganizerCreateDraftRequest.fromForm({
    required String name,
    required String area,
    required String description,
    OrganizerType organizerType = OrganizerType.club,
    required String? selectedCity,
    required String instagramHandle,
    required String phoneNumber,
    required String email,
    required OrganizerHostDefaults hostDefaults,
  }) {
    return HostOrganizerCreateDraftRequest(
      name: _trimmedTextOrNull(name),
      area: _trimmedTextOrNull(area),
      description: _trimmedTextOrNull(description),
      organizerType: organizerType,
      location: selectedCity,
      instagramHandle: _trimmedTextOrNull(instagramHandle),
      phoneNumber: _trimmedTextOrNull(phoneNumber),
      email: _trimmedTextOrNull(email),
      hostDefaults: hostDefaults,
    );
  }

  final String? name;
  final String? area;
  final String? description;
  final OrganizerType organizerType;
  final String? location;
  final String? instagramHandle;
  final String? phoneNumber;
  final String? email;
  final OrganizerHostDefaults hostDefaults;

  OrganizerDraft toDraft({required DateTime savedAt}) {
    return OrganizerDraft(
      savedAt: savedAt,
      name: name,
      area: area,
      description: description,
      organizerType: organizerType,
      location: location,
      instagramHandle: instagramHandle,
      phoneNumber: phoneNumber,
      email: email,
      hostDefaults: hostDefaults,
    );
  }
}

@immutable
class HostOrganizerCreateSubmitRequest {
  const HostOrganizerCreateSubmitRequest({
    required this.name,
    required this.location,
    required this.area,
    required this.description,
    required this.organizerType,
    required this.organizerPhotoInputs,
    required this.profileImage,
    required this.instagramHandle,
    required this.phoneNumber,
    required this.email,
    required this.hostDefaults,
  });

  factory HostOrganizerCreateSubmitRequest.fromForm({
    required String name,
    required String? selectedCity,
    required String area,
    required String description,
    OrganizerType organizerType = OrganizerType.club,
    required List<OrganizerPhotoInput>? organizerPhotoInputs,
    required PickedOrganizerProfileImage? profileImage,
    required String instagramHandle,
    required String phoneNumber,
    required String email,
    required OrganizerHostDefaults hostDefaults,
  }) {
    final location = selectedCity?.trim();
    if (location == null || location.isEmpty) {
      throw StateError('Missing selected city');
    }
    return HostOrganizerCreateSubmitRequest(
      name: name.trim(),
      location: location,
      area: area.trim(),
      description: description.trim(),
      organizerType: organizerType,
      organizerPhotoInputs: organizerPhotoInputs,
      profileImage: profileImage,
      instagramHandle: _trimmedTextOrNull(instagramHandle),
      phoneNumber: _trimmedTextOrNull(phoneNumber),
      email: _trimmedTextOrNull(email),
      hostDefaults: hostDefaults,
    );
  }

  final String name;
  final String location;
  final String area;
  final String description;
  final OrganizerType organizerType;
  final List<OrganizerPhotoInput>? organizerPhotoInputs;
  final PickedOrganizerProfileImage? profileImage;
  final String? instagramHandle;
  final String? phoneNumber;
  final String? email;
  final OrganizerHostDefaults hostDefaults;
}

@immutable
class HostOrganizerCreateState {
  const HostOrganizerCreateState({
    required this.currentStep,
    required this.totalSteps,
    required this.title,
    required this.footer,
    required this.media,
    required this.fields,
    required this.draftRestore,
    required this.mutationError,
    required this.isReviewing,
    required this.closeIntent,
  });

  final int currentStep;
  final int totalSteps;
  final String title;
  final HostOrganizerCreateFooterState footer;
  final HostOrganizerCreateMediaState media;
  final HostOrganizerCreateFieldDisplayState fields;
  final HostOrganizerCreateDraftRestoreState draftRestore;
  final String? mutationError;
  final bool isReviewing;
  final HostOrganizerCreateCloseIntent closeIntent;

  String? get subtitle => null;
  bool get isLastStep => footer.isLastStep;
  bool get canPickMedia => media.enabled;
  bool get isLoading => footer.isLoading;
  bool get requestControlsEnabled => !isLoading;

  factory HostOrganizerCreateState.resolve({
    required int currentStep,
    required List<CatchFormStepSpec> activeSteps,
    required bool submitPending,
    required bool saveDraftPending,
    required String? mutationError,
    bool draftLoadPending = false,
    Object? draftLoadError,
    bool draftRestoreEnabled = true,
    List<OrderedPhotoPreview> organizerPhotoPreviews = const [],
    PickedOrganizerProfileImage? profileImage,
    AutovalidateMode formAutovalidateMode = AutovalidateMode.disabled,
    String name = '',
    String? selectedCity,
    String area = '',
    String description = '',
    bool isReviewing = false,
    bool hasUnsavedChanges = false,
    HostOrganizerCreateReviewState? reviewState,
  }) {
    final totalSteps = activeSteps.length;
    final clampedStep = totalSteps == 0
        ? 0
        : currentStep.clamp(0, totalSteps - 1).toInt();
    final isLastStep = totalSteps == 0 || clampedStep == totalSteps - 1;
    final isLoading = submitPending || saveDraftPending || draftLoadPending;
    final footer = HostOrganizerCreateFooterState(
      isLastStep: isLastStep,
      isLoading: isLoading,
      primaryEnabled:
          !isLoading && (!isReviewing || (reviewState?.canSubmit ?? false)),
      primaryIntent: isReviewing
          ? HostOrganizerCreatePrimaryIntent.submit
          : isLastStep
          ? HostOrganizerCreatePrimaryIntent.review
          : HostOrganizerCreatePrimaryIntent.nextStep,
      previousIntent: isReviewing
          ? HostOrganizerCreatePreviousIntent.returnToSteps
          : clampedStep > 0
          ? HostOrganizerCreatePreviousIntent.previousStep
          : null,
    );
    return HostOrganizerCreateState(
      currentStep: clampedStep,
      totalSteps: totalSteps,
      title: totalSteps == 0 ? '' : formTitleForStep(activeSteps, clampedStep),
      footer: footer,
      media: HostOrganizerCreateMediaState.resolve(
        enabled: !isLoading,
        organizerPhotoPreviews: organizerPhotoPreviews,
        profileImage: profileImage,
      ),
      fields: HostOrganizerCreateFieldDisplayState.resolve(
        selectedCityName: selectedCity,
        detailsEnabled: !isLoading,
      ),
      draftRestore: HostOrganizerCreateDraftRestoreState.resolve(
        enabled: draftRestoreEnabled,
        loadPending: draftLoadPending,
        loadError: draftLoadError,
      ),
      mutationError: mutationError,
      isReviewing: isReviewing,
      closeIntent: hasUnsavedChanges
          ? HostOrganizerCreateCloseIntent.confirmUnsavedChanges
          : HostOrganizerCreateCloseIntent.close,
    );
  }
}

class HostOrganizerSubmitOutcomeState {
  const HostOrganizerSubmitOutcomeState({required this.shouldCloseRoute});

  final bool shouldCloseRoute;

  factory HostOrganizerSubmitOutcomeState.fromTransition({
    required bool wasPending,
    required bool isSuccess,
  }) {
    return HostOrganizerSubmitOutcomeState(
      shouldCloseRoute: wasPending && isSuccess,
    );
  }
}

String? _trimmedTextOrNull(String text) {
  final trimmed = text.trim();
  return trimmed.isEmpty ? null : trimmed;
}
