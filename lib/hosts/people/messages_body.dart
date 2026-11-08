import 'package:catch_dating_app/contexts/messaging/parts/messaging_thread_row.dart';
import 'package:catch_dating_app/hosts/people/messages_state.dart';
import 'package:catch_dating_app/hosts/people/widgets/people_tab_bar.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// Messages in board order: the People, Messages and Forms views, the
/// chips, the Automatic messages row and the conversations.
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
  });

  final HostMessagesState state;

  /// The clock the message times read from.
  final DateTime now;
  final ValueChanged<HostPeopleView> onView;
  final ValueChanged<HostMessagesFilter> onFilter;
  final ValueChanged<HostMessageThread> onOpenThread;
  final VoidCallback onAutomations;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final numbers = NumberFormat.decimalPattern(
      Localizations.localeOf(context).toLanguageTag(),
    );
    final on = state.automationsOn;
    final sent = state.automationsSent;
    final Widget threads = switch (state.status) {
      HostMessagesStatus.loading => const CatchLoadingIndicator(),
      HostMessagesStatus.error => CatchErrorState(
        title: l10n.hostPeopleMessagesErrorTitle,
        message: l10n.hostPeopleMessagesErrorBody,
        retryLabel: l10n.hostPeopleRetry,
        onRetry: onRetry,
        mode: CatchErrorStateMode.inline,
      ),
      HostMessagesStatus.ready => CatchSection(
        empty: switch (state.filter) {
          HostMessagesFilter.all => l10n.hostPeopleMessagesEmpty,
          HostMessagesFilter.unread => l10n.hostPeopleMessagesEmptyUnread,
          HostMessagesFilter.tonight => l10n.hostPeopleMessagesEmptyTonight,
        },
        children: [
          for (final thread in state.threads)
            MessagingThreadRow(
              key: ValueKey<String>('host-message-${thread.personId}'),
              name: thread.name,
              photoUrl: thread.photoUrl,
              preview: thread.preview,
              time: AppTimeFormatters.chatTimestamp(thread.at, now: now),
              badge: thread.tonight ? l10n.hostPeopleMessagesTonight : null,
              unread: thread.unread,
              onTap: () => onOpenThread(thread),
            ),
        ],
      ),
    };
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        HostPeopleTabBar(selected: HostPeopleView.messages, onView: onView),
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
        threads,
      ],
    );
  }
}
