import 'package:catch_dating_app/contexts/insights/parts/host_analytics_metric_tile.dart';
import 'package:catch_dating_app/contexts/organizers/parts/organizer_page_tile.dart';
import 'package:catch_dating_app/contexts/payments/parts/host_organizer_bill_row.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The Organiser tab in board order: Your page, Last 30 days, Running the
/// organizer and You.
class OrganizerBody extends StatelessWidget {
  const OrganizerBody({super.key, required this.state, required this.onAction});

  final OrganizerState state;
  final ValueChanged<OrganizerAction> onAction;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final locale = Localizations.localeOf(context).toLanguageTag();
    final billMinor = state.billMinor;
    final currency = state.billCurrencyCode;
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      children: [
        CatchSection(
          title: l10n.hostOrganizerYourPageTitle,
          dividers: CatchSectionPlacement.none,
          children: [
            OrganizerPageTile(
              live: state.pageLive,
              link: state.pageLink,
              onEdit: () => onAction(OrganizerAction.editPage),
              onView: () => onAction(OrganizerAction.viewPage),
              onShare: state.pageLink == null
                  ? null
                  : () => onAction(OrganizerAction.sharePage),
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostOrganizerLastThirtyDaysTitle,
          action: CatchSectionAction(
            label: l10n.hostOrganizerAllInsights,
            onPressed: () => onAction(OrganizerAction.insights),
          ),
          dividers: CatchSectionPlacement.none,
          children: [
            if (state.statsPending)
              const CatchSkeleton.content(child: _OrganizerStatGrid.loading())
            else
              _OrganizerStatGrid(stats: state.stats),
          ],
        ),
        CatchSection(
          title: l10n.hostOrganizerRunningTitle(name: state.organizer.name),
          children: [
            CatchIndexRow(
              key: const ValueKey<String>('organizer-row-payments'),
              title: l10n.hostOrganizerRowPayments,
              subtitle: l10n.hostOrganizerRowPaymentsNote,
              value: billMinor == null || currency == null
                  ? null
                  : hostOrganizerMoney(
                      locale,
                      currency,
                    ).format(billMinor / 100),
              density: CatchIndexRowSize.regular,
              chevron: true,
              onTap: () => onAction(OrganizerAction.payments),
            ),
            CatchIndexRow(
              key: const ValueKey<String>('organizer-row-team'),
              title: l10n.hostOrganizerRowTeam,
              subtitle: l10n.hostOrganizerRowTeamNote,
              value: l10n.hostOrganizerRowTeamCount(count: state.teamCount),
              density: CatchIndexRowSize.regular,
              chevron: true,
              onTap: () => onAction(OrganizerAction.team),
            ),
            CatchIndexRow(
              key: const ValueKey<String>('organizer-row-memberships'),
              title: l10n.hostOrganizerRowMemberships,
              subtitle: l10n.hostOrganizerRowMembershipsNote,
              density: CatchIndexRowSize.regular,
              chevron: true,
              onTap: () => onAction(OrganizerAction.memberships),
            ),
            CatchIndexRow(
              key: const ValueKey<String>('organizer-row-defaults'),
              title: l10n.hostOrganizerRowDefaults,
              subtitle: l10n.hostOrganizerRowDefaultsNote,
              density: CatchIndexRowSize.regular,
              chevron: true,
              onTap: () => onAction(OrganizerAction.eventDefaults),
            ),
            CatchIndexRow(
              key: const ValueKey<String>('organizer-row-rehearse'),
              title: l10n.hostOrganizerRowRehearse,
              subtitle: l10n.hostOrganizerRowRehearseNote,
              density: CatchIndexRowSize.regular,
              chevron: true,
              onTap: () => onAction(OrganizerAction.rehearse),
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostOrganizerYouTitle,
          children: [
            CatchIndexRow(
              key: const ValueKey<String>('organizer-row-settings'),
              title: l10n.hostOrganizerRowSettings,
              subtitle: l10n.hostOrganizerRowSettingsNote,
              value: state.accountName,
              density: CatchIndexRowSize.regular,
              chevron: true,
              onTap: () => onAction(OrganizerAction.settings),
            ),
            if (state.helpAvailable)
              CatchIndexRow(
                key: const ValueKey<String>('organizer-row-help'),
                title: l10n.hostOrganizerRowHelp,
                subtitle: l10n.hostOrganizerRowHelpNote,
                density: CatchIndexRowSize.regular,
                chevron: true,
                onTap: () => onAction(OrganizerAction.help),
              ),
          ],
        ),
      ],
    );
  }
}

/// The stats two to a row in equal widths.
class _OrganizerStatGrid extends StatelessWidget {
  const _OrganizerStatGrid({required this.stats});

  const _OrganizerStatGrid.loading()
    : stats = const [
        OrganizerStat(kind: OrganizerStatKind.bookings, value: 0),
        OrganizerStat(kind: OrganizerStatKind.ticketSales, value: 0),
        OrganizerStat(kind: OrganizerStatKind.followers, value: 0),
        OrganizerStat(kind: OrganizerStatKind.pageVisits, value: 0),
      ];

  final List<OrganizerStat> stats;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchStack(
      children: [
        for (var start = 0; start < stats.length; start += 2)
          CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            children: [
              for (final stat in stats.skip(start).take(2))
                HostAnalyticsMetricTile(
                  label: switch (stat.kind) {
                    OrganizerStatKind.bookings =>
                      l10n.hostOrganizerStatBookings,
                    OrganizerStatKind.ticketSales =>
                      l10n.hostOrganizerStatTicketSales,
                    OrganizerStatKind.followers =>
                      l10n.hostOrganizerStatFollowers,
                    OrganizerStatKind.pageVisits =>
                      l10n.hostOrganizerStatPageVisits,
                  },
                  value: stat.value,
                  previousValue: stat.previousValue,
                  currencyCode: stat.currencyCode,
                ),
              if (stats.length - start == 1) const CatchStack(children: []),
            ],
          ),
      ],
    );
  }
}
