import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/hosts/organizer/messaging_body.dart';
import 'package:catch_dating_app/hosts/organizer/messaging_screen.dart';
import 'package:catch_dating_app/hosts/organizer/messaging_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../preview_layout_contracts.dart';

const _path = '[P1 product surfaces]/Host/Organiser/WhatsApp Business';

HostWhatsappConnection _connection(String status) => HostWhatsappConnection(
  connectionId: 'connection-1',
  status: status,
  displayPhoneNumber: '+91 98765 43210',
  verifiedName: 'Lantern Lane',
  qualityRating: 'GREEN',
  messagingLimitTier: 'TIER_1K',
  templateSyncStatus: 'ready',
  webhookStatus: 'healthy',
  testStatus: 'verified',
  revision: 1,
);

HostMessagingSetup _setup({
  HostWhatsappConnection? connection,
  List<HostWhatsappTemplate> templates = const [],
}) => HostMessagingSetup(
  organizerId: 'preview-organizer',
  providerConfigured: true,
  embeddedSignup: const HostWhatsappEmbeddedSignupConfig(
    appId: 'app-id',
    configId: 'config-id',
    graphVersion: 'v24.0',
  ),
  connection: connection,
  templates: templates,
);

const _template = HostWhatsappTemplate(
  templateId: 'template-1',
  name: 'event_invite',
  language: 'en',
  category: 'MARKETING',
  status: 'APPROVED',
  variableNames: ['name'],
  hasMediaHeader: false,
  buttonKinds: [],
);

Widget _body(OrganizerMessagingState state) => SizedBox(
  width: WidgetbookPreviewLayout.phoneChromeWidth,
  height: WidgetbookPreviewLayout.hostEditorViewportHeight,
  child: CatchRoot(
    child: CatchScreen(
      body: OrganizerMessagingBody(
        state: state,
        testPhone: TextEditingController(),
        onAction: (_) {},
      ),
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Not connected, web',
  type: OrganizerMessagingBody,
  path: _path,
)
Widget messagingNotConnected(BuildContext context) => _body(
  OrganizerMessagingState(setup: _setup(), embeddedSignupSupported: true),
);

@widgetbook.UseCase(
  name: 'Verification pending',
  type: OrganizerMessagingBody,
  path: _path,
)
Widget messagingTesting(BuildContext context) => _body(
  OrganizerMessagingState(
    setup: _setup(
      connection: _connection('testing'),
      templates: const [_template],
    ),
  ),
);

@widgetbook.UseCase(name: 'Active', type: OrganizerMessagingBody, path: _path)
Widget messagingActive(BuildContext context) => _body(
  OrganizerMessagingState(
    setup: _setup(
      connection: _connection('active'),
      templates: const [_template],
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Could not load',
  type: OrganizerMessagingBody,
  path: _path,
)
Widget messagingError(BuildContext context) =>
    _body(OrganizerMessagingState(error: StateError('offline')));

@widgetbook.UseCase(
  name: 'Signed-out scope',
  type: OrganizerMessagingScreen,
  path: _path,
)
Widget messagingScreen(BuildContext context) => ProviderScope(
  overrides: [uidProvider.overrideWithValue(const AsyncData(null))],
  child: const SizedBox(
    width: WidgetbookPreviewLayout.phoneChromeWidth,
    height: WidgetbookPreviewLayout.hostEditorViewportHeight,
    child: OrganizerMessagingScreen(organizerId: 'preview-organizer'),
  ),
);
