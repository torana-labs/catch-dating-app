import 'package:catch_dating_app/contexts/programmes/domain/phone_import_access.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_policy.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:flutter/foundation.dart';

/// The jobs a staff member does at a programme.
enum StaffJobKind { greeter, dispatch, hotel, door, lead }

/// The other programme pages this person may open, beside their jobs.
enum StaffJobLink {
  alerts,
  messages,
  inbox,
  guests,
  importList,
  phoneImport,
  trips,
  counts,
  attendance,
}

/// One job: what it is and where, with the function it runs at for a door.
@immutable
class StaffJob {
  const StaffJob({
    required this.kind,
    required this.title,
    required this.placeId,
    this.function,
  });

  final StaffJobKind kind;

  /// The station, hotel, function or programme the job is at.
  final String title;

  /// The pickup point, hotel or function the job opens; empty for the lead.
  final String placeId;
  final ProgramFunction? function;
}

/// Where the jobs screen is: reading access, showing the jobs, or unable to.
enum StaffJobsStatus { loading, content, error }

/// Everything the jobs body shows, as plain values: the job on now as the
/// spotlight, the next function as the tile, the rest under Later and the
/// other pages this person may open.
@immutable
class StaffJobsState {
  const StaffJobsState({
    required this.status,
    this.title = '',
    this.now,
    this.onNow,
    this.next,
    this.later = const <StaffJob>[],
    this.links = const <StaffJobLink>[],
    this.accessEndsAt,
    this.savedAt,
  });

  const StaffJobsState.loading() : this(status: StaffJobsStatus.loading);

  const StaffJobsState.error() : this(status: StaffJobsStatus.error);

  /// Sorts what [access] allows into the job on now, the next function and
  /// the rest, as of [now]. [savedAt] is set when the access came from this
  /// phone's saved copy.
  factory StaffJobsState.fromAccess(
    ProgramWorkAccess access, {
    required DateTime now,
    DateTime? savedAt,
  }) {
    final dispatcherScope = access.stationScope(
      ProgramStaffDuty.transportDispatcher,
      now: now,
    );
    final hotelScope = access.hotelScope(ProgramStaffDuty.hotelDesk, now: now);
    final greeter = [
      for (final station in access.pickupPoints)
        if (canReadProgramStation(
          access,
          station.pickupPointId,
          dispatch: false,
          now: now,
        ))
          StaffJob(
            kind: StaffJobKind.greeter,
            title: station.label,
            placeId: station.pickupPointId,
          ),
    ];
    final dispatch = [
      if (access.hasDuty(ProgramStaffDuty.transportDispatcher, now: now))
        for (final station in access.pickupPoints)
          if (dispatcherScope == null ||
              dispatcherScope.contains(station.pickupPointId))
            StaffJob(
              kind: StaffJobKind.dispatch,
              title: station.label,
              placeId: station.pickupPointId,
            ),
    ];
    final hotels = [
      if (access.hasDuty(ProgramStaffDuty.hotelDesk, now: now))
        for (final hotel in access.hotels)
          if (hotelScope == null || hotelScope.contains(hotel.hotelId))
            StaffJob(
              kind: StaffJobKind.hotel,
              title: hotel.name,
              placeId: hotel.hotelId,
            ),
    ];
    final doors = [
      for (final function in [
        ...access.functions,
      ]..sort((a, b) => a.startsAt.compareTo(b.startsAt)))
        if (function.status != ProgramFunctionStatus.cancelled &&
            function.endsAt.isAfter(now) &&
            canReadProgramFunction(access, function.functionId, now: now))
          StaffJob(
            kind: StaffJobKind.door,
            title: function.name,
            placeId: function.functionId,
            function: function,
          ),
    ];
    final lead = access.hasDuty(ProgramStaffDuty.functionLead, now: now)
        ? StaffJob(kind: StaffJobKind.lead, title: access.title, placeId: '')
        : null;

    bool live(StaffJob job) =>
        job.function != null && !job.function!.startsAt.isAfter(now);
    final onNow =
        doors.where(live).firstOrNull ??
        greeter.firstOrNull ??
        dispatch.firstOrNull ??
        hotels.firstOrNull ??
        lead;
    final next = doors.where((job) => job != onNow && !live(job)).firstOrNull;
    final later = [
      ...[...greeter, ...dispatch, ...hotels, ?lead],
      ...doors,
    ].where((job) => job != onNow && job != next).toList(growable: false);

    final readsTrips =
        access.isManager ||
        access.hasDuty(ProgramStaffDuty.transportDispatcher, now: now) ||
        access.hasDuty(ProgramStaffDuty.reconciliationViewer, now: now);
    final guests = access.hasDuty(ProgramStaffDuty.guestRelations, now: now);
    final messages = access.hasDuty(ProgramStaffDuty.communications, now: now);
    return StaffJobsState(
      status: StaffJobsStatus.content,
      title: access.title,
      now: now,
      onNow: onNow,
      next: next,
      later: later,
      links: [
        if (lead != null) StaffJobLink.alerts,
        if (messages) StaffJobLink.messages,
        if (messages && access.isManager) StaffJobLink.inbox,
        if (guests) StaffJobLink.guests,
        if (guests) StaffJobLink.importList,
        if (savedAt == null && canImportWeddingPhoneContacts(access, now))
          StaffJobLink.phoneImport,
        if (readsTrips) StaffJobLink.trips,
        if (access.hasDuty(ProgramStaffDuty.stakeholderViewer, now: now))
          StaffJobLink.counts,
        if (access.isManager ||
            access.hasDuty(ProgramStaffDuty.reconciliationViewer, now: now))
          StaffJobLink.attendance,
      ],
      accessEndsAt: access.grantExpiresAt,
      savedAt: savedAt,
    );
  }

  final StaffJobsStatus status;

  /// The programme's name.
  final String title;

  /// The clock the jobs were sorted by.
  final DateTime? now;

  /// The job to do now: a door that is open, or the first standing job.
  final StaffJob? onNow;

  /// The next function this person works at.
  final StaffJob? next;
  final List<StaffJob> later;
  final List<StaffJobLink> links;

  /// When this person's access to the programme ends.
  final DateTime? accessEndsAt;

  /// When the phone saved the access it shows, while offline.
  final DateTime? savedAt;

  bool get isEmpty =>
      onNow == null && next == null && later.isEmpty && links.isEmpty;
}
