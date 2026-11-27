import 'package:catch_dating_app/hosts/organizer/audience_state.dart';
import 'package:catch_dating_app/hosts/organizer/host_count_formatters.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// All time and the audience, in board order: members, rating, events
/// hosted and upcoming; then contacts, past and repeat guests and imports;
/// then how many each channel reaches. A summary that cannot be read says
/// so with Try again.
class OrganizerAudienceBody extends StatelessWidget {
  const OrganizerAudienceBody({
    super.key,
    required this.state,
    required this.onRetry,
  });

  final OrganizerAudienceState state;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final organizer = state.organizer;
    final summary = state.summary;
    String count(int? value) =>
        value == null ? '—' : HostCountFormatters.compact(value);
    final allTime = <(String, String)>[
      (
        l10n.hostsHostOrganizerLabelMembers,
        HostCountFormatters.compact(organizer.memberCount),
      ),
      (
        organizer.reviewCount > 0
            ? l10n.hostsHostOrganizerLabelRatingReviewcountReviews(
                reviewCount: organizer.reviewCount,
              )
            : l10n.hostsHostOrganizerLabelRating,
        state.rating,
      ),
      (l10n.hostsHostOrganizerLabelEventsHosted, count(state.eventCount)),
      (l10n.hostsHostOrganizerLabelUpcoming, count(state.upcomingCount)),
    ];
    final crm = <(String, String)>[
      (l10n.hostsHostOrganizerCrmContacts, count(summary?.contactCount)),
      (
        l10n.hostsHostOrganizerCrmPastAttendees,
        count(summary?.pastAttendeeCount),
      ),
      (
        l10n.hostsHostOrganizerCrmRepeatAttendees,
        count(summary?.repeatAttendeeCount),
      ),
      (
        l10n.hostsHostOrganizerCrmImportedContacts,
        count(summary?.importedContactCount),
      ),
    ];
    return CatchPageBody.screen(
      children: [
        CatchSection(
          key: const ValueKey<String>('audience-all-time'),
          title: l10n.hostsHostAnalyticsLabelAllTime,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchStack(
              children: [
                for (final row in _rowsOfTwo(allTime))
                  CatchStack(
                    direction: CatchStackDirection.row,
                    equal: true,
                    children: [
                      for (final (label, value) in row)
                        CatchMetricTile.stat(label: label, value: value),
                    ],
                  ),
              ],
            ),
          ],
        ),
        CatchSection(
          key: const ValueKey<String>('audience-summary'),
          title: l10n.hostsHostOrganizerCrmTitle,
          dividers: CatchSectionPlacement.none,
          children: [
            switch (state.audienceStatus) {
              OrganizerAudienceStatus.loading => CatchText(
                l10n.hostsHostOrganizerCrmLoading,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
              OrganizerAudienceStatus.unavailable => CatchNotice.inline(
                tone: CatchNoticeTone.neutral,
                body: l10n.hostsHostOrganizerCrmUnavailable,
                action: CatchNoticeAction(
                  label: l10n.sharedActionTryAgain,
                  onPressed: onRetry,
                ),
              ),
              OrganizerAudienceStatus.content => CatchStack(
                children: [
                  for (final row in _rowsOfTwo(crm))
                    CatchStack(
                      direction: CatchStackDirection.row,
                      equal: true,
                      children: [
                        for (final (label, value) in row)
                          CatchMetricTile.stat(label: label, value: value),
                      ],
                    ),
                ],
              ),
            },
            if (summary != null && summary.truncated)
              CatchText(
                l10n.hostsHostOrganizerCrmTruncated,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
          ],
        ),
        if (summary != null &&
            state.audienceStatus == OrganizerAudienceStatus.content)
          CatchSection(
            key: const ValueKey<String>('audience-channels'),
            title: l10n.hostsHostOrganizerCrmChannels,
            children: [
              for (final (title, value, note) in [
                (
                  l10n.hostsHostOrganizerCrmCatchApp,
                  l10n.hostsHostOrganizerCrmLinked(
                    count: summary.linkedAccountCount,
                  ),
                  l10n.hostsHostOrganizerCrmCurrentEventLive,
                ),
                (
                  l10n.hostsHostOrganizerCrmWhatsapp,
                  l10n.hostsHostOrganizerCrmOptedIn(
                    count: summary.whatsappOptInCount,
                  ),
                  l10n.hostsHostOrganizerCrmWhatsappSetup,
                ),
                (
                  l10n.hostsHostOrganizerCrmTextMessage,
                  l10n.hostsHostOrganizerCrmOptedIn(
                    count: summary.smsOptInCount,
                  ),
                  l10n.hostsHostOrganizerCrmSmsSetup,
                ),
              ])
                CatchIndexRow(
                  title: title,
                  subtitle: note,
                  value: value,
                  density: CatchIndexRowSize.regular,
                  onTap: null,
                ),
            ],
          ),
      ],
    );
  }
}

/// Splits [tiles] into rows of two for the stat grid; an odd last tile sits
/// alone in its row.
List<List<(String, String)>> _rowsOfTwo(List<(String, String)> tiles) => [
  for (var start = 0; start < tiles.length; start += 2)
    tiles.skip(start).take(2).toList(),
];
