import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/insights/parts/host_analytics_metric_tile.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The post-event coach on an event report: the overall score, check-in,
/// intro coverage, guests who picked someone, chats started after a match
/// and host help, then what worked and what to change next time.
///
/// It draws [brief] when the event's scorecard came back, or only
/// [withheld] (the server's line) when fewer guests checked in than the
/// group-size floor. It reads and writes nothing.
class HostEventCoachSection extends StatelessWidget {
  const HostEventCoachSection({super.key, this.brief, this.withheld})
    : assert(
        (brief == null) != (withheld == null),
        'Pass a brief or why it is withheld.',
      );

  final EventSuccessBrief? brief;
  final String? withheld;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final title =
        l10n.eventSuccessEventSuccessFeatureBlocksTitlePostEventHostReport;
    final brief = this.brief;
    if (brief == null) {
      return CatchSection(
        key: const ValueKey<String>('host-event-coach-withheld'),
        title: title,
        children: [
          CatchText(
            withheld ?? '',
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
        ],
      );
    }
    final scorecard = brief.scorecard;
    HostAnalyticsMetricTile tile(String label, double rate) =>
        HostAnalyticsMetricTile(
          label: label,
          value: (rate * 100).round(),
          figure: HostAnalyticsFigure.percent,
        );
    return CatchStack(
      key: const ValueKey<String>('host-event-coach'),
      gap: CatchStackGap.section,
      children: [
        CatchSection(
          title: title,
          children: [
            CatchBadge(
              label: l10n.eventSuccessEventSuccessFeatureBlocksLabelRound(
                round: (scorecard.experienceScore * 100).round(),
              ),
              tone: CatchBadgeTone.brand,
            ),
            CatchStack(
              direction: CatchStackDirection.row,
              equal: true,
              children: [
                tile(
                  l10n.eventSuccessEventSuccessFeatureBlocksLabelCheckIn16e104,
                  scorecard.checkInRate,
                ),
                tile(
                  l10n.eventSuccessEventSuccessFeatureBlocksLabelIntroCoverage,
                  scorecard.introCoverageRate,
                ),
              ],
            ),
            CatchStack(
              direction: CatchStackDirection.row,
              equal: true,
              children: [
                tile(
                  l10n.eventSuccessEventSuccessFeatureBlocksLabelCaughtSomeone,
                  scorecard.caughtSomeoneRate,
                ),
                tile(
                  l10n.eventSuccessEventSuccessFeatureBlocksLabelChatStart,
                  scorecard.chatStartRate,
                ),
              ],
            ),
            CatchStack(
              direction: CatchStackDirection.row,
              equal: true,
              children: [
                tile(
                  l10n.eventSuccessEventSuccessFeatureBlocksLabelHostHelp,
                  scorecard.wingmanRequestRate,
                ),
                const CatchStack(children: []),
              ],
            ),
          ],
        ),
        if (brief.strengths.isNotEmpty)
          CatchSection(
            title: l10n.eventSuccessEventSuccessFeatureBlocksTextWorkingWell,
            children: [
              for (final strength in brief.strengths.take(4))
                CatchIndexRow(title: strength, titleMaxLines: 3, onTap: null),
            ],
          ),
        if (brief.recommendations.isNotEmpty)
          CatchSection(
            title:
                l10n.eventSuccessEventSuccessFeatureBlocksTextImproveNextTime,
            children: [
              for (final recommendation in brief.recommendations.take(4))
                CatchIndexRow(
                  key: ValueKey<String>(
                    'host-event-coach-${recommendation.id}',
                  ),
                  title: recommendation.title,
                  titleMaxLines: 3,
                  body: recommendation.rationale,
                  onTap: null,
                ),
            ],
          ),
      ],
    );
  }
}
