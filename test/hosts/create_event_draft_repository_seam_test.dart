import 'dart:async';

import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _basics = PrivateEventBasics(
  name: 'Private event',
  city: EventSetupValue.set(
    EventSetupCity(cityId: 'in-mh-mumbai', marketId: 'in-mh-mumbai'),
  ),
  localDate: '2026-10-17',
  localStartTime: '19:00',
  timezone: EventSetupValue.set('Asia/Kolkata'),
);
const _update = PrivateEventBasicsUpdateRequest(
  organizerId: 'organizer-1',
  eventId: 'event-1',
  requestId: 'persisted-update-request',
  expectedSetupRevision: 7,
  basics: _basics,
);
const _receipt = PrivateEventCreateReceipt(
  eventId: 'event-1',
  setupRevision: 8,
  replayed: true,
);
const _summary = PrivateEventBasicSummary(
  eventId: 'event-1',
  organizerId: 'organizer-1',
  setupRevision: 8,
  name: 'Private event',
  city: EventSetupCity(cityId: 'in-mh-mumbai', marketId: 'in-mh-mumbai'),
  localDate: '2026-10-17',
  localStartTime: '19:00',
  timezone: 'Asia/Kolkata',
  startTimeMillis: 1792243800000,
  status: 'active',
  setupDefaults: {'reviewedDefaultsHash': 'frozen-defaults'},
  detailsConfigured: false,
  eventPreferences: null,
);

void main() {
  test(
    'create uses the generated repository override and exact snapshot',
    () async {
      final repository = _Repository();
      final controller = _controller(_container(repository));

      final result = controller.createPrivateEvent(
        organizerId: 'organizer-1',
        requestId: 'persisted-create-request',
        basics: _basics,
      );

      expect(result, same(repository.createResult));
      expect(await result, same(_receipt));
      expect(repository.createCalls, [
        ('organizer-1', 'persisted-create-request', _basics),
      ]);
      expect(repository.createCalls.single.$3, same(_basics));
    },
  );

  test(
    'update forwards the journal request and replay receipt unchanged',
    () async {
      final repository = _Repository();
      final controller = _controller(_container(repository));

      final result = controller.updatePrivateEventBasics(_update);

      expect(result, same(repository.updateResult));
      expect(await result, same(_receipt));
      expect(repository.updateCalls, [same(_update)]);
      expect(repository.updateCalls.single.expectedSetupRevision, 7);
      expect(
        repository.updateCalls.single.requestId,
        'persisted-update-request',
      );
    },
  );

  test(
    'get uses the override and retains organizer and event identity',
    () async {
      final repository = _Repository();
      final controller = _controller(_container(repository));

      final result = controller.getPrivateEventSetup(
        organizerId: 'organizer-1',
        eventId: 'event-1',
      );

      expect(result, same(repository.getResult));
      expect(await result, same(_summary));
      expect(repository.getCalls, [('organizer-1', 'event-1')]);
    },
  );

  for (final operation in ['create', 'update', 'get']) {
    test('$operation preserves repository errors without retrying', () async {
      final repository = _Repository();
      final receipt = Completer<PrivateEventCreateReceipt>();
      final summary = Completer<PrivateEventBasicSummary>();
      repository.createResult = receipt.future;
      repository.updateResult = receipt.future;
      repository.getResult = summary.future;
      final controller = _controller(_container(repository));
      final error = StateError('Uncertain repository outcome');

      final result = switch (operation) {
        'create' => controller.createPrivateEvent(
          organizerId: 'organizer-1',
          requestId: 'persisted-create-request',
          basics: _basics,
        ),
        'update' => controller.updatePrivateEventBasics(_update),
        _ => controller.getPrivateEventSetup(
          organizerId: 'organizer-1',
          eventId: 'event-1',
        ),
      };
      final expectation = expectLater(result, throwsA(same(error)));
      if (operation == 'get') {
        summary.completeError(error);
      } else {
        receipt.completeError(error);
      }
      await expectation;

      expect(repository.callCount, 1);
    });
  }

  test(
    'disposed and replacement containers keep pending commands separate',
    () async {
      final pending = Completer<PrivateEventCreateReceipt>();
      final firstRepository = _Repository()..createResult = pending.future;
      final firstContainer = _container(firstRepository);
      final first = _controller(firstContainer).createPrivateEvent(
        organizerId: 'old-organizer',
        requestId: 'old-request',
        basics: _basics,
      );
      firstContainer.dispose();

      final replacementRepository = _Repository();
      final replacement = _controller(_container(replacementRepository));
      final second = replacement.createPrivateEvent(
        organizerId: 'new-organizer',
        requestId: 'new-request',
        basics: _basics,
      );
      expect(await second, same(_receipt));

      const oldReceipt = PrivateEventCreateReceipt(
        eventId: 'old-event',
        setupRevision: 1,
        replayed: false,
      );
      pending.complete(oldReceipt);
      expect(await first, same(oldReceipt));
      expect(firstRepository.createCalls, [
        ('old-organizer', 'old-request', _basics),
      ]);
      expect(replacementRepository.createCalls, [
        ('new-organizer', 'new-request', _basics),
      ]);
      expect(firstRepository.callCount, 1);
      expect(replacementRepository.callCount, 1);
    },
  );
}

ProviderContainer _container(_Repository repository) => ProviderContainer.test(
  overrides: [
    privateEventSetupTimelineRepositoryProvider.overrideWithValue(repository),
    firebaseFunctionsProvider.overrideWith(
      (ref) => throw StateError('A repository override must bypass Firebase'),
    ),
  ],
);

CreateEventDraftController _controller(ProviderContainer container) {
  container.listen(createEventDraftControllerProvider, (_, _) {});
  return container.read(createEventDraftControllerProvider.notifier);
}

class _Repository extends Fake implements PrivateEventSetupRepository {
  Future<PrivateEventCreateReceipt> createResult = Future.value(_receipt);
  Future<PrivateEventCreateReceipt> updateResult = Future.value(_receipt);
  Future<PrivateEventBasicSummary> getResult = Future.value(_summary);
  final createCalls = <(String, String, PrivateEventBasics)>[];
  final updateCalls = <PrivateEventBasicsUpdateRequest>[];
  final getCalls = <(String, String)>[];

  int get callCount =>
      createCalls.length + updateCalls.length + getCalls.length;

  @override
  Future<PrivateEventCreateReceipt> create({
    required String organizerId,
    required String requestId,
    required PrivateEventBasics basics,
  }) {
    createCalls.add((organizerId, requestId, basics));
    return createResult;
  }

  @override
  Future<PrivateEventCreateReceipt> update(
    PrivateEventBasicsUpdateRequest request,
  ) {
    updateCalls.add(request);
    return updateResult;
  }

  @override
  Future<PrivateEventBasicSummary> get({
    required String organizerId,
    required String eventId,
  }) {
    getCalls.add((organizerId, eventId));
    return getResult;
  }
}
