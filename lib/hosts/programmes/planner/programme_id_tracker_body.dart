import 'package:catch_dating_app/contexts/programmes/domain/program_id_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Which rows the ID tracker shows.
enum HostProgrammeIdFilter {
  all,
  toCheck,
  missing,
  passports;

  bool matches(ProgramIdTrackerRow row) => switch (this) {
    all => true,
    toCheck => row.status == ProgramGuestIdStatus.submitted,
    missing => row.status == ProgramGuestIdStatus.missing,
    passports => row.isPassport,
  };
}

/// IDs for the hotels (RbProgIdTracker) as a list beside its detail. The
/// list: the pane header with Send to the hotels, four numbers, Remind,
/// the hotels, the filters and one row per staying guest. The detail: the
/// guest with Accept and Ask for a clearer photo, the masked number, the
/// checks, who has seen it and the privacy note.
class HostProgrammeIdTrackerBody extends StatelessWidget {
  const HostProgrammeIdTrackerBody({
    super.key,
    required this.status,
    required this.tracker,
    required this.filter,
    required this.selectedGuestId,
    required this.onBack,
    required this.onHotel,
    required this.onFilter,
    required this.onSelect,
    required this.onDecide,
    required this.onSendToHotels,
    required this.onRemind,
    required this.onRetry,
    this.busy = false,
  });

  final HostProgrammeStatus status;
  final ProgramIdTracker? tracker;
  final HostProgrammeIdFilter filter;
  final String? selectedGuestId;
  final VoidCallback onBack;

  /// Null shows every hotel.
  final ValueChanged<String?> onHotel;
  final ValueChanged<HostProgrammeIdFilter> onFilter;
  final ValueChanged<ProgramIdTrackerRow> onSelect;
  final void Function(ProgramIdTrackerRow, ProgramGuestIdDecision) onDecide;

  /// Shares the hotel's handover link; null without a hotel to send to.
  final VoidCallback? onSendToHotels;
  final VoidCallback onRemind;
  final VoidCallback onRetry;

  /// A decision is on its way.
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tracker = this.tracker;
    if (status != HostProgrammeStatus.ready || tracker == null) {
      return HostProgrammeStateBody(status: status, onRetry: onRetry);
    }
    final rows = tracker.rows.where(filter.matches).toList();
    final selected = tracker.rows
        .where((row) => row.guestId == selectedGuestId)
        .firstOrNull;
    final filters = [
      (HostProgrammeIdFilter.all, l10n.hostProgrammeGuestsAll, null),
      (
        HostProgrammeIdFilter.toCheck,
        l10n.hostProgrammeIdsToCheck,
        tracker.toCheck,
      ),
      (
        HostProgrammeIdFilter.missing,
        l10n.hostProgrammeIdsMissing,
        tracker.missing,
      ),
      (
        HostProgrammeIdFilter.passports,
        l10n.hostProgrammeIdsPassports,
        tracker.passports,
      ),
    ];
    final list = CatchScrollView(
      primary: false,
      child: CatchPageBody(
        child: CatchStack(
          gap: CatchStackGap.g16,
          children: [
            CatchPaneHeader(
              title: l10n.hostProgrammeIdsTitle,
              back: CatchTopBarBack(
                label: l10n.hostProgrammeBackToProgramme,
                onPressed: onBack,
              ),
              trailing: CatchButton(
                key: const ValueKey<String>('host-programme-ids-send'),
                label: l10n.hostProgrammeIdsSend,
                size: CatchButtonSize.sm,
                onPressed: onSendToHotels,
              ),
            ),
            CatchStack(
              direction: CatchStackDirection.row,
              equal: true,
              children: [
                CatchMetricTile.stat(
                  label: l10n.hostProgrammeIdsStaying,
                  value: '${tracker.staying}',
                  mode: CatchMetricTileMode.plain,
                ),
                CatchMetricTile.stat(
                  label: l10n.hostProgrammeIdsIn,
                  value: '${tracker.idsIn}',
                  mode: CatchMetricTileMode.plain,
                ),
                CatchMetricTile.stat(
                  label: l10n.hostProgrammeIdsToCheck,
                  value: '${tracker.toCheck}',
                  mode: CatchMetricTileMode.plain,
                ),
                CatchMetricTile.stat(
                  label: l10n.hostProgrammeIdsMissing,
                  value: '${tracker.missing}',
                  mode: CatchMetricTileMode.plain,
                ),
              ],
            ),
            if (tracker.missing > 0)
              CatchButton(
                key: const ValueKey<String>('host-programme-ids-remind'),
                label: l10n.hostProgrammeIdsRemind(count: tracker.missing),
                variant: CatchButtonVariant.secondary,
                fullWidth: true,
                onPressed: onRemind,
              ),
            if (tracker.hotels.length > 1)
              CatchPageTabBar<String>.segmented(
                selected: tracker.hotelId ?? '',
                label: l10n.hostProgrammeRoomsHotels,
                size: CatchPageTabBarSize.sm,
                onChanged: (id) => onHotel(id.isEmpty ? null : id),
                options: [
                  CatchOption<String>(
                    value: '',
                    label: l10n.hostProgrammeGuestsAll,
                  ),
                  for (final hotel in tracker.hotels)
                    CatchOption<String>(
                      value: hotel.hotelId,
                      label: l10n.hostProgrammeIdsHotelCount(
                        name: hotel.name,
                        count: hotel.staying,
                      ),
                    ),
                ],
              ),
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g6,
              wrap: true,
              children: [
                for (final (value, label, count) in filters)
                  CatchChip.choice(
                    key: ValueKey<String>('host-programme-ids-${value.name}'),
                    label: label,
                    count: count,
                    selected: filter == value,
                    mode: CatchChipMode.single,
                    size: CatchChipSize.sm,
                    onPressed: () => onFilter(value),
                  ),
              ],
            ),
            CatchSection(
              empty: l10n.hostProgrammeIdsEmpty,
              children: [
                for (final row in rows)
                  CatchIndexRow(
                    key: ValueKey<String>('host-programme-id-${row.guestId}'),
                    title: row.displayName,
                    subtitle: [
                      row.hotelName,
                      row.roomLabel,
                    ].whereType<String>().join(' · '),
                    leading: CatchAvatar.system(
                      size: CatchAvatarSize.sm,
                      name: row.displayName,
                    ),
                    badge: hostProgrammeIdBadge(l10n, row),
                    selected: row.guestId == selectedGuestId,
                    onTap: () => onSelect(row),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
    final detail = CatchScrollView(
      primary: false,
      child: CatchPageBody(
        child: selected == null
            ? CatchEmptyState(
                icon: CatchIcons.protected,
                title: l10n.hostProgrammeIdsPick,
              )
            : _HostProgrammeIdDetail(
                row: selected,
                busy: busy,
                onDecide: onDecide,
              ),
      ),
    );
    return CatchPaneLayout(
      pattern: CatchPaneLayoutMode.listDetail,
      detailOpen: selected != null,
      children: [list, detail],
    );
  }
}

class _HostProgrammeIdDetail extends StatelessWidget {
  const _HostProgrammeIdDetail({
    required this.row,
    required this.busy,
    required this.onDecide,
  });

  final ProgramIdTrackerRow row;
  final bool busy;
  final void Function(ProgramIdTrackerRow, ProgramGuestIdDecision) onDecide;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final canDecide = row.status == ProgramGuestIdStatus.submitted && !busy;
    final images = [row.frontUrl, row.backUrl, row.visaUrl].whereType<String>();
    return CatchStack(
      gap: CatchStackGap.g16,
      children: [
        CatchPaneHeader(
          title: row.displayName,
          kicker: row.hotelName,
          trailing: CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            children: [
              CatchButton(
                key: const ValueKey<String>('host-programme-id-accept'),
                label: l10n.hostProgrammeIdsAccept,
                size: CatchButtonSize.sm,
                leading: CatchIcon(CatchIcons.check),
                onPressed: canDecide
                    ? () => onDecide(row, ProgramGuestIdDecision.accept)
                    : null,
              ),
              CatchButton(
                key: const ValueKey<String>('host-programme-id-ask'),
                label: l10n.hostProgrammeIdsAskAgain,
                variant: CatchButtonVariant.secondary,
                size: CatchButtonSize.sm,
                onPressed: canDecide
                    ? () => onDecide(row, ProgramGuestIdDecision.askAgain)
                    : null,
              ),
            ],
          ),
        ),
        CatchIndexRow(
          title: row.displayName,
          subtitle: row.roomLabel == null
              ? null
              : l10n.hostProgrammeIdsRoom(room: row.roomLabel!),
          leading: CatchAvatar.system(
            size: CatchAvatarSize.lg,
            name: row.displayName,
          ),
          badge: hostProgrammeIdBadge(l10n, row),
          onTap: null,
        ),
        if (row.idKind != null)
          CatchSurface(
            child: CatchStack(
              gap: CatchStackGap.g4,
              children: [
                CatchText(
                  l10n.hostProgrammeIdsKindMasked(
                    kind: hostProgrammeIdKindLabel(l10n, row.idKind!),
                  ),
                  variant: CatchTextVariant.labelCode,
                ),
                CatchText(
                  l10n.hostProgrammeIdsMasked(last4: row.numberLast4 ?? '····'),
                  variant: CatchTextVariant.displaySm,
                ),
              ],
            ),
          ),
        if (images.isNotEmpty)
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            equal: true,
            children: [
              for (final url in images)
                CatchNetworkImage(
                  url,
                  aspect: 4 / 3,
                  corner: CatchNetworkImageSize.md,
                  placeholder: CatchNetworkImageColor.tile,
                  semanticLabel: l10n.hostProgrammeIdsImage(
                    name: row.displayName,
                  ),
                ),
            ],
          ),
        CatchSection(
          title: l10n.hostProgrammeIdsChecks,
          children: [
            CatchIndexRow(
              title: row.submittedAt == null
                  ? l10n.hostProgrammeIdsNotSent
                  : l10n.hostProgrammeIdsSentAt(
                      when: AppTimeFormatters.dateTime(row.submittedAt!),
                    ),
              marker: row.submittedAt == null
                  ? CatchIndexRowTone.warning
                  : CatchIndexRowTone.success,
              onTap: null,
            ),
            if (row.status == ProgramGuestIdStatus.askedAgain)
              CatchIndexRow(
                title: l10n.hostProgrammeIdsAskedAgainRow,
                subtitle: row.askAgainNote,
                marker: CatchIndexRowTone.warning,
                onTap: null,
              ),
            if (row.status == ProgramGuestIdStatus.accepted)
              CatchIndexRow(
                title: l10n.hostProgrammeIdsAcceptedRow,
                marker: CatchIndexRowTone.success,
                onTap: null,
              ),
            if (row.isPassport)
              CatchIndexRow(
                title: row.visaUrl == null
                    ? l10n.hostProgrammeIdsNoVisa
                    : l10n.hostProgrammeIdsVisaIn,
                marker: row.visaUrl == null
                    ? CatchIndexRowTone.warning
                    : CatchIndexRowTone.success,
                onTap: null,
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeIdsSeenBy,
          empty: l10n.hostProgrammeIdsSeenByEmpty,
          children: [
            for (final view in row.hotelViews.reversed)
              CatchIndexRow(
                title: view.hotelName ?? l10n.hostProgrammeSetupHotel,
                subtitle: l10n.hostProgrammeIdsFrontDesk,
                value: AppTimeFormatters.dateTime(view.at),
                onTap: null,
              ),
          ],
        ),
        CatchNotice.inline(
          tone: CatchNoticeTone.neutral,
          icon: CatchIcons.protected,
          body: l10n.hostProgrammeIdsPrivacy,
        ),
      ],
    );
  }
}

/// A row's ID status as a badge: To check, Accepted, Missing, Asked again
/// or, for a passport still to check, Passport and visa.
CatchIndexRowBadge hostProgrammeIdBadge(
  AppLocalizations l10n,
  ProgramIdTrackerRow row,
) => switch (row.status) {
  ProgramGuestIdStatus.submitted when row.isPassport => CatchIndexRowBadge(
    label: l10n.hostProgrammeIdsPassportVisa,
    tone: CatchBadgeTone.info,
  ),
  ProgramGuestIdStatus.submitted => CatchIndexRowBadge(
    label: l10n.hostProgrammeIdsToCheck,
    tone: CatchBadgeTone.warning,
  ),
  ProgramGuestIdStatus.accepted => CatchIndexRowBadge(
    label: l10n.hostProgrammeIdsAccepted,
    tone: CatchBadgeTone.success,
  ),
  ProgramGuestIdStatus.missing => CatchIndexRowBadge(
    label: l10n.hostProgrammeIdsMissing,
  ),
  ProgramGuestIdStatus.askedAgain => CatchIndexRowBadge(
    label: l10n.hostProgrammeIdsAskedAgain,
  ),
};

String hostProgrammeIdKindLabel(
  AppLocalizations l10n,
  ProgramGuestIdKind kind,
) => switch (kind) {
  ProgramGuestIdKind.aadhaar => l10n.hostProgrammeIdsAadhaar,
  ProgramGuestIdKind.passport => l10n.hostProgrammeIdsPassport,
  ProgramGuestIdKind.licence => l10n.hostProgrammeIdsLicence,
  ProgramGuestIdKind.voterId => l10n.hostProgrammeIdsVoterId,
};
