import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_route_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/device/connectivity_service.dart';
import 'package:catch_platform/persistence/command_journal_provider.dart';
import 'package:catch_platform/persistence/memory_command_journal_storage.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'role_theme.dart';

@widgetbook.UseCase(
  name: 'Route states',
  type: HostCreateEventRouteScreen,
  path: '[P1 product surfaces]/Host operations',
)
Widget hostCreateEventRouteAndWizardStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostCreateEventRouteScreen',
    contractId: 'screen.host.event.create',
    children: [
      WidgetbookPageStateCard(
        label: 'route loading',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            organizerValue: const AsyncLoading<Organizer?>(),
            child: HostCreateEventRouteScreen(
              organizerId: widgetbookOrganizer.id,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'route error',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            organizerValue: AsyncError<Organizer?>(
              StateError('Club fetch failed'),
              StackTrace.empty,
            ),
            child: HostCreateEventRouteScreen(
              organizerId: widgetbookOrganizer.id,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'route offline',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            organizerValue: AsyncError<Organizer?>(
              obviousOfflineException(),
              StackTrace.empty,
            ),
            child: HostCreateEventRouteScreen(
              organizerId: widgetbookOrganizer.id,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'missing club',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            organizerValue: const AsyncData<Organizer?>(null),
            child: HostCreateEventRouteScreen(
              organizerId: widgetbookOrganizer.id,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Route state renderer',
  type: HostCreateEventRouteBody,
  path: '[P1 product surfaces]/Host create event',
)
Widget hostCreateEventRouteStateViewCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostCreateEventRouteBody',
    contractId: 'component.host.event.create_route_state_view',
    children: [
      WidgetbookPageStateCard(
        label: 'ready',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            child: HostCreateEventRouteBody(
              organizerId: widgetbookOrganizer.id,
              state: HostCreateEventRouteState.initial(widgetbookOrganizer),
            ),
          ),
        ),
      ),
    ],
  );
}

class _HostCreateEventScope extends StatelessWidget {
  const _HostCreateEventScope({required this.child, this.organizerValue});

  final Widget child;
  final AsyncValue<Organizer?>? organizerValue;

  @override
  Widget build(BuildContext context) {
    return WidgetbookAppRoleBoundary(
      role: AppRole.host,
      child: WidgetbookFixtureScope(
        overrides: [
          uidProvider.overrideWithValue(AsyncData<String?>(widgetbookHostUid)),
          eventDraftRepositoryProvider.overrideWithValue(
            HostFixtureEventDraftRepository(drafts: const <EventDraft>[]),
          ),
          fetchOrganizerProvider(widgetbookOrganizer.id).overrideWith(
            (ref) => switch (organizerValue) {
              AsyncData(:final value) => value,
              AsyncError(:final error, :final stackTrace) =>
                Future<Organizer?>.error(error, stackTrace),
              AsyncLoading() => Future<Organizer?>.delayed(
                const Duration(days: 1),
              ),
              null => widgetbookOrganizer,
            },
          ),
          // Photo recovery restores before the create flow renders; previews
          // start from an empty in-memory journal instead of device storage.
          commandJournalStorageProvider.overrideWith((ref) {
            final storage = MemoryCommandJournalStorage();
            return () async => storage;
          }),
        ],
        child: WidgetbookThemedHostPreview(
          themeMode: ThemeMode.light,
          child: child,
        ),
      ),
    );
  }
}
