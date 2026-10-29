import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('HostMessagingSetup.canManageWhatsappSender', () {
    test('is unavailable without a configured provider', () {
      final setup = _setup(providerConfigured: false, connected: true);

      expect(
        setup.canManageWhatsappSender(embeddedSignupSupported: true),
        isFalse,
      );
      expect(
        setup.canManageWhatsappSender(embeddedSignupSupported: false),
        isFalse,
      );
    });

    test('needs Embedded Signup to connect a new sender', () {
      final setup = _setup(providerConfigured: true, connected: false);

      expect(
        setup.canManageWhatsappSender(embeddedSignupSupported: true),
        isTrue,
      );
      expect(
        setup.canManageWhatsappSender(embeddedSignupSupported: false),
        isFalse,
      );
    });

    test('manages a connected sender on every client', () {
      final setup = _setup(providerConfigured: true, connected: true);

      expect(
        setup.canManageWhatsappSender(embeddedSignupSupported: true),
        isTrue,
      );
      expect(
        setup.canManageWhatsappSender(embeddedSignupSupported: false),
        isTrue,
      );
    });
  });
}

HostMessagingSetup _setup({
  required bool providerConfigured,
  required bool connected,
}) => HostMessagingSetup(
  organizerId: 'organizer-1',
  providerConfigured: providerConfigured,
  embeddedSignup: const HostWhatsappEmbeddedSignupConfig(
    appId: 'app-id',
    configId: 'config-id',
    graphVersion: 'v24.0',
  ),
  connection: connected
      ? const HostWhatsappConnection(
          connectionId: 'connection-1',
          status: 'pending',
          displayPhoneNumber: null,
          verifiedName: null,
          qualityRating: null,
          messagingLimitTier: null,
          templateSyncStatus: 'pending',
          webhookStatus: 'pending',
          testStatus: 'pending',
          revision: 1,
        )
      : null,
  templates: const [],
);
