import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/create/create_event_prefill.dart';
import 'package:catch_dating_app/hosts/create/create_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// What a create route can start from: the organizer when the caller has
/// it, a saved draft, a repeat of an earlier event, or a saved event to
/// carry on with; selling elsewhere; and whether saving returns the event
/// to the caller (answering a response).
class HostCreateEventRouteArguments {
  const HostCreateEventRouteArguments({
    this.initialOrganizer,
    this.initialDraft,
    this.initialPrefill,
    this.initialSavedEventId,
    this.externalBookingMode = false,
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

  /// Saving pops the route with the new event's id.
  final bool returnToResponsesOnSave;
}

/// Where opening the create route stands.
enum CreateRouteStatus { loading, error, notFound, forbidden, mismatch, ready }

/// The create route's organizer and signed-in host, resolved. A passed-in
/// organizer is used as it is; a draft, a repeat or an organizer for a
/// different organizer than the route's is refused.
CreateRouteStatus createRouteStatus({
  required String organizerId,
  required HostCreateEventRouteArguments arguments,
  required CatchAsyncState<Organizer?> organizer,
  required CatchAsyncState<String?> uid,
}) {
  if (arguments.initialOrganizer case final given?
      when given.id != organizerId) {
    return CreateRouteStatus.mismatch;
  }
  if (arguments.initialPrefill case final prefill?
      when prefill.values.organizerId != organizerId) {
    return CreateRouteStatus.mismatch;
  }
  if (arguments.initialDraft case final draft?
      when draft.organizerId != organizerId) {
    return CreateRouteStatus.mismatch;
  }
  if (organizer.status == CatchAsyncStatus.error ||
      uid.status == CatchAsyncStatus.error) {
    return CreateRouteStatus.error;
  }
  if (organizer.status == CatchAsyncStatus.loading ||
      uid.status == CatchAsyncStatus.loading) {
    return CreateRouteStatus.loading;
  }
  final resolved = organizer.value;
  if (resolved == null) return CreateRouteStatus.notFound;
  if (!resolved.isHostedBy(uid.value)) return CreateRouteStatus.forbidden;
  return CreateRouteStatus.ready;
}

/// The create route: resolves the organizer (or takes the one passed in)
/// and the signed-in host, then opens [CreateScreen] with what the route
/// starts from. Loading, a failed read, a missing organizer, a host off the
/// organizer's team and a mismatched start each get their own state.
class CreateRouteScreen extends ConsumerWidget {
  const CreateRouteScreen({
    super.key,
    required this.organizerId,
    this.arguments = const HostCreateEventRouteArguments(),
  });

  final String organizerId;
  final HostCreateEventRouteArguments arguments;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final given = arguments.initialOrganizer;
    final organizer = given == null
        ? catchAsyncStateFromAsyncValue(
            ref.watch(watchOrganizerProvider(organizerId)),
          )
        : CatchAsyncState<Organizer?>.data(given);
    final uid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final status = createRouteStatus(
      organizerId: organizerId,
      arguments: arguments,
      organizer: organizer,
      uid: uid,
    );
    if (status == CreateRouteStatus.ready) {
      final draft = arguments.initialDraft;
      final onSaved = arguments.returnToResponsesOnSave
          ? (String eventId) =>
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (context.mounted) Navigator.of(context).pop(eventId);
                })
          : null;
      return CreateScreen(
        organizer: organizer.value!,
        userId: uid.value ?? '',
        initialDraft: draft,
        initialPrefill: arguments.initialPrefill,
        initialSavedEventId: arguments.initialSavedEventId,
        externalBookingMode:
            draft?.externalBookingMode ?? arguments.externalBookingMode,
        onSaved: onSaved,
      );
    }
    final l10n = context.l10n;
    final Widget body = switch (status) {
      CreateRouteStatus.loading => const CatchLoadingIndicator(),
      CreateRouteStatus.error => CatchLocalizedErrorState(
        organizer.error ?? uid.error!,
        context: AppErrorContext.organizer,
        onRetry: () => ref.invalidate(watchOrganizerProvider(organizerId)),
      ),
      CreateRouteStatus.notFound => CatchEmptyState(
        icon: CatchIcons.block,
        title: l10n.hostsHostCreateEventScreenTitleOrganizerNotFound,
        message: l10n.hostsHostCreateEventScreenMessageThisOrganizerIsNo,
      ),
      CreateRouteStatus.forbidden => CatchEmptyState(
        icon: CatchIcons.block,
        title: l10n.hostsHostCreateEventScreenTitleHostAccessRequired,
        message: l10n.hostsHostCreateEventScreenMessageOnlyThisOrganizerS,
      ),
      CreateRouteStatus.mismatch || CreateRouteStatus.ready => CatchEmptyState(
        icon: CatchIcons.block,
        title: arguments.initialPrefill == null
            ? l10n.hostsHostCreateEventScreenTitleEventSetupUnavailable
            : l10n.hostsHostCreateEventScreenTitleRepeatUnavailable,
        message: arguments.initialPrefill == null
            ? l10n.hostsHostCreateEventScreenMessageThatOrganizerDoesNot
            : l10n.hostsHostCreateEventScreenMessageThatEventBelongsTo,
      ),
    };
    return CatchRoot(
      child: CatchScreen(
        key: ValueKey<String>('create-route-${status.name}'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.step,
          title: l10n.hostCreateNewEvent,
          back: CatchTopBarBack(label: l10n.hostCreateClose, close: true),
        ),
        bodyScrolls: false,
        body: CatchPageBody.screen(child: body),
      ),
    );
  }
}
