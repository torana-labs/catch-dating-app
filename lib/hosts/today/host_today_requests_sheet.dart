import 'dart:async';
import 'dart:math' as math;

import 'package:catch_dating_app/contexts/bookings/data/host_requests_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/host_request.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/today/host_today_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

/// Opens the requests queue over Today, on the first person waiting at
/// [focus] when given.
Future<void> showHostTodayRequestsSheet(
  BuildContext context, {
  required String organizerId,
  HostTodayRequestFocus? focus,
}) => showCatchBottomSheet<void>(
  context: context,
  builder: (_) =>
      HostTodayRequestsSheet(organizerId: organizerId, focus: focus),
);

/// Everyone waiting across the organizer's coming events, as a queue: let
/// someone in, decline them or offer a waitlist spot, then the next person.
///
/// Reads the `hostEventRequestViews` listener behind
/// [hostOrganizerRequestsProvider] (block edges already removed). Writes go
/// through the per-event guest commands of [HostEventBookingController],
/// under the same keyed mutations the event guest list runs, so either
/// screen shows a decision in flight. The listener moves the queue on; no
/// read is restarted after a decision.
class HostTodayRequestsSheet extends ConsumerWidget {
  const HostTodayRequestsSheet({
    super.key,
    required this.organizerId,
    this.focus,
  });

  final String organizerId;
  final HostTodayRequestFocus? focus;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final value = catchAsyncStateFromAsyncValue(
      ref.watch(hostOrganizerRequestsProvider(organizerId)),
    );
    final requests = value.value;
    if (requests == null) {
      final error = value.error;
      return CatchSheet.standard(
        title: l10n.hostRequestsTab,
        child: error != null
            ? CatchLocalizedErrorState(
                error,
                context: AppErrorContext.event,
                onRetry: () =>
                    ref.invalidate(hostOrganizerRequestsProvider(organizerId)),
              )
            : CatchSkeleton.content(
                child: CatchSection(
                  children: [
                    for (var row = 0; row < 3; row++)
                      CatchIndexRow(
                        title: l10n.hostRequestsGuest,
                        subtitle: l10n.hostRequestsNew,
                        onTap: null,
                      ),
                  ],
                ),
              ),
      );
    }
    final mutations = <String, List<Mutation<void>>>{
      for (final row in requests.rows) row.key: _mutationsOf(row),
    };
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [for (final list in mutations.values) ...list],
      errorContext: AppErrorContext.event,
    );
    final pending = <String>{
      for (final MapEntry(key: key, value: list) in mutations.entries)
        if ([
          for (final mutation in list) ref.watch(mutation),
        ].any((state) => state.isPending))
          key,
    };
    return HostTodayRequestsBody(
      requests: requests,
      now: ref.watch(appClockProvider).now(),
      initialFocus: focus,
      pending: pending,
      onLetIn: (row) => _run(
        ref,
        _mutationsOf(row)[0],
        (booking) =>
            booking.approveJoinRequest(eventId: row.eventId, userId: row.uid),
      ),
      onDecline: (row) => _run(
        ref,
        _mutationsOf(row)[1],
        (booking) =>
            booking.declineJoinRequest(eventId: row.eventId, userId: row.uid),
      ),
      onOffer: (row) => _run(
        ref,
        _mutationsOf(row)[2],
        (booking) => booking.createWaitlistOffers(
          eventId: row.eventId,
          userIds: [row.uid],
        ),
      ),
    );
  }

  /// Let in, Decline and Offer for [row], keyed as the event guest list keys
  /// them.
  static List<Mutation<void>> _mutationsOf(HostRequest row) => [
    HostEventBookingController.approveJoinRequestMutation(
      HostEventBookingController.approveJoinRequestMutationKey(
        eventId: row.eventId,
        userId: row.uid,
      ),
    ),
    HostEventBookingController.declineJoinRequestMutation(
      HostEventBookingController.declineJoinRequestMutationKey(
        eventId: row.eventId,
        userId: row.uid,
      ),
    ),
    HostEventBookingController.createWaitlistOfferMutation(
      HostEventBookingController.waitlistOfferMutationKey(
        eventId: row.eventId,
        userId: row.uid,
      ),
    ),
  ];

  /// Runs [command]; a failure shows through the mutation error notice.
  static void _run(
    WidgetRef ref,
    Mutation<void> mutation,
    Future<void> Function(HostEventBookingController) command,
  ) => unawaited(
    mutation
        .run(
          ref,
          (tx) => command(tx.get(hostEventBookingControllerProvider.notifier)),
        )
        .then<void>((_) {}, onError: (Object _) {}),
  );
}

enum _HostTodayRequestsFilter { all, asked, waitlist }

/// The queue itself, prop-driven so Widgetbook can show every state: the
/// filters and everyone waiting, or one person with the decision in the
/// dock. When a decision removes that person, the next one in the same
/// place takes over.
class HostTodayRequestsBody extends StatefulWidget {
  const HostTodayRequestsBody({
    super.key,
    required this.requests,
    required this.now,
    required this.onLetIn,
    required this.onDecline,
    required this.onOffer,
    this.initialFocus,
    this.pending = const <String>{},
  });

  final HostRequests requests;

  /// The clock that says whether a waitlist offer is still open.
  final DateTime now;

  /// Opens on the first person of this kind waiting at this event.
  final HostTodayRequestFocus? initialFocus;

  /// Keys of the people with a decision on its way.
  final Set<String> pending;
  final ValueChanged<HostRequest> onLetIn;
  final ValueChanged<HostRequest> onDecline;
  final ValueChanged<HostRequest> onOffer;

  @override
  State<HostTodayRequestsBody> createState() => _HostTodayRequestsBodyState();
}

class _HostTodayRequestsBodyState extends State<HostTodayRequestsBody> {
  _HostTodayRequestsFilter _filter = _HostTodayRequestsFilter.all;
  String? _selectedKey;
  int _selectedIndex = 0;
  bool _open = false;

  @override
  void initState() {
    super.initState();
    final focus = widget.initialFocus;
    if (focus == null) return;
    _filter = focus.kind == HostRequestKind.request
        ? _HostTodayRequestsFilter.asked
        : _HostTodayRequestsFilter.waitlist;
    final rows = _rowsOf(_filter);
    final index = rows.indexWhere((row) => row.eventId == focus.eventId);
    if (index < 0) return;
    _selectedKey = rows[index].key;
    _selectedIndex = index;
    _open = true;
  }

  List<HostRequest> _rowsOf(_HostTodayRequestsFilter filter) {
    final all = widget.requests.rows;
    return switch (filter) {
      _HostTodayRequestsFilter.all => all,
      _HostTodayRequestsFilter.asked =>
        all.where((row) => row.kind == HostRequestKind.request).toList(),
      _HostTodayRequestsFilter.waitlist =>
        all.where((row) => row.kind == HostRequestKind.waitlist).toList(),
    };
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final rows = _rowsOf(_filter);
    final kept = rows.indexWhere((row) => row.key == _selectedKey);
    final index = kept >= 0
        ? kept
        : math.min(_selectedIndex, math.max(0, rows.length - 1));
    final selected = rows.isEmpty ? null : rows[index];
    if (_open && selected != null) {
      final next = index + 1 < rows.length ? rows[index + 1] : null;
      return HostTodayRequestDetailBody(
        key: ValueKey<String>('host-request-detail-${selected.key}'),
        row: selected,
        now: widget.now,
        nextName: next == null ? null : hostTodayRequestName(l10n, next),
        deciding: widget.pending.contains(selected.key),
        onBack: () => setState(() => _open = false),
        onLetIn: () => widget.onLetIn(selected),
        onDecline: () => widget.onDecline(selected),
        onOffer: () => widget.onOffer(selected),
      );
    }
    final all = widget.requests.rows;
    if (all.isEmpty) {
      return CatchSheet.standard(
        title: l10n.hostRequestsTab,
        child: CatchEmptyState(
          icon: CatchIcons.people,
          title: l10n.hostRequestsEmptyTitle,
          message: l10n.hostRequestsEmptyBody,
        ),
      );
    }
    int count(HostRequestKind kind) =>
        all.where((row) => row.kind == kind).length;
    return CatchSheet.standard(
      title: l10n.hostRequestsTab,
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          // Chips wrap, so the counted labels fit a phone.
          CatchChoiceInput<_HostTodayRequestsFilter>(
            values: _HostTodayRequestsFilter.values,
            mode: CatchChipMode.single,
            selected: {_filter},
            itemKeyBuilder: (filter) =>
                ValueKey<String>('host-requests-filter-${filter.name}'),
            itemLabelBuilder: (filter) => switch (filter) {
              _HostTodayRequestsFilter.all => l10n.hostRequestsFilterAll(
                count: all.length,
              ),
              _HostTodayRequestsFilter.asked => l10n.hostRequestsFilterAsked(
                count: count(HostRequestKind.request),
              ),
              _HostTodayRequestsFilter.waitlist =>
                l10n.hostRequestsFilterWaitlist(
                  count: count(HostRequestKind.waitlist),
                ),
            },
            onChanged: (selected) => setState(() {
              _filter = selected.single;
              _selectedKey = null;
              _selectedIndex = 0;
            }),
          ),
          CatchSection(
            empty: l10n.hostRequestsEmptyTitle,
            children: [
              for (final (rowIndex, row) in rows.indexed)
                CatchIndexRow(
                  key: ValueKey<String>('host-request-${row.key}'),
                  title: hostTodayRequestName(l10n, row),
                  subtitle: _subtitleOf(l10n, row, widget.now),
                  meta: row.eventName,
                  leading: CatchAvatar.system(
                    size: CatchAvatarSize.sm,
                    name: hostTodayRequestName(l10n, row),
                  ),
                  selected: row.key == selected?.key,
                  chevron: true,
                  onTap: () => setState(() {
                    _selectedKey = row.key;
                    _selectedIndex = rowIndex;
                    _open = true;
                  }),
                ),
            ],
          ),
          if (!widget.requests.complete)
            CatchNotice.inline(
              tone: CatchNoticeTone.neutral,
              icon: CatchIcons.info,
              body: l10n.hostRequestsPartial,
            ),
        ],
      ),
    );
  }
}

/// One waiting person: the facts for the decision, how they got here, and
/// the decision in the dock. A request is let in or declined; a waitlisted
/// person is offered a spot, once while an offer is open.
class HostTodayRequestDetailBody extends StatelessWidget {
  const HostTodayRequestDetailBody({
    super.key,
    required this.row,
    required this.now,
    required this.nextName,
    required this.deciding,
    required this.onBack,
    required this.onLetIn,
    required this.onDecline,
    required this.onOffer,
  });

  final HostRequest row;
  final DateTime now;

  /// Who the queue shows after this person; null for the last one.
  final String? nextName;
  final bool deciding;
  final VoidCallback onBack;
  final VoidCallback onLetIn;
  final VoidCallback onDecline;
  final VoidCallback onOffer;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final name = hostTodayRequestName(l10n, row);
    final attended = row.attendedEventCount ?? 0;
    final askedAt = row.askedAt;
    final request = row.kind == HostRequestKind.request;
    final liveOffer = row.hasLiveOfferAt(now);
    final next = nextName;
    final offerExpiresAt = row.offerExpiresAt;
    final compact =
        CatchRootScope.sizeClassOf(context) == CatchWindowSize.compact;
    final hears = CatchText(
      next == null
          ? l10n.hostRequestsHears(name: name)
          : l10n.hostRequestsHearsThen(name: name, next: next),
      variant: CatchTextVariant.bodySmall,
      tone: CatchTextTone.secondary,
    );
    final decline = CatchDockAction(
      label: l10n.hostRequestsDecline,
      onPressed: deciding ? null : onDecline,
    );
    return CatchSheet.standard(
      title: name,
      pinFooter: true,
      footer: CatchDock(
        // A phone has no room for the pane's action row, so it gets the
        // bar: the line above, Decline beside the primary.
        placement: compact ? CatchDockPlacement.bar : CatchDockPlacement.pane,
        header: compact ? hears : null,
        next: compact ? null : hears,
        secondary: compact && request ? decline : null,
        danger: !compact && request ? decline : null,
        primary: request
            ? CatchDockAction(
                label: l10n.hostRequestsLetIn,
                loading: deciding,
                onPressed: deciding ? null : onLetIn,
              )
            : CatchDockAction(
                label: liveOffer && offerExpiresAt != null
                    ? l10n.hostRequestsOffered(
                        date: _timeLabel(l10n, offerExpiresAt),
                      )
                    : l10n.hostRequestsOffer,
                loading: deciding,
                onPressed: deciding || liveOffer ? null : onOffer,
              ),
      ),
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: CatchButton(
              key: const ValueKey<String>('host-request-back'),
              label: l10n.hostRequestsBack,
              leading: CatchIcon(CatchIcons.back),
              variant: CatchButtonVariant.quiet,
              size: CatchButtonSize.sm,
              onPressed: onBack,
            ),
          ),
          CatchSection(
            children: [
              CatchIndexRow(
                title: l10n.hostRequestsFactEvent,
                subtitle: row.eventName,
                onTap: null,
              ),
              CatchIndexRow(
                title: l10n.hostRequestsFactWhen,
                subtitle: _timeLabel(l10n, row.eventStart),
                onTap: null,
              ),
              CatchIndexRow(
                title: l10n.hostRequestsFactPlaces,
                subtitle: l10n.hostRequestsPlacesLeft(
                  left: row.placesLeft,
                  capacity: row.capacityLimit,
                ),
                onTap: null,
              ),
              CatchIndexRow(
                title: l10n.hostRequestsFactWithYou,
                subtitle: attended > 0
                    ? l10n.hostRequestsEvents(count: attended)
                    : l10n.hostRequestsNew,
                onTap: null,
              ),
            ],
          ),
          CatchSection(
            title: l10n.hostRequestsJourney,
            dividers: CatchSectionPlacement.none,
            children: [
              CatchTimelineList(
                copy: CatchTimelineListCopy(
                  done: l10n.hostRequestsStepDone,
                  current: l10n.hostRequestsStepNow,
                  next: l10n.hostRequestsStepNext,
                ),
                steps: [
                  if (attended > 0)
                    CatchSectionStep(
                      title: l10n.hostRequestsCameBefore(
                        events: l10n.hostRequestsEvents(count: attended),
                      ),
                      status: CatchSectionStepStatus.done,
                    ),
                  CatchSectionStep(
                    title: request
                        ? l10n.hostRequestsAskedStep(event: row.eventName)
                        : l10n.hostRequestsWaitlistStep(event: row.eventName),
                    meta: askedAt == null ? null : _dayLabel(l10n, askedAt),
                    status: CatchSectionStepStatus.current,
                    tone: CatchSectionStepTone.warning,
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// The person's public name, or a stand-in when they have none.
String hostTodayRequestName(AppLocalizations l10n, HostRequest row) =>
    row.name ?? l10n.hostRequestsGuest;

/// The line under a person: an open offer, else their waitlist place, else
/// their history with the organizer and when they asked.
String _subtitleOf(AppLocalizations l10n, HostRequest row, DateTime now) {
  final offerExpiresAt = row.offerExpiresAt;
  if (offerExpiresAt != null && row.hasLiveOfferAt(now)) {
    return l10n.hostRequestsOffered(date: _timeLabel(l10n, offerExpiresAt));
  }
  final position = row.waitlistPosition;
  if (row.kind == HostRequestKind.waitlist && position != null) {
    return l10n.hostRequestsPosition(position: position);
  }
  final attended = row.attendedEventCount ?? 0;
  final history = attended > 0
      ? l10n.hostRequestsWithYou(
          events: l10n.hostRequestsEvents(count: attended),
        )
      : l10n.hostRequestsNew;
  final askedAt = row.askedAt;
  return askedAt == null
      ? history
      : l10n.hostRequestsAsked(
          history: history,
          date: _dayLabel(l10n, askedAt),
        );
}

String _dayLabel(AppLocalizations l10n, DateTime date) =>
    DateFormat.MMMd(l10n.localeName).format(date);

String _timeLabel(AppLocalizations l10n, DateTime date) =>
    DateFormat.MMMd(l10n.localeName).add_jm().format(date);
