import 'dart:async';

import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_details_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_public_details.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/core/widgets/ordered_photo_picker.dart';
import 'package:catch_dating_app/events/events.dart'
    show EventMeetingLocation, LocationPickerResult, LocationPickerScreen;
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_details_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_guest_details_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_itinerary_editor.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/route_event_plan_editor.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Optional content uses the same editors as the complete create flow. Each
/// saved edit goes through the private setup revision and retry journal.
class PrivateEventContentSection extends StatelessWidget {
  const PrivateEventContentSection({
    super.key,
    required this.state,
    required this.controller,
  });
  final PrivateEventDetailsState state;
  final PrivateEventDetailsController controller;

  void _format(Map<String, dynamic> json) => unawaited(
    controller.save(
      PrivateEventDetailsPatch(
        eventFormat: EventSetupValue.set(EventFormatSnapshot.fromJson(json)),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final event = state.event!;
    final details = event.eventDetails;
    final format = details.eventFormat;
    final location = details.meetingLocation;
    final city = defaultCityOptions
        .where((city) => city.effectiveCityId == event.city.cityId)
        .firstOrNull;
    final copy = catchFieldCopy(context.l10n);
    final editable = state.canEdit;
    final formatEditable = state.canEditFormat;
    final photos = details.eventPhotos;
    final plan = format?.routePlan;
    return CatchSectionList(
      emptyStateOmitted: true,
      children: [
        if (location != null)
          CatchSection.fieldRows(
            children: [
              CatchField.input(
                key: ValueKey('private-directions-${event.setupRevision}'),
                copy: copy,
                title: context.l10n.hostsWhereStepTitleExtraDirections,
                contract: CatchContractConstraints
                    .createEventCallablePayloadLocationDetails,
                initialValue: location.notes ?? '',
                labelMode: CatchFieldLabelTextMode.optional,
                inputMode: editable
                    ? CatchTextInputMode.editable
                    : CatchTextInputMode.inactive,
                onSubmitted: editable
                    ? (value) => unawaited(
                        controller.save(
                          PrivateEventDetailsPatch(
                            meetingLocation: location.copyWith(
                              notes: value.trim().isEmpty ? null : value.trim(),
                            ),
                          ),
                        ),
                      )
                    : null,
              ),
            ],
          ),
        if (format != null)
          EventGuestDetailsSection(
            key: ValueKey('private-guest-details-${event.eventId}'),
            accessibility: format.accessibilityNotes,
            included: format.includedNotes,
            enabled: formatEditable,
            onSave: (accessibility, included) => _format(
              Map<String, dynamic>.from(
                format
                    .withPublicDetails(
                      accessibility: accessibility,
                      included: included,
                    )
                    .toJson(),
              ),
            ),
          ),
        if (format?.activityKind == ActivityKind.openActivity)
          CatchSection.fieldRows(
            children: [
              CatchField.input(
                key: ValueKey('private-format-label-${event.setupRevision}'),
                copy: copy,
                title: context.l10n.hostsEventDetailsStepTitleFormatName,
                contract: CatchContractConstraints
                    .createEventCallablePayloadEventFormatCustomActivityLabel,
                labelMode: CatchFieldLabelTextMode.optional,
                initialValue: format!.customActivityLabel ?? '',
                inputMode: formatEditable
                    ? CatchTextInputMode.editable
                    : CatchTextInputMode.inactive,
                onSubmitted: formatEditable
                    ? (value) {
                        final json = Map<String, dynamic>.from(format.toJson());
                        if (value.trim().isEmpty) {
                          json.remove('customActivityLabel');
                        } else {
                          json['customActivityLabel'] = value.trim();
                        }
                        _format(json);
                      }
                    : null,
              ),
              CatchField<EventInteractionModel>.choices(
                copy: copy,
                title: context.l10n.hostsEventDetailsStepLabelFormatStructure,
                contract: CatchContractConstraints
                    .createEventCallablePayloadEventFormatInteractionModel,
                contractValueBuilder: (value) => value.name,
                values: EventInteractionModel.values,
                selected: {format.interactionModel},
                itemLabelBuilder: (value) => value.label,
                itemAccentBuilder: (_) => ActivityPalette.resolve(
                  context,
                  format.activityKind,
                ).accent,
                onSelectionChanged: formatEditable
                    ? (values) => _format({
                        ...format.toJson(),
                        'interactionModel': values.single.name,
                      })
                    : null,
              ),
            ],
          ),
        if (format != null &&
            (format.isDistanceBased ||
                format.activityKind == ActivityKind.barCrawl ||
                format.activityKind == ActivityKind.openActivity ||
                plan != null))
          IgnorePointer(
            ignoring: !formatEditable,
            child: RouteEventPlanEditor(
              activityKind: format.activityKind,
              plan: plan,
              initialCenter: LocationCoordinate(
                location?.latitude ?? city?.latitude ?? 0,
                location?.longitude ?? city?.longitude ?? 0,
              ),
              onChanged: (next) {
                if (!formatEditable) return;
                final activityDetails = Map<String, Object?>.from(
                  format.activityDetails,
                )..remove('routePlan');
                if (next != null) {
                  activityDetails['routePlan'] = next.toJson();
                }
                final nextFormat = EventFormatSnapshot.fromJson({
                  ...format.toJson(),
                  'activityDetails': activityDetails,
                });
                unawaited(
                  controller.save(
                    PrivateEventDetailsPatch(
                      eventFormat: EventSetupValue.set(nextFormat),
                      itinerary: (next?.path.length ?? 0) < 2
                          ? details.itinerary
                                .map(
                                  (item) =>
                                      item.copyWith(routeDistanceMeters: null),
                                )
                                .toList()
                          : null,
                    ),
                  ),
                );
              },
            ),
          ),
        IgnorePointer(
          ignoring: !editable,
          child: EventItineraryEditor(
            items: details.itinerary,
            defaultLocation: location,
            onPickLocation: (current) async {
              final result = await Navigator.of(context)
                  .push<LocationPickerResult>(
                    MaterialPageRoute(
                      fullscreenDialog: true,
                      builder: (_) => LocationPickerScreen(
                        initialLocation: current == null
                            ? null
                            : LocationCoordinate(
                                current.latitude,
                                current.longitude,
                              ),
                        initialCenter: LocationCoordinate(
                          location?.latitude ?? city?.latitude ?? 0,
                          location?.longitude ?? city?.longitude ?? 0,
                        ),
                        initialLabel: current?.name,
                        countryIsoCode: city?.countryIsoCode,
                      ),
                    ),
                  );
              if (result == null || !state.canEdit) return null;
              final name = result.displayName ?? current?.name;
              if (name == null || name.trim().isEmpty) return null;
              return EventMeetingLocation(
                name: name.trim(),
                latitude: result.coordinate.latitude,
                longitude: result.coordinate.longitude,
                address: result.address,
                placeId: result.placeId,
                notes: current?.notes,
              );
            },
            hasRoutePath: (plan?.path.length ?? 0) >= 2,
            onChanged: (items) {
              if (editable) {
                unawaited(
                  controller.save(PrivateEventDetailsPatch(itinerary: items)),
                );
              }
            },
          ),
        ),
        CatchSection.divided(
          title: context.l10n.hostsCreateEventPhotoPickerTitleCoverAndGallery,
          count: context.l10n.coreCatchFormFieldLabelTextOptional,
          child: OrderedPhotoPicker(
            photos: [
              for (final photo in photos)
                OrderedPhotoPreview(
                  id: photo.id,
                  imageUrl: photo.thumbnailOrUrl,
                ),
            ],
            onAddPhotos: editable && state.canAddPhotos
                ? () => unawaited(controller.addPhotos())
                : null,
            onRemovePhoto: editable
                ? (index) => unawaited(
                    controller.save(
                      PrivateEventDetailsPatch(
                        eventPhotos: [...photos]..removeAt(index),
                      ),
                    ),
                  )
                : null,
            onReorderPhoto: editable
                ? (from, to) {
                    final next = [...photos];
                    final photo = next.removeAt(from);
                    next.insert(to, photo);
                    unawaited(
                      controller.save(
                        PrivateEventDetailsPatch(eventPhotos: next),
                      ),
                    );
                  }
                : null,
            emptyActionLabel: context
                .l10n
                .hostsCreateEventPhotoPickerVisiblecopyAddEventPhotos,
            addActionLabel:
                context.l10n.hostsCreateEventPhotoPickerVisiblecopyAddPhotos,
          ),
        ),
      ],
    );
  }
}
