import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/event_success/domain/event_success_conversation_cue.dart';
import 'package:catch_dating_app/event_success/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/event_success/domain/event_success_models.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_conversation_cue_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

part 'event_success_conversation_cue_row.dart';

const EdgeInsets _conversationCueRowGap = EdgeInsets.only(
  bottom: CatchSpacing.s2,
);
const EdgeInsets _conversationCueIconInset = EdgeInsets.only(
  top: CatchSpacing.micro3,
);

class EventSuccessReportSectionList extends StatelessWidget {
  const EventSuccessReportSectionList({super.key, this.brief});

  final EventSuccessBrief? brief;

  @override
  Widget build(BuildContext context) {
    final resolvedBrief = brief ?? EventSuccessFeatureSamples.postEventBrief;
    final scorecard = resolvedBrief.scorecard;

    return CatchSectionList(
      emptyStateOmitted: true,
      children: [
        CatchSection.plain(
          title: context
              .l10n
              .eventSuccessEventSuccessFeatureBlocksTitlePostEventHostReport,
          subtitle: context
              .l10n
              .eventSuccessEventSuccessFeatureBlocksSubtitleAConcreteReportSurface,
          trailing: CatchBadge(
            label: context.l10n.eventSuccessEventSuccessFeatureBlocksLabelRound(
              round: (scorecard.experienceScore * 100).round(),
            ),
            tone: CatchBadgeTone.brand,
          ),
          child: CatchMetricSection.dataQuality(
            metrics: [
              CatchMetricData(
                partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
                missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
                icon: CatchIcons.checkCircleOutlineRounded,
                value: _eventSuccessFeaturePercent(scorecard.checkInRate),
                label: context
                    .l10n
                    .eventSuccessEventSuccessFeatureBlocksLabelCheckIn16e104,
              ),
              CatchMetricData(
                partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
                missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
                icon: CatchIcons.groups2Outlined,
                value: _eventSuccessFeaturePercent(scorecard.introCoverageRate),
                label: context
                    .l10n
                    .eventSuccessEventSuccessFeatureBlocksLabelIntroCoverage,
              ),
              CatchMetricData(
                partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
                missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
                icon: CatchIcons.favoriteOutlineRounded,
                value: _eventSuccessFeaturePercent(scorecard.caughtSomeoneRate),
                label: context
                    .l10n
                    .eventSuccessEventSuccessFeatureBlocksLabelCaughtSomeone,
              ),
              CatchMetricData(
                partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
                missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
                icon: CatchIcons.volunteerActivismOutlined,
                value: _eventSuccessFeaturePercent(
                  scorecard.wingmanRequestRate,
                ),
                label: context
                    .l10n
                    .eventSuccessEventSuccessFeatureBlocksLabelHostHelp,
              ),
              CatchMetricData(
                partialBadgeLabel: context.l10n.hostsHostAnalyticsLabelPartial,
                missingBadgeLabel: context.l10n.hostsHostAnalyticsLabelMissing,
                icon: CatchIcons.chatBubbleOutlineRounded,
                value: _eventSuccessFeaturePercent(scorecard.chatStartRate),
                label: context
                    .l10n
                    .eventSuccessEventSuccessFeatureBlocksLabelChatStart,
              ),
            ],
          ),
        ),
        if (resolvedBrief.strengths.isNotEmpty)
          CatchSection.fieldRows(
            title: context
                .l10n
                .eventSuccessEventSuccessFeatureBlocksTextWorkingWell,
            children: [
              for (final strength in resolvedBrief.strengths.take(4))
                CatchField.read(
                  copy: catchFieldCopy(context.l10n),
                  title: strength,
                  icon: CatchIcons.checkCircleOutlineRounded,
                ),
            ],
          ),
        if (resolvedBrief.recommendations.isNotEmpty)
          CatchSection.fieldRows(
            title: context
                .l10n
                .eventSuccessEventSuccessFeatureBlocksTextImproveNextTime,
            children: [
              for (final recommendation in resolvedBrief.recommendations.take(
                4,
              ))
                EventSuccessRecommendationTile(recommendation: recommendation),
            ],
          ),
      ],
    );
  }
}

String _eventSuccessFeaturePercent(double value) => '${(value * 100).round()}%';

class EventSuccessConversationCueCard extends StatelessWidget {
  const EventSuccessConversationCueCard({
    super.key,
    required this.title,
    required this.cues,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final List<EventSuccessConversationCue> cues;

  @override
  Widget build(BuildContext context) {
    if (cues.isEmpty) return const SizedBox.shrink();

    final t = CatchTokens.of(context);
    final moment = cues.first.moment;
    final icon = switch (moment) {
      EventSuccessConversationCueMoment.live => CatchIcons.forumOutlined,
      EventSuccessConversationCueMoment.postEvent => CatchIcons.chatOutlined,
    };

    return CatchSurface(
      tone: CatchSurfaceTone.raised,
      radius: CatchRadius.sm,
      borderRole: CatchBorderRole.separator,
      padding: CatchInsets.contentDense,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: t.primary),
              const SizedBox(width: CatchSpacing.s3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: CatchSpacing.s2,
                      runSpacing: CatchSpacing.s2,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        CatchText(
                          title,
                          variant: CatchTextVariant.sectionTitle,
                        ),
                        CatchBadge(
                          label: moment.label(context.l10n),
                          tone: moment == EventSuccessConversationCueMoment.live
                              ? CatchBadgeTone.brand
                              : CatchBadgeTone.brand,
                        ),
                      ],
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: CatchSpacing.s1),
                      CatchText(
                        subtitle!,
                        variant: CatchTextVariant.supporting,
                        color: t.ink2,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: CatchSpacing.s3),
          for (final cue in cues.take(3)) ConversationCueRow(cue: cue),
        ],
      ),
    );
  }
}

class EventSuccessRecommendationTile extends StatelessWidget {
  EventSuccessRecommendationTile({
    super.key,
    required this.recommendation,
    IconData? icon,
  }) : icon = icon ?? CatchIcons.tipsAndUpdatesOutlined;

  final EventSuccessRecommendation recommendation;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: CatchField.content(
        copy: catchFieldCopy(context.l10n),
        title: recommendation.title,
        body: recommendation.rationale,
        icon: icon,
      ),
    );
  }
}
