import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/external_event.dart';
import 'package:catch_dating_app/events/presentation/event_map_center.dart';
import 'package:catch_dating_app/events/presentation/event_map_view_model.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_pins_map.dart';
import 'package:catch_dating_app/explore/explore.dart'
    show
        selectedExploreCityProvider,
        selectedExploreCityWasUserSelectedProvider;
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventMap extends ConsumerStatefulWidget {
  const EventMap({
    super.key,
    this.enableNetworkTiles = true,
    this.overlay,
    this.onEventSelected,
    this.onExternalEventSelected,
    this.onSelectionCleared,
    this.onCameraCenterChanged,
    this.onDistanceRingTapped,
    this.viewModel,
    this.onRetry,
    this.distanceRingRadiusKm,
    this.distanceRingLabel,
    this.distanceRingSemanticHint,
    this.deviceLocation,
    this.showOverviewControl = false,
    this.preserveCanvasWhenEmpty = false,
    this.selectedEventId,
    this.initialSelectedEventId,
  });

  final bool enableNetworkTiles;
  final Widget? overlay;
  final ValueChanged<Event>? onEventSelected;
  final ValueChanged<ExternalEvent>? onExternalEventSelected;
  final VoidCallback? onSelectionCleared;
  final ValueChanged<LocationCoordinate>? onCameraCenterChanged;
  final VoidCallback? onDistanceRingTapped;
  final AsyncValue<EventMapViewModel>? viewModel;
  final VoidCallback? onRetry;
  final double? distanceRingRadiusKm;
  final String? distanceRingLabel;
  final String? distanceRingSemanticHint;
  final AsyncValue<LocationCoordinate?>? deviceLocation;
  final bool showOverviewControl;
  final bool preserveCanvasWhenEmpty;
  final String? selectedEventId;
  final String? initialSelectedEventId;

  @override
  ConsumerState<EventMap> createState() => _EventMapState();
}

class _EventMapState extends ConsumerState<EventMap> {
  String? _selectedEventId;

  @override
  void initState() {
    super.initState();
    _selectedEventId = widget.initialSelectedEventId;
  }

  @override
  void didUpdateWidget(covariant EventMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialSelectedEventId != widget.initialSelectedEventId &&
        _selectedEventId == oldWidget.initialSelectedEventId) {
      _selectedEventId = widget.initialSelectedEventId;
    }
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<EventMapViewModel> viewModelAsync =
        widget.viewModel ?? ref.watch(eventMapViewModelProvider);
    final AsyncValue<LocationCoordinate?> deviceLocationAsync =
        widget.deviceLocation ?? ref.watch(deviceLocationProvider);
    final deviceLocation = catchAsyncStateFromAsyncValue(
      deviceLocationAsync,
    ).value;
    final selectedCity = ref.watch(selectedExploreCityProvider);
    final selectedCityWasUserSelected = ref.watch(
      selectedExploreCityWasUserSelectedProvider,
    );

    return Stack(
      children: [
        Positioned.fill(
          child: CatchAsyncBoundary<EventMapViewModel>(
            value: viewModelAsync,
            onRetry:
                widget.onRetry ??
                () => ref.invalidate(eventMapViewModelProvider),
            loadingBuilder: (_) => const EventMapLoadingBody(),
            errorBuilder: (_, error, _, onBoundaryRetry) =>
                CatchLocalizedErrorState(
                  error,
                  context: AppErrorContext.event,
                  onRetry: onBoundaryRetry,
                ),
            builder: (context, viewModel) {
              final selectedEventId = _effectiveSelectedEventId;
              final selectedEventCenter = viewModel.selectedCoordinate(
                selectedEventId,
              );
              final mapCenter = resolveEventMapInitialCenter(
                deviceLocation: deviceLocation,
                selectedCity: selectedCity,
                selectedCityWasUserSelected: selectedCityWasUserSelected,
              );

              if (!widget.preserveCanvasWhenEmpty && viewModel.isEmpty) {
                return Center(
                  child: CatchEmptyState(
                    icon: CatchIcons.map,
                    title:
                        context.l10n.eventsEventMapScreenTitleNoMappedEventsYet,
                    message: context
                        .l10n
                        .eventsEventMapScreenMessageJoinOrganizersBookEvents,
                  ),
                );
              }
              return Stack(
                children: [
                  Positioned.fill(
                    child: EventPinsMap(
                      items: viewModel.effectivePinnedItems,
                      externalItems: viewModel.externalPinnedItems,
                      initialCenter: mapCenter,
                      selectedEventId: selectedEventId,
                      selectedEventCenter: selectedEventCenter,
                      enableNetworkTiles: widget.enableNetworkTiles,
                      userLocation: deviceLocation,
                      distanceRingRadiusKm: widget.distanceRingRadiusKm,
                      distanceRingLabel: widget.distanceRingLabel,
                      distanceRingSemanticHint: widget.distanceRingSemanticHint,
                      showOverviewControl: widget.showOverviewControl,
                      onEventSelected: _selectEvent,
                      onExternalEventSelected: _selectExternalEvent,
                      onMapTapped: _clearSelection,
                      onCameraCenterChanged: widget.onCameraCenterChanged,
                      onDistanceRingTapped: widget.onDistanceRingTapped,
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        ?widget.overlay,
      ],
    );
  }

  void _selectEvent(Event event) {
    if (!_usesExternalSelection) {
      setState(() => _selectedEventId = event.id);
    }
    widget.onEventSelected?.call(event);
  }

  void _selectExternalEvent(ExternalEvent event) {
    if (!_usesExternalSelection) {
      setState(() => _selectedEventId = 'external:${event.id}');
    }
    widget.onExternalEventSelected?.call(event);
  }

  void _clearSelection() {
    if (_effectiveSelectedEventId == null) return;
    if (!_usesExternalSelection) {
      setState(() => _selectedEventId = null);
    }
    widget.onSelectionCleared?.call();
  }

  bool get _usesExternalSelection =>
      widget.selectedEventId != null || widget.onSelectionCleared != null;

  String? get _effectiveSelectedEventId =>
      _usesExternalSelection ? widget.selectedEventId : _selectedEventId;
}

class EventMapLoadingBody extends StatelessWidget {
  const EventMapLoadingBody({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Stack(
      children: [
        Positioned.fill(
          child: CatchSkeleton.box(
            width: double.infinity,
            height: double.infinity,
            borderRadius: BorderRadius.zero,
          ),
        ),
        Center(
          child: CatchSkeleton.circle(
            size: CatchLayout.eventMapLoadingPinExtent,
          ),
        ),
        Positioned(
          left: CatchSpacing.s5,
          top: CatchSpacing.s5,
          child: CatchSkeleton.box(
            width: CatchLayout.eventMapLoadingLabelWidth,
            height: CatchSpacing.s9,
            radius: CatchRadius.pill,
            borderColor: t.line,
          ),
        ),
        Positioned(
          right: CatchSpacing.s5,
          bottom: CatchSpacing.s5,
          child: CatchSkeleton.circle(),
        ),
      ],
    );
  }
}
