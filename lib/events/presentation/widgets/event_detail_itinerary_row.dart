part of 'event_detail_fact_list.dart';

class ItineraryStep {
  const ItineraryStep({required this.time, required this.title, this.detail});

  final String time;
  final String title;
  final String? detail;
}

class ItineraryRow extends StatelessWidget {
  const ItineraryRow({
    super.key,
    required this.step,
    required this.isLast,
    required this.accent,
    required this.railColor,
    this.titleColor,
    this.detailColor,
    this.dotBackgroundColor,
  });

  final ItineraryStep step;
  final bool isLast;
  final Color accent;
  final Color railColor;
  final Color? titleColor;
  final Color? detailColor;
  final Color? dotBackgroundColor;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: CatchLayout.eventDetailItineraryTimeColumnWidth,
            child: Text(
              step.time,
              style: CatchTextStyles.mono(
                context,
                color: t.ink,
              ).copyWith(fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
          SizedBox(
            width: CatchLayout.eventDetailItineraryRailColumnWidth,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.only(
                    top: CatchLayout.eventDetailItineraryDotTopInset,
                  ),
                  child: CatchSurface(
                    width: CatchLayout.eventDetailItineraryDotExtent,
                    height: CatchLayout.eventDetailItineraryDotExtent,
                    radius: CatchRadius.pill,
                    backgroundColor: dotBackgroundColor ?? t.surface,
                    borderSpec: CatchBorder.resolve(
                      t,
                      CatchBorderRole.selected,
                      color: accent,
                    ),
                    child: const SizedBox.shrink(),
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        vertical:
                            CatchLayout.eventDetailItineraryRailVerticalInset,
                      ),
                      child: SizedBox(
                        width: CatchStroke.underline,
                        child: ColoredBox(color: railColor),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          gapW8,
          Expanded(
            child: Padding(
              padding: CatchInsets.eventItineraryStep(isLast: isLast),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    step.title,
                    style: CatchTextStyles.fieldRowTitle(
                      context,
                      color: titleColor,
                    ),
                  ),
                  if (step.detail case final detail?) ...[
                    const SizedBox(height: CatchSpacing.micro2),
                    CatchText(
                      detail,
                      variant: CatchTextVariant.supporting,
                      color: detailColor,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
