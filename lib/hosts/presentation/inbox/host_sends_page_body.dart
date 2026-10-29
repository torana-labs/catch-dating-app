import 'package:catch_dating_app/contexts/audience/data/crm/host_campaign_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/contexts/messaging/data/host_whatsapp_embedded_signup.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_posts_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_club_post_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_broadcast_composer_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_campaign_editor.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_event_announcement_field.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_follower_update_composer_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_broadcast_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_manual_send_list.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_send_intent_menu.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_sends_back_button.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

part 'host_sends_workspace.dart';

class HostSendsPageBody extends ConsumerStatefulWidget {
  const HostSendsPageBody({
    super.key,
    required this.club,
    required this.initialSavedAudienceId,
    required this.onBusyChanged,
    required this.onOpenInbox,
    required this.indexBuilder,
    this.preferredEventId,
    this.initialSegment = HostInboxAudienceSegment.booked,
    this.broadcastEnabled = true,
    this.now,
  });

  final Widget Function(Widget historySliver) indexBuilder;
  final Club club;
  final String? initialSavedAudienceId;
  final ValueChanged<bool> onBusyChanged;
  final VoidCallback onOpenInbox;
  final String? preferredEventId;
  final HostInboxAudienceSegment initialSegment;
  final bool broadcastEnabled;
  final DateTime? now;

  @override
  ConsumerState<HostSendsPageBody> createState() =>
      _HostSendsPageBodySliverState();
}
