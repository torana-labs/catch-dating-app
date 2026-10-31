import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_messaging_setup_screen.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../organizers/organizers_test_helpers.dart';
import '../test_pump_helpers.dart';

void main() {
  setUp(() => AppConfig.configureEntrypointRole(AppRole.host));
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  testWidgets('setup route keeps its owners and omits an unavailable sender', (
    tester,
  ) async {
    const organizerId = 'organizer-route';
    final organizer = buildOrganizer(id: organizerId);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          watchOrganizerProvider(
            organizerId,
          ).overrideWithValue(AsyncData(organizer)),
          hostMessagingSetupProvider(organizerId).overrideWithValue(
            AsyncData(_messagingSetup(organizerId, providerConfigured: false)),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          builder: catchNoticeOverlayBuilder,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const HostMessagingSetupScreen(organizerId: organizerId),
        ),
      ),
    );
    await pumpFeatureUi(tester);

    expect(find.byType(CatchRouteScaffold), findsOneWidget);
    expect(find.byType(CatchPageBody), findsOneWidget);
    expect(find.byType(CustomScrollView), findsOneWidget);
    expect(find.text('WhatsApp Business settings'), findsOneWidget);
    expect(find.text('WHATSAPP BUSINESS SENDER'), findsNothing);
    expect(find.byType(CatchNotice), findsNothing);
    expect(find.text('Connect WhatsApp Business'), findsNothing);
  });

  testWidgets('hides sender connection where Embedded Signup is unavailable', (
    tester,
  ) async {
    const organizerId = 'organizer-1';

    await _pumpSection(tester, _messagingSetup(organizerId));

    // Tests run without Meta Embedded Signup, like the native Host apps.
    expect(find.text('WHATSAPP BUSINESS SENDER'), findsNothing);
    expect(find.text('Connect WhatsApp Business'), findsNothing);
  });

  testWidgets('manages an already connected sender without Embedded Signup', (
    tester,
  ) async {
    const organizerId = 'organizer-1';

    await _pumpSection(
      tester,
      _messagingSetup(organizerId, connection: _connection),
    );

    expect(find.text('WHATSAPP BUSINESS SENDER'), findsOneWidget);
    expect(find.text('Catch Social'), findsOneWidget);
    expect(find.text('Sync templates'), findsOneWidget);
    expect(find.text('Disconnect'), findsOneWidget);
    expect(find.text('Connect WhatsApp Business'), findsNothing);
  });
}

Future<void> _pumpSection(WidgetTester tester, HostMessagingSetup setup) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        hostMessagingSetupProvider(
          setup.organizerId,
        ).overrideWithValue(AsyncData(setup)),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        builder: catchNoticeOverlayBuilder,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: SingleChildScrollView(
            child: HostWhatsappSetupSection(
              organizer: buildOrganizer(id: setup.organizerId),
            ),
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

const _connection = HostWhatsappConnection(
  connectionId: 'connection-1',
  status: 'active',
  displayPhoneNumber: '+91 98765 43210',
  verifiedName: 'Catch Social',
  qualityRating: 'GREEN',
  messagingLimitTier: 'TIER_1K',
  templateSyncStatus: 'ready',
  webhookStatus: 'healthy',
  testStatus: 'verified',
  revision: 1,
);

HostMessagingSetup _messagingSetup(
  String organizerId, {
  bool providerConfigured = true,
  HostWhatsappConnection? connection,
}) => HostMessagingSetup(
  organizerId: organizerId,
  providerConfigured: providerConfigured,
  embeddedSignup: providerConfigured
      ? const HostWhatsappEmbeddedSignupConfig(
          appId: 'app-id',
          configId: 'config-id',
          graphVersion: 'v24.0',
        )
      : const HostWhatsappEmbeddedSignupConfig(
          appId: null,
          configId: null,
          graphVersion: null,
        ),
  connection: connection,
  templates: const [],
);
