import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:flutter/foundation.dart';

/// What a control on WhatsApp Business settings asks for.
enum OrganizerMessagingAction {
  connect,
  syncTemplates,
  disconnect,
  sendTest,
  retry,
}

/// WhatsApp Business settings as plain values: the organizer's messaging
/// setup, whether this client can run Meta's signup, and a command running.
@immutable
class OrganizerMessagingState {
  const OrganizerMessagingState({
    this.setup,
    this.error,
    this.embeddedSignupSupported = false,
    this.busy = false,
  });

  /// Null while it is first read, or after the read failed.
  final HostMessagingSetup? setup;
  final Object? error;

  /// Meta Embedded Signup runs here (the web Host app); the native apps can
  /// only manage a sender that is already connected.
  final bool embeddedSignupSupported;

  /// Connect, Sync templates, Disconnect or the verification message is
  /// running.
  final bool busy;

  /// The sender can be set up or managed from this client.
  bool get canManage =>
      setup?.canManageWhatsappSender(
        embeddedSignupSupported: embeddedSignupSupported,
      ) ??
      false;

  HostWhatsappConnection? get connection => setup?.connection;

  /// A connected sender that is not active yet, with an approved template
  /// to verify it with.
  bool get canSendTest =>
      connection != null &&
      !connection!.isActive &&
      (setup?.approvedTemplates.isNotEmpty ?? false);
}
