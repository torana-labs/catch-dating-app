import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Counts-only overview for stakeholderViewer staff: guest/household
/// headcounts, per-function RSVP and door counts, and per-hotel occupancy
/// from routed travel legs. The callable never returns names — function
/// and hotel labels join from the work-access payload on the client.
class ProgramStakeholderScreen extends ConsumerWidget {
  const ProgramStakeholderScreen({super.key, required this.programId});

  final String programId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final countsAsync = ref.watch(programStakeholderCountsProvider(programId));
    final access = catchAsyncStateFromAsyncValue(
      ref.watch(programWorkEntryProvider(programId, null)),
    ).value?.value;
    final accessFunctions = access?.functions ?? const <ProgramFunction>[];
    final accessHotels = access?.hotels ?? const <ProgramHotel>[];
    final functionNames = {
      for (final fn in accessFunctions) fn.functionId: fn.name,
    };
    final hotelNames = {
      for (final hotel in accessHotels) hotel.hotelId: hotel.name,
    };
    return CatchAsyncBoundary<ProgramStakeholderCounts>(
      retainDataOn: const {},
      value: countsAsync,
      onRetry: () =>
          ref.invalidate(programStakeholderCountsProvider(programId)),
      loadingBuilder: (_) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsStakeholderTitle,
          subtitle: context.l10n.programsStakeholderSubtitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: const CatchRouteBody.standardViewport(
          child: CatchStateViewport.loading(accountForBottomOverlay: false),
        ),
      ),
      errorBuilder: (_, error, _, onBoundaryRetry) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsStakeholderTitle,
          subtitle: context.l10n.programsStakeholderSubtitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            error,
            context: AppErrorContext.event,
            onRetry: onBoundaryRetry,
          ),
        ),
      ),
      builder: (context, counts) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsStakeholderTitle,
          subtitle: context.l10n.programsStakeholderSubtitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: CatchRouteBody.standardSections(
          sections: [
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsStakeholderProgramTitle,
                subtitle: context.l10n.programsStakeholderProgramSubtitle,
                child: Wrap(
                  spacing: CatchSpacing.s2,
                  runSpacing: CatchSpacing.s2,
                  children: [
                    CatchBadge.functional(
                      label: context.l10n.programsStakeholderGuests(
                        count: counts.guestCount,
                      ),
                      tone: CatchBadgeTone.brand,
                    ),
                    CatchBadge.functional(
                      label: context.l10n.programsStakeholderHouseholds(
                        count: counts.householdCount,
                      ),
                      tone: CatchBadgeTone.brand,
                    ),
                  ],
                ),
              ),
            ),
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsStakeholderFunctionsTitle,
                subtitle: context.l10n.programsStakeholderFunctionsSubtitle,
                child: counts.functions.isEmpty
                    ? CatchEmptyState(
                        icon: CatchIcons.event,
                        message: context.l10n.programsStakeholderFunctionsEmpty,
                        variant: CatchEmptyStateVariant.inline,
                      )
                    : Column(
                        children: [
                          for (final fn in counts.functions) ...[
                            ProgramFunctionCountsRow(
                              counts: fn,
                              name: functionNames[fn.functionId],
                            ),
                            gapH8,
                          ],
                        ],
                      ),
              ),
            ),
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsStakeholderHotelsTitle,
                subtitle: context.l10n.programsStakeholderHotelsSubtitle,
                child: counts.hotels.isEmpty
                    ? CatchEmptyState(
                        icon: CatchIcons.hotel,
                        message: context.l10n.programsStakeholderHotelsEmpty,
                        variant: CatchEmptyStateVariant.inline,
                      )
                    : Column(
                        children: [
                          for (final hotel in counts.hotels) ...[
                            ProgramHotelOccupancyRow(
                              occupancy: hotel,
                              name: hotelNames[hotel.hotelId],
                            ),
                            gapH8,
                          ],
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Per-function RSVP and door-count card for the stakeholder counts view.
class ProgramFunctionCountsRow extends StatelessWidget {
  const ProgramFunctionCountsRow({super.key, required this.counts, this.name});

  final ProgramFunctionCounts counts;
  final String? name;

  @override
  Widget build(BuildContext context) {
    return CatchSurface.card(
      padding: CatchInsets.contentDense,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: CatchText(
                  name ?? counts.functionId,
                  variant: CatchTextVariant.sectionTitle,
                ),
              ),
              CatchBadge.functional(
                label: _statusLabel(context, counts.status),
                tone: _statusTone(counts.status),
              ),
            ],
          ),
          gapH8,
          CatchMetaRow(
            icon: CatchIcons.people,
            label: context.l10n.programsStakeholderFunctionRsvp(
              invited: counts.invitedCount,
              attending: counts.rsvpAttending,
              declined: counts.rsvpDeclined,
              maybe: counts.rsvpMaybe,
              pending: counts.rsvpPending,
            ),
          ),
          CatchMetaRow(
            icon: CatchIcons.checkIn,
            label: context.l10n.programsStakeholderFunctionDoor(
              expected: counts.expectedHeads,
              checkedIn: counts.checkedInHeads,
              noShows: counts.noShowCount,
            ),
          ),
        ],
      ),
    );
  }

  String _statusLabel(BuildContext context, ProgramFunctionStatus status) {
    return switch (status) {
      ProgramFunctionStatus.scheduled =>
        context.l10n.programsStakeholderStatusScheduled,
      ProgramFunctionStatus.completed =>
        context.l10n.programsStakeholderStatusCompleted,
      ProgramFunctionStatus.cancelled =>
        context.l10n.programsStakeholderStatusCancelled,
    };
  }

  CatchBadgeTone _statusTone(ProgramFunctionStatus status) {
    return switch (status) {
      ProgramFunctionStatus.scheduled => CatchBadgeTone.brand,
      ProgramFunctionStatus.completed => CatchBadgeTone.success,
      ProgramFunctionStatus.cancelled => CatchBadgeTone.danger,
    };
  }
}

/// Per-hotel occupancy row for the stakeholder counts view.
class ProgramHotelOccupancyRow extends StatelessWidget {
  const ProgramHotelOccupancyRow({
    super.key,
    required this.occupancy,
    this.name,
  });

  final ProgramHotelOccupancy occupancy;
  final String? name;

  @override
  Widget build(BuildContext context) {
    return CatchSurface.card(
      padding: CatchInsets.contentDense,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(
            name ?? occupancy.hotelId,
            variant: CatchTextVariant.sectionTitle,
          ),
          gapH8,
          CatchMetaRow(
            icon: CatchIcons.luggage,
            label: context.l10n.programsStakeholderHotelRow(
              arrived: occupancy.arrivedGuestCount,
              routed: occupancy.routedGuestCount,
              legs: occupancy.legCount,
            ),
          ),
        ],
      ),
    );
  }
}
