import 'dart:async';

import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_error_context.dart' as app_ops;
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/clipboard.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/events/data/event_attendee_repository.dart';
import 'package:catch_dating_app/events/data/event_runtime_claim_repository.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_attendee.dart';
import 'package:catch_dating_app/events/domain/event_runtime_claim_request.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:catch_dating_app/hosts/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/hosts/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/hosts/data/host_provider_repository.dart';
import 'package:catch_dating_app/hosts/data/host_roster_file_parser.dart';
import 'package:catch_dating_app/hosts/data/host_roster_intake_draft_journal.dart';
import 'package:catch_dating_app/hosts/data/host_roster_intake_repository.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/hosts/domain/host_roster_import.dart';
import 'package:catch_dating_app/hosts/presentation/host_operational_roster_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_roster_insight_filter.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_booking_provider_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_luma_connection_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_roster_import_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_roster_intake_review_sheet.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

part 'host_attendance_outbox_notice.dart';
part 'host_manual_attendee_sheet.dart';
part 'host_operational_roster_actions.dart';
part 'host_operational_roster_support.dart';
part 'host_roster_handoff_sheet.dart';

class HostGuestIntakeField extends StatelessWidget {
  const HostGuestIntakeField({
    super.key,
    required this.eventId,
    required this.organizerId,
    this.bookingProvider,
    this.suggestedRevenueAmountMinor,
    this.revenueCurrency = defaultCurrencyCode,
  });

  final String eventId;
  final String organizerId;
  final ExternalBookingProvider? bookingProvider;
  final int? suggestedRevenueAmountMinor;
  final String revenueCurrency;

  @override
  Widget build(BuildContext context) =>
      HostOperationalRosterSection._guestIntake(
        eventId: eventId,
        organizerId: organizerId,
        bookingProvider: bookingProvider,
        suggestedRevenueAmountMinor: suggestedRevenueAmountMinor,
        revenueCurrency: revenueCurrency,
      );
}

class HostGuestIntakeSettingsField extends StatelessWidget {
  const HostGuestIntakeSettingsField({
    super.key,
    required this.importing,
    required this.creatingHandoff,
    required this.providerMutationPending,
    required this.showsProviderSource,
    required this.providerSetup,
    required this.bookingProvider,
    required this.mutationError,
    required this.onOpenChanged,
    required this.onImport,
    required this.onResume,
    required this.onAddGuest,
    required this.onForward,
    required this.onRetryProvider,
    required this.onConnect,
    required this.onSync,
    required this.onDisconnect,
  });

  final bool importing;
  final bool creatingHandoff;
  final bool providerMutationPending;
  final bool showsProviderSource;
  final AsyncValue<HostProviderSetup>? providerSetup;
  final ExternalBookingProvider? bookingProvider;
  final Object? mutationError;
  final ValueChanged<bool> onOpenChanged;
  final VoidCallback onImport;
  final VoidCallback? onResume;
  final VoidCallback onAddGuest;
  final VoidCallback onForward;
  final VoidCallback onRetryProvider;
  final VoidCallback onConnect;
  final VoidCallback onSync;
  final VoidCallback onDisconnect;

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: CatchField.control(
        copy: catchFieldCopy(context.l10n),
        key: const ValueKey<String>('host_event_guest_intake_field'),
        title: context.l10n.hostsOperationalRosterGuestIntakeTitle,
        body: context.l10n.hostsOperationalRosterGuestIntakeBody,
        contractExemption:
            'Disclosure and action surface for importing a server-owned event '
            'guest list; the field itself does not persist a scalar value.',
        icon: CatchIcons.groupsOutlined,
        onOpenChanged: onOpenChanged,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                CatchButton(
                  label: context.l10n.hostsOperationalRosterImport,
                  onPressed: importing ? null : onImport,
                  status: (importing)
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  variant: CatchButtonVariant.secondary,
                  leading: Icon(CatchIcons.cloudUploadOutlined),
                ),
                if (onResume != null)
                  CatchButton(
                    key: const ValueKey<String>('host-roster-intake-resume'),
                    label: context.l10n.hostsOperationalRosterIntakeResume,
                    onPressed: importing ? null : onResume,
                    variant: CatchButtonVariant.secondary,
                    leading: Icon(CatchIcons.refreshRounded),
                  ),
                CatchButton(
                  label: context.l10n.hostsOperationalRosterAddGuest,
                  onPressed: importing ? null : onAddGuest,
                  variant: CatchButtonVariant.ghost,
                  leading: Icon(CatchIcons.personAddAlt1Outlined),
                ),
                CatchButton(
                  label: context.l10n.hostsOperationalRosterForwardCsv,
                  onPressed: importing || creatingHandoff ? null : onForward,
                  status: (creatingHandoff)
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  variant: CatchButtonVariant.ghost,
                  leading: Icon(CatchIcons.alternateEmailOutlined),
                ),
              ],
            ),
            if (mutationError case final error?) ...[
              gapH12,
              CatchLocalizedErrorBanner(error, context: AppErrorContext.event),
            ],
            if (showsProviderSource) ...[
              gapH20,
              CatchText(
                context.l10n.hostsOperationalRosterProviderTitle,
                variant: CatchTextVariant.sectionTitle,
              ),
              gapH4,
              CatchText(
                context.l10n.hostsOperationalRosterProviderBody(
                  provider: _providerDisplayName(context, bookingProvider!),
                ),
                variant: CatchTextVariant.supporting,
              ),
              gapH12,
              HostBookingProviderSection(
                value: providerSetup,
                provider: bookingProvider!,
                mutationPending: providerMutationPending,
                allowChanges: true,
                onRetry: onRetryProvider,
                onConnect: onConnect,
                onSync: onSync,
                onDisconnect: onDisconnect,
                onImport: onImport,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

enum _HostOperationalRosterView { guestIntake, roster }

class HostOperationalRosterSection extends ConsumerStatefulWidget {
  const HostOperationalRosterSection({
    super.key,
    required this.eventId,
    required this.organizerId,
    this.allowAttendanceChanges = true,
    this.allowRuntimeClaimReview = true,
    this.showAudienceInsights = true,
    this.allowManualGuest = false,
    this.suggestedRevenueAmountMinor,
    this.revenueCurrency = defaultCurrencyCode,
  }) : _view = _HostOperationalRosterView.roster,
       bookingProvider = null;

  const HostOperationalRosterSection._guestIntake({
    required this.eventId,
    required this.organizerId,
    required this.bookingProvider,
    required this.suggestedRevenueAmountMinor,
    required this.revenueCurrency,
  }) : _view = _HostOperationalRosterView.guestIntake,
       allowAttendanceChanges = false,
       allowRuntimeClaimReview = false,
       showAudienceInsights = false,
       allowManualGuest = false;

  final String eventId;
  final String organizerId;
  final bool allowAttendanceChanges;
  final bool allowRuntimeClaimReview;
  final bool showAudienceInsights;
  final bool allowManualGuest;
  final ExternalBookingProvider? bookingProvider;
  final int? suggestedRevenueAmountMinor;
  final String revenueCurrency;
  final _HostOperationalRosterView _view;

  @override
  ConsumerState<HostOperationalRosterSection> createState() =>
      _HostOperationalRosterSectionState();
}

class _HostOperationalRosterSectionState
    extends ConsumerState<HostOperationalRosterSection> {
  void _setLocalState(VoidCallback callback) => setState(callback);

  var _importing = false;
  var _importGeneration = 0;
  final _rosterIntakeScopeRevision = ValueNotifier<int>(0);
  var _creatingHandoff = false;
  String? _pendingAttendanceId;
  String? _pendingClaimUid;
  AsyncValue<HostProviderSetup>? _providerSetup;
  var _providerMutationPending = false;
  String? _providerSyncOperationId;
  Object? _mutationError;
  String? _savedRosterIntakeSessionId;
  HostAttendanceOutboxSummary? _attendanceOutbox;
  HostRosterInsightFilter _insightFilter = HostRosterInsightFilter.all;

  @override
  void initState() {
    super.initState();
    if (widget._view == _HostOperationalRosterView.roster) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) unawaited(_loadAttendanceOutbox());
      });
      ref.listenManual(appConnectivityProvider, (previous, next) {
        final results = next.asData?.value;
        if (results != null && !connectivityResultsAreOffline(results)) {
          unawaited(_flushAttendanceOutbox());
        }
      });
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) unawaited(_loadRosterIntakeDraft());
      });
    }
    ref.listenManual(uidProvider, (previous, next) {
      if (previous?.asData?.value == next.asData?.value) return;
      _invalidateRosterIntakeScope();
      if (mounted && widget._view == _HostOperationalRosterView.guestIntake) {
        unawaited(_loadRosterIntakeDraft());
      }
    });
  }

  void _invalidateRosterIntakeScope() {
    _importGeneration += 1;
    _rosterIntakeScopeRevision.value += 1;
    if (!mounted) return;
    _setLocalState(() {
      _importing = false;
      _mutationError = null;
      _savedRosterIntakeSessionId = null;
    });
  }

  @override
  void didUpdateWidget(covariant HostOperationalRosterSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.eventId != widget.eventId ||
        oldWidget.organizerId != widget.organizerId ||
        oldWidget._view != widget._view) {
      _invalidateRosterIntakeScope();
      unawaited(_loadRosterIntakeDraft());
    }
  }

  @override
  void dispose() {
    _rosterIntakeScopeRevision.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget._view == _HostOperationalRosterView.guestIntake) {
      return HostGuestIntakeSettingsField(
        importing: _importing,
        creatingHandoff: _creatingHandoff,
        providerMutationPending: _providerMutationPending,
        showsProviderSource: _showsProviderSource,
        providerSetup: _providerSetup,
        bookingProvider: widget.bookingProvider,
        mutationError: _mutationError,
        onOpenChanged: (open) {
          if (open) unawaited(_loadRosterIntakeDraft());
          if (open && _showsProviderSource) {
            unawaited(_loadProviderSetup());
          }
        },
        onImport: () => unawaited(_pickRoster()),
        onResume: _savedRosterIntakeSessionId == null
            ? null
            : () => unawaited(_resumeRosterIntake()),
        onAddGuest: () => unawaited(_showManualGuest()),
        onForward: () => unawaited(_showRosterHandoff()),
        onRetryProvider: () => unawaited(_loadProviderSetup(force: true)),
        onConnect: () => unawaited(_connectLuma()),
        onSync: () => unawaited(_syncProvider()),
        onDisconnect: () => unawaited(_disconnectProvider()),
      );
    }
    final attendeesAsync = ref.watch(
      watchEventAttendeesProvider(widget.eventId),
    );
    final attendeesState = catchAsyncStateFromAsyncValue(attendeesAsync);
    final insightsAsync = widget.showAudienceInsights
        ? ref.watch(hostEventRosterInsightsProvider(widget.eventId))
        : null;
    final claimsAsync = widget.allowRuntimeClaimReview
        ? ref.watch(watchPendingEventRuntimeClaimsProvider(widget.eventId))
        : const AsyncData<List<EventRuntimeClaimRequest>>([]);
    final rosterSection = CatchSection.contained(
      title: context.l10n.hostsOperationalRosterTitle,
      subtitle: context.l10n.hostsOperationalRosterSubtitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (widget.allowManualGuest) ...[
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: CatchButton(
                label: context.l10n.hostsOperationalRosterAddWalkIn,
                onPressed: _importing
                    ? null
                    : () => unawaited(_showManualGuest()),
                status: (_importing)
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                variant: CatchButtonVariant.secondary,
                leading: Icon(CatchIcons.personAddAlt1Outlined),
              ),
            ),
            gapH12,
          ],
          if (_mutationError case final error?) ...[
            CatchLocalizedErrorBanner(error, context: AppErrorContext.event),
            gapH12,
          ],
          if (_attendanceOutbox case final outbox?
              when outbox.entries.isNotEmpty) ...[
            HostAttendanceOutboxNotice(
              summary: outbox,
              onRetry: () => unawaited(_flushAttendanceOutbox()),
              onDiscardConflicts: () => unawaited(_clearAttendanceConflicts()),
            ),
            gapH12,
          ],
          CatchAsyncBoundary<List<EventRuntimeClaimRequest>>(
            value: claimsAsync,
            onRetry: () => ref.invalidate(
              watchPendingEventRuntimeClaimsProvider(widget.eventId),
            ),
            loadingBuilder: (_) => const SizedBox.shrink(),
            errorBuilder: (_, error, _, onBoundaryRetry) =>
                CatchLocalizedErrorBanner(
                  error,
                  context: AppErrorContext.event,
                  onRetry: onBoundaryRetry,
                ),
            builder: (context, claims) {
              if (claims.isEmpty) return const SizedBox.shrink();
              return Padding(
                padding: CatchInsets.sectionItemBottomGap,
                child: HostRuntimeClaimList(
                  claims: claims,
                  attendees: attendeesState.value ?? const [],
                  pendingUid: _pendingClaimUid,
                  onApprove: (claim, attendeeId) => unawaited(
                    _reviewClaim(
                      claim,
                      EventRuntimeClaimDecision.approve,
                      attendeeId: attendeeId,
                    ),
                  ),
                  onReject: (claim) => unawaited(
                    _reviewClaim(claim, EventRuntimeClaimDecision.reject),
                  ),
                ),
              );
            },
          ),
          CatchAsyncBoundary<List<EventAttendee>>(
            value: attendeesAsync,
            errorContext: AppErrorContext.event,
            onRetry: () =>
                ref.invalidate(watchEventAttendeesProvider(widget.eventId)),
            builder: (context, attendees) {
              if (attendees.isEmpty) {
                return CatchEmptyState(
                  variant: CatchEmptyStateVariant.inline,
                  icon: CatchIcons.groupsOutlined,
                  title: context.l10n.hostsOperationalRosterEmptyTitle,
                  message: context.l10n.hostsOperationalRosterEmptyMessage,
                );
              }
              final insights = insightsAsync == null
                  ? null
                  : catchAsyncStateFromAsyncValue(insightsAsync).value;
              final insightByAttendeeId = insights?.byAttendeeId ?? const {};
              final effectiveFilter = insights == null
                  ? HostRosterInsightFilter.all
                  : _insightFilter;
              final filteredAttendees = attendees
                  .where(
                    (attendee) => hostRosterInsightMatches(
                      effectiveFilter,
                      insightByAttendeeId[attendee.id],
                    ),
                  )
                  .toList(growable: false);
              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (widget.showAudienceInsights) ...[
                    HostRosterInsightRail(
                      insightsAsync: insightsAsync!,
                      attendeeCount: attendees.length,
                      selected: _insightFilter,
                      onSelected: (filter) =>
                          setState(() => _insightFilter = filter),
                      onRetry: () => ref.invalidate(
                        hostEventRosterInsightsProvider(widget.eventId),
                      ),
                    ),
                    gapH12,
                  ],
                  if (filteredAttendees.isEmpty)
                    CatchEmptyState(
                      variant: CatchEmptyStateVariant.inline,
                      icon: CatchIcons.searchOffRounded,
                      title: context
                          .l10n
                          .hostsOperationalRosterInsightsFilterEmptyTitle,
                      message: context
                          .l10n
                          .hostsOperationalRosterInsightsFilterEmptyMessage,
                    )
                  else
                    CatchSection.containedRows(
                      children: [
                        for (final attendee in filteredAttendees)
                          CatchField.read(
                            key: ValueKey(attendee.id),
                            content: _attendeeLayout(
                              context,
                              attendee,
                              insightByAttendeeId[attendee.id],
                            ),
                            secondaryAction: widget.allowAttendanceChanges
                                ? CatchFieldSecondaryAction.button(
                                    label: attendee.isCheckedIn
                                        ? context
                                              .l10n
                                              .hostsOperationalRosterUndoCheckIn
                                        : context
                                              .l10n
                                              .hostsOperationalRosterCheckIn,
                                    loading:
                                        _pendingAttendanceId == attendee.id ||
                                        _attendanceOutbox?.forAttendee(
                                              attendee.id,
                                            ) !=
                                            null,
                                    onActivate:
                                        _pendingAttendanceId == attendee.id ||
                                            _attendanceOutbox?.forAttendee(
                                                  attendee.id,
                                                ) !=
                                                null
                                        ? null
                                        : () => unawaited(
                                            _toggleAttendance(attendee),
                                          ),
                                  )
                                : null,
                          ),
                      ],
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
    return rosterSection;
  }
}

class HostRosterInsightRail extends StatelessWidget {
  const HostRosterInsightRail({
    super.key,
    required this.insightsAsync,
    required this.attendeeCount,
    required this.selected,
    required this.onSelected,
    required this.onRetry,
  });

  final AsyncValue<HostEventRosterInsights> insightsAsync;
  final int attendeeCount;
  final HostRosterInsightFilter selected;
  final ValueChanged<HostRosterInsightFilter> onSelected;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => insightsAsync.when(
    loading: () => CatchText(
      context.l10n.hostsOperationalRosterInsightsLoading,
      variant: CatchTextVariant.supporting,
    ),
    error: (_, _) => Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: CatchSpacing.s2,
      runSpacing: CatchSpacing.s2,
      children: [
        CatchText(
          context.l10n.hostsOperationalRosterInsightsUnavailable,
          variant: CatchTextVariant.supporting,
        ),
        CatchButton(
          label: context.l10n.hostsOperationalRosterInsightsRetry,
          onPressed: onRetry,
          size: CatchButtonSize.sm,
          variant: CatchButtonVariant.ghost,
        ),
      ],
    ),
    data: (insights) {
      final filters = <HostRosterInsightFilter>[
        HostRosterInsightFilter.all,
        for (final filter in HostRosterInsightFilter.values.skip(1))
          if (hostRosterInsightFilterCount(filter, insights.rows) > 0 ||
              filter == selected)
            filter,
      ];
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchText(
            context.l10n.hostsOperationalRosterInsightsCaption,
            variant: CatchTextVariant.supporting,
          ),
          gapH8,
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              for (final filter in filters)
                CatchChip.selectable(
                  label: _insightFilterLabel(
                    context,
                    filter,
                    filter == HostRosterInsightFilter.all
                        ? attendeeCount
                        : hostRosterInsightFilterCount(filter, insights.rows),
                  ),
                  selected: selected == filter,
                  onChanged: (_) => onSelected(filter),
                  contractExemption:
                      'Manager-only, callable-owned roster insight filter; '
                      'selection is ephemeral and is never persisted.',
                ),
            ],
          ),
          if (insights.spendCoverage ==
              HostRosterSpendCoverage.catchPaymentsOnly) ...[
            gapH8,
            Text(
              context.l10n.hostsOperationalRosterInsightsSpendFootnote,
              style: CatchTextStyles.meta(context),
            ),
          ],
          if (insights.sourceCoverage == HostRosterInsightCoverage.partial) ...[
            gapH8,
            Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                Text(
                  context.l10n.hostsOperationalRosterInsightsPreparing,
                  style: CatchTextStyles.meta(context),
                ),
                CatchButton(
                  label: context.l10n.hostsOperationalRosterInsightsRetry,
                  onPressed: onRetry,
                  size: CatchButtonSize.sm,
                  variant: CatchButtonVariant.ghost,
                ),
              ],
            ),
          ],
        ],
      );
    },
  );
}

CatchPersonLayout _attendeeLayout(
  BuildContext context,
  EventAttendee attendee,
  HostEventRosterInsight? insight,
) {
  final signals = _displayInsightSignals(insight);
  return CatchPersonLayout(
    name: attendee.displayName,
    supportingText: _attendeeMeta(context, attendee),
    context: attendee.hasEventIdentity
        ? context.l10n.hostsOperationalRosterIdentityLinked
        : null,
    badges: [
      CatchRowBadge(
        label: _statusCopy(context, attendee.status),
        tone: attendee.isCheckedIn
            ? CatchBadgeTone.success
            : CatchBadgeTone.neutral,
      ),
      for (final signal in signals)
        CatchRowBadge(
          label: _insightSignalLabel(context, signal),
          tone: _insightSignalTone(signal),
        ),
    ],
  );
}

class HostRuntimeClaimList extends StatelessWidget {
  const HostRuntimeClaimList({
    super.key,
    required this.claims,
    required this.attendees,
    required this.pendingUid,
    required this.onApprove,
    required this.onReject,
  });

  final List<EventRuntimeClaimRequest> claims;
  final List<EventAttendee> attendees;
  final String? pendingUid;
  final void Function(EventRuntimeClaimRequest claim, String attendeeId)
  onApprove;
  final ValueChanged<EventRuntimeClaimRequest> onReject;

  @override
  Widget build(BuildContext context) {
    final attendeesById = <String, EventAttendee>{
      for (final attendee in attendees) attendee.id: attendee,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchBadge.functional(
          label: context.l10n.hostsOperationalRosterClaimsPending(
            count: claims.length,
          ),
          tone: CatchBadgeTone.warning,
        ),
        gapH8,
        CatchSection.containedRows(
          children: [
            for (final indexed in claims.indexed)
              CatchField.read(
                key: ValueKey('runtime-claim-${indexed.$2.uid}'),
                content: CatchPersonLayout(
                  name: indexed.$2.displayName,
                  supportingText: context.l10n.hostsOperationalRosterClaimPhone(
                    phoneLastFour: indexed.$2.phoneLastFour,
                  ),
                  context: context.l10n.hostsOperationalRosterClaimContext,
                ),
                secondaryAction: hostRuntimeClaimActions(
                  context,
                  claim: indexed.$2,
                  attendeesById: attendeesById,
                  pending: pendingUid == indexed.$2.uid,
                  enabled: pendingUid == null,
                  onApprove: (id) => onApprove(indexed.$2, id),
                  onReject: () => onReject(indexed.$2),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

CatchFieldSecondaryAction hostRuntimeClaimActions(
  BuildContext context, {
  required EventRuntimeClaimRequest claim,
  required Map<String, EventAttendee> attendeesById,
  required bool pending,
  required bool enabled,
  required ValueChanged<String> onApprove,
  required VoidCallback onReject,
}) => CatchFieldSecondaryAction.group([
  if (claim.candidateAttendeeIds.length == 1)
    CatchFieldSecondaryAction.button(
      label: context.l10n.hostsOperationalRosterClaimApprove,
      loading: pending,
      onActivate: enabled
          ? () => onApprove(claim.candidateAttendeeIds.single)
          : null,
    )
  else
    CatchFieldSecondaryAction.selection<String>(
      label: context.l10n.hostsOperationalRosterClaimChooseGuest,
      enabled: enabled,
      loading: pending,
      items: [
        for (final id in claim.candidateAttendeeIds)
          CatchMenuItem(
            value: id,
            label: attendeesById[id]?.displayName ?? id,
            sublabel: attendeesById[id]?.phoneE164,
          ),
      ],
      onSelected: onApprove,
    ),
  CatchFieldSecondaryAction.button(
    label: context.l10n.hostsOperationalRosterClaimReject,
    onActivate: enabled && !pending ? onReject : null,
  ),
]);
