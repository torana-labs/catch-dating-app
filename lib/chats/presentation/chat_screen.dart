import 'dart:async';

import 'package:catch_dating_app/chats/presentation/chat_controller.dart';
import 'package:catch_dating_app/chats/presentation/chat_conversation_context.dart';
import 'package:catch_dating_app/chats/presentation/chat_read_marker_controller.dart';
import 'package:catch_dating_app/chats/presentation/chat_retry_controller.dart';
import 'package:catch_dating_app/chats/presentation/chat_route_state.dart';
import 'package:catch_dating_app/chats/presentation/chat_route_view_model.dart';
import 'package:catch_dating_app/chats/presentation/chat_scroll_coordinator.dart';
import 'package:catch_dating_app/chats/presentation/chat_thread_action_controller.dart';
import 'package:catch_dating_app/chats/presentation/host_chat_screen_state.dart';
import 'package:catch_dating_app/chats/presentation/suvbot_controller.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_event_context_header.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_input.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_message_list.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_share_card.dart';
import 'package:catch_dating_app/chats/presentation/widgets/suvbot_dock.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/suvbot_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/suvbot_action_item.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/widgets/block_user_dialog.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({
    super.key,
    required this.matchId,
    this.otherProfile,
    this.initialDraftText,
    this.onDraftChanged,
    this.embedded = false,
  });

  final String matchId;
  final PublicProfile? otherProfile;
  final String? initialDraftText;
  final ValueChanged<String>? onDraftChanged;
  final bool embedded;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  late final TextEditingController _textController;
  late final ChatReadMarkerController _readMarkerController;
  late final ChatScrollCoordinator _scrollCoordinator;

  @override
  void initState() {
    super.initState();
    _textController = TextEditingController(text: widget.initialDraftText);
    _textController.addListener(_notifyDraftChanged);
    _readMarkerController = ChatReadMarkerController.fromReader(
      conversationId: widget.matchId,
      read: ref.read,
    );
    _scrollCoordinator = ChatScrollCoordinator(isMounted: () => mounted);
    _resetUnread(ref.read(uidProvider).value);
  }

  @override
  void dispose() {
    _readMarkerController.markOnDispose();
    _textController.removeListener(_notifyDraftChanged);
    _textController.dispose();
    _scrollCoordinator.dispose();
    super.dispose();
  }

  void _notifyDraftChanged() =>
      widget.onDraftChanged?.call(_textController.text);

  void _resetUnread(String? uid, {bool force = false}) {
    _readMarkerController.markForUid(uid, force: force);
  }

  ChatThreadActionController get _threadActionController =>
      ChatThreadActionController(
        safetyRunner: RiverpodChatSafetyActionRunner(
          ref: ref,
          matchId: widget.matchId,
        ),
      );

  ChatRetryController get _retryController =>
      ChatRetryController(ref: ref, matchId: widget.matchId);

  Future<void> _send() async {
    final uid = ref.read(uidProvider).value;
    final text = _textController.text.trim();
    final sendMutation = ref.read(ChatController.sendMessageMutation);
    if (text.isEmpty || sendMutation.isPending || uid == null) return;

    try {
      await ChatController.sendMessageMutation.run(ref, (tx) async {
        await tx
            .get(chatControllerProvider.notifier)
            .sendMessage(matchId: widget.matchId, senderId: uid, text: text);
      });
    } catch (_) {
      return;
    }

    if (mounted && _textController.text.trim() == text) {
      _textController.clear();
    }

    _scrollCoordinator.scrollAfterSendSuccess();
  }

  Future<void> _runSuvbotAction(SuvbotActionItem action) async {
    if (ref.read(SuvbotController.requestMutation).isPending) return;

    try {
      await SuvbotController.requestMutation.run(ref, (tx) async {
        await tx
            .get(suvbotControllerProvider.notifier)
            .requestAction(actionId: action.id);
      });
    } catch (_) {
      return;
    }
  }

  Future<void> _runSuvbotTextAction(
    SuvbotActionItem action,
    String text,
  ) async {
    if (ref.read(SuvbotController.requestMutation).isPending) return;

    try {
      await SuvbotController.requestMutation.run(ref, (tx) async {
        await tx
            .get(suvbotControllerProvider.notifier)
            .requestAction(actionId: action.id, text: text);
      });
    } catch (_) {
      return;
    }
  }

  Future<void> _sendImage() async {
    if (isSuvbotConversation(matchId: widget.matchId)) return;

    final uid = ref.read(uidProvider).value;
    final imageMutation = ref.read(ChatController.sendImageMutation);
    if (imageMutation.isPending || uid == null) return;

    try {
      await ChatController.sendImageMutation.run(ref, (tx) async {
        await tx
            .get(chatControllerProvider.notifier)
            .sendImage(matchId: widget.matchId, senderId: uid);
      });
    } catch (_) {
      return;
    }
  }

  ChatThreadActionUi _threadActionUi() {
    return ChatThreadActionUi(
      showFeedback: (message) {
        if (!mounted) return;
        showCatchNotice(context, message);
      },
      showShareCard: (request) {
        if (!mounted) return;
        unawaited(
          showChatShareCardSheet(
            context,
            messages: request.messages,
            currentUid: request.currentUid,
            event: request.event,
            share: request.share,
          ),
        );
      },
      confirmBlock: (targetName) async {
        if (!mounted) return false;
        return await showBlockUserDialog(context: context, name: targetName) ==
            true;
      },
      closeAfterBlock: () {
        if (mounted) Navigator.of(context).pop();
      },
    );
  }

  void _openOtherProfile(HostChatScreenState chatState) {
    final request = _threadActionController.profileNavigationRequest(chatState);
    if (request == null) return;

    context.pushNamed(
      Routes.publicProfileScreen.name,
      pathParameters: {'uid': request.uid},
      extra: request.profile,
    );
  }

  CatchActionMenuItem<ChatThreadAction> _threadActionMenuItem(
    BuildContext context,
    ChatThreadAction action,
  ) {
    return switch (action) {
      ChatThreadAction.shareCard => CatchActionMenuItem(
        value: ChatThreadAction.shareCard,
        label: context.l10n.chatsChatScreenLabelShareCard,
        icon: CatchIcons.platformShare(platform: Theme.of(context).platform),
      ),
      ChatThreadAction.report => CatchActionMenuItem(
        value: ChatThreadAction.report,
        label: context.l10n.chatsChatScreenLabelReport,
        icon: CatchIcons.flag,
      ),
      ChatThreadAction.block => CatchActionMenuItem(
        value: ChatThreadAction.block,
        label: context.l10n.chatsChatScreenLabelBlock,
        icon: CatchIcons.block,
        isDestructive: true,
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(uidProvider, (_, next) {
      if (next.value != null) {
        _resetUnread(next.value);
      }
    });

    ref.listen(watchConversationMessagesProvider(widget.matchId), (
      previous,
      next,
    ) {
      final previousMessages = previous?.asData?.value;
      next.whenData((messages) {
        _scrollCoordinator.syncWithMessages(
          messages: messages,
          previousMessages: previousMessages,
        );
        _readMarkerController.markForIncomingLatest(
          uid: ref.read(uidProvider).value,
          messages: messages,
        );
      });
    });

    final routeState = ref.watch(
      chatRouteStateProvider(
        ChatRouteStateArgs(
          matchId: widget.matchId,
          initialProfile: widget.otherProfile,
        ),
      ),
    );
    final chatState = routeState.chatState;
    final availableThreadActions = chatState.threadActions
        .where((action) => !chatState.disabledThreadActions.contains(action))
        .toList(growable: false);
    final conversationContext = chatConversationContextFor(
      isHostInquiry: routeState.lookupState.isHostInquiry,
      viewerIsHost: AppConfig.appRole.isHost,
      isCrossPathsEventPlan:
          routeState.matchAsync.value?.isCrossPathsEventPlan == true,
    );
    final routeError = routeState.routeError;
    final authError = routeState.authError;
    if (!_scrollCoordinator.didScrollToLatestMessage &&
        routeState.initialMessages != null &&
        routeState.initialMessages!.isNotEmpty) {
      _scrollCoordinator.syncWithMessages(
        messages: routeState.initialMessages!,
      );
    }

    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        ChatController.sendMessageMutation,
        ChatController.sendImageMutation,
        ChatController.reportUserMutation,
        ChatController.blockUserMutation,
        SuvbotController.requestMutation,
      ],
      errorContext: AppErrorContext.chat,
    );
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.identity(
        identitySemanticLabel: context.l10n.coreCatchTopBarLabelViewNameProfile(
          name: chatState.name,
        ),
        identityName: chatState.name,
        identityPhotoUrl: chatState.photoUrl,
        onIdentityTap: chatState.profileNavigationEnabled
            ? () => _openOtherProfile(chatState)
            : null,
        navigation: CatchTopBarNavigation(
          mode: widget.embedded
              ? CatchTopBarNavigationMode.none
              : CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        actions: [
          if (availableThreadActions.isNotEmpty)
            CatchActionMenu<ChatThreadAction>(
              tooltip: context.l10n.chatsChatScreenTooltipChatActions,
              onSelected: (action) => unawaited(
                _threadActionController.runThreadAction(
                  action: action,
                  chatState: chatState,
                  messages: routeState.messages,
                  uid: routeState.uid,
                  event: routeState.event,
                  share: routeState.share,
                  ui: _threadActionUi(),
                ),
              ),
              items: availableThreadActions
                  .map((action) => _threadActionMenuItem(context, action))
                  .toList(),
            ),
        ],
      ),
      body: CatchRouteBody.fullBleed(
        child: Column(
          children: [
            if (routeState.showEventContextHeader)
              ChatEventContextHeader(
                event: routeState.event,
                conversationContext: conversationContext,
              ),
            Expanded(
              child: authError != null
                  ? CatchLocalizedErrorState(
                      authError,
                      context: AppErrorContext.auth,
                      onRetry: () => ref.invalidate(uidProvider),
                    )
                  : routeError == null
                  ? ChatMessageList(
                      messagesAsync: _asyncValue(
                        routeState.displayMessagesAsync,
                      ),
                      currentUid: routeState.uid,
                      event: routeState.event,
                      otherName: chatState.messageOtherName,
                      conversationContext: conversationContext,
                      scrollController: _scrollCoordinator.scrollController,
                      onRetry: chatState.messagesRetryIntent == null
                          ? null
                          : () => _retryController.run(
                              chatState.messagesRetryIntent!,
                            ),
                    )
                  : CatchErrorState(
                      title:
                          context.l10n.chatsChatScreenTitleMessagesUnavailable,
                      message: appErrorMessage(
                        routeError.error,
                        l10n: context.l10n,
                        context: AppErrorContext.chat,
                      ),
                      icon: CatchIcons.chat,
                      onRetry: () =>
                          _retryController.run(routeError.retryIntent),
                      retryLabel: context
                          .l10n
                          .chatsChatScreenCatcherrorstateReloadMessages,
                    ),
            ),
            if (routeState.showSuvbotActionBar)
              SuvbotDock(
                actions: _asyncValue(routeState.suvbotActionsAsync),
                pending: routeState.suvbotPending,
                onAction: _runSuvbotAction,
                onTextAction: _runSuvbotTextAction,
                onRetry: () => _retryController.run(
                  chatState.suvbotActionsRetryIntent ??
                      HostChatRetryIntent.reloadSuvbotActions,
                ),
              ),
            if (routeState.showComposer)
              ChatInput(
                controller: _textController,
                sending: routeState.sendMessagePending,
                onSend: chatState.composerDisabledReason == null ? _send : null,
                onSendImage: chatState.composerDisabledReason == null
                    ? _sendImage
                    : null,
                disabledReason: chatState.composerDisabledReason,
                sendingImage: routeState.sendImagePending,
              ),
          ],
        ),
      ),
    );
  }
}

AsyncValue<T> _asyncValue<T>(CatchAsyncState<T> state) {
  return switch (state.status) {
    CatchAsyncStatus.data => AsyncData(state.value as T),
    CatchAsyncStatus.loading => const AsyncLoading(),
    CatchAsyncStatus.error => AsyncError(state.error!, StackTrace.empty),
  };
}
