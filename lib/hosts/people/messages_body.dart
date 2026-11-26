import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/messaging/parts/messaging_thread_row.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
import 'package:catch_dating_app/hosts/people/messages_state.dart';
import 'package:catch_dating_app/hosts/people/widgets/people_tab_bar.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// Messages in board order: the People, Messages and Forms views, the name
/// search, the chips and the scope, Booked and Prospective in an event
/// scope, the Automatic messages row and the conversations, with what the
/// list may be missing and the buttons that load more.
class HostMessagesBody extends StatelessWidget {
  const HostMessagesBody({
    super.key,
    required this.state,
    required this.now,
    required this.onView,
    required this.onFilter,
    required this.onOpenThread,
    required this.onAutomations,
    required this.onRetry,
    this.onSends,
    this.onScope,
    this.onSegment,
    this.onSearch,
    this.onMoreCatch,
    this.onMoreWhatsapp,
    this.selectedThreadId,
  });

  final HostMessagesState state;

  /// The clock the message times read from.
  final DateTime now;
  final ValueChanged<HostPeopleView> onView;
  final ValueChanged<HostMessagesFilter> onFilter;
  final ValueChanged<HostMessageThread> onOpenThread;
  final VoidCallback onAutomations;
  final VoidCallback onRetry;

  /// Opens Sends: campaigns, announcements, follower updates and the
  /// handoffs to send by hand.
  final VoidCallback? onSends;

  /// Picks a scope; null lists every conversation.
  final ValueChanged<HostInboxScope?>? onScope;
  final ValueChanged<HostInboxAudienceSegment>? onSegment;
  final ValueChanged<String>? onSearch;
  final VoidCallback? onMoreCatch;
  final VoidCallback? onMoreWhatsapp;

  /// The conversation open beside the list.
  final String? selectedThreadId;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final numbers = NumberFormat.decimalPattern(
      Localizations.localeOf(context).toLanguageTag(),
    );
    final on = state.automationsOn;
    final sent = state.automationsSent;
    final scope = state.scope;
    final programme = state.programme;
    final Widget threads = switch (state.status) {
      HostMessagesStatus.loading => const CatchLoadingIndicator(),
      HostMessagesStatus.error => CatchErrorState(
        title: l10n.hostPeopleMessagesErrorTitle,
        message: l10n.hostPeopleMessagesErrorBody,
        retryLabel: l10n.hostPeopleRetry,
        onRetry: onRetry,
        mode: CatchErrorStateMode.inline,
      ),
      HostMessagesStatus.ready when programme != null =>
        programme.error != null
            ? CatchErrorState(
                title: l10n.hostInboxProgramPurposeUnresolvedTitle,
                message: l10n.hostPeopleMessagesErrorBody,
                retryLabel: l10n.hostPeopleRetry,
                onRetry: onRetry,
                mode: CatchErrorStateMode.inline,
              )
            : programme.loading
            ? const CatchLoadingIndicator()
            : CatchEmptyState(
                key: const ValueKey<String>('host-messages-programme'),
                icon: CatchIcons.chat,
                title: l10n.hostInboxProgramPurposeUnresolvedTitle,
                message: l10n.hostInboxProgramPurposeUnresolvedBody,
              ),
      HostMessagesStatus.ready => CatchSection(
        empty: hostMessagesEmpty(l10n, state),
        children: [
          for (final thread in state.threads)
            MessagingThreadRow(
              key: ValueKey<String>('host-message-${thread.personId}'),
              name: thread.name,
              photoUrl: thread.photoUrl,
              preview: thread.preview,
              time: AppTimeFormatters.chatTimestamp(thread.at, now: now),
              badge: scope?.eventId != null && thread.booked == null
                  ? l10n.hostInboxUnknownBooking
                  : thread.tonight
                  ? l10n.hostPeopleMessagesTonight
                  : null,
              unread: thread.unread,
              selected: thread.personId == selectedThreadId,
              onTap: () => onOpenThread(thread),
            ),
        ],
      ),
    };
    final ready = state.status == HostMessagesStatus.ready && programme == null;
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        HostPeopleTabBar(selected: HostPeopleView.messages, onView: onView),
        if (onSearch case final search?)
          CatchSearchField(
            key: const ValueKey<String>('host-messages-search'),
            copy: catchSearchFieldCopy(l10n),
            value: state.query,
            placeholder: l10n.sharedSearchByNameHint,
            semanticLabel: l10n.sharedSearchByNameHint,
            contractExemption:
                'Client-side name filter over the loaded conversations; never persisted.',
            onChanged: search,
          ),
        CatchStack(
          direction: CatchStackDirection.row,
          gap: CatchStackGap.g6,
          wrap: true,
          children: [
            for (final filter in HostMessagesFilter.values)
              CatchChip.choice(
                key: ValueKey<String>('host-messages-filter-${filter.name}'),
                label: switch (filter) {
                  HostMessagesFilter.all => l10n.hostPeopleMessagesAll,
                  HostMessagesFilter.unread => l10n.hostPeopleMessagesUnread,
                  HostMessagesFilter.tonight => l10n.hostPeopleMessagesTonight,
                },
                count:
                    filter == HostMessagesFilter.unread &&
                        state.status == HostMessagesStatus.ready
                    ? state.unreadCount
                    : null,
                size: CatchChipSize.sm,
                selected: filter == state.filter,
                mode: CatchChipMode.single,
                onPressed: () => onFilter(filter),
              ),
            if (onScope case final pick?)
              CatchMenu<String>.anchored(
                items: [
                  CatchMenuItem<String>(
                    value: hostMessagesScopeKey(null),
                    label: l10n.hostTodayAllEvents,
                    selected: scope == null,
                    variant: CatchMenuItemVariant.choice,
                  ),
                  for (final event in state.scopes.events)
                    CatchMenuItem<String>(
                      value: hostMessagesScopeKey(
                        HostInboxScope.event(event.id),
                      ),
                      label: l10n
                          .hostsHostInboxScreenVisiblecopyTitleShortdatelabelCompacttimerangelabel(
                            title: event.title,
                            shortDateLabel: event.shortDateLabel,
                            compactTimeRangeLabel: event.compactTimeRangeLabel,
                          ),
                      selected: scope?.eventId == event.id,
                      variant: CatchMenuItemVariant.choice,
                    ),
                  for (final programme in state.scopes.programmes)
                    CatchMenuItem<String>(
                      value: hostMessagesScopeKey(
                        HostInboxScope.program(programme.programId),
                      ),
                      label: programme.title,
                      selected: scope?.programId == programme.programId,
                      variant: CatchMenuItemVariant.choice,
                    ),
                  CatchMenuItem<String>(
                    value: hostMessagesScopeKey(const HostInboxScope.general()),
                    label: l10n.hostsHostInboxScreenVisiblecopyGeneralInquiries,
                    selected: scope?.isGeneral == true,
                    variant: CatchMenuItemVariant.choice,
                  ),
                ],
                onSelected: (key, _) => pick(hostMessagesScopeFromKey(key)),
                builder: (context, controller, _) => CatchChip.link(
                  key: const ValueKey<String>('host-messages-scope'),
                  label: hostMessagesScopeLabel(l10n, state),
                  size: CatchChipSize.sm,
                  semanticsLabel:
                      '${l10n.hostsHostInboxScreenLabelInboxScope}: '
                      '${hostMessagesScopeLabel(l10n, state)}',
                  leading: CatchIcon(CatchIcons.event, size: CatchIconSize.xs),
                  onPressed: controller.isOpen
                      ? controller.close
                      : controller.open,
                ),
              ),
          ],
        ),
        if (ready && scope?.eventId != null && onSegment != null)
          CatchPageTabBar<HostInboxAudienceSegment>.segmented(
            key: const ValueKey<String>('host-messages-segment'),
            selected: state.segment,
            size: CatchPageTabBarSize.sm,
            onChanged: onSegment,
            options: [
              CatchOption<HostInboxAudienceSegment>(
                value: HostInboxAudienceSegment.booked,
                label: switch (state.bookedCount) {
                  final count? =>
                    l10n.hostsHostInboxScreenLabelBookedBookedthreadcount(
                      bookedThreadCount: count,
                    ),
                  null => l10n.hostInboxBookedStatus,
                },
              ),
              CatchOption<HostInboxAudienceSegment>(
                value: HostInboxAudienceSegment.prospective,
                label: switch (state.prospectiveCount) {
                  final count? =>
                    l10n.hostsHostInboxScreenLabelProspectiveProspectivethreadcount(
                      prospectiveThreadCount: count,
                    ),
                  null => l10n.hostInboxProspectiveStatus,
                },
              ),
            ],
          ),
        CatchIndexRow(
          key: const ValueKey<String>('host-messages-automations'),
          title: l10n.hostPeopleAutomationsTitle,
          subtitle: on == null || sent == null
              ? null
              : l10n.hostPeopleMessagesAutomationsNote(
                  on: numbers.format(on),
                  sent: numbers.format(sent),
                ),
          icon: CatchIcons.sync,
          iconTone: CatchIndexRowTone.success,
          chevron: true,
          onTap: onAutomations,
        ),
        if (onSends case final sends?)
          CatchIndexRow(
            key: const ValueKey<String>('host-messages-sends'),
            title: l10n.hostMessagingWorkspaceSends,
            subtitle: l10n.hostSendsSubtitle,
            icon: CatchIcons.send,
            chevron: true,
            onTap: sends,
          ),
        if (ready && state.partial)
          CatchNotice.inline(
            key: const ValueKey<String>('host-messages-partial'),
            tone: CatchNoticeTone.neutral,
            icon: CatchIcons.info,
            body: l10n.hostInboxPartialSources,
            action: state.partialFailed
                ? CatchNoticeAction(
                    label: l10n.sharedActionTryAgain,
                    onPressed: onRetry,
                  )
                : null,
          ),
        if (ready && state.unclassifiedCount > 0)
          CatchText(
            l10n.hostInboxUnclassified,
            key: const ValueKey<String>('host-messages-unclassified'),
            variant: CatchTextVariant.bodyMeta,
            tone: CatchTextTone.secondary,
          ),
        threads,
        if (ready)
          for (final (source, more, onMore) in [
            ('catch', state.moreCatch, onMoreCatch),
            ('whatsapp', state.moreWhatsapp, onMoreWhatsapp),
          ])
            if (more != HostMessagesMore.none)
              CatchButton(
                key: ValueKey<String>('host-messages-more-$source'),
                label: more == HostMessagesMore.failed
                    ? l10n.sharedActionTryAgain
                    : l10n.hostInboxMoreConversations,
                variant: CatchButtonVariant.secondary,
                status: more == HostMessagesMore.loading
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                onPressed: more == HostMessagesMore.loading ? null : onMore,
              ),
      ],
    );
  }
}

/// The empty list's line: for the search, the scope, or the chip.
String hostMessagesEmpty(AppLocalizations l10n, HostMessagesState state) {
  if (state.query.trim().isNotEmpty) {
    return l10n.chatsEmptyStateNoHostSearchResultsTitle;
  }
  final scope = state.scope;
  if (scope?.isGeneral == true) {
    return l10n.hostsHostInboxScreenTitleNoGeneralInquiries;
  }
  if (scope?.eventId != null && state.filter == HostMessagesFilter.all) {
    return l10n.hostsHostInboxScreenTitleNoValue1HaveWritten(
      value1: state.segment == HostInboxAudienceSegment.booked
          ? l10n.hostsHostInboxScreenTitleBookedAttendees
          : l10n.hostsHostInboxScreenTitleProspectiveAttendees,
    );
  }
  return switch (state.filter) {
    HostMessagesFilter.all => l10n.hostPeopleMessagesEmpty,
    HostMessagesFilter.unread => l10n.hostPeopleMessagesEmptyUnread,
    HostMessagesFilter.tonight => l10n.hostPeopleMessagesEmptyTonight,
  };
}

/// The scope chip's label: every event, the event, the programme or
/// General inquiries.
String hostMessagesScopeLabel(AppLocalizations l10n, HostMessagesState state) {
  final scope = state.scope;
  if (scope == null) return l10n.hostTodayAllEvents;
  if (scope.isGeneral) {
    return l10n.hostsHostInboxScreenVisiblecopyGeneralInquiries;
  }
  if (scope.programId case final programId?) {
    return state.programme?.title ??
        state.scopes.programmes
            .where((programme) => programme.programId == programId)
            .firstOrNull
            ?.title ??
        l10n.hostsHostInboxScreenVisiblecopyProgramGuests;
  }
  return state.scopes.events
          .where((event) => event.id == scope.eventId)
          .firstOrNull
          ?.title ??
      l10n.hostsHostInboxScreenVisiblecopyEventInquiry;
}

/// A scope as a menu value, and back.
String hostMessagesScopeKey(HostInboxScope? scope) => switch (scope?.kind) {
  null => 'all',
  HostInboxScopeKind.general => 'general',
  HostInboxScopeKind.event => 'event:${scope!.eventId}',
  HostInboxScopeKind.program => 'program:${scope!.programId}',
};

HostInboxScope? hostMessagesScopeFromKey(String key) {
  if (key == 'general') return const HostInboxScope.general();
  if (key.startsWith('event:')) return HostInboxScope.event(key.substring(6));
  if (key.startsWith('program:')) {
    return HostInboxScope.program(key.substring(8));
  }
  return null;
}
