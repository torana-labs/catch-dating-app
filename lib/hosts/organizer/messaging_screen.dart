import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/messaging/data/host_whatsapp_embedded_signup.dart';
import 'package:catch_dating_app/hosts/organizer/messaging_body.dart';
import 'package:catch_dating_app/hosts/organizer/messaging_state.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_controller.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// WhatsApp Business settings for one organizer: the organizer's own Meta
/// sender.
///
/// It reads the organizer scope and [hostMessagingSetupProvider], and runs
/// the existing sender commands on [hostAudienceControllerProvider]: connect
/// through Meta Embedded Signup (web only), sync templates, disconnect, and
/// send the verification message that activates a new sender.
class OrganizerMessagingScreen extends ConsumerStatefulWidget {
  const OrganizerMessagingScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  ConsumerState<OrganizerMessagingScreen> createState() =>
      _OrganizerMessagingScreenState();
}

class _OrganizerMessagingScreenState
    extends ConsumerState<OrganizerMessagingScreen> {
  final _testPhone = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _testPhone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final read = watchHostOrganizerScope(ref, organizerId: widget.organizerId);
    final scope = read.scope;
    final organizer = scope?.organizer;
    final Widget body;
    if (scope == null || organizer == null) {
      body = HostOrganizerScopeBody(
        gap: read.gap,
        error: read.error,
        onRetry: () => retryHostOrganizerScope(ref),
      );
    } else {
      final setup = catchAsyncStateFromAsyncValue(
        ref.watch(hostMessagingSetupProvider(organizer.id)),
      );
      final state = OrganizerMessagingState(
        setup: setup.value,
        error: setup.error,
        embeddedSignupSupported: hostWhatsappEmbeddedSignupSupported,
        busy: _busy,
      );
      body = OrganizerMessagingBody(
        state: state,
        testPhone: _testPhone,
        onAction: (action) => unawaited(_act(organizer.id, state, action)),
      );
    }
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-organizer-messaging-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostSendsSettings,
          kicker: organizer?.name,
          back: CatchTopBarBack(label: l10n.hostOrganizerBack),
        ),
        body: body,
      ),
    );
  }

  Future<void> _act(
    String organizerId,
    OrganizerMessagingState state,
    OrganizerMessagingAction action,
  ) async {
    final setup = state.setup;
    final connection = state.connection;
    switch (action) {
      case OrganizerMessagingAction.retry:
        ref.invalidate(hostMessagingSetupProvider(organizerId));
      case OrganizerMessagingAction.connect:
        if (setup == null) return;
        // Read before the signup: a signup that finishes after the screen
        // closed still completes the connection.
        final commands = ref.read(hostAudienceControllerProvider);
        await _run(() async {
          final result = await startHostWhatsappEmbeddedSignup(
            setup.embeddedSignup,
          );
          await commands.completeWhatsappConnection(
            organizerId: organizerId,
            result: result,
          );
        });
      case OrganizerMessagingAction.syncTemplates:
        if (connection == null) return;
        await _run(
          () => ref
              .read(hostAudienceControllerProvider)
              .syncWhatsappTemplates(
                organizerId: organizerId,
                connectionId: connection.connectionId,
              ),
        );
      case OrganizerMessagingAction.disconnect:
        if (connection == null) return;
        await _run(
          () => ref
              .read(hostAudienceControllerProvider)
              .disconnectWhatsapp(
                organizerId: organizerId,
                connectionId: connection.connectionId,
              ),
        );
      case OrganizerMessagingAction.sendTest:
        final template = setup?.approvedTemplates.firstOrNull;
        if (connection == null || template == null) return;
        await _run(() async {
          await ref
              .read(hostAudienceControllerProvider)
              .sendWhatsappTest(
                organizerId: organizerId,
                connectionId: connection.connectionId,
                templateId: template.templateId,
                toE164: _testPhone.text.trim(),
                templateVariables: organizerMessagingTestVariables(template),
              );
          if (mounted) {
            showCatchNotice(context, context.l10n.hostsHostAudienceTestPending);
          }
        });
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      // provider-graph: ownership-widget-async-callback:_OrganizerMessagingScreenState._run:await:action watch CAT156 -- Carried from the WhatsApp setup section: each action is a hostAudienceControllerProvider sender command that refreshes the setup read itself; _run only holds the local busy flag and shows a failure notice.
      await action();
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.organizer,
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

/// The verification message's template values: a test invite token and the
/// public site for invite variables, "Catch test" for the rest.
Map<String, String> organizerMessagingTestVariables(
  HostWhatsappTemplate template,
) => {
  for (final variable in template.variableNames)
    variable: switch (variable) {
      'invite_token' => 'catch-test',
      'invite_url' => AppConfig.publicSiteUrl.toString(),
      _ => 'Catch test',
    },
};
