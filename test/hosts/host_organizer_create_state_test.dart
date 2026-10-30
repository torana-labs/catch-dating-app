import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_screen.dart';
import 'package:catch_dating_app/platform/media/ordered_photo_picker.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const steps = <CatchFormStepSpec>[
    CatchFormStepSpec(title: 'Organizer basics'),
    CatchFormStepSpec(title: 'Organizer details'),
    CatchFormStepSpec(title: 'Host defaults', optional: true),
    CatchFormStepSpec(title: 'Live event guide', optional: true),
  ];

  test('HostOrganizerCreateState maps create wizard display state', () {
    final state = HostOrganizerCreateState.resolve(
      currentStep: 1,
      activeSteps: steps,
      submitPending: false,
      saveDraftPending: true,
      mutationError: 'Unable to save draft.',
    );

    expect(state.title, 'Organizer details');
    expect(state.subtitle, isNull);
    expect(state.currentStep, 1);
    expect(state.totalSteps, 4);
    expect(state.isLastStep, isFalse);
    expect(state.canPickMedia, isFalse);
    expect(state.requestControlsEnabled, isFalse);
    expect(state.fields.detailsEnabled, isFalse);
    expect(state.isLoading, isTrue);
    expect(state.mutationError, 'Unable to save draft.');
    expect(state.footer.primaryEnabled, isFalse);
    expect(state.footer.primaryIntent, HostOrganizerCreatePrimaryIntent.nextStep);
    expect(
      state.footer.previousIntent,
      HostOrganizerCreatePreviousIntent.previousStep,
    );
    expect(state.closeIntent, HostOrganizerCreateCloseIntent.close);
  });

  test('HostOrganizerCreateState maps draft restore retry and disable state', () {
    final error = StateError('Unable to reload draft.');
    final retry = HostOrganizerCreateState.resolve(
      currentStep: 0,
      activeSteps: steps,
      submitPending: false,
      saveDraftPending: false,
      draftLoadError: error,
      mutationError: null,
    );
    final disabled = HostOrganizerCreateState.resolve(
      currentStep: 0,
      activeSteps: steps,
      submitPending: false,
      saveDraftPending: false,
      draftLoadError: error,
      draftRestoreEnabled: false,
      mutationError: null,
    );

    expect(retry.draftRestore.error, error);
    expect(
      retry.draftRestore.retryIntent,
      HostOrganizerCreateDraftRestoreIntent.retry,
    );
    expect(disabled.draftRestore.hasError, isFalse);
  });

  test('HostOrganizerCreateState maps city and selected media', () {
    const pickedPreview = OrderedPhotoPreview(id: 'picked-1');
    final state = HostOrganizerCreateState.resolve(
      currentStep: 0,
      activeSteps: steps,
      submitPending: false,
      saveDraftPending: false,
      mutationError: null,
      selectedCity: 'in-mh-mumbai',
      organizerPhotoPreviews: const [pickedPreview],
    );

    expect(state.fields.detailsEnabled, isTrue);
    expect(state.fields.selectedCity?.label, 'Mumbai');
    expect(state.fields.currencyCode, 'INR');
    expect(state.media.organizerPhotoPreviews, const [pickedPreview]);
    expect(state.media.existingCoverImageUrl, isNull);
    expect(state.media.existingProfileImageUrl, isNull);
  });

  test('HostOrganizerCreateReviewState gates basics and details', () {
    final incomplete = HostOrganizerCreateReviewState.resolve(
      activeSteps: steps,
      name: '',
      selectedCity: null,
      area: '',
      description: '',
    );
    final complete = HostOrganizerCreateReviewState.resolve(
      activeSteps: steps,
      name: 'Saket Run Club',
      selectedCity: 'in-dl-delhi',
      area: 'Saket',
      description: 'Weekly social runs.',
    );

    expect(incomplete.canSubmit, isFalse);
    expect(incomplete.firstIncompleteStep, 0);
    expect(complete.canSubmit, isTrue);
    expect(complete.items.map((item) => item.status), [
      CatchFormStepListStatus.complete,
      CatchFormStepListStatus.complete,
      CatchFormStepListStatus.optional,
      CatchFormStepListStatus.optional,
    ]);

    final reviewState = HostOrganizerCreateState.resolve(
      currentStep: 3,
      activeSteps: steps,
      submitPending: false,
      saveDraftPending: false,
      mutationError: null,
      isReviewing: true,
      reviewState: complete,
      hasUnsavedChanges: true,
    );
    expect(
      reviewState.footer.primaryIntent,
      HostOrganizerCreatePrimaryIntent.submit,
    );
    expect(
      reviewState.footer.previousIntent,
      HostOrganizerCreatePreviousIntent.returnToSteps,
    );
    expect(reviewState.footer.primaryEnabled, isTrue);
    expect(
      reviewState.closeIntent,
      HostOrganizerCreateCloseIntent.confirmUnsavedChanges,
    );
  });

  test('HostClubCreate route intents carry typed callback payloads', () {
    const reorderIntent = HostOrganizerCreateReorderOrganizerPhotoIntent(
      fromIndex: 1,
      toIndex: 3,
    );
    final defaults = OrganizerHostDefaults(
      eventPolicy: const OrganizerHostDefaults().eventPolicy.copyWith(minAge: 24),
    );

    expect((const HostOrganizerCreateRemoveOrganizerPhotoIntent(2)).index, 2);
    expect(reorderIntent.fromIndex, 1);
    expect(reorderIntent.toIndex, 3);
    expect(HostOrganizerCreateDefaultsChangedIntent(defaults).defaults, defaults);
  });

  test('HostOrganizerCreateDraftRequest trims optional draft fields', () {
    final request = HostOrganizerCreateDraftRequest.fromForm(
      name: '  Sea Face Social  ',
      area: '   ',
      description: '  Hosted social formats. ',
      selectedCity: 'Mumbai',
      instagramHandle: '  seaface ',
      phoneNumber: '',
      email: ' host@example.com ',
      hostDefaults: const OrganizerHostDefaults(),
    );
    final draft = request.toDraft(savedAt: DateTime(2026));

    expect(draft.name, 'Sea Face Social');
    expect(draft.area, isNull);
    expect(draft.description, 'Hosted social formats.');
    expect(draft.instagramHandle, 'seaface');
    expect(draft.phoneNumber, isNull);
    expect(draft.email, 'host@example.com');
  });

  test('HostOrganizerCreateSubmitRequest trims fields and requires city', () {
    final request = HostOrganizerCreateSubmitRequest.fromForm(
      name: '  Sea Face Social  ',
      selectedCity: ' Mumbai ',
      area: ' Bandra ',
      description: '  Hosted social formats. ',
      organizerPhotoInputs: null,
      profileImage: null,
      instagramHandle: ' seaface ',
      phoneNumber: ' ',
      email: ' host@example.com ',
      hostDefaults: const OrganizerHostDefaults(),
    );

    expect(request.name, 'Sea Face Social');
    expect(request.location, 'Mumbai');
    expect(request.phoneNumber, isNull);
    expect(
      () => HostOrganizerCreateSubmitRequest.fromForm(
        name: 'Sea Face Social',
        selectedCity: ' ',
        area: 'Bandra',
        description: 'Hosted social formats.',
        organizerPhotoInputs: null,
        profileImage: null,
        instagramHandle: '',
        phoneNumber: '',
        email: '',
        hostDefaults: const OrganizerHostDefaults(),
      ),
      throwsStateError,
    );
  });

  test('HostOrganizerSubmitOutcomeState closes only after pending success', () {
    expect(
      HostOrganizerSubmitOutcomeState.fromTransition(
        wasPending: true,
        isSuccess: true,
      ).shouldCloseRoute,
      isTrue,
    );
    expect(
      HostOrganizerSubmitOutcomeState.fromTransition(
        wasPending: false,
        isSuccess: true,
      ).shouldCloseRoute,
      isFalse,
    );
  });
}
