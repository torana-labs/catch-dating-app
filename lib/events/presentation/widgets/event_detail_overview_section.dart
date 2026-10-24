import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/events/presentation/event_detail_information_state.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_fact_list.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_route_section.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_surface_style.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventDetailOverviewSection extends StatelessWidget {
  const EventDetailOverviewSection({
    super.key,
    required this.event,
    required this.informationState,
    this.onLocationTap,
    this.surfaceStyle,
    this.enableMapNetworkTiles = true,
  });

  final Event event;
  final EventDetailInformationState informationState;
  final VoidCallback? onLocationTap;
  final EventDetailSurfaceStyle? surfaceStyle;
  final bool enableMapNetworkTiles;

  @override
  Widget build(BuildContext context) {
    final description = event.description.trim();
    final style = surfaceStyle;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (description.isNotEmpty)
          CatchSection.divided(
            title: context.l10n.eventsEventDetailOverviewSectionTitleThePlan,
            titleColor: ActivityPalette.resolve(
              context,
              event.activityKind,
            ).accent,
            first: true,
            dividerColor: style?.dividerColor,
            child: EventDescriptionSection(
              description: description,
              surfaceStyle: style,
            ),
          ),
        CatchSection.divided(
          title: context
              .l10n
              .eventsEventDetailOverviewSectionTitleWhyYouMightClick,
          dividerColor: style?.dividerColor,
          titleColor: style?.headingColor,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              EventDetailHintList(
                event: event,
                textColor: style?.headingColor,
                dividerColor: style?.dividerColor,
              ),
              gapH12,
              CatchText(
                context
                    .l10n
                    .eventsEventDetailOverviewSectionTextBasedOnEventFormat,
                variant: CatchTextVariant.supporting,
                color: style?.bodyColor,
              ),
            ],
          ),
        ),
        if (event.eventFormat.routePlan case final plan?)
          EventDetailRouteSection(plan: plan),
        if (event.itinerary.isNotEmpty)
          CatchSection.divided(
            title: context.l10n.eventsEventDetailOverviewSectionTitleItinerary,
            dividerColor: style?.dividerColor,
            titleColor: style?.headingColor,
            child: EventDetailItineraryList(
              event: event,
              titleColor: style?.headingColor,
              detailColor: style?.bodyColor,
              dotBackgroundColor: style?.surfaceBackground,
            ),
          ),
        if (event.eventPhotos.isNotEmpty)
          CatchSection.divided(
            title: context.l10n.eventsEventDetailOverviewSectionTitlePhotos,
            dividerColor: style?.dividerColor,
            titleColor: style?.headingColor,
            child: EventDetailPhotoGrid(event: event),
          ),
        CatchSection.divided(
          title: context.l10n.eventsEventDetailOverviewSectionTitleWhere,
          dividerColor: style?.dividerColor,
          titleColor: style?.headingColor,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (event.effectiveMeetingLocation?.address?.trim()
                  case final address? when address.isNotEmpty) ...[
                CatchText(
                  address,
                  variant: CatchTextVariant.supporting,
                  color: style?.bodyColor,
                ),
                gapH8,
              ],
              EventDetailMapCard(
                key: ValueKey<String>('event-detail-map-${event.id}'),
                event: event,
                onTap: onLocationTap,
                borderColor: style?.borderColor,
                enableNetworkTiles: enableMapNetworkTiles,
              ),
            ],
          ),
        ),
        CatchSection.divided(
          title:
              context.l10n.eventsEventDetailOverviewSectionTitleHowSignUpsWork,
          dividerColor: style?.dividerColor,
          titleColor: style?.headingColor,
          child: EventDetailMechanismList(
            rows: informationState.signUpRows,
            activityKind: informationState.activityKind,
            dividerColor: style?.dividerColor,
            titleColor: style?.headingColor,
            bodyColor: style?.bodyColor,
          ),
        ),
        CatchSection.divided(
          title: context.l10n.eventsEventDetailOverviewSectionTitleGoodToKnow,
          dividerColor: style?.dividerColor,
          titleColor: style?.headingColor,
          child: EventDetailGoodToKnowList(
            rows: informationState.goodToKnowRows,
            activityKind: informationState.activityKind,
            dividerColor: style?.dividerColor,
            titleColor: style?.headingColor,
            bodyColor: style?.bodyColor,
          ),
        ),
      ],
    );
  }
}

class EventDescriptionSection extends StatelessWidget {
  const EventDescriptionSection({
    super.key,
    required this.description,
    this.surfaceStyle,
  });

  final String description;
  final EventDetailSurfaceStyle? surfaceStyle;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchText(
          context.l10n.eventsEventDetailOverviewSectionTextAboutThisEvent,
          variant: CatchTextVariant.sectionTitle,
          color: surfaceStyle?.headingColor,
        ),
        const SizedBox(height: CatchLayout.detailScreenSupportingGap),
        CatchText(
          description,
          variant: CatchTextVariant.bodyLead,
          color: surfaceStyle?.bodyColor ?? t.ink2,
        ),
      ],
    );
  }
}
