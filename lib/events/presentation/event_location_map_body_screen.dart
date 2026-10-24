import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/presentation/event_location_map_state.dart';
import 'package:catch_dating_app/events/presentation/event_map_view_model.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_pins_map.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tile_data.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventLocationMapScreen extends StatelessWidget {
  const EventLocationMapScreen({
    super.key,
    required this.state,
    required this.onGetDirections,
    this.directionsPending = false,
  });

  final EventLocationMapState state;
  final VoidCallback? onGetDirections;
  final bool directionsPending;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    if (!state.hasExactStartingPoint) {
      return SafeArea(
        child: CatchErrorState(
          title: context
              .l10n
              .eventsEventLocationMapBodyScreenTitleLocationUnavailable,
          message: context
              .l10n
              .eventsEventLocationMapBodyScreenMessageThisEventDoesNot,
          actions: const [CatchErrorBackButton()],
        ),
      );
    }

    return Stack(
      children: [
        Positioned.fill(
          child: EventPinsMap(
            items: [
              EventMapItem(event: state.event, status: EventTileStatus.open),
            ],
            initialCenter: state.startingPoint!,
            initialZoom: 15.5,
            selectedEventId: state.event.id,
            enableNetworkTiles: state.enableNetworkTiles,
          ),
        ),
        Positioned(
          left: CatchSpacing.s5,
          right: CatchSpacing.s5,
          bottom: CatchSpacing.s5,
          child: SafeArea(
            top: false,
            child: CatchSurface(
              tone: CatchSurfaceTone.raised,
              emphasis: CatchSurfaceEmphasis.floating,
              borderRole: CatchBorderRole.separator,
              padding: CatchInsets.content,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      SizedBox(
                        width: CatchLayout.eventInfoTileExtent,
                        height: CatchLayout.eventInfoTileExtent,
                        child: ColoredBox(
                          color: t.primarySoft,
                          child: Icon(
                            CatchIcons.locationOnOutlined,
                            color: t.primary,
                            size: CatchIcon.row,
                          ),
                        ),
                      ),
                      const SizedBox(width: CatchSpacing.s3),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CatchText(
                              state.locationName,
                              variant: CatchTextVariant.sectionTitle,
                            ),
                            if (state.event.effectiveMeetingLocation?.address
                                    ?.trim()
                                case final address?
                                when address.isNotEmpty) ...[
                              gapH2,
                              CatchText(
                                address,
                                variant: CatchTextVariant.supporting,
                                color: t.ink2,
                              ),
                            ],
                            if (state.locationNotes != null) ...[
                              gapH2,
                              CatchText(
                                state.locationNotes!,
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
                  CatchButton(
                    label: context
                        .l10n
                        .eventsEventLocationMapBodyScreenLabelGetDirections,
                    leading: Icon(
                      CatchIcons.directionsOutlined,
                      size: CatchIcon.md,
                    ),
                    fullWidth: true,
                    status: (directionsPending)
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                    onPressed: directionsPending ? null : onGetDirections,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
