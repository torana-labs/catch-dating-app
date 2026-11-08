import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_labels.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The name a host sees for one answer: the applicant, else the verified
/// name, email or phone, else nothing.
String? hostFormEntryName(HostFormInboxEntry entry) {
  final name =
      entry.application?.applicantDisplayName.trim() ??
      entry.response?.identity.primaryLabel?.trim();
  return name == null || name.isEmpty ? null : name;
}

/// The highlighted answers in one line: "Steady pace · 5 km · Instagram".
String hostFormEntryAnswers(HostFormInboxEntry entry) => [
  for (final highlight
      in entry.response?.highlights ?? const <HostFormResponseHighlight>[])
    ?hostFormAnswerText(highlight.answer),
].join(' · ');

/// One answer as plain text; lists join with commas, blanks are null.
String? hostFormAnswerText(Object? answer) {
  final text = switch (answer) {
    null => null,
    final List<Object?> values =>
      values
          .map((value) => '$value'.trim())
          .where((value) => value.isNotEmpty)
          .join(', '),
    final Map<Object?, Object?> value => value.values.join(', '),
    _ => '$answer',
  };
  final trimmed = text?.trim();
  return trimmed == null || trimmed.isEmpty ? null : trimmed;
}

/// How long ago an answer arrived, in the compact form rows use.
String hostFormAgo(DateTime at, DateTime now) =>
    AppTimeFormatters.compactRelativeTime(at, now: now);

/// One answer in Responses: the person, their highlighted answers, when they
/// sent it and where it stands.
class HostFormResponseRow extends StatelessWidget {
  const HostFormResponseRow({
    super.key,
    required this.entry,
    required this.now,
    required this.onTap,
    this.action,
  });

  final HostFormInboxEntry entry;

  /// The clock "2 days ago" reads from.
  final DateTime now;
  final VoidCallback onTap;

  /// Let in, on the form page's waiting rows.
  final CatchIndexRowAction? action;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final name = hostFormEntryName(entry);
    final review = entry.application?.reviewStatus;
    final withdrawn =
        entry.response?.status == HostFormResponseStatus.withdrawn;
    final answers = hostFormEntryAnswers(entry);
    return CatchIndexRow(
      title: name ?? l10n.hostFormsAnonymous,
      onTap: onTap,
      density: CatchIndexRowSize.compact,
      leading: CatchAvatar.system(size: CatchAvatarSize.md, name: name ?? ''),
      subtitle: answers.isEmpty ? null : answers,
      meta: action == null ? hostFormAgo(entry.submittedAt, now) : null,
      badge: action != null
          ? null
          : review != null
          ? CatchIndexRowBadge(
              label: hostFormReviewText(l10n, review),
              tone: hostFormReviewTone(review),
            )
          : withdrawn
          ? CatchIndexRowBadge(
              label: hostFormReviewText(
                l10n,
                HostApplicationReviewStatus.withdrawn,
              ),
            )
          : null,
      action: action,
    );
  }
}
