import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/core/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/core/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_success_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_route_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'role_theme.dart';

final _customActivityEventDraft = HostOperationsFixtures.eventDraft.copyWith(
  id: 'design-host-event-custom-activity-draft',
  activityKind: 'openActivity',
  customActivityLabel: 'Salsa mixer',
  interactionModel: 'hostLedProgram',
  distance: null,
  paceName: null,
);

const _createEventSteps = <int, String>{
  0: 'Basics',
  1: 'When & where',
  2: 'Booking & live guide',
};

List<PickedEventPhoto> _createEventPickedPhotos() {
  return [
    _createEventPickedPhoto('event-cover-1'),
    _createEventPickedPhoto('event-cover-2'),
  ];
}

PickedEventPhoto _createEventPickedPhoto(String name) {
  final bytes = widgetbookCreateClubPngBytes();
  return PickedEventPhoto(
    image: XFile.fromData(bytes, name: '$name.png', mimeType: 'image/png'),
    bytes: bytes,
  );
}

@widgetbook.UseCase(
  name: 'Route and wizard states',
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
            clubValue: const AsyncLoading<Club?>(),
            child: HostCreateEventRouteScreen(clubId: widgetbookClub.id),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'route error',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            clubValue: AsyncError<Club?>(
              StateError('Club fetch failed'),
              StackTrace.empty,
            ),
            child: HostCreateEventRouteScreen(clubId: widgetbookClub.id),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'route offline',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            clubValue: AsyncError<Club?>(
              obviousOfflineException(),
              StackTrace.empty,
            ),
            child: HostCreateEventRouteScreen(clubId: widgetbookClub.id),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'missing club',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            clubValue: const AsyncData<Club?>(null),
            child: HostCreateEventRouteScreen(clubId: widgetbookClub.id),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'basics validation',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            child: CreateEventScreen(
              club: widgetbookClub,
              formAutovalidateMode: AutovalidateMode.always,
              loadMapTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'custom activity',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            child: CreateEventScreen(
              club: widgetbookClub,
              initialDraft: _customActivityEventDraft,
              loadMapTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'picked event photos',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            child: CreateEventScreen(
              club: widgetbookClub,
              initialDraft: HostOperationsFixtures.eventDraft,
              initialPickedEventPhotos: _createEventPickedPhotos(),
              loadMapTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'location selected',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            child: CreateEventScreen(
              club: widgetbookClub,
              initialDraft: HostOperationsFixtures.eventDraft,
              initialStep: 1,
              loadMapTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'draft picker',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            drafts: [HostOperationsFixtures.eventDraft],
            child: CreateEventScreen(
              club: widgetbookClub,
              loadMapTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'draft restored',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            child: CreateEventScreen(
              club: widgetbookClub,
              initialDraft: HostOperationsFixtures.eventDraft,
              loadMapTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'save draft pending',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            child: _HostCreateEventMutationPreview(
              mode: _HostCreateEventMutationPreviewMode.saveDraftPending,
              child: CreateEventScreen(
                club: widgetbookClub,
                initialDraft: HostOperationsFixtures.eventDraft,
                loadMapTiles: false,
                now: () => HostOperationsFixtures.now,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'save draft error',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            child: _HostCreateEventMutationPreview(
              mode: _HostCreateEventMutationPreviewMode.saveDraftError,
              child: CreateEventScreen(
                club: widgetbookClub,
                initialDraft: HostOperationsFixtures.eventDraft,
                loadMapTiles: false,
                now: () => HostOperationsFixtures.now,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'submit pending',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            child: _HostCreateEventMutationPreview(
              mode: _HostCreateEventMutationPreviewMode.submitPending,
              child: CreateEventScreen(
                club: widgetbookClub,
                initialDraft: HostOperationsFixtures.eventDraft,
                initialStep: 2,
                loadMapTiles: false,
                now: () => HostOperationsFixtures.now,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'submit error',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            child: _HostCreateEventMutationPreview(
              mode: _HostCreateEventMutationPreviewMode.submitError,
              child: CreateEventScreen(
                club: widgetbookClub,
                initialDraft: HostOperationsFixtures.eventDraft,
                initialStep: 2,
                loadMapTiles: false,
                now: () => HostOperationsFixtures.now,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'submit offline',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            child: _HostCreateEventMutationPreview(
              mode: _HostCreateEventMutationPreviewMode.submitOffline,
              child: CreateEventScreen(
                club: widgetbookClub,
                initialDraft: HostOperationsFixtures.eventDraft,
                initialStep: 2,
                loadMapTiles: false,
                now: () => HostOperationsFixtures.now,
              ),
            ),
          ),
        ),
      ),
      for (final step in _createEventSteps.entries)
        WidgetbookPageStateCard(
          label: step.value,
          child: WidgetbookHostDeviceFrame(
            child: _HostCreateEventScope(
              child: CreateEventScreen(
                club: widgetbookClub,
                initialDraft: HostOperationsFixtures.eventDraft,
                initialStep: step.key,
                loadMapTiles: false,
                now: () => HostOperationsFixtures.now,
              ),
            ),
          ),
        ),
      for (final step in _createEventSteps.keys)
        WidgetbookPageStateCard(
          label: 'runtime only · stage ${step + 1}',
          child: WidgetbookHostDeviceFrame(
            child: _HostCreateEventScope(
              child: CreateEventScreen(
                club: widgetbookClub,
                initialDraft: HostOperationsFixtures.eventDraft.copyWith(
                  externalBookingMode: true,
                  externalBookingProvider: ExternalBookingProvider.generic.name,
                ),
                initialStep: step,
                loadMapTiles: false,
                now: () => HostOperationsFixtures.now,
              ),
            ),
          ),
        ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: const TextScaler.linear(2),
            child: _HostCreateEventScope(
              child: CreateEventScreen(
                club: widgetbookClub,
                initialDraft: HostOperationsFixtures.eventDraft,
                loadMapTiles: false,
                now: () => HostOperationsFixtures.now,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: _HostCreateEventScope(
              child: CreateEventScreen(
                club: widgetbookClub,
                initialDraft: HostOperationsFixtures.eventDraft,
                initialStep: 2,
                loadMapTiles: false,
                now: () => HostOperationsFixtures.now,
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dark theme',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            themeMode: ThemeMode.dark,
            child: CreateEventScreen(
              club: widgetbookClub,
              initialDraft: HostOperationsFixtures.eventDraft,
              initialStep: 2,
              loadMapTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'created success',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            child: CreateEventSuccessScreen(
              club: widgetbookClub,
              event: widgetbookPrivateEvent,
              inviteCode: 'SEAFACE',
              onManageEvent: () {},
              onDone: () {},
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
              clubId: widgetbookClub.id,
              state: HostCreateEventRouteState.initial(widgetbookClub),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Direct screen states',
  type: CreateEventScreen,
  path: '[P1 product surfaces]/Host create event',
)
Widget createEventScreenCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CreateEventScreen',
    contractId: 'screen.host.event.create.form',
    children: [
      WidgetbookPageStateCard(
        label: 'draft restored',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            child: CreateEventScreen(
              club: widgetbookClub,
              initialDraft: HostOperationsFixtures.eventDraft,
              loadMapTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'validation',
        child: WidgetbookHostDeviceFrame(
          child: _HostCreateEventScope(
            child: CreateEventScreen(
              club: widgetbookClub,
              formAutovalidateMode: AutovalidateMode.always,
              loadMapTiles: false,
              now: () => HostOperationsFixtures.now,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Success states',
  type: CreateEventSuccessScreen,
  path: '[P1 product surfaces]/Host create event',
)
Widget createEventSuccessScreenCatalogStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CreateEventSuccessScreen',
    contractId: 'screen.host.event.create.success',
    children: [
      WidgetbookPageStateCard(
        label: 'public event',
        child: WidgetbookHostDeviceFrame(
          child: CreateEventSuccessScreen(
            club: widgetbookClub,
            event: widgetbookEditableEvent,
            onManageEvent: () {},
            onDone: () {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'invite only',
        child: WidgetbookHostDeviceFrame(
          child: CreateEventSuccessScreen(
            club: widgetbookClub,
            event: widgetbookPrivateEvent,
            inviteCode: 'SEAFACE',
            onManageEvent: () {},
            onDone: () {},
          ),
        ),
      ),
    ],
  );
}

enum _HostCreateEventMutationPreviewMode {
  saveDraftPending,
  saveDraftError,
  submitPending,
  submitError,
  submitOffline,
}

class _HostCreateEventMutationPreview extends ConsumerStatefulWidget {
  const _HostCreateEventMutationPreview({
    required this.mode,
    required this.child,
  });

  final _HostCreateEventMutationPreviewMode mode;
  final Widget child;

  @override
  ConsumerState<_HostCreateEventMutationPreview> createState() =>
      _HostCreateEventMutationPreviewState();
}

class _HostCreateEventMutationPreviewState
    extends ConsumerState<_HostCreateEventMutationPreview> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      CreateEventController.submitMutation.reset(ref);
      CreateEventDraftController.saveDraftMutation.reset(ref);
      switch (widget.mode) {
        case _HostCreateEventMutationPreviewMode.saveDraftPending:
          _runPending(CreateEventDraftController.saveDraftMutation);
          break;
        case _HostCreateEventMutationPreviewMode.saveDraftError:
          _runError(
            CreateEventDraftController.saveDraftMutation,
            StateError('Widgetbook event draft save failed'),
          );
          break;
        case _HostCreateEventMutationPreviewMode.submitPending:
          _runPending(CreateEventController.submitMutation);
          break;
        case _HostCreateEventMutationPreviewMode.submitError:
          _runError(
            CreateEventController.submitMutation,
            StateError('Widgetbook event submit failed'),
          );
          break;
        case _HostCreateEventMutationPreviewMode.submitOffline:
          _runError(
            CreateEventController.submitMutation,
            obviousOfflineException(),
          );
          break;
      }
    });
  }

  void _runPending<T>(Mutation<T> mutation) {
    final completer = Completer<T>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError<T>(Mutation<T> mutation, Object error) {
    unawaited(
      mutation
          .run(ref, (_) async => throw error)
          .then<void>((_) {}, onError: (_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class _HostCreateEventScope extends StatelessWidget {
  const _HostCreateEventScope({
    required this.child,
    this.clubValue,
    this.drafts = const <EventDraft>[],
    this.themeMode = ThemeMode.light,
  });

  final Widget child;
  final AsyncValue<Club?>? clubValue;
  final List<EventDraft> drafts;
  final ThemeMode themeMode;

  @override
  Widget build(BuildContext context) {
    return WidgetbookAppRoleBoundary(
      role: AppRole.host,
      child: WidgetbookFixtureScope(
        overrides: [
          uidProvider.overrideWithValue(AsyncData<String?>(widgetbookHostUid)),
          eventDraftRepositoryProvider.overrideWithValue(
            HostFixtureEventDraftRepository(drafts: drafts),
          ),
          fetchClubProvider(widgetbookClub.id).overrideWith(
            (ref) => switch (clubValue) {
              AsyncData(:final value) => value,
              AsyncError(:final error, :final stackTrace) =>
                Future<Club?>.error(error, stackTrace),
              AsyncLoading() => Future<Club?>.delayed(const Duration(days: 1)),
              null => widgetbookClub,
            },
          ),
          // Photo recovery restores before the wizard renders; previews start
          // from an empty in-memory journal instead of device storage.
          commandJournalStorageProvider.overrideWith((ref) {
            final storage = MemoryCommandJournalStorage();
            return () async => storage;
          }),
        ],
        child: WidgetbookThemedHostPreview(themeMode: themeMode, child: child),
      ),
    );
  }
}
