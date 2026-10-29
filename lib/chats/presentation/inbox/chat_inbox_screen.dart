import 'dart:async';

import 'package:catch_dating_app/chats/presentation/inbox/chats_list_screen_state.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/chats/presentation/inbox/event_chat_directory_controller.dart';
import 'package:catch_dating_app/chats/presentation/inbox/event_chat_directory_section.dart';
import 'package:catch_dating_app/chats/presentation/inbox/host_inbox_filter.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_list.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_sliver_header.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ChatsListScreen extends ConsumerStatefulWidget {
  const ChatsListScreen({
    super.key,
    this.initialScope = ConsumerChatScope.events,
  });
  final ConsumerChatScope initialScope;

  @override
  ConsumerState<ChatsListScreen> createState() => _ChatsListScreenState();
}

class _ChatsListScreenState extends ConsumerState<ChatsListScreen>
    with WidgetsBindingObserver {
  late ConsumerChatScope _scope = widget.initialScope;
  HostInboxFilter _hostInboxFilter = HostInboxFilter.all;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        !AppConfig.appRole.isHost &&
        _scope == ConsumerChatScope.events &&
        (ModalRoute.of(context)?.isCurrent ?? true)) {
      unawaited(
        ref.read(eventChatDirectoryControllerProvider.notifier).refresh(),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isHostApp = AppConfig.appRole.isHost;

    final uidAsync = ref.watch(uidProvider);
    final showEvents = !isHostApp && _scope == ConsumerChatScope.events;
    final viewModelAsync = showEvents
        ? const AsyncLoading<ChatsListViewModel>()
        : ref.watch(chatsListViewModelProvider);
    final searchValue = ref.watch(chatSearchQueryProvider);
    final query = searchValue.trim();
    final screenState = HostInboxScreenState.fromAsync(
      viewModel: _catchAsyncState(viewModelAsync),
      uid: _catchAsyncState(uidAsync),
      query: query,
      selectedFilter: _hostInboxFilter,
      isHostApp: isHostApp,
    );

    return CatchRootScreenScaffold.fullBleed(
      title: ChatsBrowseHeader(
        presentation: isHostApp
            ? ChatsBrowsePresentation.host
            : ChatsBrowsePresentation.consumer,
        showSearchAction: !showEvents && screenState.showSearchAction,
        searchValue: showEvents ? '' : searchValue,
        onSearchChanged: ref.read(chatSearchQueryProvider.notifier).setQuery,
        hostFilter: screenState.hostFilter,
        hostUnreadCount: screenState.unreadThreadCount,
        onHostFilterChanged: _handleHostFilterChanged,
        consumerScope: isHostApp ? null : _scope,
        onConsumerScopeChanged: (scope) => setState(() => _scope = scope),
        actions: [
          if (showEvents)
            CatchIconAction.toolbar(
              tooltip: context.l10n.eventChatRefresh,
              onPressed: () => ref
                  .read(eventChatDirectoryControllerProvider.notifier)
                  .refresh(),
              icon: CatchIcons.refresh,
            ),
        ],
      ),
      children: [
        if (showEvents)
          const EventChatDirectorySection()
        else
          ChatsList(
            hostFilter: screenState.hostFilter,
            displayState: screenState.displayState,
            onThreadSelected: _openChatThread,
          ),
      ],
    );
  }

  void _handleHostFilterChanged(HostInboxFilter filter) {
    if (filter == _hostInboxFilter) return;
    setState(() => _hostInboxFilter = filter);
  }

  void _openChatThread(ChatThreadPreview preview) {
    final routeName = AppConfig.appRole.isHost
        ? Routes.hostChatScreen.name
        : Routes.chatScreen.name;
    context.goNamed(routeName, pathParameters: {'matchId': preview.matchId});
  }
}

CatchAsyncState<T> _catchAsyncState<T>(AsyncValue<T> value) {
  return catchAsyncStateFromAsyncValue(value);
}
