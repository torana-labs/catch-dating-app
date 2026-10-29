import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

CatchBadgeTone hostApplicationStatusTone(HostApplicationReviewStatus status) =>
    switch (status) {
      HostApplicationReviewStatus.approved => CatchBadgeTone.success,
      HostApplicationReviewStatus.declined => CatchBadgeTone.danger,
      HostApplicationReviewStatus.waitlisted => CatchBadgeTone.warning,
      _ => CatchBadgeTone.neutral,
    };

String hostApplicationStatusLabel(
  BuildContext context,
  HostApplicationReviewStatus status,
) => switch (status) {
  HostApplicationReviewStatus.submitted =>
    context.l10n.hostApplicationsStatusSubmitted,
  HostApplicationReviewStatus.inReview =>
    context.l10n.hostApplicationsStatusInReview,
  HostApplicationReviewStatus.approved =>
    context.l10n.hostApplicationsStatusApproved,
  HostApplicationReviewStatus.waitlisted =>
    context.l10n.hostApplicationsStatusWaitlisted,
  HostApplicationReviewStatus.declined =>
    context.l10n.hostApplicationsStatusDeclined,
  HostApplicationReviewStatus.withdrawn =>
    context.l10n.hostApplicationsStatusWithdrawn,
};

String hostApplicationSourceLabel(
  BuildContext context,
  HostApplicationSourceKind source,
) => switch (source) {
  HostApplicationSourceKind.native => context.l10n.hostApplicationsSourceNative,
  HostApplicationSourceKind.tabularImport =>
    context.l10n.hostApplicationsSourceImport,
  HostApplicationSourceKind.connector =>
    context.l10n.hostApplicationsSourceConnector,
};

String hostApplicationAnswerText(
  BuildContext context,
  HostApplicationAnswerValue value,
) => switch (value.valueKind) {
  'text' => value.textValue ?? context.l10n.hostApplicationNotAnswered,
  'number' =>
    value.numberValue?.toString() ?? context.l10n.hostApplicationNotAnswered,
  'boolean' =>
    value.booleanValue == null
        ? context.l10n.hostApplicationNotAnswered
        : value.booleanValue!
        ? context.l10n.hostApplicationAnswerYes
        : context.l10n.hostApplicationAnswerNo,
  'date' => value.dateValue ?? context.l10n.hostApplicationNotAnswered,
  'options' =>
    value.optionValues.isEmpty
        ? context.l10n.hostApplicationNotAnswered
        : value.optionValues.join(', '),
  'assets' =>
    value.assetIds.isEmpty
        ? context.l10n.hostApplicationNotAnswered
        : context.l10n.hostApplicationAnswerFiles(count: value.assetIds.length),
  _ => context.l10n.hostApplicationNotAnswered,
};
