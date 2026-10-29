import 'package:catch_dating_app/chats/presentation/inbox/chats_search_header_controller.dart';
import 'package:catch_dating_app/chats/presentation/inbox/host_inbox_filter.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

const double _hostInboxFilterHeight = CatchLayout.tabRailHeight;

/// Copy and interaction role for the shared chats browse header.
///
/// Route adapters must choose this explicitly so a reusable widget never
/// changes presentation because of process-global application configuration.
enum ChatsBrowsePresentation { consumer, host }

enum ConsumerChatScope { events, messages }

double chatsBrowseHeaderHeight({
  required BuildContext context,
  required bool hasHostFilter,
  required bool hasHeaderSubtitle,
}) =>
    CatchTopBar.primaryRail(
      title: hasHeaderSubtitle
          ? context.l10n.hostInboxTitle
          : context.l10n.consumerChatsTitle,
      subtitle: hasHeaderSubtitle ? context.l10n.hostInboxSubtitle : null,
    ).contentHeightFor(context) +
    (hasHostFilter ? _hostInboxFilterHeight : 0);

class ChatsBrowseHeader extends StatefulWidget {
  const ChatsBrowseHeader({
    super.key,
    required this.presentation,
    required this.showSearchAction,
    required this.searchValue,
    required this.onSearchChanged,
    required this.hostFilter,
    required this.hostUnreadCount,
    required this.onHostFilterChanged,
    this.showHostSubtitle = true,
    this.subtitle,
    this.compactForPrimaryRail = false,
    this.actions = const [],
    this.consumerScope,
    this.onConsumerScopeChanged,
  });

  final ChatsBrowsePresentation presentation;
  final bool showSearchAction;
  final String searchValue;
  final ValueChanged<String>? onSearchChanged;
  final HostInboxFilter? hostFilter;
  final int hostUnreadCount;
  final ValueChanged<HostInboxFilter>? onHostFilterChanged;
  final bool showHostSubtitle;
  final String? subtitle;
  final bool compactForPrimaryRail;
  final List<Widget> actions;
  final ConsumerChatScope? consumerScope;
  final ValueChanged<ConsumerChatScope>? onConsumerScopeChanged;

  @override
  State<ChatsBrowseHeader> createState() => _ChatsBrowseHeaderState();
}

class _ChatsBrowseHeaderState extends State<ChatsBrowseHeader> {
  late final ChatsSearchHeaderController _searchController;

  @override
  void initState() {
    super.initState();
    _searchController = ChatsSearchHeaderController();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final isHostApp = widget.presentation == ChatsBrowsePresentation.host;
    final hasHeaderSubtitle = isHostApp && widget.showHostSubtitle;
    final query = widget.searchValue;
    final searchActive =
        widget.consumerScope != ConsumerChatScope.events &&
        _searchController.isSearchActive(query);

    final title = isHostApp ? l10n.hostInboxTitle : l10n.consumerChatsTitle;
    final subtitle = hasHeaderSubtitle
        ? widget.subtitle ?? l10n.hostInboxSubtitle
        : null;
    final search = CatchTopBarSearch(
      copy: catchSearchFieldCopy(context.l10n),
      contract: CatchContractConstraints.mobileFormStateChatsInboxSearchQuery,
      enabled: widget.showSearchAction || searchActive,
      expanded: searchActive,
      onExpandedChanged: (expanded) =>
          setState(() => _searchController.setExpanded(expanded)),
      value: query,
      onChanged: widget.onSearchChanged ?? (_) {},
      placeholder: l10n.sharedSearchByNameHint,
      autofocus: true,
      onSubmitted: _closeEmptySearch,
      onFocusChanged: _handleSearchFocusChanged,
      tooltip: isHostApp
          ? l10n.hostSearchAttendeesAction
          : l10n.consumerSearchChatsAction,
      semanticLabel: isHostApp
          ? l10n.hostSearchAttendeesAction
          : l10n.consumerSearchChatsAction,
    );
    final topBar = CatchTopBar.primaryRail(
      title: title,
      subtitle: subtitle,
      search: search,
      actions: widget.actions,
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        topBar,
        if (widget.consumerScope != null)
          CatchPageTabBar<ConsumerChatScope>(
            options: [
              CatchOption(
                value: ConsumerChatScope.events,
                label: l10n.eventChatsTab,
              ),
              CatchOption(
                value: ConsumerChatScope.messages,
                label: l10n.directMessagesTab,
              ),
            ],
            selected: widget.consumerScope!,
            onChanged: widget.onConsumerScopeChanged,
          ),
        if (widget.hostFilter != null)
          CatchPageTabBar<HostInboxFilter>(
            options: [
              CatchOption(
                value: HostInboxFilter.all,
                label: l10n.hostInboxAllFilter,
              ),
              CatchOption(
                value: HostInboxFilter.unread,
                label: l10n.hostInboxUnreadCount(count: widget.hostUnreadCount),
              ),
            ],
            selected: widget.hostFilter!,
            onChanged: widget.onHostFilterChanged,
          ),
      ],
    );
  }

  void _closeEmptySearch(String value) {
    if (_searchController.closeAfterSubmitted(value)) {
      setState(() {});
    }
  }

  void _handleSearchFocusChanged(bool focused) {
    if (_searchController.closeAfterFocusChanged(
      focused: focused,
      query: widget.searchValue,
    )) {
      setState(() {});
    }
  }
}
