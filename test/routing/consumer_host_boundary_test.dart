import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'shared router does not import host management form implementations',
    () {
      final router = File('lib/routing/go_router.dart').readAsStringSync();

      expect(router, isNot(contains('clubs/presentation/create/')));
      expect(
        router,
        isNot(contains('events/presentation/create_event_screen.dart')),
      );
      expect(
        router,
        isNot(contains('hosts/presentation/club_management/create/')),
      );
      expect(
        router,
        isNot(contains('hosts/presentation/event_management/create/')),
      );
      expect(
        router,
        contains(
          'hosts/presentation/club_management/host_create_club_screen.dart',
        ),
      );
      expect(
        router,
        contains(
          'hosts/presentation/event_management/host_create_event_screen.dart',
        ),
      );
    },
  );

  test('host management implementation files live outside consumer folders', () {
    expect(
      File(
        'lib/organizers/presentation/create/create_club_screen.dart',
      ).existsSync(),
      isFalse,
    );
    expect(
      File('lib/events/presentation/create_event_screen.dart').existsSync(),
      isFalse,
    );
    expect(
      File(
        'lib/organizers/presentation/detail/club_host_management_controller.dart',
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
