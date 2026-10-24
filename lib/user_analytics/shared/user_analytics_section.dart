import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/user_analytics/data/user_analytics_repository.dart';
import 'package:catch_dating_app/user_analytics/shared/user_analytics_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class UserAnalyticsSection extends ConsumerStatefulWidget {
  const UserAnalyticsSection({super.key, this.showSectionTitle = true});

  final bool showSectionTitle;

  @override
  ConsumerState<UserAnalyticsSection> createState() =>
      _UserAnalyticsSectionState();
}

class _UserAnalyticsSectionState extends ConsumerState<UserAnalyticsSection> {
  var _rangePreset = UserAnalyticsRangePreset.thirtyDays;

  @override
  Widget build(BuildContext context) {
    final query = UserAnalyticsQuery(rangePreset: _rangePreset);
    final reportAsync = ref.watch(userAnalyticsProvider(query));

    return CatchSection.divided(
      title: widget.showSectionTitle
          ? UserAnalyticsCopy.sectionTitle(context.l10n)
          : null,
      first: !widget.showSectionTitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchField<UserAnalyticsRangePreset>.select(
            copy: catchFieldCopy(context.l10n),
            title: UserAnalyticsCopy.rangeTitle(context.l10n),
            contract: CatchContractConstraints
                .userAnalyticsQueryCallablePayloadRangePreset,
            contractValueBuilder: (value) => value.wireValue,
            values: UserAnalyticsRangePreset.values
                .where((preset) => preset != UserAnalyticsRangePreset.custom)
                .toList(growable: false),
            value: _rangePreset,
            itemLabelBuilder: (preset) =>
                UserAnalyticsCopy.rangeLabel(context.l10n, preset),
            leading: Icon(CatchIcons.calendarMonthOutlined),
            onChanged: (preset) {
              if (preset == null) return;
              setState(() => _rangePreset = preset);
            },
          ),
          gapH16,
          reportAsync.when(
            loading: () => Semantics(
              label: UserAnalyticsCopy.loadingLabel(context.l10n),
              child: const UserAnalyticsReportSkeleton(),
            ),
            error: (error, _) => CatchLocalizedErrorState(
              error,
              context: AppErrorContext.profile,
              onRetry: () => ref.invalidate(userAnalyticsProvider(query)),
            ),
            data: (report) => UserAnalyticsReportBody(report: report),
          ),
        ],
      ),
    );
  }
}

class UserAnalyticsReportBody extends StatelessWidget {
  const UserAnalyticsReportBody({super.key, required this.report});

  final UserAnalyticsReport report;

  @override
  Widget build(BuildContext context) {
    if (report.summaryCards.every(
      (metric) => metric.status == UserAnalyticsMetricStatus.missing,
    )) {
      return const UserAnalyticsEmptyState();
    }

    return CatchSectionList.inset(
      emptyStateOmitted: true,
      padding: EdgeInsets.zero,
      children: [
        CatchSection.divided(
          first: true,
          child: CatchMetricSection.dataQuality(
            metrics: [
              for (final metric in report.summaryCards)
                _userMetricCardData(metric, context.l10n),
            ],
            maxItems: 6,
          ),
        ),
        UserAnalyticsTrendSection(points: report.trend),
        if (report.coachingTipRefs.isNotEmpty)
          UserAnalyticsTipsSection(tips: report.coachingTipRefs),
        UserAnalyticsDataCoverageSection(rows: report.dataQuality),
      ],
    );
  }
}

class UserAnalyticsEmptyState extends StatelessWidget {
  const UserAnalyticsEmptyState({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      padding: CatchInsets.content,
      borderRole: CatchBorderRole.separator,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(CatchIcons.autoGraphRounded, color: t.ink2),
          const SizedBox(width: CatchSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  UserAnalyticsCopy.emptyTitle(context.l10n),
                  style: CatchTextStyles.labelL(context, color: t.ink),
                ),
                gapH6,
                CatchText(
                  UserAnalyticsCopy.emptyBody(context.l10n),
                  variant: CatchTextVariant.supporting,
                  color: t.ink2,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class UserAnalyticsReportSkeleton extends StatelessWidget {
  const UserAnalyticsReportSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return CatchSectionList.inset(
      emptyStateOmitted: true,
      padding: EdgeInsets.zero,
      children: [
        CatchSection.divided(
          first: true,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final itemWidth = (constraints.maxWidth - CatchSpacing.s3) / 2;
              return Wrap(
                spacing: CatchSpacing.s3,
                runSpacing: CatchSpacing.s3,
                children: [
                  for (var index = 0; index < 4; index++)
                    SizedBox(
                      width: itemWidth,
                      child: CatchSurface(
                        padding: CatchInsets.content,
                        borderRole: CatchBorderRole.separator,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CatchSkeleton.box(
                                  width: CatchIcon.sm,
                                  height: CatchIcon.sm,
                                ),
                                const Spacer(),
                                CatchSkeleton.box(
                                  width: CatchSpacing.s8,
                                  height: CatchIcon.sm,
                                  radius: CatchRadius.pill,
                                ),
                              ],
                            ),
                            gapH12,
                            CatchSkeleton.text(
                              width: index.isEven
                                  ? CatchLayout.skeletonTextShortWidth
                                  : CatchLayout.skeletonTextTitleWidth,
                            ),
                            gapH8,
                            CatchSkeleton.text(
                              width: CatchLayout.skeletonTextShortWidth,
                            ),
                            gapH8,
                            CatchSkeleton.textBlock(lines: 2),
                          ],
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
        CatchSection.divided(
          title: UserAnalyticsCopy.trendTitle(context.l10n),
          child: CatchSurface(
            padding: CatchInsets.content,
            borderRole: CatchBorderRole.separator,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: CatchSkeleton.textBlock(lines: 2)),
                    gapW16,
                    Expanded(child: CatchSkeleton.textBlock(lines: 2)),
                  ],
                ),
                gapH16,
                SizedBox(
                  height: CatchSpacing.s16,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      for (var index = 0; index < 12; index++) ...[
                        if (index > 0)
                          const SizedBox(width: CatchSpacing.micro6),
                        Expanded(
                          child: Align(
                            alignment: Alignment.bottomCenter,
                            child: FractionallySizedBox(
                              heightFactor: 0.2 + ((index % 5) * 0.15),
                              child: CatchSkeleton.box(height: double.infinity),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        CatchSection.fieldRows(
          title: UserAnalyticsCopy.tipsTitle(context.l10n),
          children: [
            for (var index = 0; index < 2; index++)
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: CatchFieldTokens.rowHorizontalPadding,
                  vertical: CatchFieldTokens.rowVerticalPadding,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CatchSkeleton.box(
                      width: CatchIcon.sm,
                      height: CatchIcon.sm,
                    ),
                    gapW12,
                    Expanded(child: CatchSkeleton.textBlock(lines: 2)),
                  ],
                ),
              ),
          ],
        ),
        CatchSection.fieldRows(
          title: UserAnalyticsCopy.dataQualityTitle(context.l10n),
          children: [
            for (var index = 0; index < 2; index++)
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: CatchFieldTokens.rowHorizontalPadding,
                  vertical: CatchFieldTokens.rowVerticalPadding,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CatchSkeleton.box(
                      width: CatchIcon.md,
                      height: CatchIcon.md,
                    ),
                    gapW12,
                    Expanded(child: CatchSkeleton.textBlock(lines: 2)),
                  ],
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class UserAnalyticsTrendSection extends StatelessWidget {
  const UserAnalyticsTrendSection({super.key, required this.points});

  final List<UserAnalyticsTrendPoint> points;

  @override
  Widget build(BuildContext context) {
    final maxCaughtYou = points.fold<num>(0, (max, point) {
      final value = point.metrics['caughtYou'] ?? 0;
      return value > max ? value : max;
    });
    final totalCaughtYou = points.fold<num>(
      0,
      (sum, point) => sum + (point.metrics['caughtYou'] ?? 0),
    );
    final totalMatches = points.fold<num>(
      0,
      (sum, point) => sum + (point.metrics['mutualCatches'] ?? 0),
    );

    return CatchSection.divided(
      title: UserAnalyticsCopy.trendTitle(context.l10n),
      child: CatchSurface(
        padding: CatchInsets.content,
        borderRole: CatchBorderRole.separator,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: CatchMetricTile(
                    label: UserAnalyticsCopy.trendMetricLabel(
                      context.l10n,
                      'caughtYou',
                    ),
                    value: _formatCount(totalCaughtYou),
                  ),
                ),
                Expanded(
                  child: CatchMetricTile(
                    label: UserAnalyticsCopy.trendMetricLabel(
                      context.l10n,
                      'mutualCatches',
                    ),
                    value: _formatCount(totalMatches),
                  ),
                ),
              ],
            ),
            gapH16,
            SizedBox(
              height: CatchSpacing.s16,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  for (final point in points.take(18)) ...[
                    if (point != points.first)
                      const SizedBox(width: CatchSpacing.micro6),
                    Expanded(
                      child: CatchBarIndicator(
                        value: point.metrics['caughtYou'] ?? 0,
                        maxValue: maxCaughtYou,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class UserAnalyticsTipsSection extends StatelessWidget {
  const UserAnalyticsTipsSection({super.key, required this.tips});

  final List<UserAnalyticsCoachingTipRef> tips;

  @override
  Widget build(BuildContext context) {
    return CatchSection.fieldRows(
      title: UserAnalyticsCopy.tipsTitle(context.l10n),
      children: [for (final tip in tips) UserAnalyticsTipRow(tip: tip)],
    );
  }
}

class UserAnalyticsTipRow extends StatelessWidget {
  const UserAnalyticsTipRow({super.key, required this.tip});

  final UserAnalyticsCoachingTipRef tip;

  @override
  Widget build(BuildContext context) {
    final copy = UserAnalyticsCopy.tip(context.l10n, tip.copyKey);
    return CatchField.content(
      copy: catchFieldCopy(context.l10n),
      icon: CatchIcons.sparkle,
      iconColor: CatchTokens.of(context).ink2,
      title: copy.title,
      body: copy.body,
    );
  }
}

class UserAnalyticsDataCoverageSection extends StatelessWidget {
  const UserAnalyticsDataCoverageSection({super.key, required this.rows});

  final List<UserAnalyticsDataQuality> rows;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSection.fieldRows(
      title: UserAnalyticsCopy.dataQualityTitle(context.l10n),
      children: [
        for (final row in rows)
          CatchField.content(
            copy: catchFieldCopy(context.l10n),
            icon: switch (row.state) {
              UserAnalyticsDataQualityState.ok =>
                CatchIcons.checkCircleOutlineRounded,
              UserAnalyticsDataQualityState.partial =>
                CatchIcons.warningAmberRounded,
              UserAnalyticsDataQualityState.missing =>
                CatchIcons.errorOutlineRounded,
            },
            iconColor: switch (row.state) {
              UserAnalyticsDataQualityState.ok => t.success,
              UserAnalyticsDataQualityState.partial => t.warning,
              UserAnalyticsDataQualityState.missing => t.danger,
            },
            title: UserAnalyticsCopy.dataQualityLabel(
              context.l10n,
              row.id,
              state: row.state,
            ),
            body: row.detail,
          ),
      ],
    );
  }
}

IconData _metricIcon(String id) => switch (id) {
  'profileViews' => CatchIcons.eye,
  'caughtYou' => CatchIcons.favoriteOutline,
  'mutualCatches' => CatchIcons.sparkle,
  'chatsStarted' => CatchIcons.chatCircle,
  'eventsAttended' => CatchIcons.eventAvailableOutlined,
  'followThroughRate' => CatchIcons.autoGraphRounded,
  _ => CatchIcons.autoGraphRounded,
};

CatchMetricData _userMetricCardData(
  UserAnalyticsMetricCard metric,
  AppLocalizations l10n,
) {
  return CatchMetricData(
    icon: _metricIcon(metric.id),
    value: _formatMetricValue(metric),
    label: UserAnalyticsCopy.metricLabel(
      l10n,
      metric.id,
      fallback: metric.label,
    ),
    caption: UserAnalyticsCopy.metricCaption(
      l10n,
      metric.id,
      fallback: metric.caption,
    ),
    status: switch (metric.status) {
      UserAnalyticsMetricStatus.ready => CatchMetricDataStatus.ready,
      UserAnalyticsMetricStatus.partial => CatchMetricDataStatus.partial,
      UserAnalyticsMetricStatus.missing => CatchMetricDataStatus.missing,
    },
    partialBadgeLabel: _userAnalyticsPartialBadgeLabel(l10n),
    missingBadgeLabel: _userAnalyticsMissingBadgeLabel(l10n),
  );
}

String _userAnalyticsPartialBadgeLabel(AppLocalizations l10n) =>
    UserAnalyticsCopy.partialBadge(l10n);

String _userAnalyticsMissingBadgeLabel(AppLocalizations l10n) =>
    UserAnalyticsCopy.missingBadge(l10n);

String _formatMetricValue(UserAnalyticsMetricCard metric) {
  return switch (metric.unit) {
    UserAnalyticsMetricUnit.percent => '${_formatCount(metric.value)}%',
    UserAnalyticsMetricUnit.durationSeconds => _formatDuration(metric.value),
    UserAnalyticsMetricUnit.count => _formatCount(metric.value),
  };
}

String _formatCount(num value) {
  final rounded = value.round();
  if (rounded >= 1000000) {
    return '${(rounded / 1000000).toStringAsFixed(1)}M';
  }
  if (rounded >= 10000) {
    return '${(rounded / 1000).toStringAsFixed(1)}K';
  }
  return rounded.toString();
}

String _formatDuration(num seconds) {
  final rounded = seconds.round();
  if (rounded < 60) return '${rounded}s';
  return '${(rounded / 60).round()}m';
}
