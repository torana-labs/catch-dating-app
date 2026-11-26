import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_manual_send_task.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:flutter/foundation.dart';

/// Where a Sends read is: still reading, ready, or failed.
enum HostSendsReadStatus { loading, ready, error }

/// What the event announcement intent can do: still reading the events or
/// the audience, no event to announce, unable to read, ready to start, or
/// shown but unable to start (the event has ended or has no audience).
enum HostSendsAnnouncementStatus {
  checkingEvents,
  checkingAudience,
  noEvent,
  unavailable,
  ready,
  blocked,
}

/// The event an announcement would go to and how many people each
/// audience holds.
@immutable
class HostSendsAnnouncement {
  const HostSendsAnnouncement({
    required this.status,
    this.event,
    this.booked = 0,
    this.prospective = 0,
  });

  final HostSendsAnnouncementStatus status;
  final Event? event;
  final int booked;
  final int prospective;

  bool get hasAudience => booked + prospective > 0;
}

/// Everything the Sends history and the send intents show, as plain
/// values.
@immutable
class HostSendsState {
  const HostSendsState({
    this.history,
    this.historyStatus = HostSendsReadStatus.loading,
    this.historyError,
    this.tasks,
    this.tasksStatus = HostSendsReadStatus.loading,
    this.tasksError,
    this.setup,
    this.setupStatus = HostSendsReadStatus.loading,
    this.quota,
    this.quotaStatus = HostSendsReadStatus.loading,
    this.announcement = const HostSendsAnnouncement(
      status: HostSendsAnnouncementStatus.checkingEvents,
    ),
    this.embeddedSignupSupported = false,
  });

  /// Campaigns, announcements and follower updates, newest first.
  final LivePages<HostSendSummary>? history;
  final HostSendsReadStatus historyStatus;
  final Object? historyError;

  /// The personal WhatsApp handoffs still to send by hand.
  final LivePages<HostManualSendTask>? tasks;
  final HostSendsReadStatus tasksStatus;
  final Object? tasksError;

  final HostMessagingSetup? setup;
  final HostSendsReadStatus setupStatus;

  /// Follower updates left this week.
  final int? quota;
  final HostSendsReadStatus quotaStatus;
  final HostSendsAnnouncement announcement;

  /// Meta Embedded Signup runs on this client.
  final bool embeddedSignupSupported;

  /// WhatsApp sender settings, and the saved-audience campaign that needs a
  /// sender, show unless the setup proves this client cannot manage one.
  bool get showWhatsappSetup =>
      setup?.canManageWhatsappSender(
        embeddedSignupSupported: embeddedSignupSupported,
      ) !=
      false;

  /// Active handoffs, each once.
  List<HostManualSendTask> get activeTasks {
    final seen = <String>{};
    return [
      for (final task in tasks?.items ?? const <HostManualSendTask>[])
        if (task.active && seen.add(task.taskId)) task,
    ];
  }
}

/// What the Sends detail pane holds.
sealed class HostSendsFlow {
  const HostSendsFlow();
}

/// Choose what to send.
final class HostSendsChoose extends HostSendsFlow {
  const HostSendsChoose();
}

/// A new saved-audience campaign, from a saved audience if one was named.
final class HostSendsCompose extends HostSendsFlow {
  const HostSendsCompose({this.savedAudienceId});
  final String? savedAudienceId;
}

/// A campaign's report.
final class HostSendsCampaignReport extends HostSendsFlow {
  const HostSendsCampaignReport(this.campaign);
  final HostCampaign campaign;
}

/// An announcement's or follower update's report.
final class HostSendsSummaryReport extends HostSendsFlow {
  const HostSendsSummaryReport(this.send);
  final HostSendSummary send;
}
