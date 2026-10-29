part of 'event_repository.dart';

/// Exact UTF-8 wire admission before an attachment can have an unknown outcome.
Map<String, Object?> boundedEventPhotoAttachmentPayload({
  required Event event,
  required String requestId,
  required String expectedMediaHash,
}) {
  Map<String, int> stamp(DateTime value) => {
    '_seconds': value.microsecondsSinceEpoch ~/ 1000000,
    '_nanoseconds': value.microsecondsSinceEpoch.remainder(1000000) * 1000,
  };
  final fields = <String, Object?>{
    'photoUrl': event.eventPhotos.first.url,
    'eventPhotos': [
      for (final photo in event.eventPhotos)
        {
          ...photo.toJson(),
          'createdAt': stamp(photo.createdAt),
          'updatedAt': stamp(photo.updatedAt),
        },
    ],
  };
  final mediaRecovery = <String, Object?>{
    'organizerId': event.organizerId,
    'requestId': requestId,
    'expectedMediaHash': expectedMediaHash,
  };
  final payload = UpdateEventCallableRequest(
    eventId: event.id,
    mediaRecovery: mediaRecovery,
    fields: fields,
  ).toJson();
  // Match updateEventMediaRecovery's byte admission, including UTF-8 strings.
  if (utf8.encode(jsonEncode([mediaRecovery, fields])).length > 64 * 1024) {
    throw const ValidationException(
      'These photos exceed the saved-event photo request limit. '
      'Select fewer photos and retry on this event.',
      code: 'event-photo-request-too-large',
    );
  }
  return payload;
}

mixin EventRepositoryActions {
  FirebaseFunctions get _functions;

  // ── Write ─────────────────────────────────────────────────────────────────

  Future<void> createEvent({
    required Event event,
    String? inviteCode,
    EventSuccessDefaults? eventSuccessDefaults,
    ExternalEventOriginInput? externalOrigin,
    EventRuntimeWalkInPolicy? runtimeWalkInPolicy,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('createEvent')
        .call(
          createEventCallableRequestFromEvent(
            event,
            inviteCode: inviteCode,
            eventSuccessDefaults: eventSuccessDefaults,
            externalOrigin: externalOrigin,
            runtimeWalkInPolicy: runtimeWalkInPolicy,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'create event',
      resource: _collectionPath,
    ),
  );

  Future<void> updateEventDetails({
    required Event event,
    bool includePolicy = false,
    String? inviteCode,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('updateEvent')
        .call(
          updateEventCallableRequestFromEvent(
            event,
            includePolicy: includePolicy,
            inviteCode: inviteCode,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'update event',
      resource: _collectionPath,
    ),
  );

  /// Media-only recovery for an already committed legacy create. Request ID
  /// and reviewed media identity survive ambiguous responses unchanged.
  Future<Map<Object?, Object?>> attachEventPhotos({
    required Event event,
    required String requestId,
    required String expectedMediaHash,
  }) => withBackendErrorContext(
    () async {
      final payload = boundedEventPhotoAttachmentPayload(
        event: event,
        requestId: requestId,
        expectedMediaHash: expectedMediaHash,
      );
      final result = await _functions
          .httpsCallable('updateEvent')
          .call<Object?>(payload);
      final data = result.data;
      if (data is! Map || data['updated'] != true || data['receipt'] is! Map) {
        throw const FormatException('Invalid event photo attachment response');
      }
      return Map<Object?, Object?>.from(data['receipt'] as Map);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'attach saved event photos',
      resource: _collectionPath,
    ),
  );

  Future<void> configurePublicRegistration({
    required Event event,
    required EventPublicRegistrationMode mode,
    required String requestId,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('configureEventRegistration')
          .call({
            'organizerId': event.organizerId,
            'eventId': event.id,
            'requestId': requestId,
            'expectedRegistrationRevision': event.publicRegistrationRevision,
            'mode': mode.name,
          });
      final data = result.data;
      if (data is! Map ||
          data['eventId'] != event.id ||
          data['mode'] != mode.name ||
          data['registrationRevision'] !=
              event.publicRegistrationRevision + 1 ||
          data['replayed'] is! bool) {
        throw const FormatException(
          'Invalid registration configuration response',
        );
      }
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'configure public event registration',
      resource: _collectionPath,
    ),
  );

  /// Cancels a hosted event via the [cancelEvent] Cloud Function.
  ///
  /// The backend verifies the signed-in user hosts the club, marks the event
  /// cancelled, releases schedule projections, and notifies participants.
  Future<void> cancelEvent({required String eventId, String? reason}) =>
      withBackendErrorContext(
        () => _functions
            .httpsCallable('cancelEvent')
            .call(
              CancelEventCallableRequest(
                eventId: eventId,
                reason: reason,
              ).toJson(),
            ),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'cancel event',
          resource: _collectionPath,
        ),
      );

  /// Deletes an unused hosted event via the [deleteEvent] Cloud Function.
  ///
  /// Events with bookings, payments, reviews, or other activity must be
  /// cancelled instead so history remains auditable.
  Future<void> deleteEvent({required String eventId}) =>
      withBackendErrorContext(
        () => _functions
            .httpsCallable('deleteEvent')
            .call(EventIdCallableRequest(eventId: eventId).toJson()),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'delete event',
          resource: _collectionPath,
        ),
      );

  /// Cancels the current user's sign-up via the [cancelEventSignUp] Cloud
  /// Function, which atomically updates their participation edge and aggregate
  /// booking projections.
  Future<void> cancelSignUpViaFunction({required String eventId}) =>
      withBackendErrorContext(
        () => _functions
            .httpsCallable('cancelEventSignUp')
            .call(EventIdCallableRequest(eventId: eventId).toJson()),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'cancel sign-up',
          resource: _collectionPath,
        ),
      );

  Future<void> joinWaitlistViaFunction({
    required String eventId,
    String? inviteCode,
    String? inviteLinkId,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('joinEventWaitlist')
        .call(
          EventIdCallableRequest(
            eventId: eventId,
            inviteCode: inviteCode,
            inviteLinkId: inviteLinkId,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'join waitlist',
      resource: _collectionPath,
    ),
  );

  Future<CreateEventInviteLinkCallableResponse> createInviteLink({
    required String eventId,
    required String label,
    String? source,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('createEventInviteLink')
          .call(
            CreateEventInviteLinkCallableRequest(
              eventId: eventId,
              label: label,
              source: source,
            ).toJson(),
          );
      return CreateEventInviteLinkCallableResponse.fromCallableData(
        result.data,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'create invite link',
      resource: 'eventInviteLinks',
    ),
  );

  Future<CreateEventInviteLinkCallableResponse> createAttendeeInviteLink({
    required String eventId,
    required String label,
    required String destinationKind,
    String? source,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('createAttendeeInviteLink')
          .call(
            CreateEventInviteLinkCallableRequest(
              eventId: eventId,
              label: label,
              source: source,
              linkKind: 'attendeeReferrer',
              destinationKind: destinationKind,
            ).toJson(),
          );
      return CreateEventInviteLinkCallableResponse.fromCallableData(
        result.data,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'create attendee invite link',
      resource: 'eventInviteLinks',
    ),
  );

  Future<void> recordShareIntent({
    required String eventId,
    required String inviteLinkId,
    required String surface,
    String? creativeId,
    String? channelHint,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('recordEventShareIntent')
        .call(
          RecordEventShareIntentCallableRequest(
            eventId: eventId,
            inviteLinkId: inviteLinkId,
            surface: surface,
            creativeId: creativeId,
            channelHint: channelHint,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'record event share intent',
      resource: 'eventShareIntents',
    ),
  );

  Future<void> disableInviteLink({
    required String eventId,
    required String inviteLinkId,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('disableEventInviteLink')
        .call(
          DisableEventInviteLinkCallableRequest(
            eventId: eventId,
            inviteLinkId: inviteLinkId,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'disable invite link',
      resource: 'eventInviteLinks',
    ),
  );

  Future<String> getInviteLinkToken({
    required String eventId,
    required String inviteLinkId,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('getEventInviteLinkToken')
          .call(
            GetEventInviteLinkTokenCallableRequest(
              eventId: eventId,
              inviteLinkId: inviteLinkId,
            ).toJson(),
          );
      if (result.data case {'inviteToken': final String token}) return token;
      throw StateError('getEventInviteLinkToken response was missing token.');
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'get invite link token',
      resource: 'eventInviteLinkSecrets',
    ),
  );

  Future<RecordEventInviteLinkOpenCallableResponse> recordInviteLinkOpen({
    required String eventId,
    required String inviteLinkId,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('recordEventInviteLinkOpen')
          .call(
            RecordEventInviteLinkOpenCallableRequest(
              eventId: eventId,
              inviteLinkId: inviteLinkId,
            ).toJson(),
          );
      return RecordEventInviteLinkOpenCallableResponse.fromCallableData(
        result.data,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'record invite link open',
      resource: 'eventInviteLinks',
    ),
  );

  Future<void> leaveWaitlist({required String eventId}) =>
      withBackendErrorContext(
        () => _functions
            .httpsCallable('leaveEventWaitlist')
            .call(EventIdCallableRequest(eventId: eventId).toJson()),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'leave waitlist',
          resource: _collectionPath,
        ),
      );

  Future<CreateWaitlistOffersCallableResponse> createWaitlistOffers({
    required String eventId,
    required List<String> userIds,
    int? expiresInMinutes,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('createEventWaitlistOffers')
          .call(
            CreateEventWaitlistOffersCallableRequest(
              eventId: eventId,
              userIds: userIds,
              expiresInMinutes: expiresInMinutes,
            ).toJson(),
          );
      return CreateWaitlistOffersCallableResponse.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'create waitlist offers',
      resource: _collectionPath,
    ),
  );

  Future<WaitlistOfferAcceptanceCallableResponse> acceptWaitlistOffer({
    required String eventId,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('acceptEventWaitlistOffer')
          .call(EventIdCallableRequest(eventId: eventId).toJson());
      return WaitlistOfferAcceptanceCallableResponse.fromCallableData(
        result.data,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'accept waitlist offer',
      resource: _collectionPath,
    ),
  );

  Future<void> declineWaitlistOffer({required String eventId}) =>
      withBackendErrorContext(
        () => _functions
            .httpsCallable('declineEventWaitlistOffer')
            .call(EventIdCallableRequest(eventId: eventId).toJson()),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'decline waitlist offer',
          resource: _collectionPath,
        ),
      );

  /// Approves or declines a request-to-join participation via the
  /// [decideEventJoinRequest] Cloud Function.
  ///
  /// The backend verifies host ownership and applies the final policy checks.
  Future<void> decideJoinRequest({
    required String eventId,
    required String userId,
    required String decision,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('decideEventJoinRequest')
        .call(
          EventJoinRequestDecisionCallableRequest(
            eventId: eventId,
            userId: userId,
            decision: decision,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'review join request',
      resource: _collectionPath,
    ),
  );

  /// Toggles attendance for a single user via the [markEventAttendance] Cloud
  /// Function. Only callable by the club's host.
  /// Returns `true` if the user is now marked attended, `false` if removed.
  Future<bool> markAttendance({
    required String eventId,
    required String userId,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('markEventAttendance')
          .call(
            MarkEventAttendanceCallableRequest(
              eventId: eventId,
              userId: userId,
            ).toJson(),
          );
      return MarkEventAttendanceCallableResponse.fromCallableData(
        result.data,
      ).attended;
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'mark attendance',
      resource: _collectionPath,
    ),
  );

  /// Self-check-in for a signed-up participant via the
  /// [selfCheckInAttendance] Cloud Function.
  ///
  /// Passes the current signed Host venue-session token. Printable event links
  /// and location claims carry no attendance authority.
  Future<void> selfCheckInAttendance({
    required String eventId,
    required String venueSessionToken,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('selfCheckInAttendance')
        .call(
          SelfCheckInAttendanceCallableRequest(
            eventId: eventId,
            venueSessionToken: venueSessionToken,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'self check-in',
      resource: _collectionPath,
    ),
  );

  Future<EventVenueSession> createVenueSession({required String eventId}) =>
      withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable('createEventVenueSession')
              .call<Object?>(
                CreateEventVenueSessionCallableRequest(
                  eventId: eventId,
                ).toJson(),
              );
          return EventVenueSession.fromCallableData(result.data);
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'refresh live venue QR',
          resource: 'eventVenueSessions',
        ),
      );

  Future<SendEventBroadcastCallableResponse> sendEventBroadcast({
    required String requestId,
    required String eventId,
    required EventBroadcastAudience audience,
    required String body,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('sendEventBroadcast')
          .call<Object?>(
            SendEventBroadcastCallableRequest(
              requestId: requestId,
              eventId: eventId,
              audience: audience.name,
              body: body,
            ).toJson(),
          );
      return SendEventBroadcastCallableResponse.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'send event broadcast',
      resource: 'eventBroadcasts',
    ),
  );
}
