import 'package:catch_dating_app/contexts/formats/formats.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// Where a step stands in a rehearsal: practised, the one to do now, or
/// still to come.
enum HostEventStepProgress { done, now, next }

/// One run-of-show step as a compact list row. In the plan it shows the
/// clock time it starts and what guests see; in a rehearsal it shows its
/// number (or a tick once practised) and what the host does. It draws
/// nothing of its own.
class HostEventStepRow extends StatelessWidget {
  /// A step of the night's plan, starting at [startsAt].
  const HostEventStepRow.plan({
    super.key,
    required this.step,
    required DateTime this.startsAt,
  }) : number = null,
       progress = null;

  /// The [number]th step of a rehearsal and where it stands.
  const HostEventStepRow.rehearsal({
    super.key,
    required this.step,
    required int this.number,
    required HostEventStepProgress this.progress,
  }) : startsAt = null;

  final EventRunOfShowStep step;
  final DateTime? startsAt;
  final int? number;
  final HostEventStepProgress? progress;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final startsAt = this.startsAt;
    final progress = this.progress;
    if (startsAt != null || progress == null) {
      return CatchIndexRow(
        title: step.title,
        subtitle: step.attendeeExperience.trim().isEmpty
            ? null
            : l10n.hostEventsStepGuestsSee(what: step.attendeeExperience),
        time: startsAt == null
            ? null
            : DateFormat(
                'h:mm',
                Localizations.localeOf(context).toLanguageTag(),
              ).format(startsAt),
        density: CatchIndexRowSize.compact,
        onTap: null,
      );
    }
    return CatchIndexRow(
      title: step.title,
      subtitle: step.hostInstruction.trim().isEmpty
          ? null
          : step.hostInstruction,
      leading: switch (progress) {
        HostEventStepProgress.done => const CatchMarker(
          variant: CatchMarkerVariant.check,
          tone: CatchMarkerTone.success,
        ),
        HostEventStepProgress.now => CatchMarker.number(number!),
        HostEventStepProgress.next => CatchMarker.number(
          number!,
          tone: CatchMarkerTone.muted,
        ),
      },
      emphasis: progress == HostEventStepProgress.next
          ? CatchIndexRowEmphasis.done
          : CatchIndexRowEmphasis.regular,
      density: CatchIndexRowSize.compact,
      onTap: null,
    );
  }
}
