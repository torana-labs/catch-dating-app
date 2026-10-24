import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/clubs/data/club_name_lookup.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/events/data/saved_event_repository.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/presentation/saved_events_state.dart';
import 'package:catch_dating_app/events/shared/event_agenda_list.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class SavedEventsScreen extends ConsumerWidget {
  const SavedEventsScreen({super.key, this.referenceNow});

  final DateTime? referenceNow;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = CatchTokens.of(context);
    final uidAsync = ref.watch(uidProvider);
    final uidState = catchAsyncStateFromAsyncValue(uidAsync);

    return CatchRouteScaffold(
      backgroundColor: t.bg,
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.eventsSavedEventsScreenTitleSavedEvents,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.standardSlivers(
        slivers: [
          Consumer(
            builder: (context, ref, _) {
              if (uidState.isLoading) {
                return const EventAgendaSliverSkeleton(
                  padding: EdgeInsets.zero,
                );
              }
              if (uidState.hasError) {
                return CatchLocalizedSliverErrorState(
                  uidState.error!,
                  context: AppErrorContext.auth,
                  onRetry: () => ref.invalidate(uidProvider),
                );
              }

              final userId = uidState.value;
              final savedEvents = userId == null
                  ? const AsyncData(<Event>[])
                  : ref.watch(watchSavedEventDetailsForUserProvider(userId));
              return CatchAsyncBoundary<List<Event>>.sliver(
                value: savedEvents,
                onRetry: () {
                  ref.invalidate(uidProvider);
                  if (userId != null) {
                    ref.invalidate(
                      watchSavedEventDetailsForUserProvider(userId),
                    );
                  }
                },
                initialLoadTimeout: null,
                loadingBuilder: (_) =>
                    const EventAgendaSliverSkeleton(padding: EdgeInsets.zero),
                errorBuilder: (_, error, _, onBoundaryRetry) =>
                    SavedEventsClubNamesErrorState(
                      error: error,
                      onRetry: onBoundaryRetry!,
                    ),
                builder: (context, events) {
                  if (events.isEmpty) {
                    return CatchSliverEmptyState(
                      icon: CatchIcons.bookmarkBorderRounded,
                      title: context
                          .l10n
                          .eventsSavedEventsScreenTitleNoSavedEventsYet,
                      message: context
                          .l10n
                          .eventsSavedEventsScreenMessageSaveEventsYouWant,
                      iconSize: CatchLayout.calendarEmptyIconSize,
                      padding: EdgeInsets.zero,
                      titleStyle: CatchTextStyles.titleL(context),
                      messageStyle: CatchTextStyles.supporting(
                        context,
                        color: CatchTokens.of(context).ink2,
                      ),
                    );
                  }

                  final state = SavedEventsListState.from(
                    events,
                    now: referenceNow ?? DateTime.now(),
                  );
                  final clubNames = ref.watch(
                    clubNameLookupProvider(ClubNameLookupQuery(state.clubIds)),
                  );
                  return CatchAsyncBoundary<Map<String, String>>.sliver(
                    value: clubNames,
                    onRetry: () => ref.invalidate(clubNameLookupProvider),
                    loadingBuilder: (_) => const EventAgendaSliverSkeleton(
                      padding: EdgeInsets.zero,
                    ),
                    errorBuilder: (_, error, _, onBoundaryRetry) =>
                        SavedEventsClubNamesErrorState(
                          error: error,
                          onRetry: onBoundaryRetry!,
                        ),
                    builder: (context, names) => SavedEventsAgendaList(
                      state: state,
                      clubNames: names,
                      padding: EdgeInsets.zero,
                      onEventSelected: (event) =>
                          _openEventDetail(context, event),
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  void _openEventDetail(BuildContext context, Event event) {
    context.pushNamed(
      Routes.savedEventDetailScreen.name,
      pathParameters: {'clubId': event.clubId, 'eventId': event.id},
      extra: event,
    );
  }
}

class SavedEventsAgendaList extends StatelessWidget {
  const SavedEventsAgendaList({
    super.key,
    required this.state,
    required this.clubNames,
    required this.onEventSelected,
    this.padding,
  });

  final SavedEventsListState state;
  final Map<String, String> clubNames;
  final ValueChanged<Event> onEventSelected;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return EventAgendaSliverList(
      events: state.orderedEvents,
      showClubName: true,
      clubNameBuilder: (event) => clubNames[event.clubId],
      today: state.today,
      preserveInputOrder: true,
      badgeLabelBuilder: state.badgeLabelFor,
      statusBuilder: state.statusFor,
      onEventSelected: onEventSelected,
      padding:
          padding ??
          const EdgeInsets.fromLTRB(
            CatchLayout.detailScreenHorizontalPadding,
            CatchLayout.agendaListTopPadding,
            CatchLayout.detailScreenHorizontalPadding,
            CatchLayout.agendaListBottomPadding,
          ),
    );
  }
}

class SavedEventsClubNamesErrorState extends StatelessWidget {
  const SavedEventsClubNamesErrorState({
    super.key,
    required this.error,
    required this.onRetry,
  });

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return CatchLocalizedSliverErrorState(
      error,
      context: AppErrorContext.event,
      onRetry: onRetry,
    );
  }
}
