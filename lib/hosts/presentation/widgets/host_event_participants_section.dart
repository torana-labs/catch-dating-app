import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_check_in_qr_payload.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/responsive/component_breakpoints.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/events/events.dart'
    show attendeeProfilesProvider;
import 'package:catch_dating_app/events/shared/attendance_sheet_view_model.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_action_keys.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_roster_display_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_roster_row_state.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/participant_table.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart' show listEquals;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';

part 'host_event_check_in_qr_section.dart';
part 'host_event_participants_section_list.dart';
part 'host_roster_filter_header.dart';

enum HostEventParticipantsMode { setup, live, report }

class HostEventParticipantsSection extends ConsumerStatefulWidget {
  const HostEventParticipantsSection({
    super.key,
    required this.eventId,
    required this.mode,
    this.scrollable = false,
    this.showSummaryHeader = true,
    this.initialSearchQuery = '',
  });

  final String eventId;
  final HostEventParticipantsMode mode;
  final bool scrollable;
  final bool showSummaryHeader;
  final String initialSearchQuery;

  @override
  ConsumerState<HostEventParticipantsSection> createState() =>
      _HostEventParticipantsSectionState();
}

class _HostEventParticipantsSectionState
    extends ConsumerState<HostEventParticipantsSection> {
  List<String> _stableProfileIds = const [];

  List<String> _profileIdsFor(List<String> nextProfileIds) {
    if (!listEquals(_stableProfileIds, nextProfileIds)) {
      _stableProfileIds = List.unmodifiable(nextProfileIds);
    }
    return _stableProfileIds;
  }

  @override
  Widget build(BuildContext context) {
    final eventId = widget.eventId;
    final attendanceAsync = ref.watch(
      attendanceSheetViewModelProvider(eventId),
    );

    return CatchAsyncBoundary<AttendanceSheetViewModel?>(
      value: attendanceAsync,
      onRetry: () {
        ref.invalidate(watchEventProvider(eventId));
        ref.invalidate(watchEventParticipationsForEventProvider(eventId));
        ref.invalidate(attendanceSheetViewModelProvider(eventId));
      },
      loadingBuilder: (_) => const CatchLoadingIndicator(),
      errorBuilder: (_, error, _, onBoundaryRetry) => Padding(
        padding: CatchInsets.content,
        child: CatchLocalizedErrorState(
          error,
          context: AppErrorContext.event,
          onRetry: onBoundaryRetry,
          mode: CatchErrorStateMode.inline,
        ),
      ),
      builder: (context, viewModel) {
        if (viewModel == null) {
          return Padding(
            padding: CatchInsets.contentVerticalRelaxed,
            child: CatchEmptyState(
              icon: CatchIcons.eventUnavailable,
              title:
                  context.l10n.hostsHostEventAttendancePanelTitleEventNotFound,
              message: context
                  .l10n
                  .hostsHostEventAttendancePanelMessageThisEventIsNo,
            ),
          );
        }
        final participantIds = viewModel.profileIds;
        final bulkOfferMutation = ref.watch(
          HostEventBookingController.createWaitlistOfferMutation(
            HostEventBookingController.bulkWaitlistOfferMutationKey(
              eventId: viewModel.event.id,
            ),
          ),
        );
        final opsExportMutation = ref.watch(
          HostEventManageController.shareOpsReportMutation,
        );
        final revenueExportMutation = ref.watch(
          HostEventManageController.shareRevenueReportMutation,
        );
        final bulkOfferError = bulkOfferMutation.hasError
            ? (bulkOfferMutation as MutationError).error
            : null;
        final opsReportError = opsExportMutation.hasError
            ? (opsExportMutation as MutationError).error
            : null;
        final revenueReportError = revenueExportMutation.hasError
            ? (revenueExportMutation as MutationError).error
            : null;
        final mutationState = HostParticipantsMutationDisplayState.resolve(
          markAttendancePendingIds: _pendingMutationIds(
            participantIds,
            (uid) => HostEventBookingController.markAttendanceMutation(
              HostEventBookingController.markAttendanceMutationKey(
                eventId: viewModel.event.id,
                userId: uid,
              ),
            ),
          ),
          approveJoinRequestPendingIds: _pendingMutationIds(
            participantIds,
            (uid) => HostEventBookingController.approveJoinRequestMutation(
              HostEventBookingController.approveJoinRequestMutationKey(
                eventId: viewModel.event.id,
                userId: uid,
              ),
            ),
          ),
          declineJoinRequestPendingIds: _pendingMutationIds(
            participantIds,
            (uid) => HostEventBookingController.declineJoinRequestMutation(
              HostEventBookingController.declineJoinRequestMutationKey(
                eventId: viewModel.event.id,
                userId: uid,
              ),
            ),
          ),
          createWaitlistOfferPendingIds: _pendingMutationIds(
            participantIds,
            (uid) => HostEventBookingController.createWaitlistOfferMutation(
              HostEventBookingController.waitlistOfferMutationKey(
                eventId: viewModel.event.id,
                userId: uid,
              ),
            ),
          ),
          bulkWaitlistOfferPending: bulkOfferMutation.isPending,
          opsReportPending: opsExportMutation.isPending,
          revenueReportPending: revenueExportMutation.isPending,
          markAttendanceError: participantIds
              .map(
                (uid) => _mutationError(
                  ref.watch(
                    HostEventBookingController.markAttendanceMutation(
                      HostEventBookingController.markAttendanceMutationKey(
                        eventId: viewModel.event.id,
                        userId: uid,
                      ),
                    ),
                  ),
                ),
              )
              .nonNulls
              .firstOrNull,
          approveJoinRequestError: participantIds
              .map(
                (uid) => _mutationError(
                  ref.watch(
                    HostEventBookingController.approveJoinRequestMutation(
                      HostEventBookingController.approveJoinRequestMutationKey(
                        eventId: viewModel.event.id,
                        userId: uid,
                      ),
                    ),
                  ),
                ),
              )
              .nonNulls
              .firstOrNull,
          declineJoinRequestError: participantIds
              .map(
                (uid) => _mutationError(
                  ref.watch(
                    HostEventBookingController.declineJoinRequestMutation(
                      HostEventBookingController.declineJoinRequestMutationKey(
                        eventId: viewModel.event.id,
                        userId: uid,
                      ),
                    ),
                  ),
                ),
              )
              .nonNulls
              .firstOrNull,
          createWaitlistOfferError:
              bulkOfferError ??
              participantIds
                  .map(
                    (uid) => _mutationError(
                      ref.watch(
                        HostEventBookingController.createWaitlistOfferMutation(
                          HostEventBookingController.waitlistOfferMutationKey(
                            eventId: viewModel.event.id,
                            userId: uid,
                          ),
                        ),
                      ),
                    ),
                  )
                  .nonNulls
                  .firstOrNull,
          opsReportError: opsReportError,
          revenueReportError: revenueReportError,
        );

        final profileIds = _profileIdsFor(viewModel.profileIds);
        final profilesAsync = profileIds.isEmpty
            ? null
            : ref.watch(attendeeProfilesProvider(profileIds));
        final profileLookupState = HostParticipantProfilesLookupState.resolve(
          profileIds: profileIds,
          profilesState: profilesAsync == null
              ? null
              : _catchAsyncState(profilesAsync),
        );

        return HostEventParticipantsSectionList(
          viewModel: viewModel,
          mode: widget.mode,
          scrollable: widget.scrollable,
          showSummaryHeader: widget.showSummaryHeader,
          initialSearchQuery: widget.initialSearchQuery,
          profileLookupState: profileLookupState,
          mutationState: mutationState,
          actions: HostParticipantLifecycleActions(
            openProfile: (uid) => _openPublicProfile(context, uid),
            approveJoinRequest: (uid) => _approveJoinRequest(viewModel, uid),
            declineJoinRequest: (uid) => _declineJoinRequest(viewModel, uid),
            toggleAttendance: (uid) => _toggleAttendance(viewModel, uid),
            createWaitlistOffers: (userIds) =>
                _createWaitlistOffers(viewModel, userIds),
            shareOpsReport: () =>
                _shareOpsReport(viewModel, profileLookupState),
            shareRevenueReport: () =>
                _shareRevenueReport(viewModel, profileLookupState),
          ),
          onRetryProfiles: () => ref.invalidate(
            attendeeProfilesProvider(profileLookupState.profileIds),
          ),
        );
      },
    );
  }

  void _toggleAttendance(AttendanceSheetViewModel viewModel, String uid) {
    final mutation = HostEventBookingController.markAttendanceMutation(
      HostEventBookingController.markAttendanceMutationKey(
        eventId: viewModel.event.id,
        userId: uid,
      ),
    );
    if (ref.read(mutation).isPending) return;
    mutation.run(
      ref,
      (tx) async => tx
          .get(hostEventBookingControllerProvider.notifier)
          .markAttendance(eventId: viewModel.event.id, userId: uid),
    );
  }

  void _approveJoinRequest(AttendanceSheetViewModel viewModel, String uid) {
    final mutation = HostEventBookingController.approveJoinRequestMutation(
      HostEventBookingController.approveJoinRequestMutationKey(
        eventId: viewModel.event.id,
        userId: uid,
      ),
    );
    if (ref.read(mutation).isPending) return;
    mutation.run(
      ref,
      (tx) async => tx
          .get(hostEventBookingControllerProvider.notifier)
          .approveJoinRequest(eventId: viewModel.event.id, userId: uid),
    );
  }

  void _declineJoinRequest(AttendanceSheetViewModel viewModel, String uid) {
    final mutation = HostEventBookingController.declineJoinRequestMutation(
      HostEventBookingController.declineJoinRequestMutationKey(
        eventId: viewModel.event.id,
        userId: uid,
      ),
    );
    if (ref.read(mutation).isPending) return;
    mutation.run(
      ref,
      (tx) async => tx
          .get(hostEventBookingControllerProvider.notifier)
          .declineJoinRequest(eventId: viewModel.event.id, userId: uid),
    );
  }

  void _createWaitlistOffers(
    AttendanceSheetViewModel viewModel,
    List<String> userIds,
  ) {
    if (userIds.isEmpty) return;
    final mutation = HostEventBookingController.createWaitlistOfferMutation(
      HostEventBookingController.waitlistOfferSelectionMutationKey(
        viewModel.event.id,
        userIds,
      ),
    );
    if (ref.read(mutation).isPending) return;
    mutation.run(
      ref,
      (tx) async => tx
          .get(hostEventBookingControllerProvider.notifier)
          .createWaitlistOffers(eventId: viewModel.event.id, userIds: userIds),
    );
  }

  Future<void> _shareRevenueReport(
    AttendanceSheetViewModel viewModel,
    HostParticipantProfilesLookupState profileLookupState,
  ) async {
    final origin = _shareOrigin(context);
    try {
      await HostEventManageController.shareRevenueReportMutation.run(
        ref,
        (tx) => tx
            .get(hostEventManageActionsProvider)
            .shareRevenueReport(
              viewModel: viewModel,
              profiles: profileLookupState.profiles,
              origin: origin,
            ),
      );
      if (!mounted) return;
      showCatchNotice(
        context,
        context.l10n.hostsHostEventAttendancePanelVisiblecopyRevenueCsvReady,
      );
    } catch (error, stackTrace) {
      ref
          .read(errorLoggerProvider)
          .logError(
            error,
            stackTrace,
            reason: context
                .l10n
                .hostsHostEventAttendancePanelVisiblecopySharerevenuereportFailed,
          );
    }
  }

  Future<void> _shareOpsReport(
    AttendanceSheetViewModel viewModel,
    HostParticipantProfilesLookupState profileLookupState,
  ) async {
    final origin = _shareOrigin(context);
    try {
      await HostEventManageController.shareOpsReportMutation.run(
        ref,
        (tx) => tx
            .get(hostEventManageActionsProvider)
            .shareOpsReport(
              viewModel: viewModel,
              profiles: profileLookupState.profiles,
              origin: origin,
            ),
      );
      if (!mounted) return;
      showCatchNotice(
        context,
        context.l10n.hostsHostEventAttendancePanelVisiblecopyOpsCsvReady,
      );
    } catch (error, stackTrace) {
      ref
          .read(errorLoggerProvider)
          .logError(
            error,
            stackTrace,
            reason: context
                .l10n
                .hostsHostEventAttendancePanelVisiblecopyShareopsreportFailed,
          );
    }
  }

  Set<String> _pendingMutationIds(
    Iterable<String> ids,
    Mutation<void> Function(String uid) mutationFor,
  ) {
    return {
      for (final uid in ids)
        if (ref.watch(mutationFor(uid)).isPending) uid,
    };
  }
}

CatchAsyncState<T> _catchAsyncState<T>(AsyncValue<T> value) {
  return catchAsyncStateFromAsyncValue(value);
}

Rect? _shareOrigin(BuildContext context) {
  final box = context.findRenderObject() as RenderBox?;
  return box == null ? null : box.localToGlobal(Offset.zero) & box.size;
}

void _openPublicProfile(BuildContext context, String uid) {
  final router = GoRouter.maybeOf(context);
  if (router == null) return;
  router.pushNamed(
    Routes.publicProfileScreen.name,
    pathParameters: {'uid': uid},
  );
}
