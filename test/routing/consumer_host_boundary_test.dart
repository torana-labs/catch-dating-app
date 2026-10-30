import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('shared router does not import host management form implementations', () {
    final router = File('lib/routing/go_router.dart').readAsStringSync();

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
      contains(
        'hosts/presentation/organizer_management/host_create_organizer_screen.dart',
      ),
    );
    expect(
      router,
      contains(
        'hosts/presentation/event_management/host_create_event_screen.dart',
      ),
    );
  });

  test('host management implementation files live outside consumer folders', () {
    expect(
      File(
        'lib/organizers/presentation/create/create_organizer_screen.dart',
      ).existsSync(),
      isFalse,
    );
    expect(
      File('lib/events/presentation/create_event_screen.dart').existsSync(),
      isFalse,
    );
    expect(
      File(
        'lib/organizers/presentation/detail/organizer_host_management_controller.dart',
      ).existsSync(),
      isFalse,
    );
    expect(
      File(
        'lib/payments/presentation/host_payment_account_card.dart',
      ).existsSync(),
      isFalse,
    );
    expect(
      File(
        'lib/hosts/presentation/organizer_management/create/create_organizer_screen.dart',
      ).existsSync(),
      isTrue,
    );
    expect(
      File(
        'lib/hosts/presentation/event_management/create/create_event_screen.dart',
      ).existsSync(),
      isTrue,
    );
    expect(
      File(
        'lib/hosts/presentation/organizer_management/host_team_management_controller.dart',
      ).existsSync(),
      isTrue,
    );
    expect(
      File(
        'lib/hosts/presentation/payments/host_payment_account_card.dart',
      ).existsSync(),
      isTrue,
    );
  });
}
