part of 'event_detail_screen.dart';

mixin _EventDetailScreenActions on ConsumerState<EventDetailScreen> {
  void _toggleSavedEvent(
    BuildContext context, {
    required Event event,
    required String organizerId,
    required UserProfile? userProfile,
    required bool isAuthenticated,
    required bool isSaved,
    required DateTime now,
  }) {
    if (!isAuthenticated ||
        !eventDetailHasBookingReadyProfile(userProfile, now: now)) {
      if (!isAuthenticated) {
        _openEventSignIn(context, organizerId: organizerId, eventId: event.id);
      } else {
        _openEventProfileCompletion(
          context,
          organizerId: organizerId,
          eventId: event.id,
        );
      }
      return;
    }
    final readyProfile = userProfile!;
    final failureReason = context
        .l10n
        .eventsEventDetailScreenVisiblecopyEventdetailscreenTogglesavedeventFailed;

    unawaited(
      EventDetailController.toggleSavedEventMutation
          .run(ref, (tx) async {
            final nowSaved = await tx
                .get(eventDetailControllerProvider.notifier)
                .toggleSavedEvent(
                  event: event,
                  userProfile: readyProfile,
                  isSaved: isSaved,
                );
            if (!context.mounted) return nowSaved;
            showCatchNotice(
              context,
              nowSaved
                  ? context.l10n.eventsEventDetailScreenVisiblecopyEventSaved
                  : context.l10n.eventsEventDetailScreenVisiblecopyEventRemoved,
            );
            return nowSaved;
          })
          .catchError((Object error, StackTrace stackTrace) {
            ref
                .read(errorLoggerProvider)
                .logError(error, stackTrace, reason: failureReason);
            return isSaved;
          }),
    );
  }

  Future<void> _messageHost(
    BuildContext context, {
    required String organizerId,
    required String hostUid,
    required String eventId,
  }) async {
    final matchId = await OrganizerHostContactController
        .startConversationMutation
        .run(
          ref,
          (tx) => tx
              .get(organizerHostContactControllerProvider.notifier)
              .startConversation(
                organizerId: organizerId,
                hostUid: hostUid,
                eventId: eventId,
              ),
        );
    if (!context.mounted) return;
    unawaited(
      context.pushNamed(
        Routes.chatScreen.name,
        pathParameters: {'matchId': matchId},
      ),
    );
  }
}

bool _canAddEventToCalendar({
  required Event event,
  required EventParticipation? participation,
  required bool isHost,
  required DateTime now,
}) {
  if (event.isCancelled || !event.startTime.isAfter(now)) return false;
  if (isHost) return true;
  return participation?.status == EventParticipationStatus.signedUp;
}

EventDetailSurfaceStyle _eventDetailSurfaceStyle(
  BuildContext context, {
  required EventDetailPresentationMode presentationMode,
}) {
  final t = CatchTokens.of(context);
  if (presentationMode == EventDetailPresentationMode.spotlightDark) {
    return EventDetailSurfaceStyle.dark(t);
  }
  return EventDetailSurfaceStyle.light(
    t,
    useWhite: presentationMode == EventDetailPresentationMode.ticket,
  );
}

bool _showsEventDetailBottomNavigation({
  required Event event,
  required UserProfile? userProfile,
  required bool isAuthenticated,
  required OrganizerSupplyCapabilities organizerCapabilities,
  required DateTime now,
  required EventDetailSectionVisibilityState sectionVisibility,
}) {
  if (!organizerCapabilities.bookable) return false;
  if (!sectionVisibility.showBottomNavigation) return false;

  if (!isAuthenticated) {
    return !event.isCancelled && event.startTime.isAfter(now);
  }

  if (!sectionVisibility.showConsumerActions) {
    return false;
  }

  if (!eventDetailHasBookingReadyProfile(userProfile, now: now)) {
    return !event.isCancelled && event.startTime.isAfter(now);
  }

  return true;
}

void _openEventSignIn(
  BuildContext context, {
  required String organizerId,
  required String eventId,
  String? inviteCode,
  String? inviteLinkId,
}) {
  context.go(
    Uri(
      path: Routes.authScreen.path,
      queryParameters: {
        'from': AppDeepLinks.inAppEventPath(
          organizerId: organizerId,
          eventId: eventId,
          inviteCode: inviteCode,
          inviteLinkId: inviteLinkId,
        ),
      },
    ).toString(),
  );
}

void _openEventProfileCompletion(
  BuildContext context, {
  required String organizerId,
  required String eventId,
  Event? event,
}) {
  unawaited(
    context.push(
      profileCompletionLocation(
        eventRequirements: [
          if (event?.requiresAgeDetails == true) 'ageRestricted',
          if (event?.requiresCohortDetails == true) 'cohortRestricted',
        ],
        from: AppDeepLinks.inAppEventPath(
          organizerId: organizerId,
          eventId: eventId,
        ),
      ),
    ),
  );
}

Future<void> _shareEvent(
  BuildContext context,
  Event event,
  ExternalShareController share,
  AttendeeEventShareActions actions,
  bool useAttendeeAttribution,
  String? inviteCode,
  String? inviteLinkId,
) async {
  if (useAttendeeAttribution) {
    await showTrackedAttendeeEventShareCardSheet(
      context,
      event: event,
      share: share,
      actions: actions,
      fallbackInviteCode: inviteCode,
      fallbackInviteLinkId: inviteLinkId,
    );
    return;
  }
  await showEventShareCardSheet(
    context,
    event: event,
    share: share,
    inviteCode: inviteCode,
    inviteLinkId: inviteLinkId,
  );
}

Future<void> _addEventToCalendar(
  BuildContext context,
  Event event,
  EventCalendarController calendar,
) async {
  try {
    final opened = await calendar.addToCalendar(event);
    if (!context.mounted || opened) return;
    showCatchNotice(
      context,
      context.l10n.eventsEventDetailScreenVisiblecopyCouldNotOpenCalendar,
    );
  } on Object catch (error, stackTrace) {
    final actionError = ExternalActionException(
      context.l10n.eventsEventDetailScreenVisiblecopyFailedToAddEvent,
      cause: error,
      stackTrace: stackTrace,
    );

    if (context.mounted) {
      app_ops.logAppError(
        actionError,
        stackTrace: stackTrace,
        context: app_ops.AppErrorContext(
          operation: app_ops.AppOperation.plugin,
          action:
              context.l10n.eventsEventDetailScreenVisiblecopyAddEventToCalendar,
          resource: context.l10n.eventsEventDetailScreenVisiblecopyCalendarLink,
        ),
        logError: ProviderScope.containerOf(
          context,
          listen: false,
        ).read(errorLoggerProvider),
      );

      showCatchNotice(
        context,
        context.l10n.eventsEventDetailScreenVisiblecopyCouldNotOpenCalendar,
      );
    }
  }
}
