import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_prefill.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_create_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_route_loading_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_route_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

export 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_route_loading_screen.dart';

class HostCreateEventRouteArguments {
  const HostCreateEventRouteArguments({
    this.initialOrganizer,
    this.initialDraft,
    this.initialPrefill,
    this.initialSavedEventId,
    this.externalBookingMode = false,
    this.initialRosterImportPlan,
    this.promptForDrafts = true,
    this.returnToResponsesOnSave = false,
  }) : assert(
         initialDraft == null || initialPrefill == null,
         'A create route cannot restore a draft and apply a repeat prefill.',
       ),
       assert(
         initialSavedEventId == null ||
             (initialDraft == null && initialPrefill == null),
         'A saved event cannot also restore a draft or repeat prefill.',
       );

  final Organizer? initialOrganizer;
  final EventDraft? initialDraft;
  final CreateEventPrefill? initialPrefill;
  final String? initialSavedEventId;
  final bool externalBookingMode;
  final HostRosterImportPlan? initialRosterImportPlan;
  final bool promptForDrafts;
  final bool returnToResponsesOnSave;
}

class HostCreateEventRouteScreen extends ConsumerWidget {
  const HostCreateEventRouteScreen({
    super.key,
    required this.organizerId,
    this.initialOrganizer,
    this.initialDraft,
    this.initialPrefill,
    this.initialSavedEventId,
    this.externalBookingMode = false,
    this.initialRosterImportPlan,
    this.promptForDrafts = true,
    this.returnToResponsesOnSave = false,
  }) : assert(
         initialDraft == null || initialPrefill == null,
         'A create route cannot restore a draft and apply a repeat prefill.',
       ),
       assert(
         initialSavedEventId == null ||
             (initialDraft == null && initialPrefill == null),
         'A saved event cannot also restore a draft or repeat prefill.',
       );

  final String organizerId;
  final Organizer? initialOrganizer;
  final EventDraft? initialDraft;
  final CreateEventPrefill? initialPrefill;
  final String? initialSavedEventId;
  final bool externalBookingMode;
  final HostRosterImportPlan? initialRosterImportPlan;
  final bool promptForDrafts;
  final bool returnToResponsesOnSave;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final initialOrganizer = this.initialOrganizer;
    final initialDraft = this.initialDraft;
    final initialPrefill = this.initialPrefill;
    if (initialOrganizer != null && initialOrganizer.id != organizerId) {
      return CatchScaffold.stepFlow(
        body: CatchErrorState(
          title:
              context.l10n.hostsHostCreateEventScreenTitleEventSetupUnavailable,
          message: context
              .l10n
              .hostsHostCreateEventScreenMessageThatOrganizerDoesNot,
          actions: const [CatchErrorBackButton()],
        ),
      );
    }
    if (initialPrefill != null &&
        initialPrefill.values.organizerId != organizerId) {
      return CatchScaffold.stepFlow(
        body: CatchErrorState(
          title: context.l10n.hostsHostCreateEventScreenTitleRepeatUnavailable,
          message:
              context.l10n.hostsHostCreateEventScreenMessageThatEventBelongsTo,
          actions: const [CatchErrorBackButton()],
        ),
      );
    }
    if (initialDraft != null && initialDraft.organizerId != organizerId) {
      return CatchScaffold.stepFlow(
        body: CatchErrorState(
          title:
              context.l10n.hostsHostCreateEventScreenTitleEventSetupUnavailable,
          message: context
              .l10n
              .hostsHostCreateEventScreenMessageThatOrganizerDoesNot,
          actions: const [CatchErrorBackButton()],
        ),
      );
    }
    final routeState = HostCreateEventRouteState.resolve(
      initialOrganizer: initialOrganizer,
      fetchedOrganizer: initialOrganizer == null
          ? _catchAsyncState(ref.watch(fetchOrganizerProvider(organizerId)))
          : null,
      uid: _catchAsyncState(ref.watch(uidProvider)),
    );
    return HostCreateEventRouteBody(
      organizerId: organizerId,
      state: routeState,
      initialDraft: initialDraft,
      initialPrefill: initialPrefill,
      initialSavedEventId: initialSavedEventId,
      initialRosterImportPlan: initialRosterImportPlan,
      externalBookingMode:
          initialDraft?.externalBookingMode ?? externalBookingMode,
      promptForDrafts: promptForDrafts,
      returnToResponsesOnSave: returnToResponsesOnSave,
    );
  }
}

class HostCreateEventRouteBody extends ConsumerWidget {
  const HostCreateEventRouteBody({
    super.key,
    required this.organizerId,
    required this.state,
    this.initialDraft,
    this.initialPrefill,
    this.initialSavedEventId,
    this.externalBookingMode = false,
    this.initialRosterImportPlan,
    this.promptForDrafts = true,
    this.returnToResponsesOnSave = false,
  });

  final String organizerId;
  final HostCreateEventRouteState state;
  final EventDraft? initialDraft;
  final CreateEventPrefill? initialPrefill;
  final String? initialSavedEventId;
  final bool externalBookingMode;
  final HostRosterImportPlan? initialRosterImportPlan;
  final bool promptForDrafts;
  final bool returnToResponsesOnSave;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return switch (state.status) {
      HostCreateEventRouteStatus.loading =>
        const HostCreateEventRouteLoadingScreen(),
      HostCreateEventRouteStatus.error => CatchScaffold.stepFlow(
        body: CatchLocalizedErrorState(
          state.error!,
          context: AppErrorContext.organizer,
          onRetry: () {
            switch (state.retryIntent) {
              case HostCreateEventRouteRetryIntent.reloadOrganizer:
                ref.invalidate(fetchOrganizerProvider(organizerId));
              case null:
                break;
            }
          },
        ),
      ),
      HostCreateEventRouteStatus.notFound => CatchScaffold.stepFlow(
        body: CatchErrorState(
          title: context.l10n.hostsHostCreateEventScreenTitleOrganizerNotFound,
          message:
              context.l10n.hostsHostCreateEventScreenMessageThisOrganizerIsNo,
          actions: const [CatchErrorBackButton()],
        ),
      ),
      HostCreateEventRouteStatus.forbidden => CatchScaffold.stepFlow(
        body: CatchErrorState(
          title: context.l10n.hostsHostCreateEventScreenTitleHostAccessRequired,
          message:
              context.l10n.hostsHostCreateEventScreenMessageOnlyThisOrganizerS,
          actions: const [CatchErrorBackButton()],
        ),
      ),
      HostCreateEventRouteStatus.ready => PrivateEventCreateScreen(
        organizer: state.organizer!,
        initialDraft: initialDraft,
        initialPrefill: initialPrefill,
        initialSavedEventId: initialSavedEventId,
        initialRosterImportPlan: initialRosterImportPlan,
        promptForDraftsOnStart: promptForDrafts,
        readOrganizerDefaults: (organizerId) =>
            // provider-graph: ownership-repository-construction:HostCreateEventRouteBody.build:construct:ManagerEventSetupDefaultsRepository planned CAT156 -- HostCreateEventRouteBody.build directly constructs ManagerEventSetupDefaultsRepository at a widget/reactive-controller edge. Route the exact dependency through a generated overridable repository seam (reuse the existing PrivateEventSetup factory where compatible); preserve injectable command callbacks and domain/current-account fences.
            ManagerEventSetupDefaultsRepository(
              // provider-graph: ownership-widget-backend:HostCreateEventRouteBody.build:read:firebaseFunctionsProvider planned CAT156 -- HostCreateEventRouteBody.build reads the Functions SDK to construct/wire legacy Host repository or gateway business dependencies in presentation. Move this DI into the repository/controller seam with its companion construction debt; auth-currentness reads and test overrides must remain intact.
              ref.read(firebaseFunctionsProvider),
            ).get(organizerId),
        returnToResponsesOnSave: returnToResponsesOnSave,
        onSaved: returnToResponsesOnSave
            ? (receipt) => WidgetsBinding.instance.addPostFrameCallback((_) {
                if (context.mounted) {
                  Navigator.of(context).pop(receipt.eventId);
                }
              })
            : null,
      ),
    };
  }
}

CatchAsyncState<T> _catchAsyncState<T>(AsyncValue<T> value) {
  return catchAsyncStateFromAsyncValue(value);
}
