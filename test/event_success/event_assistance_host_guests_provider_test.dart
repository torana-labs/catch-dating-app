import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_host_guests_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_assistance_participation_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_host_guests.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_host_guests_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_participation_editor.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_participation_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_host_guests_fixtures.dart';
import 'event_assistance_participation_fixtures.dart';

void main() {
  late _Repository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final selection = hostGuestsSelection();
  final provider = eventAssistanceHostGuestsProvider(selection);

  setUp(() {
    repository = _Repository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      retry: (_, _) => null,
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAssistanceHostGuestsRepositoryProvider.overrideWith(
          (ref) => repository,
        ),
        eventAssistanceParticipationRepositoryProvider.overrideWith(
          (ref) => _ParticipationRepository(),
        ),
      ],
    );
    container.listen(provider, (_, _) {});
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });

  Future<void> signIn(String? uid) async {
    final expectedReads = repository.requests.length + 1;
    auth.add(uid);
    await container.pump();
    if (uid != null) await repository.waitForRequests(expectedReads);
    await container.pump();
  }

  Future<void> complete(
    int index, [
    EventAssistanceHostGuestsView? view,
  ]) async {
    final request = repository.requests[index];
    request.pending.complete(
      view ?? hostGuestsView(selection: request.selection),
    );
    await container.pump();
  }

  test(
    'loading, sign-out and auth failures do not read or retain guest data',
    () async {
      expect(container.read(provider).isLoading, isTrue);
      expect(repository.requests, isEmpty);
      await signIn(null);
      expect(container.read(provider).error, isA<SignInRequiredException>());
      expect(repository.requests, isEmpty);
      await signIn('host-1');
      await complete(0);
      expect(container.read(provider).requireValue.accountId, 'host-1');
      await signIn(null);
      expect(container.read(provider).hasValue, isFalse);
      expect(container.read(provider).error, isA<SignInRequiredException>());
      container.read(provider.notifier).reload();
      await container.pump();
      expect(repository.requests, hasLength(1));
      auth.addError(StateError('authentication unavailable'));
      await container.pump();
      expect(container.read(provider).hasValue, isFalse);
      expect(container.read(provider).error, isA<StateError>());
    },
  );

  test('account changes immediately hide a loaded previous account', () async {
    await signIn('host-1');
    await complete(0);
    expect(container.read(provider).requireValue.accountId, 'host-1');
    await signIn('host-2');
    expect(repository.requests, hasLength(2));
    expect(container.read(provider).isLoading, isTrue);
    expect(container.read(provider).hasValue, isFalse);
    await complete(1);
    expect(container.read(provider).requireValue.accountId, 'host-2');
  });

  test('old account completion cannot publish into the new account', () async {
    await signIn('host-1');
    await signIn('host-2');
    expect(repository.requests, hasLength(2));
    await complete(0);
    expect(container.read(provider).isLoading, isTrue);
    expect(container.read(provider).hasValue, isFalse);
    final latest = hostGuestsView();
    await complete(1, latest);
    expect(container.read(provider).requireValue.accountId, 'host-2');
    expect(
      identical(container.read(provider).requireValue.view, latest),
      isTrue,
    );
  });

  test(
    'sign-out during a read never publishes the completed old response',
    () async {
      await signIn('host-1');
      await signIn(null);
      await complete(0);
      expect(container.read(provider).hasValue, isFalse);
      expect(container.read(provider).error, isA<SignInRequiredException>());
    },
  );

  test(
    'equal selections share reads and distinct selections remain independent',
    () async {
      await signIn('host-1');
      final equal = eventAssistanceHostGuestsProvider(hostGuestsSelection());
      container.listen(equal, (_, _) {});
      await container.pump();
      expect(repository.requests, hasLength(1));
      final secondSelection = hostGuestsSelection(attendeeIds: ['other']);
      final second = eventAssistanceHostGuestsProvider(secondSelection);
      container.listen(second, (_, _) {});
      await container.pump();
      expect(repository.requests, hasLength(2));
      await complete(1);
      expect(
        container.read(second).requireValue.view.selection,
        secondSelection,
      );
      expect(container.read(provider).isLoading, isTrue);
      await complete(0);
      expect(container.read(provider).requireValue.view.selection, selection);
    },
  );

  test(
    'reload starts a fresh read without letting an older completion win',
    () async {
      await signIn('host-1');
      container.read(provider.notifier).reload();
      await container.pump();
      await repository.waitForRequests(2);
      expect(repository.requests, hasLength(2));
      final latest = hostGuestsView();
      await complete(1, latest);
      await complete(0);
      expect(
        identical(container.read(provider).requireValue.view, latest),
        isTrue,
      );
    },
  );

  test('unavailable reads stay visible and explicit reload recovers', () async {
    await signIn('host-1');
    repository.requests.single.pending.completeError(
      const BackendOperationException(
        code: 'callable-unavailable',
        message: 'Not available.',
        context: BackendErrorContext(
          service: BackendService.functions,
          action: 'load guest assistance',
        ),
      ),
    );
    await container.pump();
    expect(container.read(provider).error, isA<BackendOperationException>());
    expect(container.read(provider).hasValue, isFalse);
    expect(repository.requests, hasLength(1));
    container.read(provider.notifier).reload();
    await container.pump();
    await repository.waitForRequests(2);
    expect(repository.requests, hasLength(2));
    await complete(1);
    expect(container.read(provider).requireValue.accountId, 'host-1');
  });

  test(
    'successful participation commands refresh the assistance read',
    () async {
      await signIn('host-1');
      await complete(0);
      final scope = participationScope();
      final query = eventAssistanceParticipationReviewProvider(scope);
      container.listen(query, (_, _) {});
      await container.read(
        eventAssistanceParticipationForAccountProvider(
          scope,
          account: container.read(authenticatedSessionProvider).requireValue,
        ).future,
      );
      await container.pump();
      final actions = eventAssistanceParticipationEditorProvider(scope);
      container.listen(actions, (_, _) {});
      final editor = container.read(actions.notifier)
        ..open(container.read(query).requireValue)
        ..select(EventParticipationChoice.departed);
      await editor.submit();
      await repository.waitForRequests(2);
      final refreshed = hostGuestsView();
      await complete(1, refreshed);
      expect(
        identical(container.read(provider).requireValue.view, refreshed),
        isTrue,
      );
    },
  );
}

class _Repository extends Fake implements EventAssistanceHostGuestsRepository {
  Completer<void> _changed = Completer<void>();
  final requests =
      <
        ({
          EventAssistanceGuestSelection selection,
          Completer<EventAssistanceHostGuestsView> pending,
        })
      >[];

  @override
  Future<EventAssistanceHostGuestsView> fetch(
    EventAssistanceGuestSelection selection,
  ) {
    final pending = Completer<EventAssistanceHostGuestsView>();
    requests.add((selection: selection, pending: pending));
    final changed = _changed;
    _changed = Completer<void>();
    changed.complete();
    return pending.future;
  }

  Future<void> waitForRequests(int count) async {
    while (requests.length < count) {
      await _changed.future.timeout(const Duration(seconds: 10));
    }
  }
}

class _ParticipationRepository extends Fake
    implements EventAssistanceParticipationRepository {
  @override
  Future<EventAssistanceParticipationView> fetch(
    EventAssistanceGuestScope scope,
  ) async => participationView();

  @override
  Future<EventAssistanceParticipationResult> apply(
    EventAssistanceParticipationChange change,
  ) async => EventAssistanceParticipationResult.fromCallableData(
    participationResponse(
      outcome: 'applied',
      participation: change.participation.toJson(),
      operationRevision: 3,
      revision: 3,
    ),
    expectedScope: change.snapshot.scope,
  );
}
