import 'package:catch_dating_app/kernel/brand.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/routing/app_deep_links.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  group('AppDeepLinks', () {
    test('builds an organizer detail URL from the router path contract', () {
      expect(
        AppDeepLinks.organizer('club-1').toString(),
        '${Brand.webOrigin}/organizers/club-1',
      );
    });

    test('builds a nested event detail URL from the router path contract', () {
      expect(
        AppDeepLinks.event(clubId: 'club-1', eventId: 'event-1').toString(),
        '${Brand.webOrigin}/organizers/club-1/events/event-1',
      );
    });

    test('encodes route parameter values as path segments', () {
      expect(
        AppDeepLinks.organizer('club with spaces').toString(),
        '${Brand.webOrigin}/organizers/club%20with%20spaces',
      );
    });

    test('rejects missing route parameter values', () {
      expect(() => AppDeepLinks.organizer(''), throwsArgumentError);
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
