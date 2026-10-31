import 'dart:typed_data';

import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/audience/data/host_roster_file_parser.dart';
import 'package:catch_dating_app/contexts/audience/data/host_roster_file_service.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/organizer_event_venue_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/organizer_event_venue.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_photo_recovery_controller.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_photo_recovery_controller.dart';

part 'create_event_controller.g.dart';

class PickedEventPhoto {
  const PickedEventPhoto({required this.image, required this.bytes});

  final XFile image;
  final Uint8List bytes;
}

/// **Pattern A: Action controller + static Mutations**
///
/// Validates input and delegates event creation to [EventRepository].
/// [submitMutation] carries the created [Event] on success so the UI can
/// navigate to the event detail screen.
@riverpod
class CreateEventController extends _$CreateEventController {
  static final submitMutation = Mutation<Event>();
  static final saveVenueMutation = Mutation<OrganizerEventVenue>();

  @override
  void build() {}

  Future<OrganizerEventVenue> saveVenue({
    required String organizerId,
    required EventMeetingLocation meetingLocation,
    String? venueId,
    int? defaultEventCapacity,
  }) async {
    requireSignedInUid(ref, action: 'save a reusable event venue');
    return ref
        .read(organizerEventVenueRepositoryProvider)
        .upsert(
          organizerId: organizerId,
          venueId: venueId,
          label: meetingLocation.name,
          meetingLocation: meetingLocation.toJson(),
          defaultEventCapacity: defaultEventCapacity,
        );
  }

  Future<HostRosterTable?> pickRosterFile({
    ExternalBookingProvider? providerHint,
  }) async {
    final file = await ref.read(hostRosterFileServiceProvider).pickRosterFile();
    if (file == null) return null;
    return parseHostRosterFile(
      fileName: file.name,
      bytes: file.bytes,
      providerHint: providerHint,
    );
  }

  Future<EventAttendeeImportResult> importRoster({
    required String eventId,
    required HostRosterImportPlan plan,
  }) => ref
      .read(eventAttendeeRepositoryProvider)
      .importAttendees(
        eventId: eventId,
        importKey: hostRosterImportKey(
          format: plan.format,
          rows: plan.rows,
          fileName: plan.fileName,
        ),
        fileName: plan.fileName,
        format: plan.format,
        rows: plan.rows,
      );

  Future<PickedEventPhoto?> pickEventPhoto({int imageQuality = 82}) async {
    final image = await ref
        .read(imageUploadRepositoryProvider)
        .pickImage(
          purpose: ImageUploadPurpose.eventPhoto,
          imageQuality: imageQuality,
        );
    if (image == null) {
      return null;
    }

    return PickedEventPhoto(image: image, bytes: await image.readAsBytes());
  }

  Future<List<PickedEventPhoto>> pickEventPhotos({
    int imageQuality = 82,
    int? limit,
  }) async {
    final images = await ref
        .read(imageUploadRepositoryProvider)
        .pickImages(
          purpose: ImageUploadPurpose.eventPhoto,
          imageQuality: imageQuality,
          limit: limit,
        );
    return [
      for (final image in images)
        PickedEventPhoto(image: image, bytes: await image.readAsBytes()),
    ];
  }

  Future<Event> submit({
    required String organizerId,
    required String name,
    required DateTime startTime,
    required DateTime endTime,
    required EventMeetingLocation meetingLocation,
    String? sourceVenueId,
    String? sourceDraftId,
    required EventFormatSnapshot eventFormat,
    required double distanceKm,
    required PaceLevel pace,
    required String description,
    required String currency,
    required EventConstraints constraints,
    required EventPolicyBundle eventPolicy,
    List<EventItineraryItem> itinerary = const [],
    String? inviteCode,
    XFile? photoImage,
    List<XFile> photoImages = const [],
    EventSuccessDefaults eventSuccessDefaults = const EventSuccessDefaults(),
    ExternalEventOriginInput? externalOrigin,
    EventRuntimeWalkInPolicy? runtimeWalkInPolicy,
  }) async {
    final normalizedOrganizerId = _requireNonBlank(
      organizerId,
      fieldName: 'organizerId',
      code: 'event-club-required',
    );
    final normalizedName = _requireNonBlank(
      name,
      fieldName: 'name',
      code: 'event-name-required',
    );
    final normalizedMeetingLocation = _requireMeetingLocation(meetingLocation);
    final normalizedDescription = description.trim();

    if (!endTime.isAfter(startTime)) {
      throw ArgumentError.value(
        endTime,
        'endTime',
        'Event end time must be after the start time.',
      );
    }
    if (eventFormat.isDistanceBased && distanceKm <= 0) {
      throw ArgumentError.value(
        distanceKm,
        'distanceKm',
        'Distance must be greater than zero.',
      );
    }
    if (!eventFormat.isDistanceBased && distanceKm < 0) {
      throw ArgumentError.value(
        distanceKm,
        'distanceKm',
        'Distance cannot be negative.',
      );
    }
    if (eventPolicy.capacityLimit < 1) {
      throw ArgumentError.value(
        eventPolicy.capacityLimit,
        'eventPolicy.capacityLimit',
        'Capacity limit must be at least 1.',
      );
    }
    if (eventPolicy.basePriceInPaise < 0) {
      throw ArgumentError.value(
        eventPolicy.basePriceInPaise,
        'eventPolicy.basePriceInPaise',
        'Price cannot be negative.',
      );
    }
    final normalizedInviteCode = _trimToNull(inviteCode);
    if (eventPolicy.usesInviteOnly &&
        (normalizedInviteCode == null || normalizedInviteCode.length < 4)) {
      throw ArgumentError.value(
        inviteCode,
        'inviteCode',
        'Invite-only events need a code of at least 4 characters.',
      );
    }
    final eventRepo = ref.read(eventRepositoryProvider);
    final eventId = eventRepo.generateId();
    final event = Event(
      id: eventId,
      organizerId: normalizedOrganizerId,
      name: normalizedName,
      startTime: startTime,
      endTime: endTime,
      meetingPoint: normalizedMeetingLocation.name,
      meetingLocation: normalizedMeetingLocation,
      sourceVenueId: sourceVenueId,
      startingPointLat: normalizedMeetingLocation.latitude,
      startingPointLng: normalizedMeetingLocation.longitude,
      locationDetails: normalizedMeetingLocation.notes,
      itinerary: itinerary,
      eventFormat: eventFormat,
      distanceKm: distanceKm,
      pace: pace,
      capacityLimit: eventPolicy.capacityLimit,
      description: normalizedDescription,
      priceInPaise: eventPolicy.basePriceInPaise,
      currency: currency,
      constraints: constraints,
      eventPolicy: eventPolicy,
      eventOrigin: externalOrigin == null
          ? null
          : EventOrigin(
              mode: EventOriginMode.externalCompanion,
              bookingAuthority: EventBookingAuthority.external,
              rosterAuthority: EventRosterAuthority.hostImport,
              provider: externalOrigin.provider,
              externalEventId: externalOrigin.externalEventId,
              externalEventUrl: externalOrigin.externalEventUrl,
              sourceExternalEventId: externalOrigin.sourceExternalEventId,
              adapterVersion: externalOrigin.adapterVersion,
            ),
    );
    final reportCreated = ref
        .read(appAnalyticsProvider)
        .hostEventCompletion(AnalyticsEvents.hostEventCreated);
    final selected = List<XFile>.unmodifiable(
      photoImages.isNotEmpty ? photoImages : [?photoImage],
    );
    return ref
        .read(
          createEventPhotoRecoveryControllerProvider(
            normalizedOrganizerId,
          ).notifier,
        )
        .create(
          event: event,
          photos: selected,
          sourceDraftId: sourceDraftId,
          commit: () async {
            await eventRepo.createEvent(
              event: event,
              inviteCode: normalizedInviteCode,
              eventSuccessDefaults: eventSuccessDefaults.enabled
                  ? eventSuccessDefaults.normalizedForFormat(
                      event.eventFormat,
                      targetAttendeeCount: event.capacityLimit,
                    )
                  : null,
              externalOrigin: externalOrigin,
              runtimeWalkInPolicy: runtimeWalkInPolicy,
            );
            reportCreated();
          },
        );
  }
}

EventMeetingLocation _requireMeetingLocation(EventMeetingLocation location) {
  final normalized = location.normalized();
  _requireNonBlank(
    normalized.name,
    fieldName: 'meetingLocation.name',
    code: 'event-meeting-location-required',
  );
  _requireStartingPoint(
    latitude: normalized.latitude,
    longitude: normalized.longitude,
  );
  return normalized;
}

void _requireStartingPoint({
  required double latitude,
  required double longitude,
}) {
  if (latitude < -90 || latitude > 90) {
    throw ArgumentError.value(
      latitude,
      'startingPointLat',
      'Invalid latitude.',
    );
  }
  if (longitude < -180 || longitude > 180) {
    throw ArgumentError.value(
      longitude,
      'startingPointLng',
      'Invalid longitude.',
    );
  }
}

String _requireNonBlank(
  String value, {
  required String fieldName,
  required String code,
}) {
  final normalized = value.trim();
  if (normalized.isEmpty) {
    throw ValidationException(
      'Required event field was empty: $fieldName.',
      code: code,
      debugMessage: 'Required event field was empty: $fieldName.',
    );
  }
  return normalized;
}

String? _trimToNull(String? value) {
  final normalized = value?.trim();
  if (normalized == null || normalized.isEmpty) return null;
  return normalized;
}
