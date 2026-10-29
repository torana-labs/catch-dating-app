import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/presentation/program_trip_actions_controller.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The hotel welcome team's inbound view: vehicles on the way with their
/// manifest names and plates, plus parties still expected at the airport.
/// Deliberately narrow — no contact fields, no other hotels.
class ProgramHotelDeskScreen extends ConsumerStatefulWidget {
  const ProgramHotelDeskScreen({
    super.key,
    required this.programId,
    required this.hotelId,
  });

  final String programId;
  final String hotelId;

  @override
  ConsumerState<ProgramHotelDeskScreen> createState() =>
      _ProgramHotelDeskScreenState();
}

class _ProgramHotelDeskScreenState
    extends ConsumerState<ProgramHotelDeskScreen> {
  final List<String> _tripCursors = [];
  final List<String> _expectedCursors = [];

  ProgramHotelInboundProvider get _provider => programHotelInboundProvider(
    widget.programId,
    widget.hotelId,
    tripCursor: _tripCursors.lastOrNull,
    expectedCursor: _expectedCursors.lastOrNull,
  );

  @override
  void didUpdateWidget(ProgramHotelDeskScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.programId != widget.programId ||
        oldWidget.hotelId != widget.hotelId) {
      _tripCursors.clear();
      _expectedCursors.clear();
    }
  }

  void _resetPages() {
    setState(() {
      _tripCursors.clear();
      _expectedCursors.clear();
    });
    ref.invalidate(_provider);
  }

  @override
  Widget build(BuildContext context) {
    final inboundAsync = ref.watch(_provider);
    return CatchAsyncBoundary<ProgramHotelInbound>(
      retainDataOn: const {},
      value: inboundAsync,
      onRetry: _resetPages,
      loadingBuilder: (_) => _routeScaffold(
        body: const CatchRouteBody.standardViewport(
          child: CatchStateViewport.loading(accountForBottomOverlay: false),
        ),
      ),
      errorBuilder: (_, error, _, onBoundaryRetry) => _routeScaffold(
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            error,
            context: AppErrorContext.event,
            onRetry: onBoundaryRetry,
            retryLabel: context.l10n.programsHotelRefresh,
          ),
        ),
      ),
      builder: (context, inbound) => _routeScaffold(
        title: inbound.hotelName,
        body: CatchRouteBody.standardSections(
          sections: _inboundSections(context, inbound),
        ),
      ),
    );
  }

  CatchRouteScaffold _routeScaffold({
    String? title,
    required CatchRouteBody body,
  }) => CatchRouteScaffold(
    topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
      title: title ?? context.l10n.programsHotelTitle,
      subtitle: context.l10n.programsHotelSubtitle,
      emphasis: scrolledUnder
          ? CatchTopBarEmphasis.divided
          : CatchTopBarEmphasis.plain,
      navigation: const CatchTopBarNavigation(
        mode: CatchTopBarNavigationMode.back,
      ),
    ),
    body: body,
  );

  List<CatchSectionListItem> _inboundSections(
    BuildContext context,
    ProgramHotelInbound inbound,
  ) {
    return [
      CatchSectionListItem(
        child: CatchFieldRow.standard(
          leading: Icon(CatchIcons.key),
          body: CatchText(
            context.l10n.programsHotelRoomsOpen,
            variant: CatchTextVariant.sectionTitle,
          ),
          trailing: Icon(CatchIcons.disclosure),
          onTap: () => context.pushNamed(
            Routes.hostWorkHotelRoomsScreen.name,
            pathParameters: {
              'programId': inbound.programId,
              'hotelId': inbound.hotelId,
            },
          ),
        ),
      ),
      if (_tripCursors.isNotEmpty || inbound.nextTripCursor != null)
        CatchSectionListItem(
          child: Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              if (_tripCursors.isNotEmpty) ...[
                CatchButton.command(
                  label: context.l10n.programsHotelPreviousTrip,
                  onPressed: () => setState(_tripCursors.removeLast),
                ),
                CatchButton.command(
                  label: context.l10n.programsHotelFirstTrip,
                  onPressed: () => setState(_tripCursors.clear),
                ),
              ],
              if (inbound.nextTripCursor case final cursor?)
                CatchButton.command(
                  label: context.l10n.programsHotelMoreTrip,
                  onPressed: () => setState(() => _tripCursors.add(cursor)),
                ),
            ],
          ),
        ),
      CatchSectionListItem(
        child: CatchSection.contained(
          title: context.l10n.programsHotelEnRouteTitle,
          subtitle: context.l10n.programsHotelEnRouteSubtitle,
          child: inbound.trips.isEmpty
              ? CatchEmptyState(
                  icon: CatchIcons.taxi,
                  message: context.l10n.programsHotelEnRouteEmpty,
                  variant: CatchEmptyStateVariant.inline,
                )
              : Column(
                  children: [
                    for (final trip in inbound.trips) ...[
                      ProgramHotelInboundTripTile(
                        key: ValueKey(trip.tripId),
                        trip: trip,
                        inbound: inbound,
                        onChanged: () => ref.invalidate(_provider),
                      ),
                      gapH8,
                    ],
                  ],
                ),
        ),
      ),
      if (_expectedCursors.isNotEmpty || inbound.nextExpectedCursor != null)
        CatchSectionListItem(
          child: Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              if (_expectedCursors.isNotEmpty) ...[
                CatchButton.command(
                  label: context.l10n.programsHotelPreviousExpected,
                  onPressed: () => setState(_expectedCursors.removeLast),
                ),
                CatchButton.command(
                  label: context.l10n.programsHotelFirstExpected,
                  onPressed: () => setState(_expectedCursors.clear),
                ),
              ],
              if (inbound.nextExpectedCursor case final cursor?)
                CatchButton.command(
                  label: context.l10n.programsHotelMoreExpected,
                  onPressed: () => setState(() => _expectedCursors.add(cursor)),
                ),
            ],
          ),
        ),
      CatchSectionListItem(
        child: CatchSection.contained(
          title: context.l10n.programsHotelExpectedTitle,
          subtitle: context.l10n.programsHotelExpectedSubtitle,
          child: inbound.expectedLegs.isEmpty
              ? CatchEmptyState(
                  icon: CatchIcons.arrivals,
                  message: context.l10n.programsHotelExpectedEmpty,
                  variant: CatchEmptyStateVariant.inline,
                )
              : Column(
                  children: [
                    for (final leg in inbound.expectedLegs)
                      CatchFieldRow.standard(
                        leading: Icon(CatchIcons.arrivals),
                        body: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CatchText(
                              leg.partyLabel ?? leg.guestDisplayName,
                              variant: CatchTextVariant.sectionTitle,
                            ),
                            CatchMetaRow(
                              icon: CatchIcons.people,
                              label: leg.curbAt != null
                                  ? context.l10n.programsHotelExpectedMeta(
                                      passengers: leg.passengers,
                                      time: AppTimeFormatters.time(leg.curbAt!),
                                    )
                                  : context
                                        .l10n
                                        .programsHotelExpectedNoEstimate,
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
        ),
      ),
    ];
  }
}

class ProgramHotelInboundTripTile extends ConsumerStatefulWidget {
  const ProgramHotelInboundTripTile({
    super.key,
    required this.trip,
    required this.inbound,
    required this.onChanged,
  });

  final ProgramTripSummary trip;
  final ProgramHotelInbound inbound;
  final VoidCallback onChanged;

  @override
  ConsumerState<ProgramHotelInboundTripTile> createState() =>
      _ProgramHotelInboundTripTileState();
}

class _ProgramHotelInboundTripTileState
    extends ConsumerState<ProgramHotelInboundTripTile> {
  bool _busy = false;
  Object? _error;

  Future<void> _markArrived() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(programTripActionsProvider.notifier)
          .markArrived(
            programId: widget.inbound.programId,
            tripId: widget.trip.tripId,
            expectedRevision: widget.trip.revision,
            clientOperationId:
                'arrive_${widget.trip.tripId.hashCode.abs().toRadixString(36)}_'
                '${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}',
          );
      if (!mounted) return;
      widget.onChanged();
    } on Object catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final trip = widget.trip;
    return CatchSurface.card(
      padding: CatchInsets.contentDense,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: CatchText(
                  trip.plateDisplay,
                  variant: CatchTextVariant.sectionTitle,
                ),
              ),
              CatchBadge.functional(
                label: _statusLabel(context, trip.status),
                tone: trip.status == TransportTripStatus.enRoute
                    ? CatchBadgeTone.brand
                    : CatchBadgeTone.success,
              ),
            ],
          ),
          gapH8,
          CatchMetaRow(
            icon: CatchIcons.people,
            label: context.l10n.programsHotelTripMeta(
              passengers: trip.passengerCount,
              names: trip.guestNames.join(', '),
            ),
          ),
          if (trip.manifestSource == TransportManifestSource.currentRecords)
            CatchText(
              context.l10n.programsTripCurrentNames,
              variant: CatchTextVariant.bodyS,
            ),
          CatchMetaRow(
            icon: CatchIcons.time,
            label: context.l10n.programsHotelTripTiming(
              departed: AppTimeFormatters.time(trip.departedAt),
              eta: trip.estimatedArriveAt != null
                  ? AppTimeFormatters.time(trip.estimatedArriveAt!)
                  : context.l10n.programsHotelEtaUnknown,
            ),
          ),
          if (trip.vendorName != null)
            CatchMetaRow(icon: CatchIcons.business, label: trip.vendorName!),
          if (_error != null) ...[
            gapH8,
            CatchBanner.error(
              message: appErrorMessage(_error!, l10n: context.l10n),
            ),
          ],
          if (trip.status == TransportTripStatus.enRoute) ...[
            gapH12,
            CatchButton(
              label: context.l10n.programsHotelMarkArrived,
              leading: Icon(CatchIcons.meetingPoint),
              fullWidth: true,
              status: _busy
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: _markArrived,
            ),
          ],
        ],
      ),
    );
  }

  String _statusLabel(BuildContext context, TransportTripStatus status) {
    return switch (status) {
      TransportTripStatus.enRoute => context.l10n.programsHotelStatusEnRoute,
      TransportTripStatus.arrived => context.l10n.programsHotelStatusArrived,
      TransportTripStatus.cancelled =>
        context.l10n.programsHotelStatusCancelled,
      TransportTripStatus.voided => context.l10n.programsHotelStatusVoided,
    };
  }
}
