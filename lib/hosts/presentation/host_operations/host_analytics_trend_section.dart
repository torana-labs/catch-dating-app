part of '../host_operations_screen.dart';

class HostAnalyticsTrendSection extends StatefulWidget {
  const HostAnalyticsTrendSection({
    super.key,
    required this.points,
    required this.granularity,
  });

  final List<HostAnalyticsTrendPoint> points;
  final HostAnalyticsGranularity granularity;

  @override
  State<HostAnalyticsTrendSection> createState() =>
      _HostAnalyticsTrendSectionState();
}

class _HostAnalyticsTrendSectionState extends State<HostAnalyticsTrendSection> {
  int? _selectedIndex;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final maxValue = widget.points.fold<num>(0, (max, point) {
      final demand = point.metrics[HostAnalyticsTrendKeys.demand] ?? 0;
      final bookings = point.metrics[HostAnalyticsTrendKeys.bookings] ?? 0;
      return math.max(max, math.max(demand, bookings));
    });
    final selectedPoint =
        _selectedIndex == null || _selectedIndex! >= widget.points.length
        ? null
        : widget.points[_selectedIndex!];

    return CatchSection.content(
      title: context.l10n.hostsHostAnalyticsLabelTrendBookingsVsDemand,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              for (final entry in <(Color, String)>[
                (t.primarySoft, context.l10n.hostsHostAnalyticsLabelDemand),
                (t.ink, context.l10n.hostsHostAnalyticsLabelBookings),
              ].indexed) ...[
                if (entry.$1 > 0) gapW16,
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Material(
                      color: entry.$2.$1,
                      borderRadius: BorderRadius.circular(CatchRadius.xs),
                      child: const SizedBox(
                        width: CatchSpacing.s3,
                        height: CatchSpacing.s2,
                      ),
                    ),
                    gapW6,
                    CatchText(
                      entry.$2.$2,
                      variant: CatchTextVariant.supporting,
                      color: t.ink2,
                    ),
                  ],
                ),
              ],
            ],
          ),
          gapH16,
          if (widget.points.isEmpty)
            CatchText(
              context.l10n.hostsHostAnalyticsTextNoAnalyticsInThisRange,
              variant: CatchTextVariant.supporting,
              color: t.ink2,
            )
          else
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  for (final indexed in widget.points.indexed) ...[
                    if (indexed.$1 > 0) gapW12,
                    HostAnalyticsBarTile(
                      key: ValueKey<String>(
                        'host-analytics-trend-${indexed.$2.periodStart.toIso8601String()}',
                      ),
                      point: indexed.$2,
                      maxValue: maxValue,
                      label: _trendBucketLabel(
                        indexed.$2.periodStart,
                        widget.granularity,
                        indexed.$1,
                      ),
                      selected: indexed.$1 == _selectedIndex,
                      onTap: () => setState(() => _selectedIndex = indexed.$1),
                    ),
                  ],
                ],
              ),
            ),
          if (selectedPoint != null) ...[
            gapH12,
            CatchText(
              context.l10n.hostsHostAnalyticsTextPeriodDemandBookings(
                period: _trendDetailPeriod(
                  selectedPoint.periodStart,
                  widget.granularity,
                ),
                demand:
                    selectedPoint.metrics[HostAnalyticsTrendKeys.demand]
                        ?.round() ??
                    0,
                bookings:
                    selectedPoint.metrics[HostAnalyticsTrendKeys.bookings]
                        ?.round() ??
                    0,
              ),
              key: const ValueKey('host-analytics-trend-detail'),
              variant: CatchTextVariant.supporting,
              color: t.ink2,
            ),
          ],
        ],
      ),
    );
  }
}

class HostAnalyticsBarTile extends StatelessWidget {
  const HostAnalyticsBarTile({
    super.key,
    required this.point,
    required this.maxValue,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final HostAnalyticsTrendPoint point;
  final num maxValue;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final demand = point.metrics[HostAnalyticsTrendKeys.demand] ?? 0;
    final bookings = point.metrics[HostAnalyticsTrendKeys.bookings] ?? 0;
    double heightFor(num value) => maxValue <= 0
        ? 0
        : CatchLayout.analyticsTrendHeight * (value / maxValue).clamp(0, 1);

    return Semantics(
      button: true,
      selected: selected,
      label: context.l10n.hostsHostAnalyticsTextPeriodDemandBookings(
        period: label,
        demand: demand.round(),
        bookings: bookings.round(),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(CatchRadius.sm),
        child: Padding(
          padding: CatchInsets.inlineHorizontalTight,
          child: Column(
            children: [
              SizedBox(
                width: CatchSpacing.s6,
                height: CatchLayout.analyticsTrendHeight,
                child: Stack(
                  alignment: Alignment.bottomCenter,
                  children: [
                    TweenAnimationBuilder<double>(
                      duration: CatchMotion.fast,
                      tween: Tween(
                        begin: 0,
                        end: math.max(CatchSpacing.micro2, heightFor(demand)),
                      ),
                      builder: (_, height, child) => SizedBox(
                        width: CatchSpacing.s6,
                        height: height,
                        child: child,
                      ),
                      child: Material(
                        color: t.primarySoft,
                        borderRadius: BorderRadius.circular(CatchRadius.xs),
                      ),
                    ),
                    TweenAnimationBuilder<double>(
                      duration: CatchMotion.fast,
                      tween: Tween(
                        begin: 0,
                        end: math.max(CatchSpacing.micro2, heightFor(bookings)),
                      ),
                      builder: (_, height, child) => SizedBox(
                        width: CatchSpacing.s3,
                        height: height,
                        child: child,
                      ),
                      child: Material(
                        color: t.ink,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(CatchRadius.xs),
                          side: selected
                              ? BorderSide(color: t.primary)
                              : BorderSide.none,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              gapH6,
              SizedBox(
                width: CatchSpacing.s8,
                child: CatchText(
                  label,
                  maxLines: 1,
                  textAlign: TextAlign.center,

                  variant: CatchTextVariant.supporting,
                  color: t.ink3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
