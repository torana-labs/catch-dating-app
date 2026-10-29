import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_departure_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_host_guests_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_host_guests.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_departure_fixtures.dart';
import 'event_assistance_host_guests_fixtures.dart';

final class DepartureSessionHarness {
  DepartureSessionHarness() {
    container = ProviderContainer(
      retry: (_, error) {
        automaticRetries.add(error);
        return null;
      },
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAssistanceDepartureRepositoryProvider.overrideWith(
          (ref) => repository,
        ),
        eventAssistanceHostGuestsRepositoryProvider.overrideWith(
          (ref) => guests,
        ),
      ],
    );
    container.listen(
      eventAssistanceDepartureProvider(departureScope()),
      (_, _) {},
    );
  }

  final auth = StreamController<String?>.broadcast();
  final automaticRetries = <Object>[];
  final editorSubscriptions =
      <ProviderSubscription<EventDepartureEditorState>>[];

  Future<void> closeEditors() async {
    for (final subscription in editorSubscriptions) {
      subscription.close();
    }
    editorSubscriptions.clear();
    await container.pump();
  }

  final repository = DepartureSessionRepository();
  final guests = DepartureHostGuestsRepository();
  late final ProviderContainer container;

  AsyncValue<EventDepartureSession> get current =>
      container.read(eventAssistanceDepartureProvider(departureScope()));
  EventDepartureSession get session => current.requireValue;

  Future<void> signIn([String? uid = departureActor]) async {
    final count = repository.reads.length + 1;
    auth.add(uid);
    await container.pump();
    if (uid != null) await repository.waitForReads(count);
    await container.pump();
  }

  Future<void> load({Map<String, Object?>? response}) async {
    await signIn();
    repository.completeRead(0, response: response);
    await container.pump();
  }

  EventAssistanceDepartureEditor editor([EventDepartureSession? reviewed]) {
    final provider = eventAssistanceDepartureEditorProvider(
      (reviewed ?? session).view.scope,
    );
    editorSubscriptions.add(container.listen(provider, (_, _) {}));
    return container.read(provider.notifier)..open(reviewed ?? session);
  }

  EventDepartureEditorState state(EventDepartureSession reviewed) => container
      .read(eventAssistanceDepartureEditorProvider(reviewed.view.scope));
  EventDepartureForm form(EventDepartureSession reviewed) =>
      state(reviewed) as EventDepartureForm;

  Future<void> dispose() async {
    container.dispose();
    await auth.close();
  }
}

final class DepartureSessionRepository extends Fake
    implements EventAssistanceDepartureRepository {
  Completer<void> _readChanged = Completer<void>();
  final reads =
      <
        ({
          EventAssistanceGroupScope scope,
          String actorUid,
          Completer<EventAssistanceGroupProgressView> pending,
        })
      >[];
  final reviews =
      <
        ({
          EventAssistanceGroupProgressView snapshot,
          EventAssistanceDepartureRosterSelection selection,
          Completer<EventAssistanceDepartureRosterReview> pending,
        })
      >[];
  final changes = <EventAssistanceDepartureChange>[];
  final confirmations = <Completer<EventAssistanceGroupProgressResult>>[];

  @override
  Future<EventAssistanceGroupProgressView> fetch(
    EventAssistanceGroupScope scope, {
    required String actorUid,
  }) {
    final pending = Completer<EventAssistanceGroupProgressView>();
    reads.add((scope: scope, actorUid: actorUid, pending: pending));
    final changed = _readChanged;
    _readChanged = Completer<void>();
    changed.complete();
    return pending.future;
  }

  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _readChanged.future.timeout(const Duration(seconds: 10));
    }
  }

  void completeRead(int index, {Map<String, Object?>? response}) {
    final request = reads[index];
    request.pending.complete(
      parseDeparture(
        response ??
            departureResponse(actorUid: request.actorUid, scope: request.scope),
        scope: request.scope,
        actorUid: request.actorUid,
      ).view,
    );
  }

  @override
  Future<EventAssistanceDepartureRosterReview> reviewRoster(
    EventAssistanceGroupProgressView snapshot,
    EventAssistanceDepartureRosterSelection selection,
  ) {
    final pending = Completer<EventAssistanceDepartureRosterReview>();
    reviews.add((snapshot: snapshot, selection: selection, pending: pending));
    return pending.future;
  }

  void completeReview(int index) {
    final request = reviews[index];
    request.pending.complete(
      EventAssistanceDepartureRosterReview.fromCallableData(
        {
          ...departureRosterResponse(
            attendeeIds: request.selection.attendeeIds,
            revision: request.snapshot.revision,
            serverTime: request.snapshot.serverTime + 1,
          ),
          'context': request.snapshot.scope.context,
          'groupId': request.snapshot.scope.groupId,
        },
        snapshot: request.snapshot,
        expectedSelection: request.selection,
      ),
    );
  }

  @override
  Future<EventAssistanceGroupProgressResult> confirm(
    EventAssistanceDepartureChange change,
  ) {
    changes.add(change);
    final pending = Completer<EventAssistanceGroupProgressResult>();
    confirmations.add(pending);
    return pending.future;
  }

  void completeConfirmation(int index, {bool replayed = false}) {
    final change = changes[index];
    confirmations[index].complete(
      parseDeparture(
        departureResponse(
          actorUid: change.snapshot.actorUid,
          scope: change.snapshot.scope,
          outcome: replayed ? 'replayed' : 'applied',
          operationRevision: change.snapshot.revision + 1,
          revision: change.snapshot.revision + (replayed ? 2 : 1),
          freshness: 'current',
          target: change.destination,
        ),
        scope: change.snapshot.scope,
        actorUid: change.snapshot.actorUid,
      ),
    );
  }
}

final class DepartureHostGuestsRepository extends Fake
    implements EventAssistanceHostGuestsRepository {
  final reads = <EventAssistanceGuestSelection>[];
  @override
  Future<EventAssistanceHostGuestsView> fetch(
    EventAssistanceGuestSelection selection,
  ) async {
    reads.add(selection);
    return hostGuestsView(selection: selection);
  }
}
