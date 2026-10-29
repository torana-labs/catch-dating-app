import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/routing/app_deep_links.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  group('AppDeepLinks', () {
    test('builds an organizer detail URL from the router path contract', () {
      expect(
        AppDeepLinks.club('club-1').toString(),
        'https://catchdates.com/organizers/club-1',
      );
    });

    test('builds a nested event detail URL from the router path contract', () {
      expect(
        AppDeepLinks.event(clubId: 'club-1', eventId: 'event-1').toString(),
        'https://catchdates.com/organizers/club-1/events/event-1',
      );
    });

    test('encodes route parameter values as path segments', () {
      expect(
        AppDeepLinks.club('club with spaces').toString(),
        'https://catchdates.com/organizers/club%20with%20spaces',
      );
    });

    test('rejects missing route parameter values', () {
      expect(() => AppDeepLinks.club(''), throwsArgumentError);
    });

    test('builds consumer in-app event paths by default', () {
      expect(
        AppDeepLinks.inAppEventPath(clubId: 'club-1', eventId: 'event-1'),
        '/organizers/club-1/events/event-1',
      );
    });

    test('builds host in-app event paths for host app role', () {
      AppConfig.configureEntrypointRole(AppRole.host);

      expect(
        AppDeepLinks.inAppEventPath(clubId: 'club-1', eventId: 'event-1'),
        '/host/organizers/club-1/events/event-1',
      );
    });
  });
}
