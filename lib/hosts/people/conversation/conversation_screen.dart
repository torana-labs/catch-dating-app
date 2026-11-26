import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/safety/parts/block_user_dialog.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_body.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_controller.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_drafts.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_history_controller.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_state.dart';
import 'package:catch_dating_app/pages/chat/chat_controller.dart';
import 'package:catch_dating_app/pages/chat/widgets/chat_share_card.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The Catch actions a host can take on a person's Catch conversation.
enum HostConversationAction { share, report, block }

/// One person's conversation with the organizer, Catch and WhatsApp
/// together, with a reply on one chosen route.
///
/// It watches [hostConversationControllerProvider], keeps the drafts in
/// [hostConversationDraftsProvider] (by route, for the signed-in account),
/// marks each Catch conversation read while its newest message is in view,
/// and sends with the shared chat controller (Catch text and photos) or
/// [HostConversationCommands.reply] (WhatsApp inside its 24-hour window).
/// Share card, Report and Block act on the person's Catch conversation.
class HostConversationScreen extends ConsumerStatefulWidget {
  const HostConversationScreen({
    super.key,
    required this.request,
    required this.onBack,
    this.presentation = HostConversationPresentation.screen,
  });

  final HostConversationRequest request;
  final VoidCallback onBack;
  final HostConversationPresentation presentation;

  @override
  ConsumerState<HostConversationScreen> createState() =>
      _HostConversationScreenState();
}

class _HostConversationScreenState
    extends ConsumerState<HostConversationScreen> {
  final _composer = TextEditingController();
  final _scroll = ScrollController();
  String? _route;
  bool _sendingPhoto = false;
  bool _acting = false;
  bool _atLatest = true;
  final Map<String, String> _markedLatest = {};
  final Set<String> _readFailures = {};
  Timer? _windowTimer;
  DateTime? _windowClose;
  HostReplyDrafts? _drafts;

  /// Drafts are kept per person and scope, then per route.
  String _draftContext(HostConversationState state) =>
      '${state.person?.key}/${state.scope?.eventId ?? state.scope?.programId ?? 'general'}';
  String _draftKey(HostConversationState state, String route) =>
      '${_draftContext(state)}/$route';

  @override
  void initState() {
    super.initState();
    _composer.addListener(_saveDraft);
    _scroll.addListener(_trackLatest);
  }

  @override
  void didUpdateWidget(covariant HostConversationScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.request != widget.request) {
      _saveDraft();
      _route = null;
      _markedLatest.clear();
      _readFailures.clear();
      _composer.text = '';
    }
  }

  @override
  void dispose() {
    _saveDraft();
    _drafts?.removeListener(_syncDraft);
    _windowTimer?.cancel();
    _composer.dispose();
    _scroll.dispose();
    super.dispose();
  }

  HostConversationState get _state =>
      ref.read(hostConversationControllerProvider(widget.request));

  void _trackLatest() {
    final atLatest = _scroll.position.pixels <= CatchSpacing.s12;
    if (atLatest != _atLatest && mounted) setState(() => _atLatest = atLatest);
  }

  void _saveDraft() {
    final drafts = _drafts;
    final route = _route;
    if (drafts == null || route == null) return;
    drafts.setText(_draftKey(_state, route), _composer.text);
  }

  void _syncDraft() {
    final drafts = _drafts;
    final route = _route;
    if (!mounted || drafts == null) return;
    final text = route == null ? '' : drafts.text(_draftKey(_state, route));
    if (_composer.text != text) _composer.text = text;
    setState(() {});
  }

  void _attachDrafts(HostReplyDrafts drafts, HostConversationState state) {
    if (identical(drafts, _drafts)) return;
    _drafts?.removeListener(_syncDraft);
    _drafts = drafts..addListener(_syncDraft);
    _route = drafts.selectedRoute(_draftContext(state));
    _composer.text = _route == null
        ? ''
        : drafts.text(_draftKey(state, _route!));
  }

  bool _sending(HostConversationState state) {
    final route = _route;
    return route != null &&
        (_drafts?.sending(_draftKey(state, route)) ?? false);
  }

  void _selectRoute(HostConversationState state, HostConversationRoute route) {
    if (_sending(state) || _sendingPhoto || route.key == _route) return;
    _saveDraft();
    setState(() {
      _route = route.key;
      _composer.text = _drafts?.text(_draftKey(state, route.key)) ?? '';
    });
    _drafts?.selectRoute(_draftContext(state), route.key);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(hostConversationControllerProvider(widget.request));
    final drafts = ref.watch(hostConversationDraftsProvider);
    if (state.status == HostConversationStatus.ready) {
      _attachDrafts(drafts, state);
      _markVisibleRead(state);
      _scheduleWindowClose(state.nextWindowClose);
    }
    final sending = _sendingPhoto
        ? HostConversationSending.photo
        : _sending(state)
        ? HostConversationSending.text
        : HostConversationSending.idle;
    final actions = _actions(context, state);
    final body = HostConversationBody(
      state: state,
      composer: _composer,
      scroll: _scroll,
      presentation: widget.presentation,
      selectedRoute: _route,
      sending: sending,
      onBack: widget.onBack,
      onSelectRoute: (route) => _selectRoute(state, route),
      onSend: (text) => unawaited(_send(state, text)),
      onSendPhoto: () => unawaited(_sendPhoto(state)),
      onLoadOlder: (conversationId) => unawaited(
        ref
            .read(hostConversationHistoryProvider(conversationId).notifier)
            .loadMore(),
      ),
      onRetry: () {
        setState(_readFailures.clear);
        retryHostConversationReads(ref, widget.request, state);
      },
      trailing: actions,
    );
    if (widget.presentation == HostConversationPresentation.pane) return body;
    final person = state.person;
    return CatchScreen(
      key: const ValueKey<String>('host-conversation-screen'),
      bodyScrolls: false,
      topBar: CatchTopBar(
        variant: CatchTopBarVariant.tool,
        back: CatchTopBarBack(
          label: l10n.hostPeopleBack,
          onPressed: widget.onBack,
        ),
        title: hostConversationTitle(l10n, state),
        kicker: person == null ? null : hostConversationKicker(l10n, state),
        actions: [?actions],
      ),
      body: body,
    );
  }

  /// Share card, Report and Block, for a person with a verified Catch
  /// conversation.
  Widget? _actions(BuildContext context, HostConversationState state) {
    final l10n = context.l10n;
    final conversationId = state.actionConversationId;
    final personUid = state.person?.linkedUid;
    if (conversationId == null || personUid == null) return null;
    return CatchActionMenu<HostConversationAction>(
      key: ValueKey<String>('${state.person?.key}/actions'),
      tooltip: l10n.chatsChatScreenTooltipChatActions,
      variant: CatchIconActionVariant.plain,
      onSelected: _acting
          ? null
          : (action) =>
                unawaited(_act(state, action, conversationId, personUid)),
      items: [
        if (hasShareableChatMessages(state.actionMessages))
          CatchActionMenuItem(
            value: HostConversationAction.share,
            label: l10n.chatsChatScreenLabelShareCard,
            icon: CatchIcons.platformShare(
              platform: Theme.of(context).platform,
            ),
          ),
        CatchActionMenuItem(
          value: HostConversationAction.report,
          label: l10n.chatsChatScreenLabelReport,
          icon: CatchIcons.flag,
        ),
        CatchActionMenuItem(
          value: HostConversationAction.block,
          label: l10n.chatsChatScreenLabelBlock,
          icon: CatchIcons.block,
          isDestructive: true,
        ),
      ],
    );
  }

  /// Marks each Catch conversation read once its newest message is in view,
  /// once per message. A failed mark is logged and not retried until the
  /// host asks to try again.
  void _markVisibleRead(HostConversationState state) {
    final uid = catchAsyncStateFromAsyncValue(ref.read(uidProvider)).value;
    if (!_atLatest || uid == null) return;
    for (final entry in state.latestByConversation.entries) {
      final conversationId = entry.key;
      if (_readFailures.contains(conversationId) ||
          _markedLatest[conversationId] == entry.value) {
        continue;
      }
      _markedLatest[conversationId] = entry.value;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted ||
            !_atLatest ||
            catchAsyncStateFromAsyncValue(ref.read(uidProvider)).value != uid) {
          return;
        }
        final logger = ref.read(errorLoggerProvider);
        unawaited(
          ref
              .read(hostConversationCommandsProvider)
              .markRead(conversationId, uid)
              .catchError((Object error, StackTrace stackTrace) {
                logger.logError(
                  error,
                  stackTrace,
                  reason: 'Could not mark the visible conversation read',
                );
                if (mounted) {
                  setState(() {
                    _readFailures.add(conversationId);
                    _markedLatest.remove(conversationId);
                  });
                }
              }),
        );
      });
    }
  }

  /// Reads the conversation again when the soonest WhatsApp window closes,
  /// so its route stops taking replies.
  void _scheduleWindowClose(DateTime? close) {
    if (close == _windowClose) return;
    _windowTimer?.cancel();
    _windowClose = close;
    if (close == null) return;
    final now = ref.read(appClockProvider).now();
    _windowTimer = Timer(close.difference(now), () {
      if (!mounted) return;
      _windowClose = null;
      ref.invalidate(hostConversationControllerProvider(widget.request));
    });
  }

  Future<void> _send(HostConversationState state, String text) async {
    final route = state.route(_route);
    final drafts = _drafts;
    final uid = catchAsyncStateFromAsyncValue(ref.read(uidProvider)).value;
    final person = state.person;
    final body = text.trim();
    if (route == null ||
        !route.available ||
        drafts == null ||
        uid == null ||
        person == null ||
        body.isEmpty) {
      return;
    }
    final key = _draftKey(state, route.key);
    final operation = drafts.begin(key, body);
    if (operation == null) return;
    var succeeded = false;
    try {
      switch (route.channel) {
        case HostConversationChannel.catchApp:
          await ref
              .read(chatControllerProvider.notifier)
              .sendMessage(
                matchId: route.sourceId,
                senderId: uid,
                text: body,
                messageId: operation,
              );
        case HostConversationChannel.whatsapp:
          final thread = state.whatsappThreads[route.key];
          if (thread == null) {
            throw StateError('Selected route is unavailable.');
          }
          await ref
              .read(hostConversationCommandsProvider)
              .reply(
                organizerId: person.organizerId,
                thread: thread,
                body: body,
                idempotencyKey: operation,
              );
      }
      succeeded = true;
    } on Object catch (error) {
      if (mounted) {
        // The composer cleared on send; the draft comes back to retry.
        if (_route == route.key && _composer.text.trim().isEmpty) {
          _composer.text = body;
        }
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.chat,
        );
      }
    } finally {
      drafts.finish(key, operation, succeeded: succeeded);
    }
  }

  Future<void> _sendPhoto(HostConversationState state) async {
    final route = state.route(_route);
    final uid = catchAsyncStateFromAsyncValue(ref.read(uidProvider)).value;
    if (_sendingPhoto ||
        _sending(state) ||
        route == null ||
        !route.available ||
        route.channel != HostConversationChannel.catchApp ||
        uid == null) {
      return;
    }
    setState(() => _sendingPhoto = true);
    try {
      // provider-graph: ownership-widget-async:_HostConversationScreenState._sendPhoto:await:chatControllerProvider.sendImage watch CAT156 -- Carried from the inbox person conversation: the photo picker and upload run in the shared chat controller; this method only holds the local sending flag and shows a failure notice.
      await ref
          .read(chatControllerProvider.notifier)
          .sendImage(matchId: route.sourceId, senderId: uid);
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.chat,
        );
      }
    } finally {
      if (mounted) setState(() => _sendingPhoto = false);
    }
  }

  Future<void> _act(
    HostConversationState state,
    HostConversationAction action,
    String conversationId,
    String personUid,
  ) async {
    if (_acting) return;
    final uid = catchAsyncStateFromAsyncValue(ref.read(uidProvider)).value;
    final name = state.person?.displayName ?? '';
    if (uid == null) return;
    if (action == HostConversationAction.share) {
      await showChatShareCardSheet(
        context,
        messages: state.actionMessages,
        currentUid: uid,
        event: null,
        share: ref.read(externalShareControllerProvider),
      );
      return;
    }
    setState(() => _acting = true);
    try {
      if (action == HostConversationAction.block) {
        if (await showBlockUserDialog(context: context, name: name) != true ||
            !mounted) {
          return;
        }
        // provider-graph: ownership-widget-async:_HostConversationScreenState._act:await:chatControllerProvider.blockUser watch CAT156 -- Carried from the inbox person menu: the shared chat controller owns the block; this method only holds the local busy flag and leaves the conversation once it succeeds.
        await ref
            .read(chatControllerProvider.notifier)
            .blockUser(targetUserId: personUid);
        if (mounted) widget.onBack();
      } else {
        // provider-graph: ownership-widget-async:_HostConversationScreenState._act:await:chatControllerProvider.reportUser watch CAT156 -- Carried from the inbox person menu: the shared chat controller owns the report; this method only holds the local busy flag and confirms it was sent.
        await ref
            .read(chatControllerProvider.notifier)
            .reportUser(targetUserId: personUid, matchId: conversationId);
        if (mounted) {
          showCatchNotice(
            context,
            context
                .l10n
                .publicProfilePublicProfileScreenVisiblecopyReportSubmitted,
          );
        }
      }
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.chat,
        );
      }
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }
}
