import 'dart:async';

import 'package:catch_dating_app/events/presentation/event_detail_view_model.dart';
import 'package:catch_dating_app/events/presentation/event_location_map_body_screen.dart';
import 'package:catch_dating_app/events/presentation/event_location_map_state.dart';
import 'package:catch_dating_app/events/presentation/event_map_screen.dart';
import 'package:catch_dating_app/events/presentation/widgets/map_overlay_top_bar.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/platform/riverpod_ui/failed_reads.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

export 'package:catch_dating_app/events/presentation/event_location_map_body_screen.dart';

class EventLocationMapRouteScreen extends ConsumerStatefulWidget {
  const EventLocationMapRouteScreen({
    super.key,
    required this.eventId,
    this.enableNetworkTiles = true,
  });

  final String eventId;
  final bool enableNetworkTiles;

  @override
  ConsumerState<EventLocationMapRouteScreen> createState() =>
      _EventLocationMapRouteScreenState();
}

class _EventLocationMapRouteScreenState
    extends ConsumerState<EventLocationMapRouteScreen> {
  bool _directionsPending = false;

  Future<void> _openDirections(Uri directionsUri) async {
    if (_directionsPending) return;

    setState(() => _directionsPending = true);
    var opened = false;
    try {
      // provider-graph: ownership-widget-async:_EventLocationMapRouteScreenState._openDirections:await:externalLinkControllerProvider.openExternal watch CAT156 -- Existing bounded review signal at _EventLocationMapRouteScreenState._openDirections (await:externalLinkControllerProvider.openExternal). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      opened = await ref
          .read(externalLinkControllerProvider)
          .openExternal(directionsUri);
    } catch (_) {
      // A single route-owned failure message covers launcher exceptions and
      // false platform results without claiming that another app opened.
    } finally {
      if (mounted) {
        setState(() => _directionsPending = false);
      }
    }

    if (!mounted || opened) return;
    showCatchNotice(
      context,
      context.l10n.eventsEventLocationMapDirectionsOpenFailed,
    );
  }

  @override
  Widget build(BuildContext context) {
    final eventId = widget.eventId;
    final vmAsync = ref.watch(eventDetailViewModelProvider(eventId));

    return CatchAsyncBoundary<EventDetailViewModel?>(
      value: vmAsync,
      onRetry: () => ref.retryFailedReads(
        vmAsync.error,
        composition: eventDetailViewModelProvider(eventId),
      ),
      loadingBuilder: (_) =>
          const ChromelessMapScaffold(child: EventLocationMapLoadingBody()),
      errorBuilder: (_, error, _, onBoundaryRetry) => ChromelessMapScaffold(
        child: CatchLocalizedErrorState(
          error,
          context: AppErrorContext.event,
          onRetry: onBoundaryRetry,
        ),
      ),
      builder: (context, vm) {
        final event = vm?.event;
        if (event == null) {
          return ChromelessMapScaffold(
            child: CatchErrorState(
              title:
                  context.l10n.eventsEventLocationMapScreenTitleEventNotFound,
              message:
                  context.l10n.eventsEventLocationMapScreenMessageThisEventIsNo,
              actions: const [CatchErrorBackButton()],
            ),
          );
        }
        final state = EventLocationMapState.fromEvent(
          event,
          enableNetworkTiles: widget.enableNetworkTiles,
        );

        return ChromelessMapScaffold(
          safeArea: false,
          child: EventLocationMapScreen(
            state: state,
            directionsPending: _directionsPending,
            onGetDirections: () =>
                unawaited(_openDirections(state.directionsUri)),
          ),
        );
      },
    );
  }
}

class EventLocationMapLoadingBody extends StatelessWidget {
  const EventLocationMapLoadingBody({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Stack(
      children: [
        const Positioned.fill(child: EventMapLoadingBody()),
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
                      CatchSkeleton.box(
                        width: CatchLayout.eventInfoTileExtent,
                        height: CatchLayout.eventInfoTileExtent,
                        radius: CatchRadius.interactiveTile,
                        borderColor: t.line,
                      ),
                      gapW12,
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CatchSkeleton.text(
                              width: CatchLayout.skeletonTextTitleWidth,
                            ),
                            gapH6,
                            CatchSkeleton.text(),
                          ],
                        ),
                      ),
                    ],
                  ),
                  gapH12,
                  CatchSkeleton.box(
                    width: double.infinity,
                    height: CatchButtonTokens.largeHeight,
                    radius: CatchRadius.pill,
                    borderColor: t.line,
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

class ChromelessMapScaffold extends StatelessWidget {
  const ChromelessMapScaffold({
    super.key,
    required this.child,
    this.safeArea = true,
  });

  final Widget child;
  final bool safeArea;

  @override
  Widget build(BuildContext context) {
    return CatchScaffold.workspace(
      backgroundColor: CatchTokens.of(context).bg,
      body: Stack(
        children: [
          Positioned.fill(child: safeArea ? SafeArea(child: child) : child),
          const MapOverlayTopBar(),
        ],
      ),
    );
  }
}
