import 'dart:async';

import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_draft_controller.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/widgets/organizer_basics_step.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/widgets/organizer_details_step.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/widgets/organizer_event_success_defaults_step.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/widgets/organizer_host_defaults_step.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_draft_exit_dialog.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_stepper_dock.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_wizard_step_header.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/media/ordered_photo_picker.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/platform/riverpod_ui/mutation_error_util.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

export 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_screen_state.dart';

part 'create_organizer_actions.dart';

class CreateOrganizerScreen extends ConsumerStatefulWidget {
  const CreateOrganizerScreen({
    super.key,
    this.initialDraft,
    this.initialStep = 0,
    this.restoreSavedDraft = true,
    this.formAutovalidateMode = AutovalidateMode.disabled,
    this.initialPickedOrganizerPhotos = const <PickedOrganizerPhoto>[],
    this.initialProfileImage,
  });

  final OrganizerDraft? initialDraft;
  final int initialStep;
  final bool restoreSavedDraft;
  final AutovalidateMode formAutovalidateMode;
  final List<PickedOrganizerPhoto> initialPickedOrganizerPhotos;
  final PickedOrganizerProfileImage? initialProfileImage;

  @override
  ConsumerState<CreateOrganizerScreen> createState() =>
      _CreateOrganizerScreenState();
}

sealed class HostOrganizerCreateRouteIntent {
  const HostOrganizerCreateRouteIntent();
}

final class HostOrganizerCreatePickProfileImageIntent
    extends HostOrganizerCreateRouteIntent {
  const HostOrganizerCreatePickProfileImageIntent();
}

final class HostOrganizerCreateRemoveProfileImageIntent
    extends HostOrganizerCreateRouteIntent {
  const HostOrganizerCreateRemoveProfileImageIntent();
}

final class HostOrganizerCreatePickOrganizerPhotosIntent
    extends HostOrganizerCreateRouteIntent {
  const HostOrganizerCreatePickOrganizerPhotosIntent();
}

final class HostOrganizerCreateRemoveOrganizerPhotoIntent
    extends HostOrganizerCreateRouteIntent {
  const HostOrganizerCreateRemoveOrganizerPhotoIntent(this.index);

  final int index;
}

final class HostOrganizerCreateReorderOrganizerPhotoIntent
    extends HostOrganizerCreateRouteIntent {
  const HostOrganizerCreateReorderOrganizerPhotoIntent({
    required this.fromIndex,
    required this.toIndex,
  });

  final int fromIndex;
  final int toIndex;
}

final class HostOrganizerCreateCityChangedIntent
    extends HostOrganizerCreateRouteIntent {
  const HostOrganizerCreateCityChangedIntent(this.city);

  final CityOption? city;
}

final class HostOrganizerCreateOrganizerTypeChangedIntent
    extends HostOrganizerCreateRouteIntent {
  const HostOrganizerCreateOrganizerTypeChangedIntent(this.organizerType);

  final OrganizerType organizerType;
}

final class HostOrganizerCreateDefaultsChangedIntent
    extends HostOrganizerCreateRouteIntent {
  const HostOrganizerCreateDefaultsChangedIntent(this.defaults);

  final OrganizerHostDefaults defaults;
}

typedef HostOrganizerCreateRouteIntentCallback =
    void Function(HostOrganizerCreateRouteIntent intent);

class _CreateOrganizerScreenState extends ConsumerState<CreateOrganizerScreen> {
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
  final _clubPhotos = <_OrganizerPhotoDraft>[];
  var _organizerPhotosTouched = false;
  var _nextPickedOrganizerPhotoId = 0;
  PickedOrganizerProfileImage? _profileImage;
  bool _checkedDraft = false;
  bool _restoredDraft = false;
  OrganizerHostDefaults _hostDefaults = const OrganizerHostDefaults();
  late Object _initialDraftContentSignature;
  Object? _lastSavedDraftSignature;

  List<CatchFormStepSpec> get _activeSteps {
    return [
      CatchFormStepSpec(
        title: context.l10n.hostsCreateOrganizerScreenTitleOrganizerBasics,
        formKey: _basicsFormKey,
      ),
      CatchFormStepSpec(
        title: context.l10n.hostsCreateOrganizerScreenTitleOrganizerDetails,
        formKey: _detailsFormKey,
      ),
      CatchFormStepSpec(
        title: context.l10n.hostsCreateOrganizerScreenTitleHostDefaults,
        formKey: _defaultsFormKey,
        optional: true,
      ),
      CatchFormStepSpec(
        title: context.l10n.hostsCreateOrganizerScreenTitleEventSuccessDefaults,
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
    final submitMutation = ref.watch(CreateOrganizerController.submitMutation);
    final saveDraftMutation = ref.watch(
      CreateOrganizerDraftController.saveDraftMutation,
    );
    final loadDraftMutation = ref.watch(
      CreateOrganizerDraftController.loadDraftMutation,
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
    final screenState = HostOrganizerCreateState.resolve(
      currentStep: _currentStep,
      activeSteps: activeSteps,
      submitPending: submitMutation.isPending,
      saveDraftPending: saveDraftMutation.isPending,
      draftLoadPending: loadDraftMutation.isPending,
      draftLoadError: draftLoadError,
      draftRestoreEnabled: widget.restoreSavedDraft && !_restoredDraft,
      mutationError: mutationError,
      organizerPhotoPreviews: _organizerPhotoPreviews,
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

    ref.listen(CreateOrganizerController.submitMutation, (previous, current) {
      final submitOutcome = HostOrganizerSubmitOutcomeState.fromTransition(
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
                ? HostOrganizerCreateCloseIntent.confirmUnsavedChanges
                : HostOrganizerCreateCloseIntent.close,
          ).ignore();
        }
      },
      child: CatchScaffold.stepFlow(
        backgroundColor: t.bg,
        body: Column(
          children: [
            HostWizardStepHeader(
              title: _isReviewing
                  ? context.l10n.hostsCreateOrganizerReviewTitle
                  : screenState.title,
              subtitle: screenState.subtitle,
              currentStep: screenState.currentStep,
              totalSteps: screenState.totalSteps,
              isReviewing: _isReviewing,
              onClose: screenState.requestControlsEnabled
                  ? () => _handleCloseIntent(
                      _hasUnsavedChanges
                          ? HostOrganizerCreateCloseIntent.confirmUnsavedChanges
                          : HostOrganizerCreateCloseIntent.close,
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
                            OrganizerBasicsStep(
                              formKey: _basicsFormKey,
                              autovalidateMode: autovalidateMode,
                              nameController: _nameController,
                              selectedOrganizerType: _organizerType,
                              onOrganizerTypeChanged: (organizerType) =>
                                  _handleRouteIntent(
                                    HostOrganizerCreateOrganizerTypeChangedIntent(
                                      organizerType,
                                    ),
                                  ),
                              selectedCity: screenState.fields.selectedCity,
                              onCityChanged: (city) => _handleRouteIntent(
                                HostOrganizerCreateCityChangedIntent(city),
                              ),
                              areaController: _areaController,
                              detailsEnabled: screenState.fields.detailsEnabled,
                              organizerPhotoPreviews:
                                  screenState.media.organizerPhotoPreviews,
                              existingImageUrl:
                                  screenState.media.existingCoverImageUrl,
                              profileImageBytes:
                                  screenState.media.profileImageBytes,
                              existingProfileImageUrl:
                                  screenState.media.existingProfileImageUrl,
                              onPickOrganizerPhotos: screenState.media.enabled
                                  ? () => _handleRouteIntent(
                                      const HostOrganizerCreatePickOrganizerPhotosIntent(),
                                    )
                                  : null,
                              onRemoveOrganizerPhoto: screenState.media.enabled
                                  ? (index) => _handleRouteIntent(
                                      HostOrganizerCreateRemoveOrganizerPhotoIntent(
                                        index,
                                      ),
                                    )
                                  : null,
                              onReorderOrganizerPhoto: screenState.media.enabled
                                  ? (fromIndex, toIndex) => _handleRouteIntent(
                                      HostOrganizerCreateReorderOrganizerPhotoIntent(
                                        fromIndex: fromIndex,
                                        toIndex: toIndex,
                                      ),
                                    )
                                  : null,
                              onPickProfileImage: screenState.media.enabled
                                  ? () => _handleRouteIntent(
                                      const HostOrganizerCreatePickProfileImageIntent(),
                                    )
                                  : null,
                              onRemoveProfileImage: screenState.media.enabled
                                  ? () => _handleRouteIntent(
                                      const HostOrganizerCreateRemoveProfileImageIntent(),
                                    )
                                  : null,
                            ),
                            OrganizerDetailsStep(
                              formKey: _detailsFormKey,
                              autovalidateMode: autovalidateMode,
                              descriptionController: _descriptionController,
                              instagramController: _instagramController,
                              phoneController: _phoneController,
                              emailController: _emailController,
                            ),
                            OrganizerHostDefaultsStep(
                              formKey: _defaultsFormKey,
                              defaults: _hostDefaults,
                              currencyCode: screenState.fields.currencyCode,
                              onChanged: (defaults) => _handleRouteIntent(
                                HostOrganizerCreateDefaultsChangedIntent(
                                  defaults,
                                ),
                              ),
                            ),
                            OrganizerEventSuccessDefaultsStep(
                              formKey: _eventSuccessFormKey,
                              defaults: _hostDefaults,
                              onChanged: (defaults) => _handleRouteIntent(
                                HostOrganizerCreateDefaultsChangedIntent(
                                  defaults,
                                ),
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
                              context: AppErrorContext.organizer,
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

sealed class _OrganizerPhotoDraft {
  const _OrganizerPhotoDraft();

  OrderedPhotoPreview get preview;
  OrganizerPhotoInput get input;
}

final class _PickedOrganizerPhotoDraft extends _OrganizerPhotoDraft {
  const _PickedOrganizerPhotoDraft(this.id, this.photo);

  final int id;
  final PickedOrganizerPhoto photo;

  @override
  OrderedPhotoPreview get preview =>
      OrderedPhotoPreview(id: 'picked_$id', bytes: photo.bytes);

  @override
  OrganizerPhotoInput get input => NewOrganizerPhotoInput(photo.image);
}
