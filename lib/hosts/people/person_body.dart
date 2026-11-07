import 'package:catch_dating_app/hosts/people/parts/people_night_row.dart';
import 'package:catch_dating_app/hosts/people/person_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// One person, in board order. On a phone, stacked: the avatar, their name
/// and line, Message, their stats, Notes and tags and their nights. As the
/// detail pane beside the People list: the pane header with Message, the
/// avatar beside the name, the stats in one row, then their nights and
/// Notes and tags.
class HostPersonBody extends StatelessWidget {
  const HostPersonBody({
    super.key,
    required this.state,
    required this.onMessage,
    required this.onAddTag,
    required this.onRetry,
    this.pane = false,
    this.messaging = false,
  });

  final HostPersonState state;
  final VoidCallback onMessage;
  final VoidCallback onAddTag;
  final VoidCallback onRetry;

  /// Drawn as the detail pane beside the People list.
  final bool pane;

  /// A conversation is being opened.
  final bool messaging;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case HostPersonStatus.loading:
        return const CatchLoadingIndicator();
      case HostPersonStatus.error:
        return CatchErrorState(
          title: l10n.hostPeoplePersonErrorTitle,
          message: l10n.hostPeoplePersonErrorBody,
          retryLabel: l10n.hostPeopleRetry,
          onRetry: onRetry,
          mode: CatchErrorStateMode.inline,
        );
      case HostPersonStatus.ready:
        break;
    }
    final line = hostPersonLine(l10n, state);
    final message = CatchButton(
      label: l10n.hostPeopleMessage,
      leading: CatchIcon(CatchIcons.chat, size: CatchIconSize.md),
      size: pane ? CatchButtonSize.sm : CatchButtonSize.md,
      fullWidth: !pane,
      status: messaging ? CatchButtonStatus.loading : CatchButtonStatus.idle,
      onPressed: messaging ? null : onMessage,
    );
    final stats = _HostPersonStats(state: state, pane: pane);
    final nights = CatchSection(
      title: l10n.hostPeopleNightsTitle,
      empty: l10n.hostPeopleNightsEmpty,
      children: [
        for (final night in state.nightsWithYou)
          PeopleNightRow(
            key: ValueKey<String>('host-person-night-${night.eventId}'),
            night: night,
          ),
      ],
    );
    final notes = _HostPersonNotes(
      state: state,
      pane: pane,
      onAddTag: onAddTag,
    );
    if (pane) {
      return CatchStack(
        gap: CatchStackGap.g28,
        children: [
          CatchPaneHeader(
            title: state.name,
            kicker: l10n.hostPeopleTitle,
            trailing: message,
          ),
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g20,
            align: CatchStackAlign.center,
            children: [
              CatchAvatar.system(size: CatchAvatarSize.xl, name: state.name),
              Expanded(
                child: CatchStack(
                  gap: CatchStackGap.g4,
                  children: [
                    CatchText(
                      state.name,
                      variant: CatchTextVariant.displaySection,
                    ),
                    CatchText(
                      line,
                      variant: CatchTextVariant.bodySmall,
                      tone: CatchTextTone.secondary,
                    ),
                  ],
                ),
              ),
            ],
          ),
          stats,
          CatchStack(gap: CatchStackGap.g32, children: [nights, notes]),
        ],
      );
    }
    return CatchStack(
      gap: CatchStackGap.g16,
      children: [
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            CatchAvatar.system(size: CatchAvatarSize.xxl, name: state.name),
            CatchText(state.name, variant: CatchTextVariant.pageTitle),
            CatchText(
              line,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
        message,
        stats,
        notes,
        nights,
      ],
    );
  }
}

/// "Coming since March", or that they have no nights yet.
String hostPersonLine(AppLocalizations l10n, HostPersonState state) {
  final since = state.since;
  if (since == null) return l10n.hostPeoplePersonNoNights;
  return l10n.hostPeoplePersonSince(month: AppTimeFormatters.longMonth(since));
}

/// Nights, Spent and Missed: two to a row on a phone, one row in the pane.
class _HostPersonStats extends StatelessWidget {
  const _HostPersonStats({required this.state, required this.pane});

  final HostPersonState state;
  final bool pane;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final numbers = NumberFormat.decimalPattern(locale);
    final rupees = NumberFormat.currency(
      locale: 'en_IN',
      symbol: '₹',
      decimalDigits: 0,
    );
    final since = state.since;
    final spent = state.spentMinor;
    final tiles = [
      CatchMetricTile.stat(
        label: l10n.hostPeopleStatNights,
        value: numbers.format(state.nights),
        note: since == null
            ? null
            : l10n.hostPeopleStatNightsSince(
                month: AppTimeFormatters.longMonth(since),
              ),
      ),
      if (spent != null)
        CatchMetricTile.stat(
          label: l10n.hostPeopleStatSpent,
          value: rupees.format(spent / 100),
          note: l10n.hostPeopleStatSpentNote,
        ),
      CatchMetricTile.stat(
        label: l10n.hostPeopleStatMissed,
        value: numbers.format(state.missed),
        note: state.missed == 0 && state.nights > 0
            ? l10n.hostPeopleStatMissedNever
            : null,
        noteTone: CatchMetricTileTone.success,
      ),
    ];
    if (pane || tiles.length < 3) {
      return CatchStack(
        direction: CatchStackDirection.row,
        equal: true,
        children: tiles,
      );
    }
    return CatchStack(
      children: [
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: tiles.take(2).toList(),
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: tiles.skip(2).toList(),
        ),
      ],
    );
  }
}

/// The team's tags as chips with Add a tag, and the latest note in a tile.
class _HostPersonNotes extends StatelessWidget {
  const _HostPersonNotes({
    required this.state,
    required this.pane,
    required this.onAddTag,
  });

  final HostPersonState state;
  final bool pane;
  final VoidCallback onAddTag;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final detail = state.detail;
    final tags = detail?.manualTags ?? const [];
    final note = detail?.notes.firstOrNull;
    return CatchSection(
      title: l10n.hostPeopleNotesTitle,
      note: pane ? null : l10n.hostPeopleNotesNote,
      dividers: CatchSectionPlacement.none,
      children: [
        CatchStack(
          direction: CatchStackDirection.row,
          gap: CatchStackGap.g6,
          wrap: true,
          children: [
            for (final tag in tags)
              CatchChip.tag(
                key: ValueKey<String>('host-person-tag-${tag.tagId}'),
                label: tag.label,
                size: CatchChipSize.sm,
              ),
            CatchChip.filter(
              key: const ValueKey<String>('host-person-add-tag'),
              label: l10n.hostPeopleAddTag,
              size: CatchChipSize.sm,
              leading: CatchIcon(CatchIcons.add, size: CatchIconSize.xs),
              onPressed: onAddTag,
            ),
          ],
        ),
        if (note != null)
          CatchSurface(
            child: CatchStack(
              gap: CatchStackGap.g4,
              children: [
                CatchText(note.body),
                CatchText(
                  AppTimeFormatters.weekdayDayMonth(note.updatedAt),
                  variant: CatchTextVariant.bodyMeta,
                  tone: CatchTextTone.secondary,
                ),
              ],
            ),
          ),
        if (pane)
          CatchText(
            l10n.hostPeopleNotesNote,
            variant: CatchTextVariant.bodyMeta,
            tone: CatchTextTone.secondary,
          ),
      ],
    );
  }
}
