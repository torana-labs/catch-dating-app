import 'dart:async';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_shell_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_view.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_departures_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_transport_views.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/live_paged_query.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_transport_views_repository.g.dart';

typedef _Rows = List<Map<Object?, Object?>>;

/// The transport desks (arrivals, dispatch, hotel desk, departures and the
/// planner's travel ledger) read through listeners (#1339) instead of
/// `getProgramArrivalsRoster`, `getProgramDeparturesRoster`,
/// `listProgramTrips`, `getProgramHotelInbound` and `listTransportVendors`.
/// Every read is gated on the account's authority, so cached rows stop at the
/// instant a duty does. The transport plan stays a callable: it is computed
/// on the server. The operations outbox and its writes are unchanged.
class ProgramTransportViewsRepository {
  const ProgramTransportViewsRepository(
    this._firestore,
    this._access,
    this._clock,
  );

  /// Rows are read in pages of this many, each page its own listener, up to
  /// [maxRows] a list (the departures callable capped at 500 journeys).
  static const pageSize = 100;
  static const maxRows = 500;

  final FirebaseFirestore _firestore;
  final ProgramAccessRepository _access;
  final AppClock _clock;

  static const _arrivalsContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load the arrivals roster',
    resource: 'programArrivalViews',
  );
  static const _departuresContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load the departures',
    resource: 'programDepartureViews',
  );
  static const _tripsContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load the trip ledger',
    resource: 'programTripViews',
  );
  static const _inboundContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load the hotel inbound view',
    resource: 'programHotelInboundViews',
  );
  static const _vendorsContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load transport vendors',
    resource: 'programVendorViews',
  );

  /// The arrivals the account's routes reach, optionally one pickup point's.
  Stream<ProgramArrivalsRoster> watchArrivals(
    String programId,
    String uid, {
    String? pickupPointId,
  }) => _access
      .gated<({ProgramAccessView access, _Rows rows})>(
        programId,
        uid,
        needs: const {},
        allows: (state) =>
            state.view!.liveArrivalRoutes(state.evaluatedAt).isNotEmpty,
        scopeOf: (state) =>
            _routesKey(state.view!.liveArrivalRoutes(state.evaluatedAt)),
        data: (state) => _rowsOf(
          [
            for (final query in _routeQueries(
              'programArrivalViews',
              programId,
              state.view!.liveArrivalRoutes(state.evaluatedAt),
              pickupPointId: pickupPointId,
            ))
              query,
          ],
          idField: 'legId',
          context: _arrivalsContext,
        ).map((rows) => (access: state.view!, rows: rows)),
      )
      .map(
        (source) => programArrivalsRosterFromViews(
          programId: programId,
          pickupPointId: pickupPointId,
          uid: uid,
          rows: source.rows,
          access: source.access,
          now: _clock.now(),
        ),
      );

  /// One hotel's departures, with the desk counts phased by the app clock.
  Stream<ProgramDeparturesRoster> watchDepartures(
    String programId,
    String hotelId,
    String uid,
  ) {
    final source = _access.gated<({String hotelName, _Rows rows})>(
      programId,
      uid,
      needs: const {},
      allows: (state) => state.view!.coversHotel(
        ProgramStaffDuty.hotelDesk,
        hotelId,
        state.evaluatedAt,
      ),
      scopeOf: (state) => hotelId,
      data: (state) => combineLatest(
        _hotelName(programId, hotelId, _departuresContext),
        _rowsOf(
          [
            _firestore
                .collection('programDepartureViews')
                .where('programId', isEqualTo: programId)
                .where('hotelId', isEqualTo: hotelId),
          ],
          idField: 'legId',
          context: _departuresContext,
        ),
        (hotelName, rows) => (hotelName: hotelName, rows: rows),
      ),
    );
    return clockedListener<
      ({String hotelName, _Rows rows}),
      ProgramDeparturesRoster
    >(
      source,
      clock: _clock,
      build: (raw, now) => programDeparturesRosterFromViews(
        programId: programId,
        hotelId: hotelId,
        hotelName: raw.hotelName,
        rows: raw.rows,
        now: now,
      ),
      nextRebuildAt: (roster) =>
          nextDeparturesCountChange(roster, roster.generatedAt),
    );
  }

  /// The trip ledger the account's trip routes reach.
  Stream<ProgramTripList> watchTrips(String programId, String uid) => _access
      .gated<({ProgramAccessView access, _Rows rows})>(
        programId,
        uid,
        needs: const {},
        allows: (state) =>
            state.view!.liveTripRoutes(state.evaluatedAt).isNotEmpty,
        scopeOf: (state) =>
            _routesKey(state.view!.liveTripRoutes(state.evaluatedAt)),
        data: (state) => _rowsOf(
          [
            ..._routeQueries(
              'programTripViews',
              programId,
              state.view!.liveTripRoutes(state.evaluatedAt),
            ),
          ],
          idField: 'tripId',
          context: _tripsContext,
        ).map((rows) => (access: state.view!, rows: rows)),
      )
      .map(
        (source) => programTripListFromViews(
          programId: programId,
          rows: source.rows,
          access: source.access,
        ),
      );

  /// The hotel desk's inbound board: vehicles still en route to the hotel
  /// and the guests expected there.
  Stream<ProgramHotelInbound> watchHotelInbound(
    String programId,
    String hotelId,
    String uid,
  ) => _access
      .gated<
        ({ProgramAccessView access, String hotelName, _Rows trips, _Rows legs})
      >(
        programId,
        uid,
        needs: const {},
        allows: (state) => state.view!.coversHotel(
          ProgramStaffDuty.hotelDesk,
          hotelId,
          state.evaluatedAt,
        ),
        scopeOf: (state) => hotelId,
        data: (state) => combineLatest(
          combineLatest(
            _hotelName(programId, hotelId, _inboundContext),
            _rowsOf(
              [
                _firestore
                    .collection('programTripViews')
                    .where('programId', isEqualTo: programId)
                    .where('hotelKey', isEqualTo: hotelId)
                    .where('status', isEqualTo: 'enRoute'),
              ],
              idField: 'tripId',
              context: _inboundContext,
            ),
            (name, trips) => (name: name, trips: trips),
          ),
          _rowsOf(
            [
              _firestore
                  .collection('programHotelInboundViews')
                  .where('programId', isEqualTo: programId)
                  .where('hotelId', isEqualTo: hotelId),
            ],
            idField: 'legId',
            context: _inboundContext,
          ),
          (partial, legs) => (
            access: state.view!,
            hotelName: partial.name,
            trips: partial.trips,
            legs: legs,
          ),
        ),
      )
      .map(
        (source) => programHotelInboundFromViews(
          programId: programId,
          hotelId: hotelId,
          hotelName: source.hotelName,
          trips: source.trips,
          expected: source.legs,
          access: source.access,
          now: _clock.now(),
        ),
      );

  /// The vendors bound to the programme, for the dispatch sheet and the
  /// planner's vendor page.
  Stream<List<ProgramVendorOption>> watchVendors(
    String programId,
    String uid,
  ) => _access
      .gated<_Rows>(
        programId,
        uid,
        needs: const {},
        allows: (state) => state.view!.holdsDuty(
          ProgramStaffDuty.transportDispatcher,
          state.evaluatedAt,
        ),
        scopeOf: (state) => 'vendors',
        data: (state) => _rowsOf(
          [
            _firestore
                .collection('programVendorViews')
                .where('programId', isEqualTo: programId),
          ],
          idField: 'vendorId',
          context: _vendorsContext,
        ),
      )
      .map(programVendorsFromViews);

  /// The hotel's label from its work-shell resource view.
  Stream<String> _hotelName(
    String programId,
    String hotelId,
    BackendErrorContext context,
  ) => withBackendErrorStream(
    () => _firestore
        .collection(ProgramWorkShellRepository.resources)
        .doc('${programId}__hotel__$hotelId')
        .snapshots()
        .map((snapshot) => snapshot.data()?['label'] as String? ?? ''),
    context: context,
  );

  /// One query per route a scoped account holds, or one unfiltered query for
  /// the owner and the all-routes key. A route names a side only when it is
  /// not `*`, as the rules need each side proven by the query.
  List<Query<Map<String, dynamic>>> _routeQueries(
    String collection,
    String programId,
    List<ProgramRoute> routes, {
    String? pickupPointId,
  }) {
    Query<Map<String, dynamic>> base() => _firestore
        .collection(collection)
        .where('programId', isEqualTo: programId);
    final queries = <Query<Map<String, dynamic>>>[];
    for (final route in routes) {
      String? pickup = route.pickup == ProgramAccessView.allKey
          ? null
          : route.pickup;
      if (pickupPointId != null) {
        if (pickup != null && pickup != pickupPointId) continue;
        pickup = pickupPointId;
      }
      final hotel = route.hotel == ProgramAccessView.allKey
          ? null
          : route.hotel;
      var query = base();
      if (pickup != null) query = query.where('pickupKey', isEqualTo: pickup);
      if (hotel != null) query = query.where('hotelKey', isEqualTo: hotel);
      queries.add(query);
      // An unfiltered query already covers every other route.
      if (pickup == null && hotel == null) return [query];
    }
    return queries;
  }

  String _routesKey(List<ProgramRoute> routes) =>
      [for (final route in routes) '${route.pickup}|${route.hotel}'].join(',');

  /// The rows of every query, a page at a time (each page its own live
  /// listener), each document once. No ordering beyond the document id:
  /// callers order the rows they hold.
  Stream<_Rows> _rowsOf(
    List<Query<Map<String, dynamic>>> queries, {
    required String idField,
    required BackendErrorContext context,
  }) {
    if (queries.isEmpty) return Stream.value(const []);
    Stream<_Rows> one(Query<Map<String, dynamic>> query) {
      final pager = LivePagedQuery<Map<String, dynamic>, Map<Object?, Object?>>(
        query: query.orderBy(FieldPath.documentId),
        pageSize: pageSize,
        maxRows: maxRows,
        convert: (doc) => doc.data(),
        errorContext: context,
      );
      // The screens count and group every row, so each next page opens as
      // soon as the one before it has arrived.
      return pager.pages.map((pages) {
        if (pages.hasMore &&
            !pages.loadingMore &&
            pages.nextPageError == null &&
            pages.items.length < maxRows) {
          pager.loadMore();
        }
        return pages.items;
      });
    }

    var combined = one(queries.first);
    for (final next in queries.skip(1)) {
      combined = combineLatest<_Rows, _Rows, _Rows>(
        combined,
        one(next),
        (a, b) => [...a, ...b],
      );
    }
    return combined.map((rows) {
      final seen = <Object?>{};
      return [
        for (final row in rows)
          if (seen.add(row[idField])) row,
      ];
    });
  }
}

// keepalive: a stateless repository over account-free SDK singletons.
@Riverpod(keepAlive: true)
ProgramTransportViewsRepository programTransportViewsRepository(Ref ref) =>
    ProgramTransportViewsRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(programAccessRepositoryProvider),
      ref.watch(appClockProvider),
    );

String _signedInUid(Ref ref, String action) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) throw SignInRequiredException(action);
  return uid;
}

/// The arrivals roster the account's routes reach, live.
@riverpod
Stream<ProgramArrivalsRoster> programArrivalsStream(
  Ref ref,
  String programId,
  String? pickupPointId,
) => ref
    .watch(programTransportViewsRepositoryProvider)
    .watchArrivals(
      programId,
      _signedInUid(ref, 'view the arrivals'),
      pickupPointId: pickupPointId,
    );

/// One hotel's departures, live.
@riverpod
Stream<ProgramDeparturesRoster> programDeparturesStream(
  Ref ref,
  String programId,
  String hotelId,
) => ref
    .watch(programTransportViewsRepositoryProvider)
    .watchDepartures(
      programId,
      hotelId,
      _signedInUid(ref, 'view the departures'),
    );

/// The trip ledger, live.
@riverpod
Stream<ProgramTripList> programTripsStream(Ref ref, String programId) => ref
    .watch(programTransportViewsRepositoryProvider)
    .watchTrips(programId, _signedInUid(ref, 'view the trip ledger'));

/// One hotel's inbound board, live.
@riverpod
Stream<ProgramHotelInbound> programHotelInboundStream(
  Ref ref,
  String programId,
  String hotelId,
) => ref
    .watch(programTransportViewsRepositoryProvider)
    .watchHotelInbound(
      programId,
      hotelId,
      _signedInUid(ref, 'view the hotel desk'),
    );

/// The vendors bound to a programme, live.
@riverpod
Stream<List<ProgramVendorOption>> programVendorsStream(
  Ref ref,
  String programId,
) => ref
    .watch(programTransportViewsRepositoryProvider)
    .watchVendors(programId, _signedInUid(ref, 'view the vendors'));
