import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profiles_lookup.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/design_fixtures/catches_surface_fixtures.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_view_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Event recap route states',
  type: EventRecapScreen,
  path: '[P1 product surfaces]/Catches',
)
Widget eventRecapScreenRouteStates(BuildContext context) {
  final event = CatchesSurfaceFixtures.closedWindowEvent();
  final openEvent = CatchesSurfaceFixtures.openWindowEvent();
  final attendeeIds = CatchesSurfaceFixtures.candidates
      .map((profile) => profile.uid)
      .toList(growable: false);
  final partialAttendeeIds = [
    CatchesSurfaceFixtures.candidateUid,
    widgetbookCatchesMissingRecapProfileUid,
  ];
  final partialRoster = {
    CatchesSurfaceFixtures.candidateUid:
        CatchesSurfaceFixtures.candidates.first,
  };

  return WidgetbookPageCatalogFrame(
    title: 'EventRecapScreen',
    contractId: 'screen.catches.recap',
    children: [
      WidgetbookPageStateCard(
        label: 'recap loading',
        child: WidgetbookCatchesDeviceFrame(
          child: _RecapRouteScope(
            event: event,
            recapValue: const AsyncLoading(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'view-model error',
        child: WidgetbookCatchesDeviceFrame(
          child: _RecapRouteScope(
            event: event,
            recapValue: AsyncError<EventRecapViewModel?>(
              widgetbookCatchesOfflineException(action: 'load event recap'),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'checked-in roster',
        child: WidgetbookCatchesDeviceFrame(
          child: _RecapRouteScope(
            event: event,
            recapValue: AsyncData(
              widgetbookCatchesRecapViewModel(
                event: event,
                attendeeIds: attendeeIds,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'profile lookup loading',
        child: WidgetbookCatchesDeviceFrame(
          child: _RecapRouteScope(
            event: event,
            recapValue: AsyncData(
              widgetbookCatchesRecapViewModel(
                event: event,
                attendeeIds: attendeeIds,
              ),
            ),
            rosterProfilesValue:
                const AsyncLoading<Map<String, PublicProfile>>(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'profile lookup error',
        child: WidgetbookCatchesDeviceFrame(
          child: _RecapRouteScope(
            event: event,
            recapValue: AsyncData(
              widgetbookCatchesRecapViewModel(
                event: event,
                attendeeIds: attendeeIds,
              ),
            ),
            rosterProfilesValue: AsyncError<Map<String, PublicProfile>>(
              widgetbookCatchesOfflineException(
                action: 'load attendee profiles',
              ),
              StackTrace.empty,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'partial profile fallback',
        child: WidgetbookCatchesDeviceFrame(
          child: _RecapRouteScope(
            event: event,
            recapValue: AsyncData(
              widgetbookCatchesRecapViewModel(
                event: event,
                attendeeIds: partialAttendeeIds,
              ),
            ),
            rosterProfiles: partialRoster,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'selected vibe tile',
        child: WidgetbookCatchesDeviceFrame(
          child: WidgetbookCatchesRecapReadyBodyPreview(
            event: event,
            attendeeIds: attendeeIds,
            selectedVibeIds: const {CatchesSurfaceFixtures.secondCandidateUid},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'open catch window',
        child: WidgetbookCatchesDeviceFrame(
          child: _RecapRouteScope(
            event: openEvent,
            recapValue: AsyncData(
              widgetbookCatchesRecapViewModel(
                event: openEvent,
                attendeeIds: attendeeIds,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty roster',
        child: WidgetbookCatchesDeviceFrame(
          child: _RecapRouteScope(
            event: event,
            recapValue: AsyncData(
              widgetbookCatchesRecapViewModel(
                event: event,
                attendeeIds: const [],
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event missing',
        child: WidgetbookCatchesDeviceFrame(
          child: _RecapRouteScope(
            event: event,
            recapValue: const AsyncData<EventRecapViewModel?>(null),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: WidgetbookCatchesDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: const TextScaler.linear(2),
            child: _RecapRouteScope(
              event: event,
              recapValue: AsyncData(
                widgetbookCatchesRecapViewModel(
                  event: event,
                  attendeeIds: attendeeIds,
                ),
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: WidgetbookCatchesDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: _RecapRouteScope(
              event: event,
              recapValue: AsyncData(
                widgetbookCatchesRecapViewModel(
                  event: event,
                  attendeeIds: attendeeIds,
                ),
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dark theme',
        child: Theme(
          data: AppTheme.dark,
          child: WidgetbookCatchesDeviceFrame(
            child: _RecapRouteScope(
              event: event,
              recapValue: AsyncData(
                widgetbookCatchesRecapViewModel(
                  event: event,
                  attendeeIds: attendeeIds,
                ),
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

class _RecapRouteScope extends StatelessWidget {
  const _RecapRouteScope({
    required this.event,
    required this.recapValue,
    this.rosterProfiles,
    this.rosterProfilesValue,
  });

  final Event event;
  final AsyncValue<EventRecapViewModel?> recapValue;
  final Map<String, PublicProfile>? rosterProfiles;
  final AsyncValue<Map<String, PublicProfile>>? rosterProfilesValue;

  @override
  Widget build(BuildContext context) {
    final roster = rosterProfiles ?? widgetbookCatchesRecapRosterProfiles();
    final attendeeIds = recapValue.asData?.value?.attendeeIds ?? roster.keys;
    final effectiveRosterValue =
        rosterProfilesValue ?? AsyncData<Map<String, PublicProfile>>(roster);

    return WidgetbookFixtureScope(
      overrides: [
        eventRecapViewModelProvider(event.id).overrideWith((ref) => recapValue),
        publicProfilesByIdsProvider(
          PublicProfilesQuery(attendeeIds),
        ).overrideWithValue(effectiveRosterValue),
      ],
      child: EventRecapScreen(eventId: event.id),
    );
  }
}
