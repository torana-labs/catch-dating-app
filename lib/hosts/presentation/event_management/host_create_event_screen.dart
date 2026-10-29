import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
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
    this.initialClub,
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

  final Club? initialClub;
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
    required this.clubId,
    this.initialClub,
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

  final String clubId;
  final Club? initialClub;
  final EventDraft? initialDraft;
  final CreateEventPrefill? initialPrefill;
  final String? initialSavedEventId;
  final bool externalBookingMode;
  final HostRosterImportPlan? initialRosterImportPlan;
  final bool promptForDrafts;
  final bool returnToResponsesOnSave;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final initialClub = this.initialClub;
    final initialDraft = this.initialDraft;
    final initialPrefill = this.initialPrefill;
    if (initialClub != null && initialClub.id != clubId) {
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
    if (initialPrefill != null && initialPrefill.values.clubId != clubId) {
      return CatchScaffold.stepFlow(
        body: CatchErrorState(
          title: context.l10n.hostsHostCreateEventScreenTitleRepeatUnavailable,
          message:
              context.l10n.hostsHostCreateEventScreenMessageThatEventBelongsTo,
          actions: const [CatchErrorBackButton()],
        ),
      );
    }
    if (initialDraft != null && initialDraft.clubId != clubId) {
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
      initialClub: initialClub,
      fetchedClub: initialClub == null
          ? _catchAsyncState(ref.watch(fetchClubProvider(clubId)))
          : null,
      uid: _catchAsyncState(ref.watch(uidProvider)),
    );
    return HostCreateEventRouteBody(
      clubId: clubId,
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
    required this.clubId,
    required this.state,
    this.initialDraft,
    this.initialPrefill,
    this.initialSavedEventId,
    this.externalBookingMode = false,
    this.initialRosterImportPlan,
    this.promptForDrafts = true,
    this.returnToResponsesOnSave = false,
  });

  final String clubId;
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
          context: AppErrorContext.club,
          onRetry: () {
            switch (state.retryIntent) {
              case HostCreateEventRouteRetryIntent.reloadClub:
                ref.invalidate(fetchClubProvider(clubId));
              case null:
                break;
            }
          },
        ),
      ),
      HostCreateEventRouteStatus.notFound => CatchScaffold.stepFlow(
        body: CatchErrorState(
          title: context.l10n.hostsHostCreateEventScreenTitleClubNotFound,
          message: context.l10n.hostsHostCreateEventScreenMessageThisClubIsNo,
          actions: const [CatchErrorBackButton()],
        ),
      ),
      HostCreateEventRouteStatus.forbidden => CatchScaffold.stepFlow(
        body: CatchErrorState(
          title: context.l10n.hostsHostCreateEventScreenTitleHostAccessRequired,
          message: context.l10n.hostsHostCreateEventScreenMessageOnlyThisClubS,
          actions: const [CatchErrorBackButton()],
        ),
      ),
      HostCreateEventRouteStatus.ready => PrivateEventCreateScreen(
        club: state.club!,
        initialDraft: initialDraft,
        initialPrefill: initialPrefill,
        initialSavedEventId: initialSavedEventId,
        initialRosterImportPlan: initialRosterImportPlan,
        promptForDraftsOnStart: promptForDrafts,
        readOrganizerDefaults: (organizerId) =>
            ManagerEventSetupDefaultsRepository(
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
