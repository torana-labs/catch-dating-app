import 'dart:async';
import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/chats/domain/event_chat.dart';
import 'package:catch_dating_app/chats/domain/event_chat_timing.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_controller.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_input.dart';
import 'package:catch_dating_app/chats/presentation/widgets/event_chat_message_tile.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class EventChatScreen extends ConsumerStatefulWidget {
  const EventChatScreen({super.key, required this.eventId, this.pickSchedule});
  final String eventId;
  final Future<({DateTime opensAt, DateTime closesAt})?> Function(BuildContext)?
  pickSchedule;
  @override
  ConsumerState<EventChatScreen> createState() => _EventChatScreenState();
}

class _EventChatScreenState extends ConsumerState<EventChatScreen>
    with WidgetsBindingObserver {
  final _draft = TextEditingController();
  final _scroll = ScrollController();
  String? _replyId, _reactionId;
  bool _announcement = false;
  bool _resumed = true;
  bool _ownedDialog = false;
  bool _dialogBackgrounded = false;
  bool? _active;
  Timer? _clock;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _resumed =
        WidgetsBinding.instance.lifecycleState == null ||
        WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed;
    _draft.addListener(_draftChanged);
  }

  EventChatController get _controller =>
      ref.read(eventChatControllerProvider(widget.eventId).notifier);
  void _draftChanged() =>
      _controller.draftChanged(_draft.text.trim().isNotEmpty);
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _resumed = state == AppLifecycleState.resumed;
    if (!_resumed && _ownedDialog) {
      _dialogBackgrounded = true;
    }
    if (mounted) {
      setState(() {});
    }
  }

  void _syncActive(bool active) {
    if (_active == active) {
      return;
    }
    _active = active;
    _clock?.cancel();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _active != active) {
        return;
      }
      _controller.setForeground(active);
      if (active) {
        _clock = Timer.periodic(EventChatTiming.presenceDisplayTick, (_) {
          if (mounted) {
            setState(() {});
          }
        });
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _clock?.cancel();
    _draft.removeListener(_draftChanged);
    _draft.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send(String reviewedUid) async {
    final uid = ref.read(uidProvider).asData?.value;
    if (uid != reviewedUid) {
      return;
    }
    final text = _draft.text.trim();
    final reply = _replyId;
    final reviewed = ref
        .read(eventChatControllerProvider(widget.eventId))
        .asData
        ?.value;
    final sent = await _controller.send(
      text,
      reviewedUid: reviewedUid,
      replyToMessageId: reply,
      announcement:
          _announcement || reviewed?.access.roomStatus == 'announcementsOnly',
    );
    if (!mounted || ref.read(uidProvider).asData?.value != uid || !sent) {
      return;
    }
    if (_draft.text.trim() == text && _replyId == reply) {
      _draft.clear();
      setState(() => _replyId = null);
    }
    if (_scroll.hasClients) {
      unawaited(
        _scroll.animateTo(
          0,
          duration: CatchMotion.fast,
          curve: CatchMotion.standardCurve,
        ),
      );
    }
  }

  Future<void> _handleAccessAction(
    EventChatAction action,
    String reviewedUid,
  ) async {
    if (action != EventChatAction.schedule &&
        action != EventChatAction.archive) {
      await _controller.updateAccess(action, reviewedUid: reviewedUid);
      return;
    }
    final provider = eventChatControllerProvider(widget.eventId);
    final reviewed = ref.read(provider).asData?.value;
    if (reviewed == null ||
        reviewed.uid != reviewedUid ||
        !reviewed.access.canManage) {
      return;
    }
    _ownedDialog = true;
    _dialogBackgrounded = false;
    try {
      ({DateTime opensAt, DateTime closesAt})? window;
      if (action == EventChatAction.schedule) {
        window = await (widget.pickSchedule ?? _pickSchedule)(context);
        if (!mounted || window == null) {
          return;
        }
        if (!window.opensAt.isAfter(DateTime.now()) ||
            !window.closesAt.isAfter(window.opensAt)) {
          showCatchNotice(context, context.l10n.eventChatInvalidSchedule);
          return;
        }
      } else {
        final confirmed = await showCatchConfirmDialog(
          context: context,
          copy: catchDialogCopy(context.l10n),
          title: context.l10n.eventChatArchive,
          message: context.l10n.eventChatArchiveDisclosure,
          confirmLabel: context.l10n.eventChatArchive,
          danger: true,
        );
        if (confirmed != true || !mounted) {
          return;
        }
      }
      final latest = ref.read(provider).asData?.value;
      if (_dialogBackgrounded ||
          !_resumed ||
          ref.read(uidProvider).asData?.value != reviewedUid ||
          latest == null ||
          latest.uid != reviewedUid ||
          latest.busy ||
          latest.access.roomRevision != reviewed.access.roomRevision) {
        return;
      }
      await _controller.updateAccess(
        action,
        reviewedUid: reviewedUid,
        opensAt: window?.opensAt,
        closesAt: window?.closesAt,
      );
    } finally {
      _ownedDialog = false;
      if (mounted) {
        _syncActive(_resumed && (ModalRoute.isCurrentOf(context) ?? true));
      }
    }
  }

  Future<({DateTime opensAt, DateTime closesAt})?> _pickSchedule(
    BuildContext context,
  ) async {
    final now = DateTime.now();
    final openDate = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (!context.mounted || openDate == null) return null;
    final openTime = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(now),
    );
    if (!context.mounted || openTime == null) return null;
    final closeDate = await showDatePicker(
      context: context,
      initialDate: openDate,
      firstDate: openDate,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (!context.mounted || closeDate == null) return null;
    final closeTime = await showTimePicker(
      context: context,
      initialTime: openTime,
    );
    if (!context.mounted || closeTime == null) return null;
    return (
      opensAt: DateTime(
        openDate.year,
        openDate.month,
        openDate.day,
        openTime.hour,
        openTime.minute,
      ),
      closesAt: DateTime(
        closeDate.year,
        closeDate.month,
        closeDate.day,
        closeTime.hour,
        closeTime.minute,
      ),
    );
  }

  Future<void> _messageAction(
    EventChatState reviewed,
    EventChatMessage message,
    EventChatSafetyAction action,
  ) async {
    final l = context.l10n;
    EventChatReportReason? reason;
    if (action == EventChatSafetyAction.report) {
      reason = await showCatchSelectionSheet<EventChatReportReason?>(
        context: context,
        title: l.eventChatReport,
        subtitle: l.eventChatReportDisclosure,
        value: null,
        items: [
          CatchSelectionMenuItem(
            value: EventChatReportReason.harassment,
            label: l.eventChatReportHarassment,
          ),
          CatchSelectionMenuItem(
            value: EventChatReportReason.spam,
            label: l.eventChatReportSpam,
          ),
          CatchSelectionMenuItem(
            value: EventChatReportReason.inappropriate,
            label: l.eventChatReportInappropriate,
          ),
          CatchSelectionMenuItem(
            value: EventChatReportReason.other,
            label: l.eventChatReportOther,
          ),
        ],
      );
      if (reason == null) return;
    } else {
      final confirmed = await showCatchConfirmDialog(
        context: context,
        copy: catchDialogCopy(l),
        title: action == EventChatSafetyAction.block
            ? l.eventChatBlock
            : l.eventChatRemove,
        message: action == EventChatSafetyAction.block
            ? l.eventChatBlockDisclosure
            : l.eventChatRemoveDisclosure,
        confirmLabel: action == EventChatSafetyAction.block
            ? l.eventChatBlock
            : l.eventChatRemove,
        danger: true,
      );
      if (confirmed != true) return;
    }
    if (!mounted || ref.read(uidProvider).asData?.value != reviewed.uid) return;
    final saved = await _controller.actOnMessage(
      message,
      action,
      reviewedUid: reviewed.uid,
      reason: reason,
    );
    if (!mounted ||
        ref.read(uidProvider).asData?.value != reviewed.uid ||
        !saved) {
      return;
    }
    if (action != EventChatSafetyAction.report) {
      setState(() {
        _replyId = null;
        _reactionId = null;
      });
    }
    showCatchNotice(context, switch (action) {
      EventChatSafetyAction.report => l.eventChatReported,
      EventChatSafetyAction.block => l.eventChatBlocked,
      EventChatSafetyAction.remove => l.eventChatRemoved,
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = eventChatControllerProvider(widget.eventId);
    final value = ref.watch(provider);
    final display = catchAsyncStateFromAsyncValue(value);
    final current = display.isSettledData ? display.value : null;
    _syncActive(
      _resumed && ((ModalRoute.isCurrentOf(context) ?? true) || _ownedDialog),
    );
    ref.listen(uidProvider, (before, after) {
      if (before?.asData?.value != after.asData?.value) {
        _draft.clear();
        setState(() {
          _replyId = null;
          _reactionId = null;
          _announcement = false;
        });
      }
    });
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: current?.access.title ?? context.l10n.eventChatTitle,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        actions: [
          if (current?.access.canReadMessages == true)
            CatchIconAction.toolbar(
              tooltip: context.l10n.eventChatParticipantsTitle,
              icon: CatchIcons.peopleOutlineRounded,
              onPressed: current!.busy
                  ? null
                  : () => context.pushNamed(
                      Routes.eventChatParticipantsScreen.name,
                      pathParameters: {'eventId': widget.eventId},
                      queryParameters: GoRouterState.of(
                        context,
                      ).uri.queryParameters,
                    ),
            ),
          if (current != null)
            CatchIconAction(
              tooltip: context.l10n.eventProfileMine,
              onPressed: current.busy
                  ? null
                  : () => context.pushNamed(
                      Routes.eventProfileSharingScreen.name,
                      pathParameters: {'eventId': widget.eventId},
                      queryParameters: GoRouterState.of(
                        context,
                      ).uri.queryParameters,
                    ),
              child: Icon(CatchIcons.personOutlineRounded),
            ),
          if (current != null &&
              current.access.canManage &&
              current.access.roomStatus != 'archived')
            CatchActionMenu<EventChatAction>(
              tooltip: context.l10n.eventChatTitle,
              enabled: !current.busy,
              items: [
                CatchActionMenuItem(
                  value: current.access.isRoomOpen
                      ? EventChatAction.close
                      : EventChatAction.open,
                  label: current.access.isRoomOpen
                      ? context.l10n.eventChatClose
                      : context.l10n.eventChatOpen,
                ),
                CatchActionMenuItem(
                  value: EventChatAction.schedule,
                  label: context.l10n.eventChatSchedule,
                ),
                if (current.access.roomStatus == 'open' ||
                    current.access.roomStatus == 'announcementsOnly')
                  CatchActionMenuItem(
                    value: EventChatAction.pause,
                    label: context.l10n.eventChatPause,
                  ),
                if (current.access.roomStatus == 'open' ||
                    current.access.roomStatus == 'paused')
                  CatchActionMenuItem(
                    value: EventChatAction.announcementsOnly,
                    label: context.l10n.eventChatAnnouncementsOnly,
                  ),
                if (current.access.roomStatus == 'paused' ||
                    current.access.roomStatus == 'announcementsOnly')
                  CatchActionMenuItem(
                    value: EventChatAction.resume,
                    label: context.l10n.eventChatResume,
                  ),
                CatchActionMenuItem(
                  value: EventChatAction.archive,
                  label: context.l10n.eventChatArchive,
                ),
              ],
              onSelected: (action) =>
                  unawaited(_handleAccessAction(action, current.uid)),
            ),
          if (current != null && current.access.hasJoined)
            CatchActionMenu<EventChatAction>(
              tooltip: context.l10n.eventChatMemberActions,
              enabled: !current.busy,
              items: [
                CatchActionMenuItem(
                  value: EventChatAction.leave,
                  label: context.l10n.eventChatLeave,
                ),
                CatchActionMenuItem(
                  value: current.access.notificationsMuted
                      ? EventChatAction.unmute
                      : EventChatAction.mute,
                  label: current.access.notificationsMuted
                      ? context.l10n.eventChatUnmute
                      : context.l10n.eventChatMute,
                ),
              ],
              onSelected: (action) =>
                  unawaited(_handleAccessAction(action, current.uid)),
            ),
        ],
      ),
      body: CatchRouteBody.fullBleed(
        child: CatchAsyncBoundary<EventChatState>(
          value: value,
          retainDataOn: const {},
          onRetry: () => unawaited(_controller.refresh()),
          builder: (context, state) => EventChatPageBody(
            state: state,
            draft: _draft,
            scrollController: _scroll,
            now: DateTime.now(),
            replyId: _replyId,
            reactionId: _reactionId,
            announcement: _announcement,
            onAnnouncementChanged: (value) =>
                setState(() => _announcement = value),
            onSend: () => unawaited(_send(state.uid)),
            onMessageAction: (message, action) =>
                unawaited(_messageAction(state, message, action)),
            onViewProfile: (uid) => context.pushNamed(
              Routes.eventParticipantProfileScreen.name,
              pathParameters: {
                'eventId': widget.eventId,
                'participantUid': uid,
              },
            ),
            onLoadEarlier: () => unawaited(_controller.loadEarlier()),
            onAction: (action) =>
                unawaited(_handleAccessAction(action, state.uid)),
            onReviewProfile: AppConfig.appRole.isHost
                ? null
                : () => context.pushNamed(Routes.formProfilesScreen.name),
            onReply: (id) => setState(() {
              _replyId = id;
              _reactionId = null;
            }),
            onShowReactions: (id) {
              FocusManager.instance.primaryFocus?.unfocus();
              setState(() => _reactionId = id);
            },
            onReaction: (message, reaction) {
              setState(() => _reactionId = null);
              unawaited(
                _controller.react(message, reaction, reviewedUid: state.uid),
              );
            },
          ),
        ),
      ),
    );
  }
}

class EventChatPageBody extends StatelessWidget {
  const EventChatPageBody({
    super.key,
    required this.state,
    required this.draft,
    required this.scrollController,
    required this.now,
    required this.replyId,
    required this.reactionId,
    this.announcement = false,
    this.onAnnouncementChanged,
    required this.onSend,
    required this.onLoadEarlier,
    required this.onAction,
    required this.onReviewProfile,
    required this.onReply,
    required this.onShowReactions,
    required this.onReaction,
    this.onViewProfile,
    this.onMessageAction,
  });
  final EventChatState state;
  final TextEditingController draft;
  final ScrollController scrollController;
  final DateTime now;
  final String? replyId, reactionId;
  final bool announcement;
  final ValueChanged<bool>? onAnnouncementChanged;
  final VoidCallback onSend, onLoadEarlier;
  final ValueChanged<String>? onViewProfile;
  final void Function(EventChatMessage, EventChatSafetyAction)? onMessageAction;
  final ValueChanged<EventChatAction> onAction;
  final VoidCallback? onReviewProfile;
  final ValueChanged<String?> onReply, onShowReactions;
  final void Function(EventChatMessage, EventChatReaction?) onReaction;
  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final access = state.access;
    final reply = state.messages
        .where((m) => m.messageId == replyId && m.available)
        .firstOrNull;
    final reacting = state.messages
        .where((m) => m.messageId == reactionId && m.available)
        .firstOrNull;
    final typing = state.typingAt(now).map((p) => p.displayName).join(', ');
    if (!access.canReadMessages || !state.active) {
      return CatchPageBody.screen(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            gapH24,
            Text(
              access.membershipUnavailable
                  ? l.eventChatMembershipRemoved
                  : !access.isRoomOpen
                  ? l.eventChatNotOpen
                  : l.eventChatJoinTitle,
              style: CatchTextStyles.headlineS(context),
            ),
            gapH16,
            CatchText(
              !access.isRoomOpen
                  ? access.canManage
                        ? l.eventChatHostSetup
                        : l.eventChatGuestWaiting
                  : l.eventChatJoinDisclosure,
              variant: CatchTextVariant.bodyL,
            ),
            gapH24,
            if (access.canManage &&
                !access.isRoomOpen &&
                access.roomStatus != 'archived')
              CatchButton(
                label: l.eventChatOpen,
                fullWidth: true,
                status: state.busy
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                onPressed: state.busy
                    ? null
                    : () => onAction(EventChatAction.open),
              ),
            if (access.profileClaimRequired) ...[
              gapH24,
              CatchText(
                l.eventChatProfileRequired,
                variant: CatchTextVariant.sectionTitle,
              ),
              gapH8,
              CatchText(
                onReviewProfile == null
                    ? l.eventChatProfileHostHelp
                    : l.eventChatProfileHelp,
                variant: CatchTextVariant.bodyL,
              ),
              if (onReviewProfile != null) ...[
                gapH16,
                CatchButton(
                  label: l.eventChatReviewProfile,
                  fullWidth: true,
                  variant: CatchButtonVariant.secondary,
                  onPressed: onReviewProfile,
                ),
              ],
            ] else if (access.canJoin) ...[
              CatchButton(
                label: l.eventChatJoin,
                fullWidth: true,
                status: state.busy
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                onPressed: state.busy
                    ? null
                    : () => onAction(EventChatAction.join),
              ),
            ],
          ],
        ),
      );
    }
    return Column(
      children: [
        Expanded(
          child: state.messages.isEmpty
              ? Center(
                  child: Padding(
                    padding: CatchInsets.contentRelaxed,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          l.eventChatEmptyTitle,
                          style: CatchTextStyles.headlineS(context),
                        ),
                        gapH12,
                        CatchText(
                          l.eventChatEmptyBody,
                          textAlign: TextAlign.center,
                          variant: CatchTextVariant.bodyL,
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  controller: scrollController,
                  reverse: true,
                  padding: CatchInsets.content,
                  itemCount:
                      state.messages.length +
                      (state.nextBeforeSequence == null ? 0 : 1),
                  itemBuilder: (context, index) {
                    if (index == state.messages.length) {
                      return CatchButton(
                        label: l.eventChatEarlier,
                        variant: CatchButtonVariant.ghost,
                        onPressed: state.busy ? null : onLoadEarlier,
                      );
                    }
                    final message = state.messages[index];
                    return Padding(
                      key: ValueKey(message.messageId),
                      padding: CatchInsets.chatBubbleGroupEnd,
                      child: EventChatMessageTile(
                        message: message,
                        isMe: message.senderUid == state.uid,
                        enabled: state.canSend,
                        safetyEnabled:
                            state.active &&
                            access.canReadMessages &&
                            !state.busy,
                        onReport:
                            onMessageAction != null &&
                                message.senderUid != state.uid
                            ? () => onMessageAction!(
                                message,
                                EventChatSafetyAction.report,
                              )
                            : null,
                        onBlock:
                            onMessageAction != null &&
                                message.senderUid != state.uid
                            ? () => onMessageAction!(
                                message,
                                EventChatSafetyAction.block,
                              )
                            : null,
                        onRemove:
                            onMessageAction != null &&
                                (message.senderUid == state.uid ||
                                    access.canManage)
                            ? () => onMessageAction!(
                                message,
                                EventChatSafetyAction.remove,
                              )
                            : null,
                        onReply: () => onReply(message.messageId),
                        onViewProfile:
                            message.senderUid == null || onViewProfile == null
                            ? null
                            : () => onViewProfile!(message.senderUid!),
                        onReact: () => onShowReactions(message.messageId),
                        onReaction: (reaction) => onReaction(message, reaction),
                      ),
                    );
                  },
                ),
        ),
        if (typing.isNotEmpty)
          Padding(
            padding: CatchInsets.contentHorizontal,
            child: CatchText(
              l.eventChatTyping(names: typing),
              variant: CatchTextVariant.supporting,
            ),
          ),
        if (reacting != null && state.canSend)
          EventChatReactionSection(
            selected: reacting.myReaction,
            onClose: () => onShowReactions(null),
            onSelected: (reaction) => onReaction(reacting, reaction),
          ),
        if (replyId != null && reacting == null && state.canSend)
          Padding(
            padding: CatchInsets.contentHorizontal,
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CatchText(
                        reply == null
                            ? l.eventChatUnavailable
                            : l.eventChatReplyingTo(
                                name: reply.senderName ?? '',
                              ),
                        variant: CatchTextVariant.supporting,
                      ),
                      if (reply != null)
                        CatchText(
                          reply.text ?? '',
                          maxLines: 2,
                          variant: CatchTextVariant.bodyM,
                        ),
                    ],
                  ),
                ),
                CatchIconAction(
                  tooltip: l.eventChatClearReply,
                  onPressed: () => onReply(null),
                  child: Icon(CatchIcons.closeRounded),
                ),
              ],
            ),
          ),
        if (!access.canPostMessages)
          Padding(
            padding: CatchInsets.contentHorizontal,
            child: CatchText(
              access.announcementsOnly
                  ? l.eventChatAnnouncementsReadOnly
                  : l.eventChatReadOnly,
              variant: CatchTextVariant.supporting,
            ),
          ),
        if (reacting == null &&
            access.canPostMessages &&
            access.canManage &&
            access.roomStatus == 'open')
          Padding(
            padding: CatchInsets.contentHorizontal,
            child: CatchFieldLanes.single(
              child: CatchField.toggle(
                copy: catchFieldCopy(l),
                title: l.eventChatAnnouncement,
                value: announcement,
                contractExemption:
                    'The callable validates announcement authority and mode.',
                onChanged: onAnnouncementChanged,
              ),
            ),
          ),
        if (reacting == null && access.canPostMessages)
          ChatInput(
            controller: draft,
            sending: state.busy,
            showImageButton: false,
            contract: CatchContractConstraints
                .sendEventChatMessageCallablePayloadText,
            disabledReason: replyId != null && reply == null
                ? l.eventChatUnavailable
                : null,
            onSend: onSend,
          ),
      ],
    );
  }
}
