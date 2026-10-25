import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/events/data/event_participation_repository.dart';
import 'package:catch_dating_app/events/data/event_repository.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_catch_pages_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_people.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_program_audience_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_whatsapp_pages_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_person_conversation_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_reply_drafts.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/data/program_setup_repository.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HostInboxPersonPageBody extends ConsumerWidget {
  const HostInboxPersonPageBody({
    super.key,
    required this.organizerId,
    required this.selection,
    required this.scope,
    required this.now,
    required this.segment,
    required this.drafts,
    required this.onBack,
  });
  final String organizerId;
  final String selection;
  final HostInboxScope? scope;
  final DateTime now;
  final HostInboxAudienceSegment segment;
  final HostReplyDrafts drafts;
  final VoidCallback onBack;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final events = catchAsyncStateFromAsyncValue(
      ref.watch(watchEventsForClubProvider(organizerId)),
    );
    final programs = catchAsyncStateFromAsyncValue(
      ref.watch(organizerProgramListProvider(organizerId)),
    );
    final requestedProgramId = this.scope?.programId;
    final programPagesAsync = requestedProgramId == null
        ? null
        : ref.watch(
            hostInboxProgramAudiencePagesProvider(
              organizerId,
              requestedProgramId,
            ),
          );
    final programPages = programPagesAsync == null
        ? null
        : catchAsyncStateFromAsyncValue(programPagesAsync);
    final waitingForProgram =
        requestedProgramId != null &&
        (programPages?.isLoading == true || programPages?.value == null);
    final waitingForScope = this.scope == null && !events.hasData;
    final scope = events.value == null
        ? this.scope ?? const HostInboxScope.general()
        : resolveHostInboxScope(
            events: events.value!,
            now: now,
            requestedScope: this.scope,
            programs: programs.value ?? const [],
          );
    final inbox = catchAsyncStateFromAsyncValue(
      ref.watch(hostInboxCatchViewModelProvider),
    );
    final whatsapp = catchAsyncStateFromAsyncValue(
      ref.watch(hostInboxWhatsappPagesProvider(organizerId)),
    );
    final participations = scope.eventId == null
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(watchEventParticipationsForEventProvider(scope.eventId!)),
          ).value;
    final whatsappThreads = whatsapp.value?.threads ?? const [];
    final programAudience = scope.programId == null
        ? null
        : hostInboxProgramAudience(
            guestContactIds: programPages?.value?.contactIds ?? const [],
            whatsappThreads: whatsappThreads,
          );
    final people = composeHostInboxPeople(
      organizerId: organizerId,
      scope: scope,
      segment: segment,
      catchThreads: [
        ...?inbox.value?.newMatches,
        ...?inbox.value?.conversations,
      ],
      whatsappThreads: whatsappThreads,
      participations: participations,
      programAudience: programAudience,
    );
    final person = people.people
        .where((p) => p.containsEndpoint(selection))
        .firstOrNull;
    if (person != null &&
        !waitingForScope &&
        !waitingForProgram &&
        programPages?.hasError != true) {
      return HostPersonConversationPageBody(
        key: ValueKey(
          '${person.key}/${scope.eventId ?? scope.programId ?? 'general'}',
        ),
        person: person,
        scope: scope,
        scopeLabel:
            events.value
                ?.where((event) => event.id == scope.eventId)
                .firstOrNull
                ?.title ??
            programPages?.value?.program.title ??
            programs.value
                ?.where((program) => program.programId == scope.programId)
                .firstOrNull
                ?.title,
        drafts: drafts,
        onBack: onBack,
      );
    }
    return CatchWorkspacePaneScaffold(
      title: CatchTopBar.route(
        title: context.l10n.hostInboxNewMessage,
        navigation: CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
          onPressed: onBack,
        ),
      ),
      body: programPages?.hasError == true
          ? CatchLocalizedErrorState(
              programPages!.error!,
              onRetry: () => ref.invalidate(
                hostInboxProgramAudiencePagesProvider(
                  organizerId,
                  requestedProgramId!,
                ),
              ),
            )
          : waitingForScope && events.hasError
          ? CatchLocalizedErrorState(
              events.error!,
              onRetry: () =>
                  ref.invalidate(watchEventsForClubProvider(organizerId)),
            )
          : waitingForScope ||
                waitingForProgram ||
                inbox.isLoading ||
                whatsapp.isLoading
          ? const CatchStateViewport.loading()
          : programPages?.value?.nextCursor != null
          ? Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CatchEmptyState(
                  icon: CatchIcons.chat,
                  title: context.l10n.hostInboxSelectionUnavailable,
                ),
                CatchButton(
                  label: programPages?.value?.error == null
                      ? context.l10n.hostInboxMoreProgramGuests
                      : context.l10n.sharedActionTryAgain,
                  onPressed: programPages!.value!.loadingMore
                      ? null
                      : () => ref
                            .read(
                              hostInboxProgramAudiencePagesProvider(
                                organizerId,
                                requestedProgramId!,
                              ).notifier,
                            )
                            .loadMore(),
                ),
              ],
            )
          : CatchEmptyState(
              icon: CatchIcons.chat,
              title: context.l10n.hostInboxSelectionUnavailable,
              message:
                  scope.isProgram &&
                      (programPages?.value?.unlinkedGuestCount ?? 0) > 0
                  ? context.l10n.hostInboxProgramContactsUnlinked
                  : null,
            ),
    );
  }
}
