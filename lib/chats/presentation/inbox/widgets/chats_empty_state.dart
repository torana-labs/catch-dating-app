import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class ChatsEmptyState extends StatelessWidget {
  const ChatsEmptyState({
    super.key,
    this.title,
    this.message,
    this._iconRole = _ChatsEmptyStateIconRole.catchWindow,
  }) : _variant = _ChatsEmptyStateVariant.noCatches;

  const ChatsEmptyState.hostInbox({super.key})
    : title = null,
      message = null,
      _variant = _ChatsEmptyStateVariant.hostInbox,
      _iconRole = _ChatsEmptyStateIconRole.hostInquiry;

  const ChatsEmptyState.noSearchResults({super.key})
    : title = null,
      message = null,
      _variant = _ChatsEmptyStateVariant.noSearchResults,
      _iconRole = _ChatsEmptyStateIconRole.catchWindow;

  const ChatsEmptyState.noHostSearchResults({super.key})
    : title = null,
      message = null,
      _variant = _ChatsEmptyStateVariant.noHostSearchResults,
      _iconRole = _ChatsEmptyStateIconRole.hostInquiry;

  const ChatsEmptyState.noUnreadQueries({super.key})
    : title = null,
      message = null,
      _variant = _ChatsEmptyStateVariant.noUnreadQueries,
      _iconRole = _ChatsEmptyStateIconRole.hostInquiry;

  final String? title;
  final String? message;
  final _ChatsEmptyStateVariant _variant;
  final _ChatsEmptyStateIconRole _iconRole;

  @override
  Widget build(BuildContext context) {
    final resolvedTitle = title ?? _variant.title(context.l10n);
    final resolvedMessage = message ?? _variant.message(context.l10n);
    return CatchEmptyState(
      icon: _iconRole.icon,
      title: resolvedTitle,
      message: resolvedMessage,
      padding: CatchInsets.contentRelaxed,
      titleStyle: CatchTextStyles.displayXs(context),
    );
  }
}

enum _ChatsEmptyStateVariant {
  noCatches,
  hostInbox,
  noSearchResults,
  noHostSearchResults,
  noUnreadQueries;

  String title(AppLocalizations l10n) => switch (this) {
    _ChatsEmptyStateVariant.noCatches => l10n.chatsEmptyStateNoCatchesTitle,
    _ChatsEmptyStateVariant.hostInbox => l10n.chatsEmptyStateHostInboxTitle,
    _ChatsEmptyStateVariant.noSearchResults =>
      l10n.chatsEmptyStateNoSearchResultsTitle,
    _ChatsEmptyStateVariant.noHostSearchResults =>
      l10n.chatsEmptyStateNoHostSearchResultsTitle,
    _ChatsEmptyStateVariant.noUnreadQueries =>
      l10n.chatsEmptyStateNoUnreadQueriesTitle,
  };

  String message(AppLocalizations l10n) => switch (this) {
    _ChatsEmptyStateVariant.noCatches => l10n.chatsEmptyStateNoCatchesMessage,
    _ChatsEmptyStateVariant.hostInbox => l10n.chatsEmptyStateHostInboxMessage,
    _ChatsEmptyStateVariant.noSearchResults =>
      l10n.chatsEmptyStateNoSearchResultsMessage,
    _ChatsEmptyStateVariant.noHostSearchResults =>
      l10n.chatsEmptyStateNoHostSearchResultsMessage,
    _ChatsEmptyStateVariant.noUnreadQueries =>
      l10n.chatsEmptyStateNoUnreadQueriesMessage,
  };
}

enum _ChatsEmptyStateIconRole {
  catchWindow,
  hostInquiry;

  IconData get icon => switch (this) {
    _ChatsEmptyStateIconRole.catchWindow => CatchIcons.like,
    _ChatsEmptyStateIconRole.hostInquiry => CatchIcons.chat,
  };
}
