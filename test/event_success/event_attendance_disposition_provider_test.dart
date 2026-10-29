import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_attendance_disposition_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_participation.dart';
import 'package:catch_dating_app/event_success/presentation/event_attendance_disposition_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_attendance_disposition_fixtures.dart';

void main() {
  late AttendanceTestRepository repository;
  late StreamController<String?> auth;
  late ProviderContainer container;
  final provider = eventAttendanceDispositionProvider(attendanceScope());

  Future<void> signIn(String? uid) async {
    final count = repository.reads.length + 1;
    auth.add(uid);
    await container.pump();
    if (uid != null) await repository.waitForReads(count);
    await container.pump();
  }

  setUp(() {
    repository = AttendanceTestRepository();
    auth = StreamController<String?>.broadcast();
    container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => auth.stream),
        eventAttendanceDispositionRepositoryProvider.overrideWith(
          (ref) => repository,
        ),
      ],
    );
    container.listen(provider, (_, _) {});
  });
  tearDown(() async {
    container.dispose();
    await auth.close();
  });

  test('loading and sign-out expose no previous guest review', () async {
    expect(container.read(provider).isLoading, isTrue);
    expect(repository.reads, isEmpty);
    await signIn('host-1');
    expect(repository.reads.single.scope, attendanceScope());
    repository.reads.single.result.complete(attendanceView());
    await container.pump();
    final first = container.read(provider).requireValue;
    expect(first.account.uid, 'host-1');
    container.read(provider.notifier).reload();
    await container.pump();
    await repository.waitForReads(2);
    expect(container.read(provider).isLoading, isTrue);
    expect(container.read(provider).hasValue, isFalse);
    repository.reads.last.result.complete(attendanceView());
    await container.pump();
    final refreshed = container.read(provider).requireValue;
    expect(refreshed.account, same(first.account));
    expect(refreshed, isNot(same(first)));
    await signIn(null);
    expect(container.read(provider).hasValue, isFalse);
    expect(container.read(provider).error, isA<SignInRequiredException>());
  });

  test(
    'a response for the previous account cannot surface after switching',
    () async {
      await signIn('host-1');
      final old = repository.reads.single;
      await signIn('host-2');
      final current = repository.reads.last;
      current.result.complete(attendanceView());
      await container.pump();
      final review = container.read(provider).requireValue;
      old.result.complete(
        attendanceView(viewPatch: {'displayName': 'Old account guest'}),
      );
      await container.pump();
      expect(container.read(provider).requireValue, same(review));
      expect(review.account.uid, 'host-2');
      expect(review.view.displayName, 'Avery');
    },
  );

  test('unavailable reads stay errors without automatic retries', () async {
    await signIn('host-1');
    const error = BackendOperationException(
      code: 'callable-unavailable',
      message: 'Not deployed',
      context: BackendErrorContext(
        service: BackendService.functions,
        action: 'read attendance closeout',
      ),
    );
    repository.reads.single.result.completeError(error);
    await container.pump();
    expect(container.read(provider).hasValue, isFalse);
    expect(container.read(provider).error, same(error));
    await container.pump();
    expect(repository.reads, hasLength(1));
    container.read(provider.notifier).reload();
    await container.pump();
    await repository.waitForReads(2);
    repository.reads.last.result.complete(attendanceView());
    await container.pump();
    expect(container.read(provider).hasValue, isTrue);
  });

  test('each attendee scope has its own reviewed source and reload', () async {
    await signIn('host-1');
    final otherScope = EventAssistanceGuestScope(
      organizerId: 'organizer-1',
      eventId: 'event-1',
      attendeeId: 'attendee-2',
    );
    final other = eventAttendanceDispositionProvider(otherScope);
    container.listen(other, (_, _) {});
    await repository.waitForReads(2);
    expect(repository.reads[0].scope.attendeeId, 'attendee-1');
    expect(repository.reads[1].scope.attendeeId, 'attendee-2');
    repository.reads[0].result.complete(attendanceView());
    // The independent read remains pending; refreshing one cannot release it.
    await container.pump();
    container.read(provider.notifier).reload();
    await repository.waitForReads(3);
    expect(repository.reads.last.scope, attendanceScope());
    expect(container.read(other).hasValue, isFalse);
  });
}
