import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:flutter/foundation.dart';

/// Where the form page is: reading the form, or showing it.
enum HostFormStatus { loading, content }

/// Everything the form page shows, as plain values.
@immutable
class HostFormState {
  const HostFormState({
    required this.status,
    this.form,
    this.questionLabels = const <String>[],
    this.analytics,
    this.waiting = const <HostFormInboxEntry>[],
    this.waitingPending = false,
    this.lettingIn = const <String>{},
    this.busy = false,
  });

  const HostFormState.loading() : this(status: HostFormStatus.loading);

  final HostFormStatus status;
  final HostFormSummary? form;

  /// Every question's wording, in order.
  final List<String> questionLabels;

  /// Opens, starts and answers of the published version; null before it is
  /// published or while it is read.
  final HostFormAnalytics? analytics;

  /// Answers nobody has reviewed yet, newest first.
  final List<HostFormInboxEntry> waiting;

  /// The waiting answers are still being read.
  final bool waitingPending;

  /// Applications being let in now.
  final Set<String> lettingIn;

  /// A publish or another form command is running.
  final bool busy;

  bool get isDraft => form?.status == HostFormLifecycleStatus.draft;

  /// What happens when the host lets someone in, in the order the form
  /// runs them.
  List<HostFormAutomationActionKind> get consequences => [
    for (final kind in HostFormAutomationActionKind.values)
      if (form?.consequences.enabledAutomationActionKinds.contains(kind) ??
          false)
        kind,
  ];
}
