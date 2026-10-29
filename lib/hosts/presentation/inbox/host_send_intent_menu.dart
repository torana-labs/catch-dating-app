import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/host_whatsapp_embedded_signup.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_posts_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_event_announcement_field.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_sends_back_button.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class HostSendIntentMenu extends ConsumerWidget {
  const HostSendIntentMenu({
    super.key,
    required this.club,
    required this.onBack,
    required this.onOpenInbox,
    required this.onStartCampaign,
    required this.onStartEventAnnouncement,
    required this.onStartFollowerUpdate,
    required this.preferredEventId,
    required this.initialSegment,
    required this.broadcastEnabled,
    required this.now,
  });

  final Club club;
  final VoidCallback onBack;
  final VoidCallback onOpenInbox;
  final VoidCallback onStartCampaign;
  final Future<void> Function(HostEventAnnouncementTarget target)
  onStartEventAnnouncement;
  final Future<void> Function(int remainingQuota) onStartFollowerUpdate;
  final String? preferredEventId;
  final HostInboxAudienceSegment initialSegment;
  final bool broadcastEnabled;
  final DateTime now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final setup = ref.watch(hostMessagingSetupProvider(club.id));
    // Saved-audience campaigns need a WhatsApp sender, so both the intent and
    // its settings entry stay hidden where this client cannot manage one.
    final showWhatsappSetup =
        catchAsyncStateFromAsyncValue(setup).value?.canManageWhatsappSender(
          embeddedSignupSupported: hostWhatsappEmbeddedSignupSupported,
        ) !=
        false;
    final followerQuota = ref.watch(
      watchClubPostRemainingWeeklyQuotaProvider(club.id),
    );
    final campaignField = setup.when<Widget>(
      loading: () => CatchFieldLanes.single(
        child: CatchField.read(
          copy: catchFieldCopy(context.l10n),
          key: const ValueKey('host-send-intent-saved-audience'),
          title: context.l10n.hostSendsSavedAudienceIntent,
          body: context.l10n.hostSendsChannelChecking,
        ),
      ),
      error: (_, _) => CatchFieldLanes.single(
        child: CatchField.read(
          copy: catchFieldCopy(context.l10n),
          key: const ValueKey('host-send-intent-saved-audience'),
          title: context.l10n.hostSendsSavedAudienceIntent,
          body: context.l10n.hostSendsChannelUnavailable,
          valueText: context.l10n.hostSendsSetupRequired,
        ),
      ),
      data: (value) => CatchFieldLanes.single(
        child: value.canComposeCampaign
            ? CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                key: const ValueKey('host-send-intent-saved-audience'),
                title: context.l10n.hostSendsSavedAudienceIntent,
                body: context.l10n.hostSendsSavedAudienceIntentBody,
                onTap: onStartCampaign,
              )
            : CatchField.read(
                copy: catchFieldCopy(context.l10n),
                key: const ValueKey('host-send-intent-saved-audience'),
                title: context.l10n.hostSendsSavedAudienceIntent,
                body: context.l10n.hostSendsSavedAudienceSetupBody,
                valueText: context.l10n.hostSendsSetupRequired,
              ),
      ),
    );
    final followerUpdateField = followerQuota.when<Widget>(
      loading: () => CatchFieldLanes.single(
        child: CatchField.read(
          copy: catchFieldCopy(context.l10n),
          key: const ValueKey('host-send-intent-follower-update'),
          title: context.l10n.hostSendsFollowerUpdateIntent,
          body: context.l10n.hostSendsChannelChecking,
        ),
      ),
      error: (_, _) => CatchFieldLanes.single(
        child: CatchField.read(
          copy: catchFieldCopy(context.l10n),
          key: const ValueKey('host-send-intent-follower-update'),
          title: context.l10n.hostSendsFollowerUpdateIntent,
          body: context.l10n.hostSendsChannelUnavailable,
        ),
      ),
      data: (remainingQuota) => CatchFieldLanes.single(
        child: remainingQuota > 0
            ? CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                key: const ValueKey('host-send-intent-follower-update'),
                title: context.l10n.hostSendsFollowerUpdateIntent,
                body: context.l10n.hostSendsFollowerUpdateDescription,
                onTap: () => unawaited(onStartFollowerUpdate(remainingQuota)),
              )
            : CatchField.read(
                copy: catchFieldCopy(context.l10n),
                key: const ValueKey('host-send-intent-follower-update'),
                title: context.l10n.hostSendsFollowerUpdateIntent,
                body: context.l10n.hostSendsFollowerUpdateQuotaUsed,
                valueText: context.l10n.hostSendsWeeklyLimit,
              ),
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        HostSendsBackButton(onPressed: onBack),
        gapH12,
        CatchSection.divided(
          title: context.l10n.hostSendsIntentTitle,
          children: [
            CatchFieldLanes.single(
              child: CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                key: const ValueKey('host-send-intent-conversation'),
                title: context.l10n.hostSendsConversationIntent,
                body: context.l10n.hostSendsConversationIntentBody,
                onTap: onOpenInbox,
              ),
            ),
            if (showWhatsappSetup) campaignField,
            HostEventAnnouncementField(
              organizerId: club.id,
              preferredEventId: preferredEventId,
              initialSegment: initialSegment,
              sendingEnabled: broadcastEnabled,
              now: now,
              onStart: onStartEventAnnouncement,
            ),
            followerUpdateField,
          ],
        ),
        if (showWhatsappSetup) ...[
          gapH12,
          CatchButton(
            label: context.l10n.hostSendsSettings,
            variant: CatchButtonVariant.secondary,
            onPressed: () => context.pushNamed(
              Routes.hostOrganizerMessagingScreen.name,
              pathParameters: {'clubId': club.id},
            ),
          ),
        ],
      ],
    );
  }
}
