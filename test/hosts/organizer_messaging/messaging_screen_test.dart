import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/hosts/organizer/messaging_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_controller.dart';
import 'package:catch_l10n/generated/app_localizations.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/organizers_test_helpers.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _organizerId = 'organizer-1';
const _uid = 'host-1';

class _Commands extends Fake implements HostAudienceController {
  final calls = <String>[];
  Map<String, String>? testVariables;
  String? testPhone;

  @override
  Future<HostMessagingSetup> syncWhatsappTemplates({
    required String organizerId,
    required String connectionId,
  }) async {
    calls.add('sync:$connectionId');
    return _setup();
  }

  @override
  Future<HostMessagingSetup> disconnectWhatsapp({
    required String organizerId,
    required String connectionId,
  }) async {
    calls.add('disconnect:$connectionId');
    return _setup();
  }

  @override
  Future<HostMessagingSetup> sendWhatsappTest({
    required String organizerId,
    required String connectionId,
    required String templateId,
    required String toE164,
    required Map<String, String> templateVariables,
  }) async {
    calls.add('test:$templateId');
    testPhone = toE164;
    testVariables = templateVariables;
    return _setup();
  }
}

void main() {
  setUp(() => AppConfig.configureEntrypointRole(AppRole.host));
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  Future<_Commands> pump(WidgetTester tester, HostMessagingSetup setup) async {
    final commands = _Commands();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWithValue(const AsyncData(_uid)),
          hostOperableOrganizersProvider(_uid).overrideWithValue(
            AsyncData([buildOrganizer(id: _organizerId, name: 'Lantern Lane')]),
          ),
          hostMessagingSetupProvider(
            _organizerId,
          ).overrideWithValue(AsyncData(setup)),
          hostAudienceControllerProvider.overrideWithValue(commands),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const OrganizerMessagingScreen(organizerId: _organizerId),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    return commands;
  }

  testWidgets('offers nothing where the provider is not configured', (
    tester,
  ) async {
    await pump(tester, _setup(providerConfigured: false));
    expect(find.text('WhatsApp Business settings'), findsOneWidget);
    expect(find.text('WhatsApp Business sender'), findsNothing);
    expect(find.text('Connect WhatsApp Business'), findsNothing);
  });

  testWidgets('hides Connect where Embedded Signup is unavailable', (
    tester,
  ) async {
    // Tests run without Meta Embedded Signup, like the native Host apps.
    await pump(tester, _setup());
    expect(find.text('WhatsApp Business sender'), findsNothing);
    expect(find.text('Connect WhatsApp Business'), findsNothing);
  });

  testWidgets('manages a connected sender without Embedded Signup', (
    tester,
  ) async {
    final commands = await pump(tester, _setup(connection: _connection()));
    expect(find.text('Catch Social'), findsOneWidget);
    expect(find.text('+91 98765 43210'), findsOneWidget);
    expect(find.text('Active'), findsOneWidget);
    expect(find.text('No approved templates'), findsOneWidget);
    expect(find.text('Connect WhatsApp Business'), findsNothing);
    expect(find.text('Send verification message'), findsNothing);

    await tester.tap(find.text('Sync templates'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Disconnect'));
    await pumpFeatureUi(tester);
    expect(commands.calls, ['sync:connection-1', 'disconnect:connection-1']);
  });

  testWidgets('a sender in testing sends the verification message', (
    tester,
  ) async {
    final commands = await pump(
      tester,
      _setup(
        connection: _connection(status: 'testing'),
        templates: const [_template],
      ),
    );
    expect(find.text('Verification pending'), findsOneWidget);
    await tester.enterText(
      find.byKey(const ValueKey<String>('organizer-messaging-phone')),
      ' +919800000001 ',
    );
    await tester.tap(find.text('Send verification message'));
    await pumpFeatureUi(tester);
    expect(commands.calls, ['test:template-1']);
    expect(commands.testPhone, '+919800000001');
    expect(commands.testVariables, {
      'name': 'Catch test',
      'invite_token': 'catch-test',
      'invite_url': AppConfig.publicSiteUrl.toString(),
    });
    expect(
      find.text(
        'Meta accepted the test. The sender becomes active after the '
        'delivered webhook arrives.',
      ),
      findsOneWidget,
    );
  });
}

const _template = HostWhatsappTemplate(
  templateId: 'template-1',
  name: 'event_invite',
  language: 'en',
  category: 'MARKETING',
  status: 'APPROVED',
  variableNames: ['name', 'invite_token', 'invite_url'],
  hasMediaHeader: false,
  buttonKinds: [],
);

HostWhatsappConnection _connection({String status = 'active'}) =>
    HostWhatsappConnection(
      connectionId: 'connection-1',
      status: status,
      displayPhoneNumber: '+91 98765 43210',
      verifiedName: 'Catch Social',
      qualityRating: 'GREEN',
      messagingLimitTier: 'TIER_1K',
      templateSyncStatus: 'ready',
      webhookStatus: 'healthy',
      testStatus: 'verified',
      revision: 1,
    );

HostMessagingSetup _setup({
  bool providerConfigured = true,
  HostWhatsappConnection? connection,
  List<HostWhatsappTemplate> templates = const [],
}) => HostMessagingSetup(
  organizerId: _organizerId,
  providerConfigured: providerConfigured,
  embeddedSignup: const HostWhatsappEmbeddedSignupConfig(
    appId: 'app-id',
    configId: 'config-id',
    graphVersion: 'v24.0',
  ),
  connection: connection,
  templates: templates,
);
