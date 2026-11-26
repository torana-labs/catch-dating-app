import 'package:catch_dating_app/contexts/audience/parts/host_door_guest_row.dart';
import 'package:catch_dating_app/hosts/door/door_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The door in board order: how many are in, the meter and who is still to
/// come, the search beside the scan button, the filters with their counts
/// and the guests. On a window wide enough for the operations layout the
/// guests take the main pane and the scanner tile, the last arrival, the
/// counts and who else is on the door take the side.
///
/// Event staff see only what their [access] allows: no check-in or scanner
/// without check-in, no let-in or offer, and a line saying who they are at
/// the door and until when.
class DoorBody extends StatelessWidget {
  const DoorBody({
    super.key,
    required this.state,
    required this.onFilter,
    required this.onSearch,
    required this.onGuestAction,
    required this.onScan,
    required this.onRetrySync,
    required this.onDiscardRefused,
    this.claims,
    this.format,
    this.access = const DoorAccess(),
  });

  final DoorState state;
  final ValueChanged<DoorFilter> onFilter;
  final ValueChanged<String> onSearch;
  final ValueChanged<HostDoorGuest> onGuestAction;
  final VoidCallback onScan;

  /// Sends the attendance changes this phone holds again.
  final VoidCallback onRetrySync;

  /// Drops the changes the server refused.
  final VoidCallback onDiscardRefused;

  /// Web guests asking to be matched to a name on the list, to approve or
  /// reject; null when nobody is waiting.
  final Widget? claims;

  /// The event's format, for the "New" badges.
  final CatchFormat? format;

  /// What this phone may do at the door.
  final DoorAccess access;

  /// Whether this phone may take [guest]'s one action.
  bool _mayAct(HostDoorGuest guest) => switch (guest.status) {
    HostDoorGuestStatus.arriving ||
    HostDoorGuestStatus.checkedIn => access.checkIn,
    HostDoorGuestStatus.asked || HostDoorGuestStatus.waitlist => access.manage,
  };

  @override
  Widget build(BuildContext context) {
    if (state.status == DoorStatus.loading) {
      return const CatchPageBody.screen(child: _DoorLoading());
    }
    final l10n = context.l10n;
    final headline = CatchText(
      l10n.doorHeadline(checkedIn: state.checkedIn, expected: state.expected),
      variant: CatchTextVariant.displayTitle,
      numeric: true,
    );
    final meter = CatchMeter(
      value: state.checkedIn,
      max: state.expected == 0 ? 1 : state.expected,
      label: l10n.doorMeterLabel,
    );
    final sentence = CatchText(
      l10n.doorSummary(
        toCome: state.countOf(DoorFilter.arriving),
        asked: state.countOf(DoorFilter.asked),
        waiting: state.countOf(DoorFilter.waitlist),
      ),
      variant: CatchTextVariant.bodySmall,
      tone: CatchTextTone.secondary,
    );
    final team = state.team.isEmpty
        ? null
        : CatchText(
            l10n.doorTeamWithYou(names: state.team.join(', ')),
            key: const ValueKey<String>('door-team'),
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          );
    final event = state.event;
    final accessLine = switch (access.role) {
      null => null,
      final role => CatchNotice.inline(
        key: const ValueKey<String>('door-access'),
        tone: CatchNoticeTone.neutral,
        title: role == DoorRole.manager
            ? l10n.hostsEventOperatorRoleManager
            : l10n.hostsEventOperatorRoleStaff,
        body: [
          if (role == DoorRole.staff) l10n.hostsEventOperatorAccessSubtitle,
          [
            if (event != null) AppTimeFormatters.dateTime(event.startTime),
            if (access.until case final until?)
              l10n.hostsEventOperatorExpires(
                date: AppTimeFormatters.dateTime(until),
              ),
          ].join(' · '),
        ].where((line) => line.isNotEmpty).join('\n'),
      ),
    };
    final search = CatchSearchField(
      key: const ValueKey<String>('door-search'),
      copy: catchSearchFieldCopy(l10n),
      value: state.query,
      placeholder: l10n.doorSearchPlaceholder(count: state.guests.length),
      contractExemption:
          'Client-side filter over the loaded door rows; never persisted.',
      onChanged: onSearch,
    );
    final filters = CatchPageTabBar<DoorFilter>.segmented(
      selected: state.filter,
      onChanged: onFilter,
      label: l10n.doorFiltersLabel,
      options: [
        for (final filter in DoorFilter.values)
          CatchOption(
            value: filter,
            label: switch (filter) {
              DoorFilter.arriving => l10n.doorFilterArriving,
              DoorFilter.checkedIn => l10n.doorFilterIn,
              DoorFilter.waitlist => l10n.doorFilterWaitlist,
              DoorFilter.asked => l10n.doorFilterAsked,
            },
            count: state.countOf(filter),
          ),
      ],
    );
    final refused = state.needsReview == 0
        ? null
        : CatchStack(
            gap: CatchStackGap.g8,
            children: [
              CatchNotice.inline(
                tone: CatchNoticeTone.warning,
                title: l10n.doorRefusedTitle(count: state.needsReview),
                body: l10n.doorRefusedBody,
              ),
              CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g8,
                children: [
                  CatchButton(
                    label: l10n.doorRefusedRetry,
                    onPressed: onRetrySync,
                    variant: CatchButtonVariant.secondary,
                    size: CatchButtonSize.md,
                  ),
                  CatchButton(
                    label: l10n.doorRefusedDiscard,
                    onPressed: onDiscardRefused,
                    variant: CatchButtonVariant.quiet,
                    size: CatchButtonSize.md,
                  ),
                ],
              ),
            ],
          );
    final guests = CatchSection(
      empty: l10n.doorEmpty,
      children: [
        for (final guest in state.shown)
          HostDoorGuestRow(
            key: ValueKey<String>('door-guest-${guest.attendeeId}'),
            guest: guest,
            format: format,
            onAction: _mayAct(guest) ? () => onGuestAction(guest) : null,
          ),
      ],
    );

    if (CatchRootScope.sizeClassOf(context) != CatchWindowSize.expanded) {
      return CatchPageBody.screen(
        child: CatchStack(
          gap: CatchStackGap.g20,
          children: [
            CatchStack(
              gap: CatchStackGap.g8,
              children: [headline, meter, sentence, ?team],
            ),
            ?accessLine,
            if (access.checkIn)
              CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g8,
                align: CatchStackAlign.center,
                children: [
                  Expanded(child: search),
                  CatchIconAction.icon(
                    key: const ValueKey<String>('door-scan'),
                    icon: CatchIcons.scanQr,
                    tooltip: l10n.doorScanTicket,
                    onPressed: onScan,
                  ),
                ],
              )
            else
              search,
            ?refused,
            ?claims,
            filters,
            guests,
          ],
        ),
      );
    }
    final latest = state.guests
        .where(
          (guest) =>
              guest.status == HostDoorGuestStatus.checkedIn &&
              guest.checkedInAt != null,
        )
        .firstOrNull;
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      child: CatchPaneLayout(
        pattern: CatchPaneLayoutMode.operations,
        children: [
          CatchPageBody.screen(
            gutter: false,
            child: CatchStack(
              gap: CatchStackGap.g16,
              children: [
                CatchStack(
                  gap: CatchStackGap.g4,
                  children: [headline, sentence],
                ),
                meter,
                ?accessLine,
                search,
                ?refused,
                ?claims,
                filters,
                guests,
              ],
            ),
          ),
          CatchPageBody.screen(
            gutter: false,
            child: CatchStack(
              gap: CatchStackGap.g16,
              children: [
                if (access.checkIn)
                  CatchSurface(
                    key: const ValueKey<String>('door-scan'),
                    onPress: onScan,
                    semanticLabel: l10n.doorScanTicket,
                    child: CatchStack(
                      gap: CatchStackGap.g8,
                      align: CatchStackAlign.center,
                      children: [
                        CatchIcon(CatchIcons.scanQr, size: CatchIconSize.lg),
                        CatchText(
                          l10n.doorScannerTileTitle,
                          variant: CatchTextVariant.titleRow,
                          align: TextAlign.center,
                        ),
                        CatchText(
                          l10n.doorScannerTileBody,
                          variant: CatchTextVariant.bodySmall,
                          tone: CatchTextTone.secondary,
                          align: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                if (latest != null)
                  CatchNotice.inline(
                    tone: CatchNoticeTone.success,
                    icon: CatchIcons.checkIn,
                    title: l10n.doorLatestTitle(name: latest.name),
                    body: hostDoorGuestMeta(context, latest),
                  ),
                CatchStack(
                  direction: CatchStackDirection.row,
                  equal: true,
                  children: [
                    CatchMetricTile.stat(
                      label: l10n.doorStatToCome,
                      value: '${state.countOf(DoorFilter.arriving)}',
                    ),
                    CatchMetricTile.stat(
                      label: l10n.doorStatAsked,
                      value: '${state.countOf(DoorFilter.asked)}',
                    ),
                    CatchMetricTile.stat(
                      label: l10n.doorStatWaiting,
                      value: '${state.countOf(DoorFilter.waitlist)}',
                    ),
                  ],
                ),
                ?team,
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// The loading shape: the headline, the filters and rows, drawn from the
/// real components.
class _DoorLoading extends StatelessWidget {
  const _DoorLoading();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final row = HostDoorGuestRow(
      guest: HostDoorGuest(
        attendeeId: '',
        name: l10n.doorFilterArriving,
        status: HostDoorGuestStatus.arriving,
      ),
      onAction: () {},
    );
    return CatchSkeleton.content(
      child: CatchStack(
        gap: CatchStackGap.g20,
        children: [
          CatchText(
            l10n.doorHeadline(checkedIn: 0, expected: 0),
            variant: CatchTextVariant.displayTitle,
          ),
          CatchMeter(value: 0, label: l10n.doorMeterLabel),
          CatchSection(children: [row, row, row]),
        ],
      ),
    );
  }
}
