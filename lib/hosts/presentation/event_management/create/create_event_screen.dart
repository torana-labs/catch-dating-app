import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy_defaults.dart';
import 'package:catch_dating_app/contexts/events/domain/event_public_details.dart';
import 'package:catch_dating_app/contexts/events/domain/organizer_event_venue.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/events/events.dart'
    show LocationPickerResult, LocationPickerScreen;
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_sheet.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_restore_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_snapshot.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_location_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_photo_draft_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_prefill.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_schedule_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_success_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_wizard_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/create_event_adaptive_workspace.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/create_event_guests_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_details_step.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_policy_step.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_success_step.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/when_step.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/where_step.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_draft_exit_dialog.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_roster_import_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_stepper_dock.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_wizard_step_header.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/business_rules.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/kernel/country_markets.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/media/ordered_photo_picker.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/platform/riverpod_ui/mutation_error_util.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

part 'create_event_actions.dart';
part 'create_event_draft_actions.dart';

DateTime _systemNow() => DateTime.now();

Future<HostDraftExitDecision?> showCreateEventUnsavedChangesDialog(
  BuildContext context,
) => showHostDraftExitDialog(context);

class CreateEventScreen extends ConsumerStatefulWidget {
  const CreateEventScreen({
    super.key,
    required this.organizer,
    this.loadMapTiles = true,
    this.now = _systemNow,
    this.initialDraft,
    this.initialPrefill,
    this.promptForDraftsOnStart = true,
    this.initialStep = 0,
    this.formAutovalidateMode = AutovalidateMode.disabled,
    this.initialPickedEventPhotos = const <PickedEventPhoto>[],
    this.externalBookingMode = false,
    this.initialRosterImportPlan,
  }) : assert(
         initialDraft == null || initialPrefill == null,
         'A create flow cannot restore a draft and apply a repeat prefill.',
       );

  final Organizer organizer;
  final EventDraft? initialDraft;
  final CreateEventPrefill? initialPrefill;
  final bool promptForDraftsOnStart;
  final int initialStep;
  final AutovalidateMode formAutovalidateMode;
  final List<PickedEventPhoto> initialPickedEventPhotos;
  final bool externalBookingMode;
  final HostRosterImportPlan? initialRosterImportPlan;

  /// Tests can disable network tiles while still exercising map callbacks.
  final bool loadMapTiles;

  /// Current time source, injectable so same-day time validation is testable.
  final DateTime Function() now;

  @override
  ConsumerState<CreateEventScreen> createState() => _CreateEventScreenState();
}

class _CreateEventScreenState extends ConsumerState<CreateEventScreen> {
  void _setLocalState(VoidCallback callback) => setState(callback);

  late final PageController _pageController;
  int _currentStep = 0;
  bool _isReviewing = false;
  late bool _externalBookingMode;
  bool _allowRoutePop = false;
  bool _showValidationErrors = false;
  bool _sessionReplaced = false;
  HostRosterImportPlan? _pendingRosterImport;
  EventAttendeeImportResult? _rosterImportResult;
  bool _rosterImportFailed = false;
  String? _rosterFileName;
  String? _rosterFileFingerprint;
  int? _rosterReadyCount;

  // Draft support
  String? _activeDraftId;
  Object? _lastSavedDraftSignature;
  late Object _initialDraftContentSignature;
  bool _checkedDrafts = false;

  final _eventDetailsFormKey = GlobalKey<FormState>();
  final _whenFormKey = GlobalKey<FormState>();
  final _eventPolicyFormKey = GlobalKey<FormState>();

  List<CatchFormStepSpec> get _stepSpecs => createEventWizardStepSpecs(
    l10n: context.l10n,
    externalBookingMode: _externalBookingMode,
    eventDetailsFormKey: _eventDetailsFormKey,
    scheduleFormKey: _whenFormKey,
    eventPolicyFormKey: _eventPolicyFormKey,
  );

  // Step 2 — When
  final _dateController = TextEditingController();
  final _startTimeController = TextEditingController();
  DateTime? _selectedDate;
  TimeOfDay? _selectedStartTime;
  int _durationMinutes = BusinessRules.eventDefaultDurationMinutes;
  String? _scheduleErrorText;

  // Step 1 — Where
  final _meetingPointController = TextEditingController();
  final _locationDetailsController = TextEditingController();
  CreateEventLocationState _locationState = const CreateEventLocationState();

  // Step 0 — Event details
  final _nameController = TextEditingController();
  final _distanceController = TextEditingController();
  final _capacityController = TextEditingController();
  final _priceController = TextEditingController();
  final _customActivityLabelController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _accessibilityController = TextEditingController();
  final _includedController = TextEditingController();
  final _externalEventUrlController = TextEditingController();
  final _externalEventIdController = TextEditingController();
  ExternalBookingProvider _externalBookingProvider =
      ExternalBookingProvider.generic;
  EventRuntimeWalkInPolicy _runtimeWalkInPolicy =
      EventRuntimeWalkInPolicy.hostApproval;
  ActivityKind _selectedActivityKind = ActivityKind.socialRun;
  EventInteractionModel _selectedInteractionModel =
      ActivityKind.socialRun.defaultInteractionModel;
  PaceLevel? _selectedPace;
  RouteEventPlan? _routePlan = RouteEventPlan.socialRun;
  List<EventItineraryItem> _itinerary = const [];
  var _eventPhotos = const CreateEventPhotoDraftState.empty();

  // Step 3 — Rules
  final _minAgeController = TextEditingController();
  final _maxAgeController = TextEditingController();
  final _maxMenController = TextEditingController();
  final _maxWomenController = TextEditingController();
  final _inviteCodeController = TextEditingController();
  final _dynamicPricingStepController = TextEditingController();
  final _dynamicPricingMaxController = TextEditingController();
  final _crossPathsPairCapacityController = TextEditingController(text: '2');
  CreateEventPolicyState _policyState = const CreateEventPolicyState();
  EventSuccessDefaults _eventSuccessDefaults = const EventSuccessDefaults();

  String get _eventCurrencyCode =>
      currencyCodeForCityName(widget.organizer.location);

  CreateEventScheduleState get _scheduleState => CreateEventScheduleState(
    selectedDate: _selectedDate,
    selectedStartTime: _selectedStartTime,
    durationMinutes: _durationMinutes,
  );

  DateTime? get _selectedStartDateTime => _scheduleState.selectedStartDateTime;

  EventConstraints get _constraints => EventConstraints(
    minAge: _eventPolicyDefaults.minAge,
    maxAge: _eventPolicyDefaults.maxAge,
    maxMen: _eventPolicyDefaults.toConstraints().maxMen,
    maxWomen: _eventPolicyDefaults.toConstraints().maxWomen,
  );

  EventPolicyDefaults get _eventPolicyDefaults =>
      (_externalBookingMode ? const CreateEventPolicyState() : _policyState)
          .defaultsFromFields(
            minAge: _minAgeController.text,
            maxAge: _maxAgeController.text,
            maxMen: _externalBookingMode ? '' : _maxMenController.text,
            maxWomen: _externalBookingMode ? '' : _maxWomenController.text,
            dynamicPricingStep: _dynamicPricingStepController.text,
            dynamicPricingMax: _dynamicPricingMaxController.text,
            currencyCode: _eventCurrencyCode,
          );

  EventPolicyBundle get _eventPolicy {
    if (_externalBookingMode) {
      return EventPolicyBundle.openEvent(
        capacityLimit: int.parse(_capacityController.text.trim()),
        basePriceInPaise: 0,
      );
    }
    return _policyState.eventPolicyFromFields(
      capacity: _capacityController.text,
      basePrice: _externalBookingMode ? '0' : _priceController.text,
      inviteCode: _inviteCodeController.text,
      minAge: _minAgeController.text,
      maxAge: _maxAgeController.text,
      maxMen: _maxMenController.text,
      maxWomen: _maxWomenController.text,
      dynamicPricingStep: _dynamicPricingStepController.text,
      dynamicPricingMax: _dynamicPricingMaxController.text,
      currencyCode: _eventCurrencyCode,
      crossPathsPairCapacity: _crossPathsPairCapacityController.text,
    );
  }

  int get _eventSuccessTargetAttendeeCount {
    final parsed = int.tryParse(_capacityController.text.trim());
    if (parsed == null || parsed < 1) return 20;
    return parsed;
  }

  VoidCallback? get _decreaseDurationCallback =>
      _scheduleState.canDecreaseDuration
      ? () => setState(
          () => _durationMinutes = _scheduleState
              .decreaseDuration()
              .durationMinutes,
        )
      : null;

  VoidCallback? get _increaseDurationCallback =>
      _scheduleState.canIncreaseDuration
      ? () => setState(
          () => _durationMinutes = _scheduleState
              .increaseDuration()
              .durationMinutes,
        )
      : null;

  @override
  void initState() {
    super.initState();
    _externalBookingMode =
        widget.initialDraft?.externalBookingMode ??
        widget.initialPrefill?.values.externalBookingMode ??
        (widget.externalBookingMode || widget.initialRosterImportPlan != null);
    _currentStep = widget.initialStep
        .clamp(0, CreateEventWizardStep.values.length - 1)
        .toInt();
    _pageController = PageController(initialPage: _currentStep);
    _applyOrganizerDefaults(widget.organizer.hostDefaults);
    final initialRosterImportPlan = widget.initialRosterImportPlan;
    if (initialRosterImportPlan != null) {
      _setRosterPlan(initialRosterImportPlan);
    } else if (_externalBookingMode) {
      _priceController.text = '0';
    }
    if (_externalBookingMode && !_eventSuccessDefaults.enabled) {
      _eventSuccessDefaults = _eventSuccessDefaults.copyWith(enabled: true);
    }
    final initialDraft = widget.initialDraft;
    if (initialDraft != null) {
      _activeDraftId = initialDraft.id;
      _applyDraftValues(initialDraft);
      _lastSavedDraftSignature = _currentDraftContentSignature;
      // A draft selected by the calling surface is already the user's choice;
      // do not reload the same collection and show the picker again.
      _checkedDrafts = true;
    }
    if (!widget.promptForDraftsOnStart) _checkedDrafts = true;
    final initialPrefill = widget.initialPrefill;
    if (initialPrefill != null) {
      _applyDraftValues(initialPrefill.values);
      // A repeat template is not a persisted draft. Do not replace it with the
      // saved-draft picker or assign it a local draft lifecycle.
      _checkedDrafts = true;
    }
    if (widget.initialPickedEventPhotos.isNotEmpty) {
      _eventPhotos = CreateEventPhotoDraftState.fromPicked(
        widget.initialPickedEventPhotos,
      );
    }
    _initialDraftContentSignature = _currentDraftContentSignature;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _restorePhotoRecovery();
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _dateController.dispose();
    _startTimeController.dispose();
    _meetingPointController.dispose();
    _locationDetailsController.dispose();
    _nameController.dispose();
    _distanceController.dispose();
    _capacityController.dispose();
    _priceController.dispose();
    _customActivityLabelController.dispose();
    _descriptionController.dispose();
    _accessibilityController.dispose();
    _includedController.dispose();
    _externalEventUrlController.dispose();
    _externalEventIdController.dispose();
    _minAgeController.dispose();
    _maxAgeController.dispose();
    _maxMenController.dispose();
    _maxWomenController.dispose();
    _inviteCodeController.dispose();
    _dynamicPricingStepController.dispose();
    _dynamicPricingMaxController.dispose();
    _crossPathsPairCapacityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final recovery = ref.watch(
      createEventPhotoRecoveryControllerProvider(widget.organizer.id),
    );
    ref.listen(authenticatedSessionProvider, (previous, next) {
      final before = previous?.asData?.value;
      final after = next.asData?.value;
      if (before != null && !identical(before, after)) {
        _setLocalState(() => _sessionReplaced = true);
      } else if (after != null && !_sessionReplaced) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _restorePhotoRecovery();
        });
      }
    });
    if (_sessionReplaced) {
      return CatchScaffold.stepFlow(
        body: CatchErrorState(
          title:
              context.l10n.hostsHostCreateEventScreenTitleEventSetupUnavailable,
          message: context.l10n.hostsEventPhotoRecoverySession,
          actions: [
            CatchButton(
              label: context
                  .l10n
                  .hostsCreateEventSuccessScreenLabelBackToOrganizer,
              onPressed: () => Navigator.of(context).maybePop(),
            ),
          ],
        ),
      );
    }
    if (recovery.restored is! AsyncData<void>) {
      return CatchScaffold.stepFlow(
        body: CatchAsyncBoundary<void>(
          value: recovery.restored,
          onRetry: _restorePhotoRecovery,
          errorContext: AppErrorContext.event,
          builder: (context, _) => const SizedBox.shrink(),
        ),
      );
    }
    final submitMutation = ref.watch(CreateEventController.submitMutation);
    final saveDraftMutation = ref.watch(
      CreateEventDraftController.saveDraftMutation,
    );
    final mutationError = submitMutation.hasError
        ? mutationErrorMessage(
            submitMutation,
            l10n: context.l10n,
            context: AppErrorContext.event,
          )
        : saveDraftMutation.hasError
        ? mutationErrorMessage(
            saveDraftMutation,
            l10n: context.l10n,
            context: AppErrorContext.event,
          )
        : null;
    final reviewState = _reviewState;
    final wizardState = CreateEventWizardState.resolve(
      organizer: widget.organizer,
      activeSteps: _stepSpecs,
      currentStep: _currentStep,
      submitPending: submitMutation.isPending,
      saveDraftPending: saveDraftMutation.isPending,
      mutationError: mutationError,
      createdEvent: recovery.event,
      inviteCode: _externalBookingMode
          ? null
          : _trimmedTextOrNull(_inviteCodeController),
      hasUnsavedChanges: _hasUnsavedChanges,
      isReviewing: _isReviewing,
      reviewState: reviewState,
    );

    final successNavigation = wizardState.successNavigation;
    if (successNavigation != null) {
      return PopScope(
        canPop:
            recovery.isDurable || !recovery.hasPhotoRecovery || _allowRoutePop,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) {
            _handleSuccessNavigationIntent(
              CreateEventSuccessNavigationIntent.backToOrganizer,
              successNavigation,
            ).ignore();
          }
        },
        child: CreateEventSuccessScreen(
          organizer: successNavigation.organizer,
          event: successNavigation.event,
          inviteCode: successNavigation.inviteCode,
          onManageEvent: () => _handleSuccessNavigationIntent(
            CreateEventSuccessNavigationIntent.manageEvent,
            successNavigation,
          ).ignore(),
          onDone: () => _handleSuccessNavigationIntent(
            CreateEventSuccessNavigationIntent.backToOrganizer,
            successNavigation,
          ).ignore(),
          rosterImportResult: _rosterImportResult,
          rosterImportFailed: _rosterImportFailed,
          photoRecovery: recovery,
          onRetryPhotos: () => ref
              .read(
                createEventPhotoRecoveryControllerProvider(
                  widget.organizer.id,
                ).notifier,
              )
              .retryPhotos()
              .ignore(),
          onReselectPhotos: () => ref
              .read(
                createEventPhotoRecoveryControllerProvider(
                  widget.organizer.id,
                ).notifier,
              )
              .retryPhotos(reselect: true)
              .ignore(),
        ),
      );
    }

    final autovalidateMode = _showValidationErrors
        ? AutovalidateMode.onUserInteraction
        : widget.formAutovalidateMode;

    return PopScope(
      canPop: _allowRoutePop,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _handleCloseIntent(
            _hasUnsavedChanges
                ? CreateEventWizardCloseIntent.confirmUnsavedChanges
                : CreateEventWizardCloseIntent.close,
          ).ignore();
        }
      },
      child: CatchScaffold.stepFlow(
        backgroundColor: t.bg,
        body: CreateEventAdaptiveWorkspace(
          header: HostWizardStepHeader(
            title: _isReviewing
                ? context.l10n.hostsCreateEventReviewTitle
                : wizardState.title,
            subtitle: wizardState.organizer.name,
            currentStep: wizardState.currentStep,
            totalSteps: wizardState.totalSteps,
            isReviewing: _isReviewing,
            onClose: wizardState.isLoading
                ? null
                : () => _handleCloseIntent(
                    _hasUnsavedChanges
                        ? CreateEventWizardCloseIntent.confirmUnsavedChanges
                        : CreateEventWizardCloseIntent.close,
                  ).ignore(),
            onStepOverview: wizardState.isLoading ? null : _showStepOverview,
          ),
          body: HostStepperDock(
            expandSoloPrimary: true,
            body: _isReviewing
                ? CatchFormReviewPageBody(
                    fieldCopy: catchFieldCopy(context.l10n),
                    statusLabelBuilder: catchFormStepStatusLabelBuilder(
                      context.l10n,
                    ),
                    message: context.l10n.hostsWizardReviewBody,
                    items: reviewState.items,
                    summaryItems: _reviewSummaryItems,
                    onStepSelected: _showStep,
                  )
                : PageView(
                    controller: _pageController,
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      EventDetailsStep(
                        formKey: _eventDetailsFormKey,
                        autovalidateMode: autovalidateMode,
                        photoPreviews: _eventPhotoPreviews,
                        onPickPhotos: _pickEventPhotos,
                        onRemovePhoto: _removeEventPhoto,
                        onReorderPhoto: _reorderEventPhoto,
                        organizerName: widget.organizer.name,
                        organizerLogoUrl: widget.organizer.profileImageUrl,
                        nameController: _nameController,
                        distanceController: _distanceController,
                        customActivityLabelController:
                            _customActivityLabelController,
                        descriptionController: _descriptionController,
                        accessibilityController: _accessibilityController,
                        includedController: _includedController,
                        selectedActivityKind: _selectedActivityKind,
                        onActivityKindChanged: (activityKind) => setState(() {
                          _selectedActivityKind = activityKind;
                          _selectedInteractionModel =
                              activityKind.defaultInteractionModel;
                          _routePlan = RouteEventPlan.defaultForActivity(
                            activityKind,
                          );
                          _itinerary = _itinerary
                              .map(
                                (item) =>
                                    item.copyWith(routeDistanceMeters: null),
                              )
                              .toList();
                          if (!activityKind.isDistanceBased) {
                            _selectedPace = null;
                          }
                          _eventSuccessDefaults = widget.organizer.hostDefaults
                              .eventSuccessForFormat(
                                _selectedEventFormat,
                                targetAttendeeCount:
                                    _eventSuccessTargetAttendeeCount,
                              );
                        }),
                        selectedInteractionModel: _selectedInteractionModel,
                        onInteractionModelChanged: (model) => setState(() {
                          _selectedInteractionModel = model;
                          _eventSuccessDefaults = widget.organizer.hostDefaults
                              .eventSuccessForFormat(
                                _selectedEventFormat,
                                targetAttendeeCount:
                                    _eventSuccessTargetAttendeeCount,
                              );
                        }),
                        selectedPace: _selectedPace,
                        onPaceChanged: (p) => setState(() => _selectedPace = p),
                        routePlan: _routePlan,
                        onRoutePlanChanged: (plan) => setState(() {
                          _routePlan = plan;
                          if ((plan?.path.length ?? 0) < 2) {
                            _itinerary = _itinerary
                                .map(
                                  (item) =>
                                      item.copyWith(routeDistanceMeters: null),
                                )
                                .toList();
                          }
                        }),
                        itinerary: _itinerary,
                        onItineraryChanged: (items) =>
                            setState(() => _itinerary = items),
                        defaultItineraryLocation: _currentMeetingLocation,
                        onPickItineraryLocation: _pickItineraryLocation,
                        routeInitialCenter:
                            _locationState.startingPoint ??
                            _locationState.initialCenter(
                              ref.read(deviceLocationProvider).asData?.value,
                            ) ??
                            LocationCoordinate(
                              defaultCityDataForMarket().latitude,
                              defaultCityDataForMarket().longitude,
                            ),
                        loadMapTiles: widget.loadMapTiles,
                      ),
                      Form(
                        key: _whenFormKey,
                        autovalidateMode: autovalidateMode,
                        child: SingleChildScrollView(
                          padding: CatchInsets.formStepBodyWithBottomActions,
                          child: CatchSectionList(
                            emptyStateOmitted: true,
                            children: [
                              WhenStep(
                                formKey: _whenFormKey,
                                embedded: true,
                                autovalidateMode: autovalidateMode,
                                dateController: _dateController,
                                startTimeController: _startTimeController,
                                durationMinutes: _durationMinutes,
                                onPickDate: _pickDate,
                                onPickTime: _pickStartTime,
                                onDecreaseDuration: _decreaseDurationCallback,
                                onIncreaseDuration: _increaseDurationCallback,
                                formatDuration: EventFormatters.durationMinutes,
                                scheduleErrorText: _scheduleErrorText,
                              ),
                              WhereStep(
                                formKey: _whenFormKey,
                                embedded: true,
                                organizerId: widget.organizer.id,
                                autovalidateMode: autovalidateMode,
                                meetingPointController: _meetingPointController,
                                locationDetailsController:
                                    _locationDetailsController,
                                startingPoint: _locationState.startingPoint,
                                onMeetingPointChanged: (_) => setState(() {}),
                                onPickLocation: _pickLocation,
                                onLocationDetailsChanged: (_) =>
                                    setState(() {}),
                                currentMeetingLocation: _currentMeetingLocation,
                                selectedVenueId: _locationState.sourceVenueId,
                                onVenueSelected: _selectVenue,
                                currentCapacity: int.tryParse(
                                  _capacityController.text.trim(),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      Form(
                        key: _eventPolicyFormKey,
                        autovalidateMode: autovalidateMode,
                        child: SingleChildScrollView(
                          padding: CatchInsets.formStepBodyWithBottomActions,
                          child: CatchSectionList(
                            emptyStateOmitted: true,
                            children: [
                              EventPolicyStep(
                                embedded: true,
                                formKey: _eventPolicyFormKey,
                                autovalidateMode: autovalidateMode,
                                capacityController: _capacityController,
                                onCapacityChanged: (_) => setState(() {}),
                                priceController: _priceController,
                                currencyCode: _eventCurrencyCode,
                                inviteCodeController: _inviteCodeController,
                                dynamicPricingStepController:
                                    _dynamicPricingStepController,
                                dynamicPricingMaxController:
                                    _dynamicPricingMaxController,
                                minAgeController: _minAgeController,
                                maxAgeController: _maxAgeController,
                                maxMenController: _maxMenController,
                                maxWomenController: _maxWomenController,
                                crossPathsPairCapacityController:
                                    _crossPathsPairCapacityController,
                                admissionPreset: _policyState.admissionPreset,
                                onAdmissionPresetChanged: (preset) =>
                                    setState(() {
                                      _policyState = _policyState
                                          .selectAdmissionPreset(preset);
                                    }),
                                cohortCapsEnabled:
                                    _policyState.cohortCapsEnabled,
                                onCohortCapsEnabledChanged: (enabled) =>
                                    setState(() {
                                      _policyState = _policyState
                                          .setCohortCapsEnabled(enabled);
                                    }),
                                dynamicPricingEnabled:
                                    _policyState.dynamicPricingEnabled,
                                onDynamicPricingChanged: (enabled) =>
                                    setState(() {
                                      _policyState = _policyState
                                          .setDynamicPricingEnabled(enabled);
                                    }),
                                crossPathsPairInventoryEnabled:
                                    _policyState.crossPathsPairInventoryEnabled,
                                onCrossPathsPairInventoryChanged: (enabled) =>
                                    setState(
                                      () => _policyState = _policyState
                                          .setCrossPathsPairInventoryEnabled(
                                            enabled,
                                          ),
                                    ),
                                cancellationPolicyId:
                                    _policyState.cancellationPolicyId,
                                onCancellationPolicyChanged: (policyId) =>
                                    setState(
                                      () => _policyState = _policyState
                                          .setCancellationPolicy(policyId),
                                    ),
                                externalBookingMode: _externalBookingMode,
                                minimumCapacity:
                                    _pendingRosterImport?.readyCount,
                              ),
                              if (_externalBookingMode)
                                CreateEventGuestsSection(
                                  autovalidateMode: autovalidateMode,
                                  externalBookingProvider:
                                      _externalBookingProvider,
                                  externalEventUrlController:
                                      _externalEventUrlController,
                                  externalEventIdController:
                                      _externalEventIdController,
                                  runtimeWalkInPolicy: _runtimeWalkInPolicy,
                                  onExternalBookingProviderChanged:
                                      (provider) => setState(
                                        () =>
                                            _externalBookingProvider = provider,
                                      ),
                                  onRuntimeWalkInPolicyChanged: (policy) =>
                                      setState(
                                        () => _runtimeWalkInPolicy = policy,
                                      ),
                                  rosterFileName: _rosterFileName,
                                  rosterReadyCount: _rosterReadyCount,
                                  rosterNeedsReviewCount:
                                      _pendingRosterImport?.needsReviewCount ??
                                      0,
                                  rosterExcludedCount:
                                      _pendingRosterImport?.excludedCount ?? 0,
                                  rosterAttached: _pendingRosterImport != null,
                                  onPickRoster: _pickRoster,
                                ),
                              EventSuccessStep(
                                embedded: true,
                                requiredForRuntime: _externalBookingMode,
                                organizerId: widget.organizer.id,
                                activityKind: _selectedActivityKind,
                                eventFormat: _selectedEventFormat,
                                eventSuccessDefaults: _externalBookingMode
                                    ? _eventSuccessDefaults.copyWith(
                                        enabled: true,
                                      )
                                    : _eventSuccessDefaults,
                                targetAttendeeCount:
                                    _eventSuccessTargetAttendeeCount,
                                onEventSuccessDefaultsChanged: (defaults) =>
                                    setState(
                                      () => _eventSuccessDefaults = defaults,
                                    ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
            notice: wizardState.mutationError == null
                ? null
                : CatchBanner.error(message: wizardState.mutationError!),
            isLastStep: wizardState.isLastStep || _isReviewing,
            isLoading: wizardState.isLoading,
            primaryEnabled: wizardState.primaryEnabled,
            primaryLabel: _primaryLabel(wizardState.primaryIntent),
            onPrimary: () => _handlePrimaryIntent(wizardState.primaryIntent),
            onPrevious: wizardState.previousIntent == null
                ? null
                : () => _handlePreviousIntent(wizardState.previousIntent!),
          ),
          steps: reviewState.items,
          currentStep: wizardState.currentStep,
          onStepSelected: _showStep,
          summaryTitle: context.l10n.hostsCreateEventReviewTitle,
          summaryItems: _reviewSummaryItems,
        ),
      ),
    );
  }
}
