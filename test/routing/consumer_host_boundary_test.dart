import 'package:catch_test_support/repo_file.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the guest router imports no Host screens', () {
    final router = repoFile(
      'lib/routing/consumer_router.dart',
    ).readAsStringSync();

    expect(router, isNot(contains('package:catch_dating_app/hosts/')));
    expect(
      router,
      isNot(
        contains("import 'package:catch_dating_app/routing/host_router.dart'"),
      ),
    );
  });

  test('host router does not import host management form implementations', () {
    final router = repoFile('lib/routing/host_router.dart').readAsStringSync();

    expect(router, isNot(contains('organizers/presentation/create/')));
    expect(
      router,
      isNot(contains('events/presentation/create_event_screen.dart')),
    );
    expect(
      router,
      isNot(contains('hosts/presentation/organizer_management/create/')),
    );
    expect(
      router,
      isNot(contains('hosts/presentation/event_management/create/')),
    );
    expect(
      router,
      contains('hosts/onboarding/host_create_organizer_screen.dart'),
    );
    expect(router, contains('hosts/create/create_route_screen.dart'));
  });

  test('host management implementation files live outside consumer folders', () {
    expect(
      repoFile(
        'lib/organizers/presentation/create/create_organizer_screen.dart',
      ).existsSync(),
      isFalse,
    );
    expect(
      repoFile('lib/events/presentation/create_event_screen.dart').existsSync(),
      isFalse,
    );
    expect(
      repoFile(
        'lib/organizers/presentation/detail/organizer_host_management_controller.dart',
      ).existsSync(),
      isFalse,
    );
    expect(
      repoFile(
        'lib/payments/presentation/host_payment_account_card.dart',
      ).existsSync(),
      isFalse,
    );
    expect(
      repoFile('lib/hosts/onboarding/setup_screen.dart').existsSync(),
      isTrue,
    );
    expect(
      repoFile('lib/hosts/create/create_screen.dart').existsSync(),
      isTrue,
    );
    expect(
      repoFile(
        'lib/hosts/organizer/team/host_team_management_controller.dart',
      ).existsSync(),
      isTrue,
    );
    expect(
      repoFile('lib/hosts/organizer/payments_screen.dart').existsSync(),
      isTrue,
    );
  });
}
