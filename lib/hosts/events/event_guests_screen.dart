import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/events/shared/attendance_sheet_view_model.dart';
import 'package:catch_dating_app/hosts/events/event_guests_body.dart';
import 'package:catch_dating_app/hosts/events/event_guests_controller.dart';
import 'package:catch_dating_app/hosts/events/event_guests_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_screen.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_state.dart';
import 'package:catch_dating_app/hosts/events/guest_safety_commands_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/dialogs/confirm_danger_dialog.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

/// The event's guests: booked, asked, waitlisted and cancelled, with Let in
/// for a guest who asked, Offer for a guest waiting, Message all and
/// Download the list.
///
/// It watches [hostEventGuestsControllerProvider] and turns the body's
/// callbacks into the existing join-request approval and decline, waitlist
/// offers (one guest, or the places left at once) and list export
/// commands, the event's messages and the guest's profile. Tapping a guest
/// who asked asks Let in, Decline or See profile; tapping anyone else asks
/// See profile, Report or Block from your events. Blocked from your events
/// lists who the organiser has blocked, with Let them back.
class HostEventGuestsScreen extends ConsumerStatefulWidget {
  const HostEventGuestsScreen({super.key, required this.request});

  final HostEventRequest request;

  @override
  ConsumerState<HostEventGuestsScreen> createState() =>
      _HostEventGuestsScreenState();
}

class _HostEventGuestsScreenState extends ConsumerState<HostEventGuestsScreen> {
  HostEventGuestList _list = HostEventGuestList.booked;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final request = widget.request;
    final state = ref.watch(hostEventGuestsControllerProvider(request));
    final event = state.event;
    // Let in and Offer run one keyed mutation per guest; a failed one shows
    // its error notice, and a running one marks the guest's row busy.
    final guestMutations = <String, List<Mutation<Object?>>>{
      for (final guest in [
        ...state.listOf(HostEventGuestList.asked),
        ...state.listOf(HostEventGuestList.waitlist),
      ])
        if (guest.uid case final uid?)
          guest.id: [
            HostEventBookingController.approveJoinRequestMutation(
              HostEventBookingController.approveJoinRequestMutationKey(
                eventId: request.eventId,
                userId: uid,
              ),
            ),
            HostEventBookingController.declineJoinRequestMutation(
              HostEventBookingController.declineJoinRequestMutationKey(
                eventId: request.eventId,
                userId: uid,
              ),
            ),
            HostEventBookingController.createWaitlistOfferMutation(
              HostEventBookingController.waitlistOfferMutationKey(
                eventId: request.eventId,
                userId: uid,
              ),
            ),
          ],
    };
    final offerAllMutation =
        HostEventBookingController.createWaitlistOfferMutation(
          HostEventBookingController.bulkWaitlistOfferMutationKey(
            eventId: request.eventId,
          ),
        );
    final shareMutation = HostEventManageController.shareOpsReportMutation;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        ...guestMutations.values.expand((list) => list),
        offerAllMutation,
        shareMutation,
        HostGuestSafetyCommands.reportMutation,
        HostGuestSafetyCommands.blockMutation,
        HostGuestSafetyCommands.letBackMutation,
      ],
      errorContext: AppErrorContext.event,
    );
    final pending = <String>{
      for (final MapEntry(key: guestId, value: mutations)
          in guestMutations.entries)
        if ([
          for (final mutation in mutations) ref.watch(mutation),
        ].any((state) => state.isPending))
          guestId,
    };
    final share = ref.watch(shareMutation);
    final downloading = share.isPending;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-event-guests-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(
            label: l10n.hostEventsBack,
            // Beside Today or in the split view, Back returns to that list.
            onPressed: CatchWorkspaceBackScope.maybeOf(context),
          ),
          kicker: event == null ? null : hostEventKicker(event),
          title: event?.title,
        ),
        bodyScrolls: false,
        body: HostEventGuestsBody(
          state: state,
          list: _list,
          pending: pending,
          downloading: downloading,
          onView: _view,
          onList: (list) => setState(() => _list = list),
          onLetIn: _letIn,
          onOffer: _offer,
          offeringAll: ref.watch(offerAllMutation).isPending,
          onOfferAll: () => _offerAll(state.offerAllUids),
          onGuest: (guest) => unawaited(_openGuest(guest)),
          onMessageAll: () => context.pushNamed(
            Routes.hostInboxScreen.name,
            queryParameters: {'eventId': request.eventId},
          ),
          onDownload: () => unawaited(_download()),
          onBlocked: () => unawaited(_openBlocked()),
          onRetry: () => retryHostEventGuestsReads(ref, request),
        ),
      ),
    );
  }

  Map<String, String> get _path => {
    'organizerId': widget.request.organizerId,
    'eventId': widget.request.eventId,
  };

  void _view(HostEventView view) {
    switch (view) {
      case HostEventView.guests:
        return;
      case HostEventView.overview:
        if (context.canPop()) {
          context.pop();
        } else {
          context.goNamed(
            Routes.hostAppEventManageScreen.name,
            pathParameters: _path,
          );
        }
      case HostEventView.live || HostEventView.report:
        context.pushNamed(
          Routes.hostAppEventManageScreen.name,
          pathParameters: _path,
          queryParameters: {
            'section': view == HostEventView.live ? 'live' : 'report',
          },
        );
    }
  }

  void _letIn(HostEventGuest guest) {
    final uid = guest.uid;
    if (uid == null) return;
    final eventId = widget.request.eventId;
    _quietly(
      HostEventBookingController.approveJoinRequestMutation(
        HostEventBookingController.approveJoinRequestMutationKey(
          eventId: eventId,
          userId: uid,
        ),
      ).run(
        ref,
        (tx) => tx
            .get(hostEventBookingControllerProvider.notifier)
            .approveJoinRequest(eventId: eventId, userId: uid),
      ),
    );
  }

  void _offer(HostEventGuest guest) {
    final uid = guest.uid;
    if (uid == null) return;
    final eventId = widget.request.eventId;
    _quietly(
      HostEventBookingController.createWaitlistOfferMutation(
        HostEventBookingController.waitlistOfferMutationKey(
          eventId: eventId,
          userId: uid,
        ),
      ).run(
        ref,
        (tx) => tx
            .get(hostEventBookingControllerProvider.notifier)
            .createWaitlistOffers(eventId: eventId, userIds: [uid]),
      ),
    );
  }

  void _offerAll(List<String> uids) {
    if (uids.isEmpty) return;
    final eventId = widget.request.eventId;
    _quietly(
      HostEventBookingController.createWaitlistOfferMutation(
        HostEventBookingController.bulkWaitlistOfferMutationKey(
          eventId: eventId,
        ),
      ).run(
        ref,
        (tx) => tx
            .get(hostEventBookingControllerProvider.notifier)
            .createWaitlistOffers(eventId: eventId, userIds: uids),
      ),
    );
  }

  void _decline(HostEventGuest guest) {
    final uid = guest.uid;
    if (uid == null) return;
    final eventId = widget.request.eventId;
    _quietly(
      HostEventBookingController.declineJoinRequestMutation(
        HostEventBookingController.declineJoinRequestMutationKey(
          eventId: eventId,
          userId: uid,
        ),
      ).run(
        ref,
        (tx) => tx
            .get(hostEventBookingControllerProvider.notifier)
            .declineJoinRequest(eventId: eventId, userId: uid),
      ),
    );
  }

  void _profile(String uid) => context.pushNamed(
    Routes.publicProfileScreen.name,
    pathParameters: {'uid': uid},
  );

  /// A guest who asked gets Let in, Decline or See profile; anyone else
  /// gets See profile, Report or Block from your events.
  Future<void> _openGuest(HostEventGuest guest) async {
    final uid = guest.uid;
    if (uid == null) return;
    if (_list != HostEventGuestList.asked) return _openBookedGuest(guest, uid);
    final l10n = context.l10n;
    final choice = await showCatchAdaptiveDialog<_AskedChoice>(
      context: context,
      title: l10n.hostEventsGuestsAskedTitle(name: guest.name),
      message: l10n.hostEventsGuestsAskedBody,
      actions: [
        CatchDialogAction(
          label: l10n.hostEventsGuestsLetIn,
          value: _AskedChoice.letIn,
          isDefault: true,
        ),
        CatchDialogAction(
          label: l10n.hostEventsGuestsSeeProfile,
          value: _AskedChoice.profile,
        ),
        CatchDialogAction(
          label: l10n.hostEventsGuestsDecline,
          value: _AskedChoice.decline,
          isDestructive: true,
        ),
      ],
    );
    if (!mounted) return;
    switch (choice) {
      case _AskedChoice.letIn:
        _letIn(guest);
      case _AskedChoice.decline:
        _decline(guest);
      case _AskedChoice.profile:
        _profile(uid);
      case null:
        return;
    }
  }

  Future<void> _openBookedGuest(HostEventGuest guest, String uid) async {
    final l10n = context.l10n;
    final choice = await showCatchAdaptiveDialog<_GuestChoice>(
      context: context,
      title: guest.name,
      message: l10n.hostEventsGuestsGuestBody,
      actions: [
        CatchDialogAction(
          label: l10n.hostEventsGuestsSeeProfile,
          value: _GuestChoice.profile,
          isDefault: true,
        ),
        CatchDialogAction(
          label: l10n.hostEventsGuestsReport,
          value: _GuestChoice.report,
        ),
        CatchDialogAction(
          label: l10n.hostEventsGuestsBlock,
          value: _GuestChoice.block,
          isDestructive: true,
        ),
      ],
    );
    if (!mounted) return;
    switch (choice) {
      case _GuestChoice.profile:
        _profile(uid);
      case _GuestChoice.report:
        await _report(guest, uid);
      case _GuestChoice.block:
        await _block(guest, uid);
      case null:
        return;
    }
  }

  /// Asks why, then reports the guest to Catch from this event.
  Future<void> _report(HostEventGuest guest, String uid) async {
    final l10n = context.l10n;
    final reason = await showCatchAdaptiveDialog<OrganizerGuestReportReason>(
      context: context,
      title: l10n.hostEventsGuestsReportTitle(name: guest.name),
      message: l10n.hostEventsGuestsReportBody,
      actions: [
        for (final reason in OrganizerGuestReportReason.values)
          CatchDialogAction(
            label: switch (reason) {
              OrganizerGuestReportReason.unsafeBehaviour =>
                l10n.hostEventsGuestsReportUnsafe,
              OrganizerGuestReportReason.harassment =>
                l10n.hostEventsGuestsReportHarassment,
              OrganizerGuestReportReason.other =>
                l10n.hostEventsGuestsReportOther,
            },
            value: reason,
          ),
      ],
    );
    if (reason == null || !mounted) return;
    final request = widget.request;
    try {
      await HostGuestSafetyCommands.reportMutation.run(
        ref,
        (tx) => tx
            .get(hostGuestSafetyCommandsProvider.notifier)
            .report(
              organizerId: request.organizerId,
              eventId: request.eventId,
              uid: uid,
              reason: reason,
            ),
      );
    } on Object {
      // The error notice for this mutation, set up in build, says why.
      return;
    }
    if (mounted) showCatchNotice(context, l10n.hostEventsGuestsReported);
  }

  /// Confirms, then stops the guest booking the organiser events.
  Future<void> _block(HostEventGuest guest, String uid) async {
    final l10n = context.l10n;
    final confirmed = await showConfirmDangerDialog(
      context: context,
      title: l10n.hostEventsGuestsBlockTitle(name: guest.name),
      message: l10n.hostEventsGuestsBlockBody,
      confirmLabel: l10n.hostEventsGuestsBlockConfirm,
    );
    if (confirmed != true || !mounted) return;
    try {
      await HostGuestSafetyCommands.blockMutation.run(
        ref,
        (tx) => tx
            .get(hostGuestSafetyCommandsProvider.notifier)
            .block(organizerId: widget.request.organizerId, uid: uid),
      );
    } on Object {
      // The error notice for this mutation, set up in build, says why.
      return;
    }
    if (mounted) {
      showCatchNotice(
        context,
        l10n.hostEventsGuestsBlockedNotice(name: guest.name),
      );
    }
  }

  /// Who the organiser has blocked from their events, each with Let them
  /// back.
  Future<void> _openBlocked() {
    final l10n = context.l10n;
    final organizerId = widget.request.organizerId;
    final dates = DateFormat.yMMMd(
      Localizations.localeOf(context).toLanguageTag(),
    );
    return showCatchBottomSheet<void>(
      context: context,
      builder: (_) => Consumer(
        builder: (context, ref, _) {
          final blocks = ref.watch(organizerGuestBlocksProvider(organizerId));
          final lettingBack = ref
              .watch(HostGuestSafetyCommands.letBackMutation)
              .isPending;
          return CatchSheet.standard(
            title: l10n.hostEventsGuestsBlockedLink,
            child: blocks.when(
              data: (blocks) => CatchSection(
                key: const ValueKey<String>('host-event-guests-blocked-list'),
                empty: l10n.hostEventsGuestsBlockedEmpty,
                children: [
                  for (final block in blocks)
                    CatchIndexRow(
                      key: ValueKey<String>('host-event-blocked-${block.uid}'),
                      title:
                          block.displayName ??
                          l10n.hostEventsGuestsBlockedNoName,
                      meta: switch (block.createdAt) {
                        final createdAt? => l10n.hostEventsGuestsBlockedOn(
                          date: dates.format(createdAt),
                        ),
                        null => null,
                      },
                      onTap: null,
                      action: CatchIndexRowAction(
                        label: l10n.hostEventsGuestsLetBack,
                        onPressed: lettingBack
                            ? null
                            : () => unawaited(_letBack(organizerId, block)),
                      ),
                    ),
                ],
              ),
              error: (_, _) => CatchErrorState(
                title: l10n.hostEventsGuestsBlockedErrorTitle,
                message: l10n.hostEventsErrorBody,
                retryLabel: l10n.hostEventsRetry,
                onRetry: () =>
                    ref.invalidate(organizerGuestBlocksProvider(organizerId)),
              ),
              loading: () => const CatchLoadingIndicator(),
            ),
          );
        },
      ),
    );
  }

  Future<void> _letBack(String organizerId, OrganizerGuestBlock block) async {
    final l10n = context.l10n;
    try {
      await HostGuestSafetyCommands.letBackMutation.run(
        ref,
        (tx) => tx
            .get(hostGuestSafetyCommandsProvider.notifier)
            .letBack(organizerId: organizerId, uid: block.uid),
      );
    } on Object {
      // The error notice for this mutation, set up in build, says why.
      return;
    }
    if (mounted) showCatchNotice(context, l10n.hostEventsGuestsLetBackDone);
  }

  /// Shares the guest list through the existing list export.
  Future<void> _download() async {
    final l10n = context.l10n;
    final box = context.findRenderObject() as RenderBox?;
    final origin = box == null
        ? null
        : box.localToGlobal(Offset.zero) & box.size;
    final viewModel = ref
        .read(attendanceSheetViewModelProvider(widget.request.eventId))
        .value;
    if (viewModel == null) return;
    final ids = [...viewModel.profileIds]..sort();
    final Map<String, (String, String?)> profiles;
    try {
      profiles = await ref.read(
        hostEventGuestNamesProvider(ids.join(',')).future,
      );
    } on Object catch (error, stackTrace) {
      ref
          .read(errorLoggerProvider)
          .logError(error, stackTrace, reason: 'share the guest list');
      if (mounted) {
        showCatchNotice(context, l10n.hostEventsGuestsDownloadFailed);
      }
      return;
    }
    try {
      await HostEventManageController.shareOpsReportMutation.run(
        ref,
        (tx) => tx
            .get(hostEventManageActionsProvider)
            .shareOpsReport(
              viewModel: viewModel,
              profiles: profiles,
              origin: origin,
            ),
      );
    } on Object {
      // The share mutation's error notice, set up in build, says why.
      return;
    }
    if (mounted) showCatchNotice(context, l10n.hostEventsGuestsDownloaded);
  }

  void _quietly(Future<Object?> command) =>
      unawaited(command.then<void>((_) {}, onError: (Object _) {}));
}

enum _AskedChoice { letIn, profile, decline }

enum _GuestChoice { profile, report, block }
