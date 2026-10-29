import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_membership.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_membership_controller.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_membership_fixtures.dart';
import 'event_rehearsal_membership_result_fixtures.dart';

class RehearsalMembershipHarness {
  RehearsalMembershipHarness() {
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
      ],
    );
    container.listen(query, (_, _) {});
  }
  final repository = MembershipTestRepository();
  final auth = StreamController<String?>.broadcast();
  late final ProviderContainer container;
  final query = eventRehearsalAssistanceProvider('session-1');
  Future<void> dispose() async {
    container.dispose();
    await auth.close();
  }

  Future<void> signIn(String? uid) async {
    final expected = repository.reads.length + 1;
    auth.add(uid);
    await container.pump();
    if (uid != null) await repository.waitForReads(expected);
    await container.pump();
  }

  Future<void> completeRead(
    int index, {
    EventRehearsalBootstrap? snapshot,
  }) async {
    await repository.waitForReads(index + 1);
    repository.reads[index].complete(snapshot ?? practiceMembershipSnapshot());
    await container.pump();
  }

  Future<RehearsalAssistanceReview> review({
    String state = 'uninitialized',
    String uid = 'host-1',
  }) async {
    await signIn(uid);
    await completeRead(
      0,
      snapshot: practiceMembershipSnapshot(state: state, uid: uid),
    );
    return container.read(query).requireValue;
  }

  RehearsalMembershipRow row(
    RehearsalAssistanceReview review, [
    int index = 0,
  ]) => review.snapshot.membershipReviews!.rows[index];
  RehearsalMembershipForm form(RehearsalMembershipScope scope) =>
      container.read(eventRehearsalMembershipControllerProvider(scope))
          as RehearsalMembershipForm;
  EventRehearsalMembershipController editor(
    RehearsalAssistanceReview review, [
    int index = 0,
  ]) {
    final membership = row(review, index);
    final provider = eventRehearsalMembershipControllerProvider(
      membership.scope,
    );
    container.listen(provider, (_, _) {});
    return container.read(provider.notifier)..open(review, membership);
  }

  void confirm(int index, {bool later = false}) {
    final write = repository.writes[index];
    write.result.complete(
      EventRehearsalBootstrap.fromCallableData(
        practiceMembershipApplied(write.change, later: later),
      ),
    );
  }

  Future<void> fail(
    int index,
    Future<EventRehearsalBootstrap> pending, {
    Object error = const NetworkException('unavailable', 'Offline'),
  }) async {
    final check = expectLater(pending, throwsA(same(error)));
    repository.writes[index].result.completeError(error);
    await check;
  }
}

class MembershipTestRepository extends Fake
    implements EventRehearsalRepository {
  Completer<void> _changed = Completer<void>();
  final reads = <Completer<EventRehearsalBootstrap>>[];
  final writes =
      <
        ({
          RehearsalAssistanceChange change,
          Completer<EventRehearsalBootstrap> result,
        })
      >[];
  Future<void> waitForReads(int count) async {
    while (reads.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }

  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) {
    final result = Completer<EventRehearsalBootstrap>();
    reads.add(result);
    _changed.complete();
    _changed = Completer<void>();
    return result.future;
  }

  @override
  Future<EventRehearsalBootstrap> applyAssistance(
    RehearsalAssistanceChange change,
  ) {
    final result = Completer<EventRehearsalBootstrap>();
    writes.add((change: change, result: result));
    // The controller must independently check even a parsed repository response.
    return result.future;
  }
}
