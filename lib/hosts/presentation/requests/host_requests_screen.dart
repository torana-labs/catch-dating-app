import 'dart:async';
import 'dart:math' as math;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_requests_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/host_request.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_no_organizer_empty_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/hosts/presentation/requests/host_requests_controller.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

/// Audience → Requests: everyone waiting across this organizer's coming events,
/// as a queue. Let someone in, decline or offer a spot, and move to the next.
class HostRequestsScreen extends ConsumerWidget {
  const HostRequestsScreen({super.key, this.initialOrganizerId});

  final String? initialOrganizerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uid =
        catchAsyncStateFromAsyncValue(ref.watch(uidProvider)).value ?? '';
    final organizers = uid.isEmpty
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(hostOperableOrganizersProvider(uid)),
          ).value;
    final organizer = organizers == null
        ? null
        : resolveSelectedHostOrganizer(
            organizers,
            selectedOrganizerId: ref.watch(hostOrganizerSelectionProvider(uid)),
            preferredOrganizerId: initialOrganizerId,
          );
    if (organizers != null && organizer == null) {
      return const HostAudienceNoOrganizerEmptyState(
        selected: HostAudienceView.requests,
      );
    }
    final organizerId = organizer?.id;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [HostRequestsController.decideMutation],
      errorContext: AppErrorContext.event,
    );
    final deciding = ref.watch(HostRequestsController.decideMutation).isPending;
    void decide(
      Future<void> Function(HostRequestsController, String, HostRequest) action,
      HostRequest row,
    ) => unawaited(
      HostRequestsController.decideMutation.run(
        ref,
        (tx) =>
            action(tx.get(hostRequestsControllerProvider), organizerId!, row),
      ),
    );

    return CatchWorkspacePaneScaffold(
      title: const HostAudienceHeader(),
      actions: HostAudienceTabRail(
        selected: HostAudienceView.requests,
        selectionPosition: HostAudienceView.requests.index.toDouble(),
        onChanged: (view) => context.goNamed(
          Routes.hostAudienceScreen.name,
          queryParameters: {'view': view.name, 'organizerId': ?organizerId},
        ),
      ),
      body: organizerId == null
          ? const CatchStateViewport.loading(accountForBottomOverlay: false)
          : CatchAsyncBoundary<HostRequests>(
              value: ref.watch(hostOrganizerRequestsProvider(organizerId)),
              onRetry: () =>
                  ref.invalidate(hostOrganizerRequestsProvider(organizerId)),
              errorContext: AppErrorContext.event,
              initialLoadTimeout: null,
              builder: (context, requests) => HostRequestsWorkspace(
                requests: requests,
                deciding: deciding,
                onLetIn: (row) => decide((c, id, r) => c.letIn(id, r), row),
                onDecline: (row) => decide((c, id, r) => c.decline(id, r), row),
                onOffer: (row) => decide((c, id, r) => c.offer(id, r), row),
              ),
            ),
    );
  }
}

enum _Filter { all, asked, waitlist }

const _filterChipExemption =
    'Host-only queue filter over a callable-owned list; selection is ephemeral '
    'and is never persisted.';

/// The queue itself; prop-driven so Widgetbook can show every state. When a
/// decision removes the selected person, the next one takes their place.
class HostRequestsWorkspace extends StatefulWidget {
  const HostRequestsWorkspace({
    super.key,
    required this.requests,
    required this.deciding,
    required this.onLetIn,
    required this.onDecline,
    required this.onOffer,
  });

  final HostRequests requests;
  final bool deciding;
  final ValueChanged<HostRequest> onLetIn;
  final ValueChanged<HostRequest> onDecline;
  final ValueChanged<HostRequest> onOffer;

  @override
  State<HostRequestsWorkspace> createState() => _HostRequestsWorkspaceState();
}

class _HostRequestsWorkspaceState extends State<HostRequestsWorkspace> {
  _Filter _filter = _Filter.all;
  String? _selectedKey;
  int _selectedIndex = 0;
  bool _detailOpen = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = CatchTokens.of(context);
    final all = widget.requests.rows;
    if (all.isEmpty) {
      return CatchEmptyState(
        icon: CatchIcons.people,
        title: l10n.hostRequestsEmptyTitle,
        message: l10n.hostRequestsEmptyBody,
      );
    }
    final asked = all.where((row) => row.kind == HostRequestKind.request);
    final waiting = all.where((row) => row.kind == HostRequestKind.waitlist);
    final rows = switch (_filter) {
      _Filter.all => all,
      _Filter.asked => asked.toList(growable: false),
      _Filter.waitlist => waiting.toList(growable: false),
    };
    final kept = rows.indexWhere((row) => row.key == _selectedKey);
    final index = kept >= 0
        ? kept
        : math.min(_selectedIndex, math.max(0, rows.length - 1));
    final selected = rows.isEmpty ? null : rows[index];
    final next = index + 1 < rows.length ? rows[index + 1] : null;

    void select(_Filter filter) => setState(() {
      _filter = filter;
      _selectedKey = null;
      _selectedIndex = 0;
    });

    final list = ListView(
      padding: CatchInsets.pageBody,
      children: [
        Wrap(
          spacing: CatchSpacing.s2,
          runSpacing: CatchSpacing.s2,
          children: [
            CatchChip.selectable(
              key: const ValueKey('host-requests-filter-all'),
              label: l10n.hostRequestsFilterAll(count: all.length),
              selected: _filter == _Filter.all,
              onChanged: (_) => select(_Filter.all),
              contractExemption: _filterChipExemption,
            ),
            CatchChip.selectable(
              key: const ValueKey('host-requests-filter-asked'),
              label: l10n.hostRequestsFilterAsked(count: asked.length),
              selected: _filter == _Filter.asked,
              onChanged: (_) => select(_Filter.asked),
              contractExemption: _filterChipExemption,
            ),
            CatchChip.selectable(
              key: const ValueKey('host-requests-filter-waitlist'),
              label: l10n.hostRequestsFilterWaitlist(count: waiting.length),
              selected: _filter == _Filter.waitlist,
              onChanged: (_) => select(_Filter.waitlist),
              contractExemption: _filterChipExemption,
            ),
          ],
        ),
        const SizedBox(height: CatchSpacing.s3),
        for (final (rowIndex, row) in rows.indexed)
          CatchLegacySurface(
            radius: CatchRadius.none,
            backgroundColor: rowIndex == index
                ? t.ink.withValues(alpha: CatchOpacity.tabBarPillFill)
                : Colors.transparent,
            child: CatchIndexRow(
              key: ValueKey('host-request-${row.key}'),
              title: _nameOf(l10n, row),
              titleStyle: CatchTextStyles.supportingStrong(
                context,
                color: t.ink,
              ),
              subtitle: _subtitleOf(l10n, row),
              selected: rowIndex == index,
              trailing: CatchLegacyText(
                row.eventName,
                variant: CatchLegacyTextVariant.supporting,
                color: t.ink2,
              ),
              onTap: () => setState(() {
                _selectedKey = row.key;
                _selectedIndex = rowIndex;
                _detailOpen = true;
              }),
            ),
          ),
        if (!widget.requests.complete) ...[
          const SizedBox(height: CatchSpacing.s3),
          CatchLegacyText(
            l10n.hostRequestsPartial,
            variant: CatchLegacyTextVariant.supporting,
            color: t.ink2,
          ),
        ],
      ],
    );

    return CatchViewport.box(
      builder: (context, viewport) => CatchPaneLayout(
        pattern: CatchPaneLayoutMode.queue,
        detailOpen: _detailOpen && selected != null,
        children: [
          list,
          if (selected == null)
            const SizedBox.shrink()
          else
            HostRequestBody(
              key: ValueKey('host-request-detail-${selected.key}'),
              row: selected,
              nextName: next == null ? null : _nameOf(l10n, next),
              deciding: widget.deciding,
              onBack:
                  viewport.width <
                      CatchPaneLayout.splitWidthOf(CatchPaneLayoutMode.queue)
                  ? () => setState(() => _detailOpen = false)
                  : null,
              onLetIn: () => widget.onLetIn(selected),
              onDecline: () => widget.onDecline(selected),
              onOffer: () => widget.onOffer(selected),
            ),
        ],
      ),
    );
  }
}

/// One waiting person: the facts for the decision, how they got here, and the
/// decision itself. A request is let in or declined; a waitlisted person is
/// offered a spot.
class HostRequestBody extends StatelessWidget {
  const HostRequestBody({
    super.key,
    required this.row,
    required this.nextName,
    required this.deciding,
    required this.onBack,
    required this.onLetIn,
    required this.onDecline,
    required this.onOffer,
  });

  final HostRequest row;
  final String? nextName;
  final bool deciding;

  /// Null when the list sits beside this pane.
  final VoidCallback? onBack;
  final VoidCallback onLetIn;
  final VoidCallback onDecline;
  final VoidCallback onOffer;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final t = CatchTokens.of(context);
    final copy = catchFieldCopy(l10n);
    final name = _nameOf(l10n, row);
    final attended = row.attendedEventCount ?? 0;
    final askedAt = row.askedAt;
    final request = row.kind == HostRequestKind.request;
    final next = nextName;
    final back = onBack;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: ListView(
            padding: CatchInsets.pageBody,
            children: [
              if (back != null)
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: CatchIconAction(
                    key: const ValueKey('host-request-back'),
                    tooltip: l10n.hostRequestsBack,
                    onPressed: back,
                    child: Icon(CatchIcons.back),
                  ),
                ),
              if (back != null) const SizedBox(height: CatchSpacing.s3),
              CatchLegacyText(name, variant: CatchLegacyTextVariant.titleL),
              const SizedBox(height: CatchSpacing.s3),
              CatchSection.fieldRows(
                first: true,
                children: [
                  CatchField.read(
                    copy: copy,
                    title: l10n.hostRequestsFactEvent,
                    valueText: row.eventName,
                  ),
                  CatchField.read(
                    copy: copy,
                    title: l10n.hostRequestsFactWhen,
                    valueText: _timeLabel(l10n, row.eventStart),
                  ),
                  CatchField.read(
                    copy: copy,
                    title: l10n.hostRequestsFactPlaces,
                    valueText: l10n.hostRequestsPlacesLeft(
                      left: row.placesLeft,
                      capacity: row.capacityLimit,
                    ),
                  ),
                  CatchField.read(
                    copy: copy,
                    title: l10n.hostRequestsFactWithYou,
                    valueText: attended > 0
                        ? l10n.hostRequestsEvents(count: attended)
                        : l10n.hostRequestsNew,
                  ),
                ],
              ),
              const SizedBox(height: CatchSpacing.s5),
              CatchSection.plain(
                title: l10n.hostRequestsJourney,
                padding: EdgeInsets.zero,
                child: CatchTimelineList(
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
              ),
            ],
          ),
        ),
        CatchDock(
          includeSafeArea: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              CatchLegacyText(
                next == null
                    ? l10n.hostRequestsHears(name: name)
                    : l10n.hostRequestsHearsThen(name: name, next: next),
                variant: CatchLegacyTextVariant.supporting,
                color: t.ink2,
              ),
              const SizedBox(height: CatchSpacing.s2),
              if (request)
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    CatchButton(
                      key: const ValueKey('host-request-decline'),
                      label: l10n.hostRequestsDecline,
                      variant: CatchButtonVariant.quiet,
                      foregroundColor: t.danger,
                      onPressed: deciding ? null : onDecline,
                    ),
                    const SizedBox(width: CatchSpacing.s2),
                    CatchButton(
                      key: const ValueKey('host-request-let-in'),
                      label: l10n.hostRequestsLetIn,
                      status: deciding
                          ? CatchButtonStatus.loading
                          : CatchButtonStatus.idle,
                      onPressed: deciding ? null : onLetIn,
                    ),
                  ],
                )
              else
                CatchButton(
                  key: const ValueKey('host-request-offer'),
                  label: row.hasLiveOffer
                      ? l10n.hostRequestsOffered(
                          date: _timeLabel(l10n, row.offerExpiresAt!),
                        )
                      : l10n.hostRequestsOffer,
                  fullWidth: true,
                  status: deciding
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  onPressed: deciding || row.hasLiveOffer ? null : onOffer,
                ),
            ],
          ),
        ),
      ],
    );
  }
}

String _nameOf(AppLocalizations l10n, HostRequest row) =>
    row.name ?? l10n.hostRequestsGuest;

String _subtitleOf(AppLocalizations l10n, HostRequest row) {
  final offerExpiresAt = row.offerExpiresAt;
  if (offerExpiresAt != null) {
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
