import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_draft.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/riverpod_ui/mutation_error_util.dart';
import 'package:catch_dating_app/core/widgets/ordered_photo_picker.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/create_club_controller.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/create_club_draft_controller.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/create_club_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/club_basics_step.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/club_details_step.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/club_event_success_defaults_step.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/club_host_defaults_step.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_draft_exit_dialog.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_stepper_dock.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_wizard_step_header.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

export 'package:catch_dating_app/hosts/presentation/club_management/create/create_club_screen_state.dart';

part 'create_club_actions.dart';

class CreateClubScreen extends ConsumerStatefulWidget {
  const CreateClubScreen({
    super.key,
    this.initialDraft,
    this.initialStep = 0,
    this.restoreSavedDraft = true,
    this.formAutovalidateMode = AutovalidateMode.disabled,
    this.initialPickedClubPhotos = const <PickedClubPhoto>[],
    this.initialProfileImage,
  });

  final ClubDraft? initialDraft;
  final int initialStep;
  final bool restoreSavedDraft;
  final AutovalidateMode formAutovalidateMode;
  final List<PickedClubPhoto> initialPickedClubPhotos;
  final PickedClubProfileImage? initialProfileImage;

  @override
  ConsumerState<CreateClubScreen> createState() => _CreateClubScreenState();
}

sealed class HostClubCreateRouteIntent {
  const HostClubCreateRouteIntent();
}

final class HostClubCreatePickProfileImageIntent
    extends HostClubCreateRouteIntent {
  const HostClubCreatePickProfileImageIntent();
}

final class HostClubCreateRemoveProfileImageIntent
    extends HostClubCreateRouteIntent {
  const HostClubCreateRemoveProfileImageIntent();
}

final class HostClubCreatePickClubPhotosIntent
    extends HostClubCreateRouteIntent {
  const HostClubCreatePickClubPhotosIntent();
}

final class HostClubCreateRemoveClubPhotoIntent
    extends HostClubCreateRouteIntent {
  const HostClubCreateRemoveClubPhotoIntent(this.index);

  final int index;
}

final class HostClubCreateReorderClubPhotoIntent
    extends HostClubCreateRouteIntent {
  const HostClubCreateReorderClubPhotoIntent({
    required this.fromIndex,
    required this.toIndex,
  });

  final int fromIndex;
  final int toIndex;
}

final class HostClubCreateCityChangedIntent extends HostClubCreateRouteIntent {
  const HostClubCreateCityChangedIntent(this.city);

  final CityOption? city;
}

final class HostClubCreateOrganizerTypeChangedIntent
    extends HostClubCreateRouteIntent {
  const HostClubCreateOrganizerTypeChangedIntent(this.organizerType);

  final OrganizerType organizerType;
}

final class HostClubCreateDefaultsChangedIntent
    extends HostClubCreateRouteIntent {
  const HostClubCreateDefaultsChangedIntent(this.defaults);

  final ClubHostDefaults defaults;
}

typedef HostClubCreateRouteIntentCallback =
    void Function(HostClubCreateRouteIntent intent);

class _CreateClubScreenState extends ConsumerState<CreateClubScreen> {
  void _setLocalState(VoidCallback callback) => setState(callback);

  late final PageController _pageController;
  final _basicsFormKey = GlobalKey<FormState>();
  final _detailsFormKey = GlobalKey<FormState>();
  final _defaultsFormKey = GlobalKey<FormState>();
  final _eventSuccessFormKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _areaController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _instagramController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();

  int _currentStep = 0;
  bool _isReviewing = false;
  bool _allowRoutePop = false;
  bool _showValidationErrors = false;
  String? _selectedCity;
  OrganizerType _organizerType = OrganizerType.club;
  final _clubPhotos = <_ClubPhotoDraft>[];
  var _clubPhotosTouched = false;
  var _nextPickedClubPhotoId = 0;
  PickedClubProfileImage? _profileImage;
  bool _checkedDraft = false;
  bool _restoredDraft = false;
  ClubHostDefaults _hostDefaults = const ClubHostDefaults();
  late Object _initialDraftContentSignature;
  Object? _lastSavedDraftSignature;

  List<CatchFormStepSpec> get _activeSteps {
    return [
      CatchFormStepSpec(
        title: context.l10n.hostsCreateClubScreenTitleClubBasics,
        formKey: _basicsFormKey,
      ),
      CatchFormStepSpec(
        title: context.l10n.hostsCreateClubScreenTitleClubDetails,
        formKey: _detailsFormKey,
      ),
      CatchFormStepSpec(
        title: context.l10n.hostsCreateClubScreenTitleHostDefaults,
        formKey: _defaultsFormKey,
        optional: true,
      ),
      CatchFormStepSpec(
        title: context.l10n.hostsCreateClubScreenTitleEventSuccessDefaults,
        formKey: _eventSuccessFormKey,
        optional: true,
      ),
    ];
  }

  @override
  void initState() {
    super.initState();
    const stepCount = 4;
    _currentStep = widget.initialStep.clamp(0, stepCount - 1).toInt();
    _pageController = PageController(initialPage: _currentStep);
    _seedInitialMedia();

    final initialDraft = widget.initialDraft;
    if (initialDraft != null && !initialDraft.isEmpty) {
      _restoreFromDraft(initialDraft);
      _restoredDraft = true;
      _lastSavedDraftSignature = _currentDraftContentSignature;
    }
    _initialDraftContentSignature = _currentDraftContentSignature;

    if (initialDraft == null || initialDraft.isEmpty) {
      if (widget.restoreSavedDraft) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!_checkedDraft) {
            _checkedDraft = true;
            unawaited(_restoreSavedDraft());
          }
        });
      }
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _nameController.dispose();
    _areaController.dispose();
    _descriptionController.dispose();
    _instagramController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final activeSteps = _activeSteps;
    final submitMutation = ref.watch(CreateClubController.submitMutation);
    final saveDraftMutation = ref.watch(
      CreateClubDraftController.saveDraftMutation,
    );
    final loadDraftMutation = ref.watch(
      CreateClubDraftController.loadDraftMutation,
    );
    final mutationError = submitMutation.hasError
        ? mutationErrorMessage(submitMutation, l10n: context.l10n)
        : saveDraftMutation.hasError
        ? mutationErrorMessage(saveDraftMutation, l10n: context.l10n)
        : null;
    final draftLoadError = loadDraftMutation.hasError
        ? (loadDraftMutation as MutationError).error
        : null;
    final reviewState = _reviewState;
    final screenState = HostClubCreateState.resolve(
      currentStep: _currentStep,
      activeSteps: activeSteps,
      submitPending: submitMutation.isPending,
      saveDraftPending: saveDraftMutation.isPending,
      draftLoadPending: loadDraftMutation.isPending,
      draftLoadError: draftLoadError,
      draftRestoreEnabled: widget.restoreSavedDraft && !_restoredDraft,
      mutationError: mutationError,
      clubPhotoPreviews: _clubPhotoPreviews,
      profileImage: _profileImage,
      formAutovalidateMode: widget.formAutovalidateMode,
      name: _nameController.text,
      selectedCity: _selectedCity,
      area: _areaController.text,
      description: _descriptionController.text,
      isReviewing: _isReviewing,
      hasUnsavedChanges: _hasUnsavedChanges,
      reviewState: reviewState,
    );

    ref.listen(CreateClubController.submitMutation, (previous, current) {
      final submitOutcome = HostClubSubmitOutcomeState.fromTransition(
        wasPending: previous?.isPending == true,
        isSuccess: current.isSuccess,
      );
      if (submitOutcome.shouldCloseRoute) {
        _completeClose();
      }
    });

    final autovalidateMode = _showValidationErrors
        ? AutovalidateMode.onUserInteraction
        : widget.formAutovalidateMode;

    return PopScope(
      canPop: _allowRoutePop,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _handleCloseIntent(
            _hasUnsavedChanges
                ? HostClubCreateCloseIntent.confirmUnsavedChanges
                : HostClubCreateCloseIntent.close,
          ).ignore();
        }
      },
      child: CatchScaffold.stepFlow(
        backgroundColor: t.bg,
        body: Column(
          children: [
            HostWizardStepHeader(
              title: _isReviewing
                  ? context.l10n.hostsCreateClubReviewTitle
                  : screenState.title,
              subtitle: screenState.subtitle,
              currentStep: screenState.currentStep,
              totalSteps: screenState.totalSteps,
              isReviewing: _isReviewing,
              onClose: screenState.requestControlsEnabled
                  ? () => _handleCloseIntent(
                      _hasUnsavedChanges
                          ? HostClubCreateCloseIntent.confirmUnsavedChanges
                          : HostClubCreateCloseIntent.close,
                    ).ignore()
                  : null,
              onStepOverview: screenState.requestControlsEnabled
                  ? _showStepOverview
                  : null,
            ),
            gapH4,
            Expanded(
              child: HostStepperDock(
                body: IgnorePointer(
                  ignoring: !screenState.requestControlsEnabled,
                  child: _isReviewing
                      ? CatchFormReviewPageBody(
                          fieldCopy: catchFieldCopy(context.l10n),
                          statusLabelBuilder: catchFormStepStatusLabelBuilder(
                            context.l10n,
                          ),
                          message: context.l10n.hostsWizardReviewBody,
                          items: reviewState.items,
                          onStepSelected: _showStep,
                        )
                      : PageView(
                          controller: _pageController,
                          physics: const NeverScrollableScrollPhysics(),
                          children: [
                            ClubBasicsStep(
                              formKey: _basicsFormKey,
                              autovalidateMode: autovalidateMode,
                              nameController: _nameController,
                              selectedOrganizerType: _organizerType,
                              onOrganizerTypeChanged: (organizerType) =>
                                  _handleRouteIntent(
                                    HostClubCreateOrganizerTypeChangedIntent(
                                      organizerType,
                                    ),
                                  ),
                              selectedCity: screenState.fields.selectedCity,
                              onCityChanged: (city) => _handleRouteIntent(
                                HostClubCreateCityChangedIntent(city),
                              ),
                              areaController: _areaController,
                              detailsEnabled: screenState.fields.detailsEnabled,
                              clubPhotoPreviews:
                                  screenState.media.clubPhotoPreviews,
                              existingImageUrl:
                                  screenState.media.existingCoverImageUrl,
                              profileImageBytes:
                                  screenState.media.profileImageBytes,
                              existingProfileImageUrl:
                                  screenState.media.existingProfileImageUrl,
                              onPickClubPhotos: screenState.media.enabled
                                  ? () => _handleRouteIntent(
                                      const HostClubCreatePickClubPhotosIntent(),
                                    )
                                  : null,
                              onRemoveClubPhoto: screenState.media.enabled
                                  ? (index) => _handleRouteIntent(
                                      HostClubCreateRemoveClubPhotoIntent(
                                        index,
                                      ),
                                    )
                                  : null,
                              onReorderClubPhoto: screenState.media.enabled
                                  ? (fromIndex, toIndex) => _handleRouteIntent(
                                      HostClubCreateReorderClubPhotoIntent(
                                        fromIndex: fromIndex,
                                        toIndex: toIndex,
                                      ),
                                    )
                                  : null,
                              onPickProfileImage: screenState.media.enabled
                                  ? () => _handleRouteIntent(
                                      const HostClubCreatePickProfileImageIntent(),
                                    )
                                  : null,
                              onRemoveProfileImage: screenState.media.enabled
                                  ? () => _handleRouteIntent(
                                      const HostClubCreateRemoveProfileImageIntent(),
                                    )
                                  : null,
                            ),
                            ClubDetailsStep(
                              formKey: _detailsFormKey,
                              autovalidateMode: autovalidateMode,
                              descriptionController: _descriptionController,
                              instagramController: _instagramController,
                              phoneController: _phoneController,
                              emailController: _emailController,
                            ),
                            ClubHostDefaultsStep(
                              formKey: _defaultsFormKey,
                              defaults: _hostDefaults,
                              currencyCode: screenState.fields.currencyCode,
                              onChanged: (defaults) => _handleRouteIntent(
                                HostClubCreateDefaultsChangedIntent(defaults),
                              ),
                            ),
                            ClubEventSuccessDefaultsStep(
                              formKey: _eventSuccessFormKey,
                              defaults: _hostDefaults,
                              onChanged: (defaults) => _handleRouteIntent(
                                HostClubCreateDefaultsChangedIntent(defaults),
                              ),
                            ),
                          ],
                        ),
                ),
                notice:
                    screenState.mutationError == null &&
                        !screenState.draftRestore.hasError
                    ? null
                    : Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (screenState.mutationError != null)
                            CatchBanner.error(
                              message: screenState.mutationError!,
                            ),
                          if (screenState.draftRestore.hasError)
                            CatchLocalizedErrorBanner(
                              screenState.draftRestore.error!,
                              context: AppErrorContext.club,
                              onRetry:
                                  screenState.draftRestore.retryIntent ==
                                          null ||
                                      screenState.draftRestore.isLoading
                                  ? null
                                  : () => unawaited(
                                      _handleDraftRestoreIntent(
                                        screenState.draftRestore.retryIntent!,
                                      ),
                                    ),
                            ),
                        ],
                      ),
                isLastStep:
                    screenState.footer.isLastStep || screenState.isReviewing,
                isLoading: screenState.footer.isLoading,
                primaryEnabled: screenState.footer.primaryEnabled,
                primaryLabel: _primaryLabel(screenState.footer.primaryIntent),
                onPrimary: () =>
                    _handlePrimaryIntent(screenState.footer.primaryIntent),
                onPrevious: screenState.footer.previousIntent == null
                    ? null
                    : () => _handlePreviousIntent(
                        screenState.footer.previousIntent!,
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

sealed class _ClubPhotoDraft {
  const _ClubPhotoDraft();

  OrderedPhotoPreview get preview;
  ClubPhotoInput get input;
}

final class _PickedClubPhotoDraft extends _ClubPhotoDraft {
  const _PickedClubPhotoDraft(this.id, this.photo);

  final int id;
  final PickedClubPhoto photo;

  @override
  OrderedPhotoPreview get preview =>
      OrderedPhotoPreview(id: 'picked_$id', bytes: photo.bytes);

  @override
  ClubPhotoInput get input => NewClubPhotoInput(photo.image);
}
