import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/design_fixtures/catches_surface_fixtures.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen_state.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_view_model.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_card_content.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_view.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_view_mapper.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

import '../../support/contract_preview.dart';

class WidgetbookCatchesRecapReadyBodyPreview extends StatelessWidget {
  const WidgetbookCatchesRecapReadyBodyPreview({
    super.key,
    required this.event,
    required this.attendeeIds,
    required this.selectedVibeIds,
  });

  final Event event;
  final List<String> attendeeIds;
  final Set<String> selectedVibeIds;

  @override
  Widget build(BuildContext context) {
    final ready = widgetbookCatchesRecapReadyState(
      context,
      event: event,
      attendeeIds: attendeeIds,
      selectedVibeIds: selectedVibeIds,
    );

    return Scaffold(
      backgroundColor: CatchTokens.of(context).bg,
      body: EventRecapReadyBody(
        state: ready,
        onToggleVibe: widgetbookIgnoreString,
        onRetryRosterProfiles: _ignoreStrings,
        onOpenCatchesDeck: _ignoreRecapOpenDeck,
      ),
    );
  }
}

EventRecapReady widgetbookCatchesRecapReadyState(
  BuildContext context, {
  required Event event,
  required List<String> attendeeIds,
  Map<String, PublicProfile>? rosterProfiles,
  Set<String> selectedVibeIds = const <String>{},
}) {
  final screenState = buildEventRecapScreenState(
    eventId: event.id,
    viewModel: CatchAsyncState.data(
      widgetbookCatchesRecapViewModel(event: event, attendeeIds: attendeeIds),
    ),
    rosterProfiles: CatchAsyncState.data(
      rosterProfiles ?? widgetbookCatchesRecapRosterProfiles(),
    ),
    selectedVibeIds: selectedVibeIds,
    l10n: context.l10n,
    now: CatchesSurfaceFixtures.now,
  );

  return screenState as EventRecapReady;
}

void _ignoreStrings(Iterable<String> _) {}

const widgetbookCatchesMissingRecapProfileUid =
    'design-catches-missing-profile';

Map<String, PublicProfile> widgetbookCatchesRecapRosterProfiles() {
  return {
    for (final profile in CatchesSurfaceFixtures.candidates)
      profile.uid: profile,
  };
}

EventRecapViewModel widgetbookCatchesRecapViewModel({
  required Event event,
  required List<String> attendeeIds,
}) {
  return EventRecapViewModel(
    event: event,
    attendeeIds: attendeeIds,
    checkedInCount: attendeeIds.length + 1,
  );
}

ProfileView widgetbookCatchesProfileView(BuildContext context) {
  final profile = CatchesSurfaceFixtures.candidates.first;
  final content = ProfileCardContent.fromProfile(
    profile,
    l10n: context.l10n,
    viewerProfile: CatchesSurfaceFixtures.viewer,
    sharedRunTitle: CatchesSurfaceFixtures.openWindowEvent().title,
  );

  return profileViewFromCardContent(
    content,
    l10n: context.l10n,
    name: profile.name,
    age: profile.age,
    running: profile.activityPreferences.running,
    kicker: 'Was at · ${CatchesSurfaceFixtures.openWindowEvent().title}',
    kickerActivity: CatchesSurfaceFixtures.openWindowEvent().activityKind,
    metaLine: profile.city,
  );
}

T widgetbookCatchesProfileSection<T extends ProfileSectionData>(
  BuildContext context,
) {
  return widgetbookCatchesProfileView(context).sections.whereType<T>().first;
}

void _ignoreRecapOpenDeck(EventRecapOpenDeckIntent intent) {}

Future<void> widgetbookCatchesNoopReaction(
  ProfileReactionTarget target,
  String? comment,
) async {}

NetworkException widgetbookCatchesOfflineException({required String action}) {
  return obviousOfflineException(
    context: BackendErrorContext(
      service: BackendService.firestore,
      action: action,
      resource: 'catches',
    ),
  );
}
