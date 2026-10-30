import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/private_event_details_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/events/events.dart'
    show EventMeetingLocation, LocationPickerResult, LocationPickerScreen;
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_private_event_listing_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_content_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_details_controller.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_context.dart'
    as operation;
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/schema_contracts/field_value_validation.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Actual optional schedule, place and format of one saved private event.
/// Organizer defaults appear only as explicit copy-on-save choices.
class PrivateEventDetailsScreen extends ConsumerWidget {
  const PrivateEventDetailsScreen({
    super.key,
    required this.scope,
    required this.onBack,
    this.pickLocation,
  });
  final PrivateEventDetailsScope scope;
  final VoidCallback onBack;
  final Future<EventMeetingLocation?> Function(EventMeetingLocation?)?
  pickLocation;

  Future<void> _chooseLocation(
    BuildContext context,
    PrivateEventDetailsState state,
    PrivateEventDetailsController controller,
  ) async {
    if (!state.canEdit) return;
    final current = state.event?.eventDetails.meetingLocation;
    try {
      EventMeetingLocation? location;
      if (pickLocation != null) {
        location = await pickLocation!(current);
      } else {
        final city = defaultCityOptions
            .where(
              (option) => option.effectiveCityId == state.event?.city.cityId,
            )
            .firstOrNull;
        final result = await Navigator.of(context).push<LocationPickerResult>(
          MaterialPageRoute(
            builder: (_) => LocationPickerScreen(
              countryIsoCode: city?.countryIsoCode,
              initialLocation: current == null
                  ? null
                  : LocationCoordinate(current.latitude, current.longitude),
              initialCenter: city == null
                  ? null
                  : LocationCoordinate(city.latitude, city.longitude),
              initialLabel:
                  current?.name ?? state.event?.eventDetails.venueName,
            ),
            fullscreenDialog: true,
          ),
        );
        if (result == null) return;
        final name =
            result.displayName ??
            current?.name ??
            state.event?.eventDetails.venueName;
        if (name == null || name.trim().isEmpty) {
          throw const FormatException('Choose a named meeting place');
        }
        location = EventMeetingLocation(
          name: name.trim(),
          latitude: result.coordinate.latitude,
          longitude: result.coordinate.longitude,
          address: result.address,
          placeId: result.placeId,
          notes: current?.notes,
        );
      }
      if (location != null && state.canEdit) {
        await controller.save(
          PrivateEventDetailsPatch(meetingLocation: location),
        );
      }
    } catch (error, stackTrace) {
      controller.reportValidationError(
        operation.normalizeAppError(
          error,
          stackTrace: stackTrace,
          context: const operation.AppErrorContext(
            operation: operation.AppOperation.plugin,
            action: 'choose meeting place',
            resource: 'event_location_picker',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = privateEventDetailsControllerProvider(scope);
    final state = ref.watch(provider);
    final controller = ref.read(provider.notifier);
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final tokens = CatchTokens.of(context);
    final event = state.event;
    final details = event?.eventDetails;
    final defaults = state.defaults?.preferences;
    final editable = state.canEdit;
    final end = details?.endTimeMillis;
    final duration = end == null || event == null
        ? null
        : (end - event.startTimeMillis) ~/ 60000;
    final suggestedDuration = defaults?.usualDurationMinutes;
    final suggestedVenue = defaults?.preferredVenueId;
    final currentVenue = details?.venueName;
    final currentFormat = details?.eventFormat;
    if (state.loading && event == null) {
      return const CatchScaffold.stepFlow(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    return CatchScaffold.stepFlow(
      backgroundColor: tokens.bg,
      body: Column(
        children: [
          CatchStepHeader(
            title: l10n.hostsPrivateEventDetails,
            subtitle: event?.name ?? l10n.hostsPrivateEventSavedTitle,
            stepLabelBuilder: catchStepHeaderLabelBuilder(l10n),
            compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(l10n),
            onBack: onBack,
            leadingType: CatchTopBarNavigationMode.back,
          ),
          Expanded(
            child: Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  maxWidth: CatchLayout.hostCreateEventFormLaneMaxWidth,
                ),
                child: ListView(
                  padding: CatchInsets.formStepBodyWithBottomActions,
                  children: [
                    CatchSectionList(
                      emptyStateOmitted: true,
                      children: [
                        CatchSection.fieldRows(
                          first: true,
                          title: l10n.hostsPrivateEventDetails,
                          children: [
                            CatchField.read(
                              copy: copy,
                              title: l10n.hostsPrivateEventDetails,
                              body: l10n.hostsPrivateEventDetailActualHint,
                              icon: CatchIcons.eventConfirmed,
                            ),
                            if (state.pending != null) ...[
                              CatchField.read(
                                copy: copy,
                                title: state.pending?.discard == true
                                    ? l10n.hostsPrivateEventDiscarding
                                    : state.reconciliationProgress == null
                                    ? l10n.hostsEventPreferencePending
                                    : l10n.hostsPrivateEventCheckingGuests,
                                body: state.pending?.discard == true
                                    ? l10n.hostsPrivateEventDiscardingBody
                                    : state.reconciliationProgress == null
                                    ? l10n.hostsEventPreferencePendingBody
                                    : l10n.hostsPrivateEventCheckingGuestsBody,
                                icon: CatchIcons.time,
                              ),
                              CatchField.action(
                                copy: copy,
                                title: state.pending?.discard == true
                                    ? l10n.hostsPrivateEventContinueDiscarding
                                    : state.reconciliationProgress == null
                                    ? l10n.hostsEventPreferenceRetry
                                    : l10n.hostsPrivateEventContinueCheckingGuests,
                                onTap: state.saving
                                    ? null
                                    : () =>
                                          unawaited(controller.retryPending()),
                              ),
                            ],
                            if (state.canDiscardPending)
                              CatchField.action(
                                copy: copy,
                                title: l10n.hostsPrivateEventDiscardPending,
                                body: l10n.hostsPrivateEventDiscardPendingBody,
                                onTap: () =>
                                    unawaited(controller.discardPending()),
                              ),
                            if (state.error != null) ...[
                              CatchField.read(
                                copy: copy,
                                title: l10n.hostsEventPreferenceError,
                                body: appErrorMessage(
                                  state.error!,
                                  l10n: l10n,
                                  context: AppErrorContext.event,
                                ),
                                icon: CatchIcons.error,
                              ),
                              if (state.pending == null)
                                CatchField.action(
                                  copy: copy,
                                  title:
                                      l10n.hostsPrivateEventRetryDefaultsRead,
                                  onTap: state.loading
                                      ? null
                                      : () => unawaited(controller.load()),
                                ),
                            ],
                          ],
                        ),
                        CatchSection.fieldRows(
                          title: l10n.hostsEventDefaultsUsualDuration,
                          children: [
                            CatchField.read(
                              copy: copy,
                              title:
                                  l10n.hostsPrivateEventDetailCurrentDuration,
                              body: duration == null
                                  ? l10n.hostsPrivateEventDetailNotSet
                                  : l10n.hostsPrivateEventDetailMinutes(
                                      minutes: duration,
                                    ),
                              icon: CatchIcons.time,
                            ),
                            CatchField.input(
                              copy: copy,
                              title: l10n.hostsPrivateEventDetailDuration,
                              contractExemption:
                                  'Blank issues a clear intent; set values use the generated duration contract.',
                              initialValue: duration?.toString() ?? '',
                              inputHint:
                                  l10n.hostsPrivateEventDetailDurationHint,
                              inputMode: editable
                                  ? CatchTextInputMode.editable
                                  : CatchTextInputMode.inactive,
                              labelMode: CatchFieldLabelTextMode.optional,

                              onValidate: (value) {
                                final text = value?.trim() ?? '';
                                if (text.isEmpty) return null;
                                final minutes = int.tryParse(text);
                                return acceptsContractValue(
                                      CatchContractConstraints
                                          .updatePrivateEventDetailsCallablePayloadDetailsDurationMinutesValue,
                                      minutes,
                                    )
                                    ? null
                                    : l10n.hostsEventPreferenceInvalidValue;
                              },
                              onSubmitted: editable
                                  ? (text) {
                                      if (text.trim().isEmpty) {
                                        unawaited(
                                          controller.save(
                                            const PrivateEventDetailsPatch(
                                              durationMinutes:
                                                  EventSetupValue.clear(),
                                            ),
                                          ),
                                        );
                                        return;
                                      }
                                      final minutes = int.tryParse(text.trim());
                                      if (minutes == null ||
                                          !acceptsContractValue(
                                            CatchContractConstraints
                                                .updatePrivateEventDetailsCallablePayloadDetailsDurationMinutesValue,
                                            minutes,
                                          )) {
                                        controller.reportValidationError(
                                          const FormatException(
                                            'Invalid event duration',
                                          ),
                                        );
                                        return;
                                      }
                                      unawaited(
                                        controller.save(
                                          PrivateEventDetailsPatch(
                                            durationMinutes:
                                                EventSetupValue.set(minutes),
                                          ),
                                        ),
                                      );
                                    }
                                  : null,
                            ),
                            CatchField.action(
                              copy: copy,
                              title: l10n.hostsPrivateEventDetailUseDuration,
                              body: suggestedDuration == null
                                  ? l10n.hostsPrivateEventDetailNoDurationSuggestion
                                  : l10n.hostsPrivateEventDetailMinutes(
                                      minutes: suggestedDuration,
                                    ),
                              onTap: editable && suggestedDuration != null
                                  ? () => unawaited(
                                      controller.save(
                                        const PrivateEventDetailsPatch(
                                          durationMinutes:
                                              EventSetupValue.inherit(),
                                        ),
                                      ),
                                    )
                                  : null,
                            ),
                            CatchField.action(
                              copy: copy,
                              title: l10n.hostsPrivateEventDetailClearDuration,
                              onTap: editable && end != null
                                  ? () => unawaited(
                                      controller.save(
                                        const PrivateEventDetailsPatch(
                                          durationMinutes:
                                              EventSetupValue.clear(),
                                        ),
                                      ),
                                    )
                                  : null,
                            ),
                          ],
                        ),
                        CatchSection.fieldRows(
                          title: l10n.hostsEventDefaultsPreferredVenue,
                          children: [
                            CatchField.read(
                              copy: copy,
                              title: l10n.hostsPrivateEventDetailCurrentVenue,
                              body:
                                  currentVenue ??
                                  l10n.hostsPrivateEventDetailNotSet,
                              icon: CatchIcons.location,
                            ),
                            CatchField.action(
                              copy: copy,
                              title: l10n.hostsPrivateEventDetailPickLocation,
                              body: details?.meetingLocation == null
                                  ? l10n.hostsPrivateEventDetailLocationNeeded
                                  : l10n.hostsPrivateEventDetailLocationReady,
                              icon: CatchIcons.location,
                              onTap: editable
                                  ? () => unawaited(
                                      _chooseLocation(
                                        context,
                                        state,
                                        controller,
                                      ),
                                    )
                                  : null,
                            ),
                            CatchField.input(
                              copy: copy,
                              title: l10n.hostsPrivateEventDetailVenueName,
                              contractExemption:
                                  'Blank issues a clear intent; set values use the generated venue contract.',
                              initialValue: currentVenue ?? '',
                              inputHint: l10n.hostsPrivateEventDetailVenueHint,
                              inputMode: editable
                                  ? CatchTextInputMode.editable
                                  : CatchTextInputMode.inactive,
                              maxLength: CatchContractConstraints
                                  .updatePrivateEventDetailsCallablePayloadDetailsVenueValueName
                                  .maxLength,
                              labelMode: CatchFieldLabelTextMode.optional,
                              onValidate: (value) =>
                                  value?.trim().isNotEmpty == true &&
                                      !acceptsContractValue(
                                        CatchContractConstraints
                                            .updatePrivateEventDetailsCallablePayloadDetailsVenueValueName,
                                        value!.trim(),
                                      )
                                  ? l10n.hostsEventPreferenceInvalidValue
                                  : null,
                              onSubmitted: editable
                                  ? (text) {
                                      final name = text.trim();
                                      if (name.isEmpty) {
                                        unawaited(
                                          controller.save(
                                            const PrivateEventDetailsPatch(
                                              venue: EventSetupValue.clear(),
                                            ),
                                          ),
                                        );
                                        return;
                                      }
                                      if (!acceptsContractValue(
                                        CatchContractConstraints
                                            .updatePrivateEventDetailsCallablePayloadDetailsVenueValueName,
                                        name,
                                      )) {
                                        controller.reportValidationError(
                                          const FormatException(
                                            'Invalid event venue',
                                          ),
                                        );
                                        return;
                                      }
                                      unawaited(
                                        controller.save(
                                          PrivateEventDetailsPatch(
                                            meetingLocation: details
                                                ?.meetingLocation
                                                ?.copyWith(name: name),
                                            venue:
                                                details?.meetingLocation == null
                                                ? EventSetupValue.set(name)
                                                : null,
                                          ),
                                        ),
                                      );
                                    }
                                  : null,
                            ),
                            CatchField.action(
                              copy: copy,
                              title: l10n.hostsPrivateEventDetailUseSavedPlace,
                              body: suggestedVenue == null
                                  ? l10n.hostsPrivateEventDetailNoSavedPlace
                                  : l10n.hostsPrivateEventDetailSavedPlaceHint,
                              onTap: editable && suggestedVenue != null
                                  ? () => unawaited(
                                      controller.save(
                                        const PrivateEventDetailsPatch(
                                          venue: EventSetupValue.inherit(),
                                        ),
                                      ),
                                    )
                                  : null,
                            ),
                            CatchField.action(
                              copy: copy,
                              title: l10n.hostsPrivateEventDetailClearVenue,
                              onTap: editable && currentVenue != null
                                  ? () => unawaited(
                                      controller.save(
                                        const PrivateEventDetailsPatch(
                                          venue: EventSetupValue.clear(),
                                        ),
                                      ),
                                    )
                                  : null,
                            ),
                          ],
                        ),
                        CatchSection.fieldRows(
                          title: l10n.hostsPrivateEventDetailFormat,
                          children: [
                            CatchField.read(
                              copy: copy,
                              title: l10n.hostsPrivateEventDetailCurrentFormat,
                              body:
                                  currentFormat?.label ??
                                  l10n.hostsPrivateEventDetailNotSet,
                              icon: CatchIcons.eventConfirmed,
                            ),
                            CatchField<ActivityKind>.control(
                              copy: copy,
                              title: l10n.hostsPrivateEventDetailFormat,
                              contractExemption:
                                  'Activity choice writes a versioned event format.',
                              child: CatchChoiceInput<ActivityKind>(
                                values: ActivityKind.values,
                                itemLabelBuilder: (kind) => kind.label,
                                selected: currentFormat == null
                                    ? const <ActivityKind>{}
                                    : {currentFormat.activityKind},
                                mode: CatchChipMode.single,
                                autoClose: true,
                                onChanged: state.canEditFormat
                                    ? (selection) {
                                        if (selection.isEmpty) return;
                                        unawaited(
                                          controller.save(
                                            PrivateEventDetailsPatch(
                                              itinerary: details?.itinerary
                                                  .map(
                                                    (item) => item.copyWith(
                                                      routeDistanceMeters: null,
                                                    ),
                                                  )
                                                  .toList(),
                                              eventFormat: EventSetupValue.set(
                                                EventFormatSnapshot.fromActivityKind(
                                                  selection.single,
                                                ),
                                              ),
                                            ),
                                          ),
                                        );
                                      }
                                    : null,
                              ),
                            ),
                            CatchField.action(
                              copy: copy,
                              title: l10n.hostsPrivateEventDetailClearFormat,
                              onTap:
                                  state.canEditFormat && currentFormat != null
                                  ? () => unawaited(
                                      controller.save(
                                        PrivateEventDetailsPatch(
                                          itinerary: details?.itinerary
                                              .map(
                                                (item) => item.copyWith(
                                                  routeDistanceMeters: null,
                                                ),
                                              )
                                              .toList(),
                                          eventFormat:
                                              const EventSetupValue.clear(),
                                        ),
                                      ),
                                    )
                                  : null,
                            ),
                          ],
                        ),
                        if (event != null)
                          PrivateEventContentSection(
                            state: state,
                            controller: controller,
                          ),
                        if (event != null)
                          HostPrivateEventListingSection(
                            key: ValueKey(
                              '${event.eventId}:${event.city.cityId}',
                            ),
                            state: state,
                            controller: controller,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
