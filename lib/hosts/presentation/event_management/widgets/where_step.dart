import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/events/data/organizer_event_venue_repository.dart';
import 'package:catch_dating_app/events/domain/event_meeting_location.dart';
import 'package:catch_dating_app/events/domain/organizer_event_venue.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class WhereStep extends ConsumerWidget {
  const WhereStep({
    super.key,
    this.embedded = false,
    required this.formKey,
    required this.organizerId,
    this.autovalidateMode = AutovalidateMode.disabled,
    required this.meetingPointController,
    required this.locationDetailsController,
    required this.startingPoint,
    required this.onMeetingPointChanged,
    required this.onLocationDetailsChanged,
    required this.onPickLocation,
    required this.currentMeetingLocation,
    required this.selectedVenueId,
    required this.onVenueSelected,
    required this.currentCapacity,
  });

  /// When composed by the shared editor, its parent owns scrolling and Form.
  final bool embedded;
  final GlobalKey<FormState> formKey;
  final String organizerId;
  final AutovalidateMode autovalidateMode;
  final TextEditingController meetingPointController;
  final TextEditingController locationDetailsController;
  final LocationCoordinate? startingPoint;
  final ValueChanged<String> onMeetingPointChanged;
  final ValueChanged<String> onLocationDetailsChanged;
  final VoidCallback onPickLocation;
  final EventMeetingLocation? currentMeetingLocation;
  final String? selectedVenueId;
  final ValueChanged<OrganizerEventVenue> onVenueSelected;
  final int? currentCapacity;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final venuesAsync = ref.watch(
      watchOrganizerEventVenuesProvider(organizerId),
    );
    final saveMutation = ref.watch(CreateEventController.saveVenueMutation);
    final saveError = saveMutation.hasError
        ? (saveMutation as MutationError).error
        : null;

    Future<void> saveCurrentPlace() async {
      final location = currentMeetingLocation;
      if (location == null) return;
      try {
        final saved = await CreateEventController.saveVenueMutation.run(
          ref,
          (tx) => tx
              .get(createEventControllerProvider.notifier)
              .saveVenue(
                organizerId: organizerId,
                venueId: selectedVenueId,
                meetingLocation: location,
                defaultEventCapacity: currentCapacity,
              ),
        );
        if (!context.mounted) return;
        onVenueSelected(saved);
      } catch (_) {
        // The mutation-owned error banner is the user-facing failure surface.
      }
    }

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        CatchAsyncBoundary<List<OrganizerEventVenue>>(
          value: venuesAsync,
          errorContext: AppErrorContext.event,
          onRetry: () =>
              ref.invalidate(watchOrganizerEventVenuesProvider(organizerId)),
          loadingBuilder: (_) => HostSavedPlacesSection(
            venues: const [],
            selectedVenueId: selectedVenueId,
            onVenueSelected: onVenueSelected,
            canSave: currentMeetingLocation != null,
            saving: saveMutation.isPending,
            saveError: saveError,
            onSave: saveCurrentPlace,
          ),
          errorBuilder: (_, error, _, onBoundaryRetry) =>
              HostSavedPlacesSection(
                venues: const [],
                loadError: error,
                selectedVenueId: selectedVenueId,
                onVenueSelected: onVenueSelected,
                canSave: currentMeetingLocation != null,
                saving: saveMutation.isPending,
                saveError: saveError,
                onSave: saveCurrentPlace,
              ),
          builder: (_, venues) => HostSavedPlacesSection(
            venues: venues,
            selectedVenueId: selectedVenueId,
            onVenueSelected: onVenueSelected,
            canSave: currentMeetingLocation != null,
            saving: saveMutation.isPending,
            saveError: saveError,
            onSave: saveCurrentPlace,
          ),
        ),
        CatchFieldLanes.divided(
          children: [
            FormField<LocationCoordinate>(
              key: ValueKey(startingPoint),
              validator: (_) => startingPoint == null
                  ? context.l10n.hostsWhereStepVisiblecopyChooseAMeetingLocation
                  : null,
              builder: (field) => CatchFieldLanes.single(
                child: CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.mapPicker,
                  title: context.l10n.hostsWhereStepLabelMeetingLocation,
                  body: startingPoint == null
                      ? context.l10n.eventsMapPinTileTitleChooseOnMap
                      : _trimToNull(meetingPointController.text) ??
                            context.l10n.eventsMapPinTileTitlePinnedLocation,
                  icon: startingPoint == null
                      ? CatchIcons.mapOutlined
                      : CatchIcons.editLocationAltOutlined,
                  error: field.errorText,
                  onTap: saveMutation.isPending ? null : onPickLocation,
                ),
              ),
            ),
            CatchField.input(
              copy: catchFieldCopy(context.l10n),
              key: CreateEventFormKeys.meetingPoint,
              title: context.l10n.hostsWhereStepTitleLocationName,
              contract: CatchContractConstraints
                  .createEventCallablePayloadMeetingPoint,
              controller: meetingPointController,
              states: <WidgetState>{
                if (saveMutation.isPending) WidgetState.disabled,
              },
              inputHint:
                  context.l10n.hostsWhereStepPlaceholderEGBandstandPromenade,
              helperText: startingPoint == null
                  ? context.l10n.hostsWhereStepHelpertextPickAMapLocation
                  : context.l10n.hostsWhereStepHelpertextEditThisIfAttendees,
              icon: CatchIcons.locationOnOutlined,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              onChanged: onMeetingPointChanged,
              onValidate: (value) {
                if (startingPoint == null) return null;
                return value == null || value.trim().isEmpty
                    ? context.l10n.hostsWhereStepVisiblecopyAddALocationName
                    : null;
              },
            ),
            CatchField.input(
              copy: catchFieldCopy(context.l10n),
              key: CreateEventFormKeys.locationDetails,
              title: context.l10n.hostsWhereStepTitleExtraDirections,
              contract: CatchContractConstraints
                  .createEventCallablePayloadLocationDetails,
              labelMode: CatchFieldLabelTextMode.optional,
              controller: locationDetailsController,
              states: <WidgetState>{
                if (saveMutation.isPending) WidgetState.disabled,
              },
              inputHint: context.l10n.hostsWhereStepPlaceholderEGMeetOutside,
              helperText:
                  context.l10n.hostsWhereStepHelpertextGateEntranceFloorOr,
              icon: CatchIcons.infoOutline,
              maxLines: 3,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.done,
              onChanged: onLocationDetailsChanged,
            ),
          ],
        ),
      ],
    );
    if (embedded) return content;
    return Form(
      key: formKey,
      autovalidateMode: autovalidateMode,
      child: SingleChildScrollView(
        padding: CatchInsets.formStepBodyWithBottomActions,
        child: content,
      ),
    );
  }
}

class HostSavedPlacesSection extends StatelessWidget {
  const HostSavedPlacesSection({
    super.key,
    required this.venues,
    required this.selectedVenueId,
    required this.onVenueSelected,
    required this.canSave,
    required this.saving,
    required this.saveError,
    required this.onSave,
    this.loadError,
  });

  final List<OrganizerEventVenue> venues;
  final String? selectedVenueId;
  final ValueChanged<OrganizerEventVenue> onVenueSelected;
  final bool canSave;
  final bool saving;
  final Object? saveError;
  final Future<void> Function() onSave;
  final Object? loadError;

  @override
  Widget build(BuildContext context) {
    return CatchSection.fieldRows(
      first: true,
      title: context.l10n.hostsWhereStepSavedPlacesTitle,
      footer: CatchText(
        context.l10n.hostsWhereStepSavedPlacesSubtitle,
        variant: CatchTextVariant.supporting,
      ),
      children: [
        if (loadError != null)
          CatchLocalizedErrorBanner(loadError!, context: AppErrorContext.event),
        for (final venue in venues)
          CatchField.nav(
            copy: catchFieldCopy(context.l10n),
            title: venue.label,
            body: venue.meetingLocation.address ?? venue.meetingLocation.name,
            valueText: selectedVenueId == venue.venueId
                ? context.l10n.hostsWhereStepSavedPlaceSelected
                : null,
            showChevron: false,
            icon: CatchIcons.locationOnOutlined,
            onTap: saving ? null : () => onVenueSelected(venue),
          ),
        CatchField.action(
          copy: catchFieldCopy(context.l10n),
          icon: CatchIcons.add,
          status: saving ? CatchFieldStatus.saving : CatchFieldStatus.idle,
          title: selectedVenueId == null
              ? context.l10n.hostsWhereStepSaveCurrentPlace
              : context.l10n.hostsWhereStepUpdateSavedPlace,
          onTap: !canSave || saving ? null : onSave,
        ),
        if (saveError != null)
          CatchLocalizedErrorBanner(saveError!, context: AppErrorContext.event),
      ],
    );
  }
}

String? _trimToNull(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return null;
  return trimmed;
}
