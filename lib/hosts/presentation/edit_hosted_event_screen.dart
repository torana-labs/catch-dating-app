import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/events/domain/event_public_details.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/events/events.dart'
    show LocationPickerResult, LocationPickerScreen;
import 'package:catch_dating_app/hosts/presentation/edit_hosted_event_scope_notice.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_guest_details_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_itinerary_editor.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/route_event_plan_editor.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_edit_save_request.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_edit_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_edit_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/hosted_event_membership_rules_section.dart';
import 'package:catch_dating_app/hosts/presentation/hosted_event_policy_section.dart';
import 'package:catch_dating_app/hosts/presentation/hosted_event_schedule_section.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/business_rules.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

export 'package:catch_dating_app/hosts/presentation/edit_hosted_event_scope_notice.dart';
export 'package:catch_dating_app/hosts/presentation/host_event_edit_save_request.dart';
export 'package:catch_dating_app/hosts/presentation/hosted_event_policy_section.dart';
export 'package:catch_dating_app/hosts/presentation/hosted_event_schedule_section.dart';

part 'edit_hosted_event_actions.dart';
part 'edit_hosted_event_route_screen.dart';

abstract final class EditHostedEventKeys {
  static const saveButton = ValueKey('edit-hosted-event-save-button');
  static const scrollView = ValueKey('edit-hosted-event-scroll-view');
}

class EditHostedEventScreen extends ConsumerStatefulWidget {
  const EditHostedEventScreen({
    super.key,
    required this.club,
    required this.event,
    this.now,
    this.loadMapTiles = true,
    this.formAutovalidateMode = AutovalidateMode.disabled,
  });

  final Club club;
  final Event event;
  final DateTime Function()? now;
  final bool loadMapTiles;
  final AutovalidateMode formAutovalidateMode;

  @override
  ConsumerState<EditHostedEventScreen> createState() =>
      _EditHostedEventScreenState();
}

class _EditHostedEventScreenState extends ConsumerState<EditHostedEventScreen> {
  void _setLocalState(VoidCallback callback) => setState(callback);

  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _meetingPointController = TextEditingController();
  final _locationDetailsController = TextEditingController();
  final _distanceController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _accessibilityController = TextEditingController();
  final _includedController = TextEditingController();
  final _capacityController = TextEditingController();
  final _priceController = TextEditingController();
  final _minAgeController = TextEditingController();
  final _maxAgeController = TextEditingController();
  final _maxMenController = TextEditingController();
  final _maxWomenController = TextEditingController();
  final _inviteCodeController = TextEditingController();
  final _dynamicPricingStepController = TextEditingController();
  final _dynamicPricingMaxController = TextEditingController();

  late DateTime _selectedDate;
  late TimeOfDay _selectedStartTime;
  late int _durationMinutes;
  late LocationCoordinate? _startingPoint;
  String? _meetingLocationAddress;
  String? _meetingLocationPlaceId;
  late PaceLevel _selectedPace;
  late List<EventItineraryItem> _itinerary;
  late RouteEventPlan? _routePlan;
  late EventAdmissionPreset _selectedAdmissionPreset;
  late bool _cohortCapsEnabled;
  late bool _dynamicPricingEnabled;
  late EventCancellationPolicyId _selectedCancellationPolicyId;
  bool _loadedPrivateAccess = false;
  String? _scheduleErrorText;

  DateTime get _now => widget.now?.call() ?? DateTime.now();

  DateTime get _selectedStartDateTime => DateTime(
    _selectedDate.year,
    _selectedDate.month,
    _selectedDate.day,
    _selectedStartTime.hour,
    _selectedStartTime.minute,
  );

  @override
  void initState() {
    super.initState();
    final event = widget.event;
    final meetingLocation = event.effectiveMeetingLocation;
    _selectedDate = DateUtils.dateOnly(event.startTime);
    _selectedStartTime = TimeOfDay.fromDateTime(event.startTime);
    _durationMinutes = event.endTime.difference(event.startTime).inMinutes;
    _startingPoint = LocationCoordinate.fromNullable(
      latitude: event.effectiveStartingPointLat,
      longitude: event.effectiveStartingPointLng,
    );
    _meetingLocationAddress = meetingLocation?.address;
    _meetingLocationPlaceId = meetingLocation?.placeId;
    _selectedPace = event.pace;
    _itinerary = event.itinerary;
    _routePlan = event.eventFormat.routePlan;

    _nameController.text = event.name;
    _meetingPointController.text = event.locationName;
    _locationDetailsController.text = event.locationNotes ?? '';
    _distanceController.text = EventFormatters.distanceKm(
      event.distanceKm,
      includeUnit: false,
    );
    _descriptionController.text = event.description;
    _accessibilityController.text = event.eventFormat.accessibilityNotes ?? '';
    _includedController.text = event.eventFormat.includedNotes ?? '';
    _capacityController.text = event.capacityLimit.toString();
    _priceController.text = CreateEventPolicyState.minorUnitsText(
      event.priceInPaise,
      currencyCode: event.currency,
    );
    _minAgeController.text = event.constraints.minAge == 0
        ? ''
        : event.constraints.minAge.toString();
    _maxAgeController.text = event.constraints.maxAge == 99
        ? ''
        : event.constraints.maxAge.toString();
    _maxMenController.text = event.constraints.maxMen?.toString() ?? '';
    _maxWomenController.text = event.constraints.maxWomen?.toString() ?? '';
    final policy = event.effectiveEventPolicy;
    _selectedAdmissionPreset =
        HostEventEditPolicyFieldState.admissionPresetForPolicy(policy);
    _cohortCapsEnabled = policy.usesFixedCohortCaps;
    _dynamicPricingEnabled = policy.usesDemandPricing;
    final demandRules = policy.pricingPolicy.demandPricingRules;
    final demandRule = demandRules.isEmpty ? null : demandRules.first;
    _dynamicPricingStepController.text = CreateEventPolicyState.minorUnitsText(
      demandRule?.stepAdjustment.inPaise,
      currencyCode: event.currency,
    );
    _dynamicPricingMaxController.text = CreateEventPolicyState.minorUnitsText(
      demandRule?.maxAdjustment.inPaise,
      currencyCode: event.currency,
    );
    _selectedCancellationPolicyId = policy.cancellationPolicy.id;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _meetingPointController.dispose();
    _locationDetailsController.dispose();
    _distanceController.dispose();
    _descriptionController.dispose();
    _accessibilityController.dispose();
    _includedController.dispose();
    _capacityController.dispose();
    _priceController.dispose();
    _minAgeController.dispose();
    _maxAgeController.dispose();
    _maxMenController.dispose();
    _maxWomenController.dispose();
    _inviteCodeController.dispose();
    _dynamicPricingStepController.dispose();
    _dynamicPricingMaxController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mutation = ref.watch(
      HostEventBookingController.updateHostedEventMutation,
    );
    final saveError = mutation.hasError
        ? (mutation as MutationError).error
        : null;
    final canEdit = HostEventEditScreenState.eventCanEdit(widget.event);
    final scheduleLocked = HostEventEditScreenState.eventScheduleLocked(
      widget.event,
      _now,
    );
    final requestControlsEnabled = canEdit && !mutation.isPending;
    final fieldState = HostEventEditFieldDisplayState.fromForm(
      canEdit: requestControlsEnabled,
      scheduleLocked: scheduleLocked,
      selectedDate: _selectedDate,
      selectedStartTime: _selectedStartTime,
      durationMinutes: _durationMinutes,
      scheduleErrorText: _scheduleErrorText,
      isDistanceBased: widget.event.eventFormat.activityKind.isDistanceBased,
      startingPoint: _startingPoint,
      meetingPoint: _meetingPointController.text,
      locationDetails: _locationDetailsController.text,
      distanceText: _distanceController.text,
      selectedPace: _selectedPace,
      description: _descriptionController.text,
      currencyCode: widget.event.currency,
      admissionPreset: _selectedAdmissionPreset,
      cohortCapsEnabled: _cohortCapsEnabled,
      dynamicPricingEnabled: _dynamicPricingEnabled,
      cancellationPolicyId: _selectedCancellationPolicyId,
    );
    final screenState = HostEventEditScreenState.from(
      event: widget.event,
      now: _now,
      savePending: mutation.isPending,
      l10n: context.l10n,
      fields: fieldState,
      saveError: saveError,
    );
    final fields = screenState.fields;
    final scheduleFields = fields.schedule;
    final detailsFields = fields.locationDetails;
    final locationState = detailsFields.location;
    final privateAccessAsync =
        _selectedAdmissionPreset == EventAdmissionPreset.inviteOnly
        ? ref.watch(watchEventPrivateAccessProvider(widget.event.id))
        : const AsyncData<EventPrivateAccess?>(null);
    final privateAccessState = buildHostEventEditPrivateAccessState(
      admissionPreset: _selectedAdmissionPreset,
      loadedPrivateAccess: _loadedPrivateAccess,
      privateAccess: privateAccessAsync,
    );
    if (privateAccessState.shouldMarkLoaded &&
        privateAccessState.privateAccess.status == CatchAsyncStatus.data) {
      _loadedPrivateAccess = true;
      final inviteCode = privateAccessState.inviteCodeSeed;
      if (inviteCode != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _inviteCodeController.text.isEmpty) {
            _inviteCodeController.text = inviteCode;
          }
        });
      }
    }

    return PopScope(
      canPop: !mutation.isPending,
      child: CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.hostsEditHostedEventScreenTitleEditEvent,
          navigation: CatchTopBarNavigation(
            mode: mutation.isPending
                ? CatchTopBarNavigationMode.none
                : CatchTopBarNavigationMode.auto,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standard(
          child: IgnorePointer(
            ignoring: mutation.isPending,
            child: Form(
              key: _formKey,
              autovalidateMode: widget.formAutovalidateMode,
              child: Column(
                key: EditHostedEventKeys.scrollView,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CatchSectionList(
                    emptyStateOmitted: true,
                    gap: 0,
                    children: [
                      CatchSection.plain(
                        child: EditHostedEventScopeNotice(
                          isCancelled: widget.event.isCancelled,
                          scheduleLocked: screenState.scheduleLocked,
                          policyLocked: screenState.policyLocked,
                        ),
                      ),
                      if (screenState.hasSaveError)
                        CatchSection.plain(
                          padding: CatchInsets.fieldSectionChildTop,
                          child: CatchLocalizedErrorBanner(
                            screenState.saveError!,
                            context: AppErrorContext.event,
                          ),
                        ),
                      if (screenState.scheduleLocked)
                        HostedEventScheduleSection.readOnly(event: widget.event)
                      else
                        HostedEventScheduleSection.editable(
                          state: scheduleFields,
                          onPickDate: () => _handleIntent(
                            const HostEventEditPickDateIntent(),
                          ),
                          onPickStartTime: () => _handleIntent(
                            const HostEventEditPickStartTimeIntent(),
                          ),
                          onDurationChanged: (durationMinutes) => _handleIntent(
                            HostEventEditDurationChangedIntent(durationMinutes),
                          ),
                        ),
                      CatchSection.fieldRows(
                        title:
                            context.l10n.hostsEditHostedEventScreenLabelWhere,
                        children: [
                          CatchField.input(
                            copy: catchFieldCopy(context.l10n),
                            key: CreateEventFormKeys.meetingPoint,
                            title: context
                                .l10n
                                .hostsEditHostedEventScreenTitleLocationName,
                            contract: CatchContractConstraints
                                .updateEventCallablePayloadFieldsMeetingPoint,
                            controller: _meetingPointController,
                            states: <WidgetState>{
                              if (!screenState.canEdit) WidgetState.disabled,
                            },
                            inputHint: context
                                .l10n
                                .hostsEditHostedEventScreenPlaceholderEGBandstandPromenade,
                            helperText: context
                                .l10n
                                .hostsEditHostedEventScreenHelpertextThisIsWhatAttendees,
                            icon: CatchIcons.location,
                            textCapitalization: TextCapitalization.words,
                            textInputAction: TextInputAction.next,
                            onChanged: (value) => _handleIntent(
                              HostEventEditMeetingPointChangedIntent(value),
                            ),
                            onValidate: (value) =>
                                value == null || value.trim().isEmpty
                                ? context
                                      .l10n
                                      .hostsEditHostedEventScreenBodyRequired
                                : null,
                          ),
                          CatchField.nav(
                            copy: catchFieldCopy(context.l10n),
                            key: CreateEventFormKeys.mapPicker,
                            title:
                                context.l10n.hostsWhereStepLabelMeetingLocation,
                            body: locationState.hasStartingPoint
                                ? (locationState.selectedLabel.isEmpty
                                      ? context
                                            .l10n
                                            .eventsMapPinTileTitlePinnedLocation
                                      : locationState.selectedLabel)
                                : context.l10n.eventsMapPinTileTitleChooseOnMap,
                            icon: locationState.hasStartingPoint
                                ? CatchIcons.editLocation
                                : CatchIcons.map,
                            onTap: locationState.canPick
                                ? () => _handleIntent(
                                    const HostEventEditPickLocationIntent(),
                                  )
                                : null,
                          ),
                          CatchField.input(
                            copy: catchFieldCopy(context.l10n),
                            key: CreateEventFormKeys.locationDetails,
                            title: context
                                .l10n
                                .hostsEditHostedEventScreenTitleExtraDirections,
                            contract: CatchContractConstraints
                                .updateEventCallablePayloadFieldsLocationDetails,
                            labelMode: CatchFieldLabelTextMode.optional,
                            controller: _locationDetailsController,
                            states: <WidgetState>{
                              if (!screenState.canEdit) WidgetState.disabled,
                            },
                            inputHint: context
                                .l10n
                                .hostsEditHostedEventScreenPlaceholderEGMeetOutside,
                            icon: CatchIcons.info,
                            maxLines: 3,
                            textCapitalization: TextCapitalization.sentences,
                            textInputAction: TextInputAction.next,
                          ),
                        ],
                      ),
                      IgnorePointer(
                        ignoring: !screenState.canEdit,
                        child: Opacity(
                          opacity: screenState.canEdit ? 1 : 0.56,
                          child: Column(
                            children: [
                              if (widget.event.eventFormat.activityKind ==
                                      ActivityKind.openActivity ||
                                  _routePlan != null)
                                RouteEventPlanEditor(
                                  activityKind:
                                      widget.event.eventFormat.activityKind,
                                  plan: _routePlan,
                                  onChanged: (plan) =>
                                      setState(() => _routePlan = plan),
                                  initialCenter:
                                      _startingPoint ??
                                      LocationCoordinate(
                                        defaultCityDataForMarket().latitude,
                                        defaultCityDataForMarket().longitude,
                                      ),
                                  loadMapTiles: widget.loadMapTiles,
                                ),
                              EventItineraryEditor(
                                items: _itinerary,
                                onChanged: (items) =>
                                    setState(() => _itinerary = items),
                                defaultLocation: _currentMeetingLocation,
                                onPickLocation: _pickItineraryLocation,
                              ),
                            ],
                          ),
                        ),
                      ),
                      CatchSection.fieldRows(
                        title: context
                            .l10n
                            .hostsEditHostedEventScreenLabelEventDetails,
                        children: [
                          CatchField.input(
                            copy: catchFieldCopy(context.l10n),
                            key: CreateEventFormKeys.name,
                            title: context
                                .l10n
                                .hostsEventDetailsStepTitleEventName,
                            contract: CatchContractConstraints
                                .updateEventCallablePayloadFieldsName,
                            controller: _nameController,
                            states: <WidgetState>{
                              if (!screenState.canEdit) WidgetState.disabled,
                            },
                            inputHint: context
                                .l10n
                                .hostsEventDetailsStepPlaceholderEventName,
                            icon: CatchIcons.note,
                            textCapitalization: TextCapitalization.words,
                            textInputAction: TextInputAction.next,
                            onValidate: (value) =>
                                value == null || value.trim().isEmpty
                                ? context
                                      .l10n
                                      .hostsEditHostedEventScreenBodyRequired
                                : null,
                          ),
                          if (detailsFields.isDistanceBased) ...[
                            CatchField.input(
                              copy: catchFieldCopy(context.l10n),
                              key: CreateEventFormKeys.distance,
                              title: context
                                  .l10n
                                  .hostsEditHostedEventScreenTitleDistanceKm,
                              contract: CatchContractConstraints
                                  .updateEventCallablePayloadFieldsDistanceKm,
                              controller: _distanceController,
                              states: <WidgetState>{
                                if (!screenState.canEdit) WidgetState.disabled,
                              },
                              inputHint: '10',
                              icon: CatchIcons.measure,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              inputFormatters: [
                                FilteringTextInputFormatter.allow(
                                  RegExp(
                                    context
                                        .l10n
                                        .hostsEditHostedEventScreenBodyDD,
                                  ),
                                ),
                              ],
                              textInputAction: TextInputAction.next,
                              onValidate: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return context
                                      .l10n
                                      .hostsEditHostedEventScreenBodyRequired;
                                }
                                final distance = double.tryParse(value.trim());
                                if (distance == null) {
                                  return context
                                      .l10n
                                      .hostsEditHostedEventScreenBodyInvalid;
                                }
                                if (distance <= 0) {
                                  return context
                                      .l10n
                                      .hostsEditHostedEventScreenBodyMustBe0;
                                }
                                return null;
                              },
                            ),
                            CatchField<PaceLevel>.choices(
                              copy: catchFieldCopy(context.l10n),
                              title: context
                                  .l10n
                                  .hostsEventDetailsStepLabelPaceLevel,
                              contract: CatchContractConstraints
                                  .updateEventCallablePayloadFieldsPace,
                              contractValueBuilder: (value) => value.name,
                              body: detailsFields.selectedPace.label,
                              values: PaceLevel.values,
                              itemLabelBuilder: (pace) => pace.label,
                              itemAccentBuilder: (_) => ActivityPalette.resolve(
                                context,
                                widget.event.eventFormat.activityKind,
                              ).accent,
                              selected: <PaceLevel>{detailsFields.selectedPace},
                              onSelectionChanged: screenState.canEdit
                                  ? (selection) => _handleIntent(
                                      HostEventEditPaceChangedIntent(
                                        selection.single,
                                      ),
                                    )
                                  : null,
                              states: <WidgetState>{
                                if (!screenState.canEdit) WidgetState.disabled,
                              },
                              icon: CatchIcons.pace,
                            ),
                          ],
                          CatchField.input(
                            copy: catchFieldCopy(context.l10n),
                            key: CreateEventFormKeys.description,
                            title: context
                                .l10n
                                .hostsEditHostedEventScreenTitleDescription,
                            contract: CatchContractConstraints
                                .updateEventCallablePayloadFieldsDescription,
                            labelMode: CatchFieldLabelTextMode.optional,
                            controller: _descriptionController,
                            states: <WidgetState>{
                              if (!screenState.canEdit) WidgetState.disabled,
                            },
                            inputHint: context
                                .l10n
                                .hostsEditHostedEventScreenPlaceholderWhatShouldAttendeesExpect,
                            icon: CatchIcons.note,
                            maxLines: 4,
                            textCapitalization: TextCapitalization.sentences,
                            textInputAction: TextInputAction.newline,
                          ),
                        ],
                      ),
                      EventGuestDetailsSection(
                        accessibilityController: _accessibilityController,
                        includedController: _includedController,
                        enabled: screenState.canEdit,
                      ),
                      if (screenState.policyLocked)
                        HostedEventPolicySection.readOnly(event: widget.event)
                      else
                        HostedEventPolicySection.editable(
                          state: fields.policy,
                          capacityController: _capacityController,
                          priceController: _priceController,
                          minAgeController: _minAgeController,
                          maxAgeController: _maxAgeController,
                          maxMenController: _maxMenController,
                          maxWomenController: _maxWomenController,
                          inviteCodeController: _inviteCodeController,
                          dynamicPricingStepController:
                              _dynamicPricingStepController,
                          dynamicPricingMaxController:
                              _dynamicPricingMaxController,
                          onAdmissionPresetChanged: (preset) => _handleIntent(
                            HostEventEditAdmissionPresetChangedIntent(preset),
                          ),
                          onCohortCapsEnabledChanged: (value) => _handleIntent(
                            HostEventEditCohortCapsChangedIntent(value),
                          ),
                          onDynamicPricingChanged: (value) => _handleIntent(
                            HostEventEditDynamicPricingChangedIntent(value),
                          ),
                          onCancellationPolicyChanged: (policyId) =>
                              _handleIntent(
                                HostEventEditCancellationPolicyChangedIntent(
                                  policyId,
                                ),
                              ),
                          privateAccessAsync: privateAccessState.privateAccess,
                        ),
                      // Paid membership pricing is INR-only (Razorpay).
                      if (widget.event.currency == 'INR')
                        HostedEventMembershipRulesSection(
                          eventId: widget.event.id,
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        footer: CatchDock(
          child: CatchButton(
            key: EditHostedEventKeys.saveButton,
            label: screenState.footer.label,
            onPressed: screenState.footer.isEnabled
                ? () => _handleIntent(const HostEventEditSaveIntent())
                : null,
            status: (screenState.footer.isLoading)
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            fullWidth: true,
            leading: Icon(CatchIcons.saveChanges),
          ),
        ),
      ),
    );
  }
}
