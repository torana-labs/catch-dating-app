import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/widgets.dart';

/// Current organizer-scoped names; historical answers remain versioned.
String hostApplicationContextLabel(
  BuildContext context, {
  required String formId,
  required String targetKind,
  required String? targetId,
  required HostSavedAudienceFilterOptions? sources,
}) {
  final formTitle = sources?.forms
      .where((form) => form.id == formId)
      .firstOrNull
      ?.title;
  final eventTitle = targetKind == 'event'
      ? sources?.events
            .where((event) => event.id == targetId)
            .firstOrNull
            ?.title
      : null;
  return [
    formTitle ??
        (targetKind == 'event'
            ? context.l10n.hostAudienceApplicationEvent
            : context.l10n.hostAudienceApplicationOrganizer),
    if (eventTitle != null && eventTitle != formTitle) eventTitle,
  ].join(' · ');
}
