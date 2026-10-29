import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/field_value_validation.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/core/widgets/ordered_photo_picker.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/create_event_photo_picker.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_guest_details_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_itinerary_editor.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/route_event_plan_editor.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class EventDetailsStep extends StatefulWidget {
  const EventDetailsStep({
    super.key,
    required this.formKey,
    this.autovalidateMode = AutovalidateMode.disabled,
    required this.photoPreviews,
    required this.onPickPhotos,
    required this.onRemovePhoto,
    required this.onReorderPhoto,
    required this.organizerName,
    this.organizerLogoUrl,
    required this.nameController,
    required this.distanceController,
    required this.customActivityLabelController,
    required this.descriptionController,
    required this.accessibilityController,
    required this.includedController,
    required this.selectedActivityKind,
    required this.onActivityKindChanged,
    required this.selectedInteractionModel,
    required this.onInteractionModelChanged,
    required this.selectedPace,
    required this.onPaceChanged,
    required this.routePlan,
    required this.onRoutePlanChanged,
    required this.itinerary,
    required this.onItineraryChanged,
    this.defaultItineraryLocation,
    this.onPickItineraryLocation,
    required this.routeInitialCenter,
    this.loadMapTiles = true,
  });

  final GlobalKey<FormState> formKey;
  final AutovalidateMode autovalidateMode;
  final List<OrderedPhotoPreview> photoPreviews;
  final VoidCallback? onPickPhotos;
  final ValueChanged<int>? onRemovePhoto;
  final void Function(int fromIndex, int toIndex)? onReorderPhoto;
  final String organizerName;
  final String? organizerLogoUrl;
  final TextEditingController nameController;
  final TextEditingController distanceController;
  final TextEditingController customActivityLabelController;
  final TextEditingController descriptionController;
  final TextEditingController accessibilityController;
  final TextEditingController includedController;
  final ActivityKind selectedActivityKind;
  final ValueChanged<ActivityKind> onActivityKindChanged;
  final EventInteractionModel selectedInteractionModel;
  final ValueChanged<EventInteractionModel> onInteractionModelChanged;
  final PaceLevel? selectedPace;
  final ValueChanged<PaceLevel?> onPaceChanged;
  final RouteEventPlan? routePlan;
  final ValueChanged<RouteEventPlan?> onRoutePlanChanged;
  final List<EventItineraryItem> itinerary;
  final ValueChanged<List<EventItineraryItem>> onItineraryChanged;
  final EventMeetingLocation? defaultItineraryLocation;
  final EventItineraryLocationPicker? onPickItineraryLocation;
  final LocationCoordinate routeInitialCenter;
  final bool loadMapTiles;

  @override
  State<EventDetailsStep> createState() => _EventDetailsStepState();
}

class _EventDetailsStepState extends State<EventDetailsStep> {
  static const _activityField = 'activity';
  static const _interactionField = 'interaction';
  static const _paceField = 'pace';

  final CatchAccordionController _accordion = CatchAccordionController();
  bool _showPresentation = false;
  bool _showItinerary = false;

  @override
  void initState() {
    super.initState();
    _accordion.addListener(_handleAccordionChanged);
  }

  @override
  void dispose() {
    _accordion
      ..removeListener(_handleAccordionChanged)
      ..dispose();
    super.dispose();
  }

  void _handleAccordionChanged() {
    if (mounted) setState(() {});
  }

  void _setOpen(String field, bool open) {
    if (open && !_accordion.isExpanded(field)) {
      _accordion.toggle(field);
    } else if (!open && _accordion.isExpanded(field)) {
      _accordion.collapse();
    }
  }

  @override
  Widget build(BuildContext context) {
    final activity = ActivityPalette.resolve(
      context,
      widget.selectedActivityKind,
    );
    return Form(
      key: widget.formKey,
      autovalidateMode: widget.autovalidateMode,
      child: ListView(
        padding: CatchInsets.formStepBodyWithBottomActions,
        children: [
          CatchSectionList(
            emptyStateOmitted: true,
            gap: 0,
            children: [
              CatchSection.fieldRows(
                children: [
                  CatchField.input(
                    copy: catchFieldCopy(context.l10n),
                    key: CreateEventFormKeys.name,
                    title: context.l10n.hostsEventDetailsStepTitleEventName,
                    contract:
                        CatchContractConstraints.createEventCallablePayloadName,
                    controller: widget.nameController,
                    inputHint:
                        context.l10n.hostsEventDetailsStepPlaceholderEventName,
                    icon: CatchIcons.eventConfirmed,
                    textCapitalization: TextCapitalization.words,
                    textInputAction: TextInputAction.next,
                    onValidate: (value) {
                      final normalized = value?.trim() ?? '';
                      if (normalized.isEmpty) {
                        return context
                            .l10n
                            .hostsEventDetailsStepVisiblecopyRequired;
                      }
                      return null;
                    },
                  ),
                  CatchField<ActivityKind>.choices(
                    copy: catchFieldCopy(context.l10n),
                    key: CreateEventFormKeys.activityType,
                    title: context.l10n.hostsEventDetailsStepLabelActivityType,
                    contract: CatchContractConstraints
                        .createEventCallablePayloadEventFormatActivityKind,
                    contractValueBuilder: (value) => value.name,
                    body: widget.selectedActivityKind.label,
                    values: ActivityKind.eventCreationDefaults,
                    itemLabelBuilder: (activityKind) => activityKind.label,
                    itemAccentBuilder: (activityKind) =>
                        ActivityPalette.resolve(context, activityKind).accent,
                    selected: <ActivityKind>{widget.selectedActivityKind},
                    onSelectionChanged: (selection) {
                      widget.onActivityKindChanged(selection.single);
                    },
                    disclosureMode: _accordion.isExpanded(_activityField)
                        ? CatchFieldMode.controlledExpanded
                        : CatchFieldMode.controlledCollapsed,
                    onOpenChanged: (open) => _setOpen(_activityField, open),
                    icon: activity.glyph,
                    iconColor: activity.accent,
                  ),
                  if (widget.selectedActivityKind ==
                      ActivityKind.openActivity) ...[
                    CatchField.input(
                      copy: catchFieldCopy(context.l10n),
                      key: CreateEventFormKeys.customActivityLabel,
                      title: context.l10n.hostsEventDetailsStepTitleFormatName,
                      contract: CatchContractConstraints
                          .createEventCallablePayloadEventFormatCustomActivityLabel,
                      controller: widget.customActivityLabelController,
                      labelMode: CatchFieldLabelTextMode.optional,
                      inputHint: context
                          .l10n
                          .hostsEventDetailsStepPlaceholderSalsaNight,
                      icon: CatchIcons.eventConfirmed,
                      textCapitalization: TextCapitalization.words,
                      textInputAction: TextInputAction.next,
                      onValidate: (value) {
                        final normalized = value?.trim() ?? '';
                        if (normalized.isNotEmpty &&
                            !acceptsContractValue(
                              CatchContractConstraints
                                  .createEventCallablePayloadEventFormatCustomActivityLabel,
                              normalized,
                            )) {
                          return context
                              .l10n
                              .hostsEventDetailsStepVisiblecopyTooLong;
                        }
                        return null;
                      },
                    ),
                    CatchField<EventInteractionModel>.choices(
                      copy: catchFieldCopy(context.l10n),
                      key: CreateEventFormKeys.customInteractionModel,
                      title: context
                          .l10n
                          .hostsEventDetailsStepLabelFormatStructure,
                      contract: CatchContractConstraints
                          .createEventCallablePayloadEventFormatInteractionModel,
                      contractValueBuilder: (value) => value.name,
                      body: widget.selectedInteractionModel.label,
                      values: EventInteractionModel.values,
                      itemLabelBuilder: (model) => model.label,
                      itemAccentBuilder: (_) => activity.accent,
                      selected: <EventInteractionModel>{
                        widget.selectedInteractionModel,
                      },
                      onSelectionChanged: (selection) {
                        widget.onInteractionModelChanged(selection.single);
                      },
                      disclosureMode: _accordion.isExpanded(_interactionField)
                          ? CatchFieldMode.controlledExpanded
                          : CatchFieldMode.controlledCollapsed,
                      onOpenChanged: (open) =>
                          _setOpen(_interactionField, open),
                      icon: CatchIcons.filters,
                      iconColor: activity.accent,
                    ),
                  ],
                  if (widget.selectedActivityKind.isDistanceBased) ...[
                    CatchField.input(
                      copy: catchFieldCopy(context.l10n),
                      key: CreateEventFormKeys.distance,
                      title: context.l10n.hostsEventDetailsStepTitleDistanceKm,
                      contract: CatchContractConstraints
                          .createEventCallablePayloadDistanceKm,
                      controller: widget.distanceController,
                      inputHint: '10',
                      icon: CatchIcons.measure,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(
                          RegExp(
                            context.l10n.hostsEventDetailsStepVisiblecopyDD,
                          ),
                        ),
                      ],
                      textInputAction: TextInputAction.next,
                      onValidate: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return context
                              .l10n
                              .hostsEventDetailsStepVisiblecopyRequired;
                        }
                        final distance = double.tryParse(value.trim());
                        if (distance == null) {
                          return context
                              .l10n
                              .hostsEventDetailsStepVisiblecopyInvalid;
                        }
                        if (distance <= 0) {
                          return context
                              .l10n
                              .hostsEventDetailsStepVisiblecopyMustBe0;
                        }
                        return null;
                      },
                    ),
                    FormField<PaceLevel>(
                      initialValue: widget.selectedPace,
                      validator: (value) => value == null
                          ? context
                                .l10n
                                .hostsEventDetailsStepVisiblecopySelectAPace
                          : null,
                      builder: (field) => CatchFieldLanes.single(
                        child: CatchField<PaceLevel>.choices(
                          copy: catchFieldCopy(context.l10n),
                          title:
                              context.l10n.hostsEventDetailsStepLabelPaceLevel,
                          contract: CatchContractConstraints
                              .createEventCallablePayloadPace,
                          contractValueBuilder: (value) => value.name,
                          body: widget.selectedPace?.label,
                          values: PaceLevel.values,
                          itemLabelBuilder: (pace) => pace.label,
                          itemAccentBuilder: (_) => activity.accent,
                          selected: widget.selectedPace == null
                              ? const <PaceLevel>{}
                              : <PaceLevel>{widget.selectedPace!},
                          onSelectionChanged: (selection) {
                            final next = selection.isEmpty
                                ? null
                                : selection.single;
                            widget.onPaceChanged(next);
                            field.didChange(next);
                          },
                          allowEmptySelection: true,
                          disclosureMode: _accordion.isExpanded(_paceField)
                              ? CatchFieldMode.controlledExpanded
                              : CatchFieldMode.controlledCollapsed,
                          onOpenChanged: (open) => _setOpen(_paceField, open),
                          icon: CatchIcons.pace,
                          iconColor: activity.accent,
                          error: field.errorText,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              CatchSection.fieldRows(
                children: [
                  Semantics(
                    expanded: _showPresentation,
                    child: CatchField.action(
                      copy: catchFieldCopy(context.l10n),
                      key: const ValueKey('host.create_event.presentation'),
                      title: context.l10n.hostsCreateEventPresentationTitle,
                      valueText: _showPresentation
                          ? context.l10n.hostsCreateEventHideDetails
                          : context.l10n.hostsCreateEventShowDetails,
                      icon: CatchIcons.addPhoto,
                      onTap: () => setState(
                        () => _showPresentation = !_showPresentation,
                      ),
                    ),
                  ),
                  if (_showPresentation) ...[
                    CatchField.input(
                      copy: catchFieldCopy(context.l10n),
                      key: CreateEventFormKeys.description,
                      title: context.l10n.hostsEventDetailsStepTitleDescription,
                      contract: CatchContractConstraints
                          .createEventCallablePayloadDescription,
                      labelMode: CatchFieldLabelTextMode.optional,
                      controller: widget.descriptionController,
                      inputHint: context
                          .l10n
                          .hostsEventDetailsStepPlaceholderWhatShouldAttendeesExpect,
                      icon: CatchIcons.note,
                      maxLines: 4,
                      textCapitalization: TextCapitalization.sentences,
                      textInputAction: TextInputAction.newline,
                    ),
                  ],
                ],
              ),
              EventGuestDetailsSection(
                accessibilityController: widget.accessibilityController,
                includedController: widget.includedController,
              ),
              if (_showPresentation)
                CreateEventPhotoPicker(
                  photos: widget.photoPreviews,
                  onAddPhotos: widget.onPickPhotos,
                  onRemovePhoto: widget.onRemovePhoto,
                  onReorderPhoto: widget.onReorderPhoto,
                  organizerName: widget.organizerName,
                  organizerLogoUrl: widget.organizerLogoUrl,
                ),
              CatchSection.fieldRows(
                children: [
                  Semantics(
                    expanded: _showItinerary,
                    child: CatchField.action(
                      copy: catchFieldCopy(context.l10n),
                      key: const ValueKey('host.create_event.itinerary'),
                      title: context.l10n.hostsCreateEventItineraryTitle,
                      valueText: _showItinerary
                          ? context.l10n.hostsCreateEventHideDetails
                          : context.l10n.hostsCreateEventShowDetails,
                      icon: CatchIcons.route,
                      onTap: () =>
                          setState(() => _showItinerary = !_showItinerary),
                    ),
                  ),
                ],
              ),
              if (_showItinerary) ...[
                if (widget.selectedActivityKind == ActivityKind.openActivity ||
                    widget.selectedActivityKind.isDistanceBased ||
                    widget.selectedActivityKind == ActivityKind.barCrawl ||
                    widget.routePlan != null)
                  RouteEventPlanEditor(
                    activityKind: widget.selectedActivityKind,
                    plan: widget.routePlan,
                    onChanged: widget.onRoutePlanChanged,
                    initialCenter: widget.routeInitialCenter,
                    loadMapTiles: widget.loadMapTiles,
                  ),
                EventItineraryEditor(
                  items: widget.itinerary,
                  hasRoutePath: (widget.routePlan?.path.length ?? 0) >= 2,
                  onChanged: widget.onItineraryChanged,
                  defaultLocation: widget.defaultItineraryLocation,
                  onPickLocation: widget.onPickItineraryLocation,
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
