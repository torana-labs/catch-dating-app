import 'package:catch_dating_app/platform/app_config.dart';
import 'package:flutter/foundation.dart';

enum AppRouteAudience { shared, consumer, host }

enum Routes {
  loadingScreen('/loading', AppRouteAudience.shared),
  startScreen('/start', AppRouteAudience.shared),
  authScreen('/auth', AppRouteAudience.shared),
  onboardingScreen('/onboarding', AppRouteAudience.consumer),
  calendarScreen('/calendar', AppRouteAudience.consumer),
  calendarEventDetailScreen(
    '/calendar/organizers/:clubId/events/:eventId',
    AppRouteAudience.consumer,
  ),
  savedEventsScreen('/saved-events', AppRouteAudience.consumer),
  savedEventDetailScreen(
    '/saved-events/organizers/:clubId/events/:eventId',
    AppRouteAudience.consumer,
  ),
  filtersScreen('/filters', AppRouteAudience.consumer),
  dashboardEventDetailScreen(
    '/dashboard/organizers/:clubId/events/:eventId',
    AppRouteAudience.consumer,
  ),
  eventChatScreen('/events/:eventId/chat', AppRouteAudience.shared),
  eventProfileSharingScreen(
    '/events/:eventId/chat/profile',
    AppRouteAudience.shared,
  ),
  eventChatParticipantsScreen(
    '/events/:eventId/chat/people',
    AppRouteAudience.shared,
  ),
  eventParticipantProfileScreen(
    '/events/:eventId/chat/people/:participantUid',
    AppRouteAudience.shared,
  ),
  eventLocationMapScreen('/events/:eventId/location', AppRouteAudience.shared),
  dashboardScreen('/', AppRouteAudience.consumer),
  notificationsScreen('/notifications', AppRouteAudience.consumer),
  crossPathsInvitationScreen(
    '/cross-paths/invitations/:invitationId',
    AppRouteAudience.consumer,
  ),
  exploreScreen('/organizers', AppRouteAudience.consumer),
  exploreMapScreen('/organizers/map', AppRouteAudience.consumer),
  organizerDetailScreen('/organizers/:clubId', AppRouteAudience.consumer),
  eventDetailScreen(
    '/organizers/:clubId/events/:eventId',
    AppRouteAudience.consumer,
  ),
  eventSuccessCompanionScreen(
    '/organizers/:clubId/events/:eventId/companion',
    AppRouteAudience.consumer,
  ),
  swipeHubScreen('/catches', AppRouteAudience.consumer),
  swipeEventScreen('/catches/:eventId', AppRouteAudience.consumer),
  eventRecapScreen('/catches/:eventId/recap', AppRouteAudience.consumer),
  matchesListScreen('/chats', AppRouteAudience.consumer),
  chatScreen('/chats/:matchId', AppRouteAudience.consumer),
  profileScreen('/you', AppRouteAudience.consumer),
  formProfilesScreen('/you/forms', AppRouteAudience.consumer),
  formProfileReviewScreen('/you/forms/:responseId', AppRouteAudience.consumer),
  reviewsHistoryScreen('/you/reviews', AppRouteAudience.consumer),
  publicProfileScreen('/profiles/:uid', AppRouteAudience.consumer),
  settingsScreen('/settings', AppRouteAudience.consumer),
  messagingPermissionsScreen('/settings/whatsapp', AppRouteAudience.consumer),
  launchAccessScreen('/settings/launch-access', AppRouteAudience.consumer),
  paymentHistoryScreen('/payment-history', AppRouteAudience.consumer),
  myMembershipsScreen('/memberships', AppRouteAudience.consumer),
  paymentConfirmationScreen('/payment-confirmation', AppRouteAudience.consumer),
  hostHomeScreen('/host', AppRouteAudience.host),
  hostTodayScreen('/host/today', AppRouteAudience.host),
  hostTodayFocusScreen('/host/today/focus', AppRouteAudience.host),
  hostEventsScreen('/host/events', AppRouteAudience.host),
  hostAudienceScreen('/host/audience', AppRouteAudience.host),
  hostNewMessageScreen('/host/inbox/new', AppRouteAudience.host),
  hostEventRosterScreen(
    '/host/organizers/:clubId/events/:eventId/guests',
    AppRouteAudience.host,
  ),
  hostEventPublicationScreen(
    '/host/organizers/:clubId/events/:eventId/publication',
    AppRouteAudience.host,
  ),
  hostResponseOfferScreen(
    '/host/audience/responses/:responseId/offer',
    AppRouteAudience.host,
  ),
  hostResponseOfferReviewScreen(
    '/host/audience/responses/:responseId/offer/review',
    AppRouteAudience.host,
  ),
  hostResponseOfferPreferencesScreen(
    '/host/audience/responses/:responseId/offers/:eventId/preferences',
    AppRouteAudience.host,
  ),
  hostResponseQueryOfferPreferencesScreen(
    '/host/audience/forms/:formId/query-offer/events/:eventId/preferences',
    AppRouteAudience.host,
  ),
  hostResponseQueryOfferScreen(
    '/host/audience/forms/:formId/query-offer',
    AppRouteAudience.host,
  ),
  hostAddCustomerScreen('/host/audience/people/new', AppRouteAudience.host),
  hostCreateSavedAudienceScreen(
    '/host/audience/audiences/new',
    AppRouteAudience.host,
  ),
  hostSavedAudienceDetailScreen(
    '/host/audience/audiences/:audienceId',
    AppRouteAudience.host,
  ),
  hostFormTemplatesScreen('/host/audience/forms/new', AppRouteAudience.host),
  hostFormResponseDetailScreen(
    '/host/audience/responses/:responseId',
    AppRouteAudience.host,
  ),
  hostFormBuilderScreen('/host/audience/forms/:formId', AppRouteAudience.host),
  hostFormPreviewScreen(
    '/host/audience/forms/:formId/preview',
    AppRouteAudience.host,
  ),
  hostFormShareScreen(
    '/host/audience/forms/:formId/share',
    AppRouteAudience.host,
  ),
  hostFormAnalyticsScreen(
    '/host/audience/forms/:formId/analytics',
    AppRouteAudience.host,
  ),
  hostAudienceAutomationsScreen(
    '/host/audience/automations',
    AppRouteAudience.host,
  ),
  hostFormAutomationsScreen(
    '/host/audience/forms/:formId/automations',
    AppRouteAudience.host,
  ),
  hostApplicationsScreen('/host/audience/applications', AppRouteAudience.host),
  hostApplicationDetailScreen(
    '/host/audience/applications/:applicationId',
    AppRouteAudience.host,
  ),
  hostCustomerDetailScreen(
    '/host/audience/people/:contactId',
    AppRouteAudience.host,
  ),
  hostCustomersLegacyScreen('/host/customers', AppRouteAudience.host),
  hostFormsLegacyScreen('/host/forms', AppRouteAudience.host),
  hostOperatorEventScreen('/host/operator/:eventId', AppRouteAudience.host),
  hostWorkScreen('/host/work', AppRouteAudience.host),
  hostWorkEventScreen('/host/work/event/:eventId', AppRouteAudience.host),
  hostWorkProgramScreen('/host/work/:programId', AppRouteAudience.host),
  hostWorkArrivalsScreen(
    '/host/work/:programId/arrivals/:pickupPointId',
    AppRouteAudience.host,
  ),
  hostWorkDispatchScreen(
    '/host/work/:programId/dispatch/:pickupPointId',
    AppRouteAudience.host,
  ),
  hostWorkHotelScreen(
    '/host/work/:programId/hotel/:hotelId',
    AppRouteAudience.host,
  ),
  hostWorkHotelRoomsScreen(
    '/host/work/:programId/hotel/:hotelId/rooms',
    AppRouteAudience.host,
  ),
  hostWorkDoorScreen(
    '/host/work/:programId/door/:functionId',
    AppRouteAudience.host,
  ),
  hostWorkNowScreen('/host/work/:programId/now', AppRouteAudience.host),
  hostWorkAttentionScreen(
    '/host/work/:programId/attention',
    AppRouteAudience.host,
  ),
  hostWorkTripsScreen('/host/work/:programId/trips', AppRouteAudience.host),
  hostWorkGuestsScreen('/host/work/:programId/guests', AppRouteAudience.host),
  hostWorkImportScreen('/host/work/:programId/import', AppRouteAudience.host),
  hostWorkPhoneImportScreen(
    '/host/work/:programId/phone-import',
    AppRouteAudience.host,
  ),
  hostWorkAttendanceReportScreen(
    '/host/work/:programId/attendance',
    AppRouteAudience.host,
  ),
  hostWorkCountsScreen('/host/work/:programId/counts', AppRouteAudience.host),
  // Compatibility redirect for existing program-index links.
  hostProgramsScreen('/host/programs', AppRouteAudience.host),
  hostCreateProgramScreen(
    '/host/organizers/:clubId/create-program',
    AppRouteAudience.host,
  ),
  hostProgramWorkspaceScreen(
    '/host/programs/:programId',
    AppRouteAudience.host,
  ),
  hostProgramLodgingScreen(
    '/host/programs/:programId/lodging',
    AppRouteAudience.host,
  ),
  hostProgramGuestsScreen(
    '/host/programs/:programId/guests',
    AppRouteAudience.host,
  ),
  hostProgramTeamScreen(
    '/host/programs/:programId/team',
    AppRouteAudience.host,
  ),
  hostProgramImportScreen(
    '/host/programs/:programId/import',
    AppRouteAudience.host,
  ),
  hostProgramMomentsScreen(
    '/host/programs/:programId/moments',
    AppRouteAudience.host,
  ),
  hostOrganizerScreen('/host/organizer', AppRouteAudience.host),
  hostOrganizerMessagingScreen(
    '/host/organizer/:clubId/messaging',
    AppRouteAudience.host,
  ),
  hostOrganizersScreen('/host/organizers', AppRouteAudience.host),
  hostOrganizerEventDefaultsScreen(
    '/host/organizers/event-defaults',
    AppRouteAudience.host,
  ),
  hostOrganizerLiveGuideScreen('/host/organizers/live-guide', AppRouteAudience.host),
  hostOrganizerTeamScreen('/host/organizers/team', AppRouteAudience.host),
  hostOrganizerPaymentsScreen('/host/organizers/payments', AppRouteAudience.host),
  hostOrganizerMembershipsScreen(
    '/host/organizers/memberships',
    AppRouteAudience.host,
  ),
  hostOrganizerDetailScreen('/host/organizers/:clubId', AppRouteAudience.host),
  hostCreateOrganizerScreen(
    '/host/organizers/create-organizer',
    AppRouteAudience.host,
  ),
  hostCreateEventScreen(
    '/host/organizers/:clubId/create-event',
    AppRouteAudience.host,
  ),
  hostEventRehearsalStartScreen(
    '/host/organizers/:clubId/rehearsals/new',
    AppRouteAudience.host,
  ),
  hostEventRehearsalScreen(
    '/host/organizers/:clubId/rehearsals/:sessionId',
    AppRouteAudience.host,
  ),
  hostAppEventDetailScreen(
    '/host/organizers/:clubId/events/:eventId',
    AppRouteAudience.host,
  ),
  hostAppEventManageScreen(
    '/host/organizers/:clubId/events/:eventId/manage',
    AppRouteAudience.host,
  ),
  hostAppEditEventScreen(
    '/host/organizers/:clubId/events/:eventId/edit',
    AppRouteAudience.host,
  ),
  hostAppAttendanceSheet(
    '/host/organizers/:clubId/events/:eventId/attendance',
    AppRouteAudience.host,
  ),
  hostAppEventSuccessScreen(
    '/host/organizers/:clubId/events/:eventId/success',
    AppRouteAudience.host,
  ),
  hostAppEventMomentsScreen(
    '/host/organizers/:clubId/events/:eventId/moments',
    AppRouteAudience.host,
  ),
  hostInboxScreen('/host/inbox', AppRouteAudience.host),
  hostChatScreen('/host/inbox/:matchId', AppRouteAudience.host);

  const Routes(this.path, this.audience);
  final String path;
  final AppRouteAudience audience;
}

@visibleForTesting
bool routeAvailableForAppRole(Routes route, AppRole role) {
  return switch (route.audience) {
    AppRouteAudience.shared => true,
    AppRouteAudience.consumer => !role.isHost,
    AppRouteAudience.host => role.isHost,
  };
}
