import 'dart:async';

import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

class ChatScrollCoordinator {
  ChatScrollCoordinator({
    required this.isMounted,
    ScrollController? scrollController,
  }) : scrollController = scrollController ?? ScrollController();

  final bool Function() isMounted;
  final ScrollController scrollController;
  bool _didScrollToLatestMessage = false;
  int _lastMessageCount = 0;

  bool get didScrollToLatestMessage => _didScrollToLatestMessage;
  int get lastMessageCount => _lastMessageCount;

  void dispose() {
    scrollController.dispose();
  }

  void syncWithMessages({
    required List<ChatMessage> messages,
    List<ChatMessage>? previousMessages,
  }) {
    final previousCount = previousMessages?.length ?? _lastMessageCount;
    final nextCount = messages.length;

    if (nextCount == 0) {
      _lastMessageCount = 0;
      return;
    }

    if (!_didScrollToLatestMessage) {
      _didScrollToLatestMessage = true;
      _lastMessageCount = nextCount;
      _scheduleScrollToBottom();
      return;
    }

    final hasNewMessages = nextCount > previousCount;
    if (hasNewMessages && _isNearBottom()) {
      _lastMessageCount = nextCount;
      _scheduleScrollToBottom(animated: true);
      return;
    }

    _lastMessageCount = nextCount;
  }

  void scrollAfterSendSuccess() {
    if (!isMounted() || !scrollController.hasClients) return;

    unawaited(
      scrollController.animateTo(
        scrollController.position.maxScrollExtent,
        duration: CatchMotion.chatScroll,
        curve: CatchMotion.easeOutCurve,
      ),
    );
  }

  bool _isNearBottom() {
    if (!scrollController.hasClients) return true;
    final position = scrollController.position;
    return (position.maxScrollExtent - position.pixels) <= 80;
  }

  void _scheduleScrollToBottom({bool animated = false}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!isMounted() || !scrollController.hasClients) return;

      final target = scrollController.position.maxScrollExtent;
      if (animated) {
        unawaited(
          scrollController.animateTo(
            target,
            duration: CatchMotion.chatScroll,
            curve: CatchMotion.easeOutCurve,
          ),
        );
        return;
      }

      scrollController.jumpTo(target);
    });
  }
}
