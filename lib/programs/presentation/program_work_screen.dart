import 'package:catch_dating_app/contexts/programmes/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_access.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_policy.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Scoped entry point for private program staff.
///
/// Resolves the actor's program grants once, then offers only the workspaces
/// their duties allow: station arrivals rosters, the dispatch desk, hotel
/// desks and the trip ledger. The callable response is the access contract —
/// the shell renders exactly the scopes the server returned, and every
/// destination is re-checked server-side.
class ProgramWorkScreen extends ConsumerStatefulWidget {
  const ProgramWorkScreen({
    super.key,
    required this.programId,
    this.inviteId,
    this.now,
  });

  final String programId;
  final DateTime Function()? now;

  /// Staff invite token carried by a join deep link; claimed before access
  /// resolves so the shell lands directly on the granted program.
  final String? inviteId;

  @override
  ConsumerState<ProgramWorkScreen> createState() => _ProgramWorkScreenState();
}

class _ProgramWorkScreenState extends ConsumerState<ProgramWorkScreen> {
  ProviderSubscription<AsyncValue<ProgramReadView<ProgramWorkAccess>>>?
  _inviteSubscription;

  @override
  void initState() {
    super.initState();
    _listenForInvite();
  }

  @override
  void didUpdateWidget(ProgramWorkScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.programId != widget.programId ||
        oldWidget.inviteId != widget.inviteId) {
      _listenForInvite();
    }
  }

  void _listenForInvite() {
    _inviteSubscription?.close();
    _inviteSubscription = null;
    final inviteId = widget.inviteId;
    if (inviteId == null || inviteId.isEmpty) return;
    final provider = programWorkEntryProvider(widget.programId, inviteId);
    _inviteSubscription = ref.listenManual(provider, (_, next) {
      final result = next.asData?.value;
      if (next.isLoading || result == null) return;
      // A claim is an online entry action, not a permanent workspace URL.
      // Wait until the access read settles and navigation is outside build.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted ||
            widget.inviteId != inviteId ||
            provider !=
                programWorkEntryProvider(widget.programId, widget.inviteId) ||
            ref.read(provider).isLoading ||
            ref.read(provider).asData?.value != result ||
            ModalRoute.of(context)?.isCurrent != true) {
          return;
        }
        context.replaceNamed(
          Routes.hostWorkProgramScreen.name,
          pathParameters: {'programId': result.value.programId},
        );
      });
    }, fireImmediately: true);
  }

  @override
  void dispose() {
    _inviteSubscription?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final accessAsync = ref.watch(
      programWorkEntryProvider(widget.programId, widget.inviteId),
    );
    return CatchAsyncBoundary<ProgramReadView<ProgramWorkAccess>>(
      retainDataOn: const {},
      value: accessAsync,
      onRetry: () => ref.invalidate(
        programWorkEntryProvider(widget.programId, widget.inviteId),
      ),
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
          ),
        ),
      ),
      builder: (context, result) => ProgramWorkPageBody(
        access: result.value,
        now: widget.now?.call() ?? DateTime.now(),
        snapshotAt: result.snapshotAt,
      ),
    );
  }
}

class ProgramWorkPageBody extends StatelessWidget {
  const ProgramWorkPageBody({
    super.key,
    required this.access,
    required this.now,
    this.snapshotAt,
  });

  final ProgramWorkAccess access;
  final DateTime now;
  final DateTime? snapshotAt;

  @override
  Widget build(BuildContext context) {
    final dispatcherScope = access.stationScope(
      ProgramStaffDuty.transportDispatcher,
      now: now,
    );
    final hotelScope = access.hotelScope(ProgramStaffDuty.hotelDesk, now: now);
    final arrivalsStations = access.pickupPoints
        .where(
          (station) => canReadProgramStation(
            access,
            station.pickupPointId,
            dispatch: false,
            now: now,
          ),
        )
        .toList(growable: false);
    final dispatchStations = access.pickupPoints
        .where(
          (station) =>
              access.hasDuty(ProgramStaffDuty.transportDispatcher, now: now) &&
              (dispatcherScope?.contains(station.pickupPointId) ??
                  dispatcherScope == null),
        )
        .toList(growable: false);
    final hotels = access.hotels
        .where(
          (hotel) =>
              access.hasDuty(ProgramStaffDuty.hotelDesk, now: now) &&
              (hotelScope?.contains(hotel.hotelId) ?? hotelScope == null),
        )
        .toList(growable: false);
    final functions = access.functions
        .where((fn) => canReadProgramFunction(access, fn.functionId, now: now))
        .toList(growable: false);
    final canSeeLedger =
        access.isManager ||
        access.hasDuty(ProgramStaffDuty.transportDispatcher, now: now) ||
        access.hasDuty(ProgramStaffDuty.reconciliationViewer, now: now);
    final canSeeAttendance =
        access.isManager ||
        access.hasDuty(ProgramStaffDuty.reconciliationViewer, now: now);
    final canSeeCommunications = access.hasDuty(
      ProgramStaffDuty.communications,
      now: now,
    );
    final canSeeLead = access.hasDuty(ProgramStaffDuty.functionLead, now: now);
    final canSeeCounts = access.hasDuty(
      ProgramStaffDuty.stakeholderViewer,
      now: now,
    );

    return _routeScaffold(
      title: access.title,
      body: CatchRouteBody.standardSections(
        sections: [
          if (snapshotAt != null)
            CatchSectionListItem(
              child: CatchBanner(
                title: context.l10n.programsSnapshotTitle,
                message: context.l10n.programsSnapshotBanner(
                  time: AppTimeFormatters.time(snapshotAt!),
                ),
                icon: CatchIcons.offline,
                tone: CatchBannerTone.warning,
              ),
            ),
          CatchSectionListItem(
            child: CatchSection.contained(
              title: context.l10n.programsWorkShellAccessTitle,
              subtitle: context.l10n.programsWorkShellAccessSubtitle,
              child: Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  CatchBadge.functional(
                    label: access.isManager
                        ? context.l10n.programsWorkShellRoleManager
                        : context.l10n.programsWorkShellRoleStaff,
                    tone: CatchBadgeTone.success,
                  ),
                  CatchBadge(label: access.kind.name),
                  if (access.grantExpiresAt case final expiresAt?)
                    CatchBadge(
                      label: context.l10n.programsWorkShellExpires(
                        date: AppTimeFormatters.dateTime(expiresAt),
                      ),
                      tone: CatchBadgeTone.warning,
                    ),
                ],
              ),
            ),
          ),
          if (snapshotAt == null && canImportWeddingPhoneContacts(access, now))
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.phoneImportEntryTitle,
                subtitle: context.l10n.phoneImportEntryHelp,
                child: CatchButton(
                  key: const ValueKey('program-work-phone-import'),
                  label: context.l10n.phoneImportChooseContacts,
                  onPressed: () => context.pushNamed(
                    Routes.hostWorkPhoneImportScreen.name,
                    pathParameters: {'programId': access.programId},
                  ),
                  fullWidth: true,
                ),
              ),
            ),
          if (canSeeCommunications)
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsWorkCommsTitle,
                subtitle: context.l10n.programsWorkCommsSubtitle,
                child: Column(
                  children: [
                    CatchFieldRow.standard(
                      leading: Icon(CatchIcons.magic),
                      body: CatchText(
                        context.l10n.programsWorkCommsMomentsRow,
                        variant: CatchTextVariant.sectionTitle,
                      ),
                      trailing: Icon(CatchIcons.disclosure),
                      onTap: () => context.pushNamed(
                        Routes.hostProgramMomentsScreen.name,
                        pathParameters: {'programId': access.programId},
                        queryParameters: {'title': access.title},
                      ),
                    ),
                    if (access.isManager)
                      CatchFieldRow.standard(
                        leading: Icon(CatchIcons.conversations),
                        body: CatchText(
                          context.l10n.programsWorkCommsInboxRow,
                          variant: CatchTextVariant.sectionTitle,
                        ),
                        trailing: Icon(CatchIcons.disclosure),
                        onTap: () => context.pushNamed(
                          Routes.hostInboxScreen.name,
                          queryParameters: {
                            'programId': access.programId,
                            'organizerId': access.organizerId,
                          },
                        ),
                      ),
                  ],
                ),
              ),
            ),
          if (arrivalsStations.isNotEmpty)
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsWorkArrivalsTitle,
                subtitle: context.l10n.programsWorkArrivalsSubtitle,
                child: Column(
                  children: [
                    for (final station in arrivalsStations)
                      CatchFieldRow.standard(
                        leading: Icon(CatchIcons.arrivals),
                        body: CatchText(
                          station.label,
                          variant: CatchTextVariant.sectionTitle,
                        ),
                        trailing: Icon(CatchIcons.disclosure),
                        onTap: () => context.pushNamed(
                          Routes.hostWorkArrivalsScreen.name,
                          pathParameters: {
                            'programId': access.programId,
                            'pickupPointId': station.pickupPointId,
                          },
                          queryParameters: {'station': station.label},
                        ),
                      ),
                  ],
                ),
              ),
            ),
          if (dispatchStations.isNotEmpty)
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsWorkDispatchTitle,
                subtitle: context.l10n.programsWorkDispatchSubtitle,
                child: Column(
                  children: [
                    for (final station in dispatchStations)
                      CatchFieldRow.standard(
                        leading: Icon(CatchIcons.taxi),
                        body: CatchText(
                          station.label,
                          variant: CatchTextVariant.sectionTitle,
                        ),
                        trailing: Icon(CatchIcons.disclosure),
                        onTap: () => context.pushNamed(
                          Routes.hostWorkDispatchScreen.name,
                          pathParameters: {
                            'programId': access.programId,
                            'pickupPointId': station.pickupPointId,
                          },
                          queryParameters: {'station': station.label},
                        ),
                      ),
                  ],
                ),
              ),
            ),
          if (hotels.isNotEmpty)
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsWorkHotelTitle,
                subtitle: context.l10n.programsWorkHotelSubtitle,
                child: Column(
                  children: [
                    for (final hotel in hotels)
                      CatchFieldRow.standard(
                        leading: Icon(CatchIcons.hotel),
                        body: CatchText(
                          hotel.name,
                          variant: CatchTextVariant.sectionTitle,
                        ),
                        trailing: Icon(CatchIcons.disclosure),
                        onTap: () => context.pushNamed(
                          Routes.hostWorkHotelScreen.name,
                          pathParameters: {
                            'programId': access.programId,
                            'hotelId': hotel.hotelId,
                          },
                        ),
                      ),
                  ],
                ),
              ),
            ),
          if (functions.isNotEmpty)
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsWorkDoorTitle,
                subtitle: context.l10n.programsWorkDoorSubtitle,
                child: Column(
                  children: [
                    for (final fn in functions)
                      CatchFieldRow.standard(
                        leading: Icon(CatchIcons.checkIn),
                        body: CatchText(
                          fn.name,
                          variant: CatchTextVariant.sectionTitle,
                        ),
                        trailing: Icon(CatchIcons.disclosure),
                        onTap: () => context.pushNamed(
                          Routes.hostWorkDoorScreen.name,
                          pathParameters: {
                            'programId': access.programId,
                            'functionId': fn.functionId,
                          },
                          queryParameters: {'function': fn.name},
                        ),
                      ),
                  ],
                ),
              ),
            ),
          if (access.hasDuty(ProgramStaffDuty.guestRelations, now: now))
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsWorkGuestsTitle,
                subtitle: context.l10n.programsWorkGuestsSubtitle,
                child: Column(
                  children: [
                    CatchFieldRow.standard(
                      leading: Icon(CatchIcons.people),
                      body: CatchText(
                        context.l10n.programsGuestsTitle,
                        variant: CatchTextVariant.sectionTitle,
                      ),
                      trailing: Icon(CatchIcons.disclosure),
                      onTap: () => context.pushNamed(
                        Routes.hostWorkGuestsScreen.name,
                        pathParameters: {'programId': access.programId},
                      ),
                    ),
                    CatchFieldRow.standard(
                      leading: Icon(CatchIcons.upload),
                      body: CatchText(
                        context.l10n.programsImportTitle,
                        variant: CatchTextVariant.sectionTitle,
                      ),
                      trailing: Icon(CatchIcons.disclosure),
                      onTap: () => context.pushNamed(
                        Routes.hostWorkImportScreen.name,
                        pathParameters: {'programId': access.programId},
                      ),
                    ),
                  ],
                ),
              ),
            ),
          if (canSeeLead)
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsWorkLeadTitle,
                subtitle: context.l10n.programsWorkLeadSubtitle,
                child: Column(
                  children: [
                    CatchFieldRow.standard(
                      leading: Icon(CatchIcons.play),
                      body: CatchText(
                        context.l10n.programsWorkLeadNowNextRow,
                        variant: CatchTextVariant.sectionTitle,
                      ),
                      trailing: Icon(CatchIcons.disclosure),
                      onTap: () => context.pushNamed(
                        Routes.hostWorkNowScreen.name,
                        pathParameters: {'programId': access.programId},
                      ),
                    ),
                    CatchFieldRow.standard(
                      leading: Icon(CatchIcons.notifications),
                      body: CatchText(
                        context.l10n.programsWorkLeadAttentionRow,
                        variant: CatchTextVariant.sectionTitle,
                      ),
                      trailing: Icon(CatchIcons.disclosure),
                      onTap: () => context.pushNamed(
                        Routes.hostWorkAttentionScreen.name,
                        pathParameters: {'programId': access.programId},
                      ),
                    ),
                  ],
                ),
              ),
            ),
          if (canSeeLedger)
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsWorkLedgerTitle,
                subtitle: context.l10n.programsWorkLedgerSubtitle,
                child: CatchFieldRow.standard(
                  leading: Icon(CatchIcons.receipt),
                  body: CatchText(
                    context.l10n.programsWorkLedgerOpen,
                    variant: CatchTextVariant.sectionTitle,
                  ),
                  trailing: Icon(CatchIcons.disclosure),
                  onTap: () => context.pushNamed(
                    Routes.hostWorkTripsScreen.name,
                    pathParameters: {'programId': access.programId},
                  ),
                ),
              ),
            ),
          if (canSeeCounts)
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsWorkCountsTitle,
                subtitle: context.l10n.programsWorkCountsSubtitle,
                child: CatchFieldRow.standard(
                  leading: Icon(CatchIcons.review),
                  body: CatchText(
                    context.l10n.programsWorkCountsOpen,
                    variant: CatchTextVariant.sectionTitle,
                  ),
                  trailing: Icon(CatchIcons.disclosure),
                  onTap: () => context.pushNamed(
                    Routes.hostWorkCountsScreen.name,
                    pathParameters: {'programId': access.programId},
                  ),
                ),
              ),
            ),
          if (canSeeAttendance)
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsWorkAttendanceTitle,
                subtitle: context.l10n.programsWorkAttendanceSubtitle,
                child: CatchFieldRow.standard(
                  leading: Icon(CatchIcons.review),
                  body: CatchText(
                    context.l10n.programsWorkAttendanceOpen,
                    variant: CatchTextVariant.sectionTitle,
                  ),
                  trailing: Icon(CatchIcons.disclosure),
                  onTap: () => context.pushNamed(
                    Routes.hostWorkAttendanceReportScreen.name,
                    pathParameters: {'programId': access.programId},
                  ),
                ),
              ),
            ),
          if (arrivalsStations.isEmpty &&
              dispatchStations.isEmpty &&
              hotels.isEmpty &&
              functions.isEmpty &&
              !canSeeLead &&
              !canSeeLedger &&
              !canSeeCounts &&
              !canSeeAttendance &&
              !canSeeCommunications &&
              !access.hasDuty(ProgramStaffDuty.guestRelations, now: now))
            CatchSectionListItem(
              child: CatchEmptyState(
                icon: CatchIcons.locked,
                title: context.l10n.programsWorkShellEmptyTitle,
                message: context.l10n.programsWorkShellEmptyMessage,
              ),
            ),
        ],
      ),
    );
  }
}

CatchRouteScaffold _routeScaffold({
  String? title,
  required CatchRouteBody body,
}) => CatchRouteScaffold(
  topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
    title: title ?? context.l10n.programsWorkShellTitle,
    subtitle: title == null ? null : context.l10n.programsWorkShellTitle,
    emphasis: scrolledUnder
        ? CatchTopBarEmphasis.divided
        : CatchTopBarEmphasis.plain,
    navigation: const CatchTopBarNavigation(
      mode: CatchTopBarNavigationMode.back,
    ),
  ),
  body: body,
);
