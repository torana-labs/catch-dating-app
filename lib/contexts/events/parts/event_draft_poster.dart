import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/parts/event_catch_format.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// An event still being set up, as the system poster: the draft's name and
/// format tint, with the caller's words for when, where and the counts,
/// since a draft has no booking yet. The poster follows the form as it
/// changes.
class EventDraftPoster extends StatelessWidget {
  const EventDraftPoster({
    super.key,
    required this.draft,
    required this.untitled,
    this.formatLabel,
    this.when,
    this.place,
    this.counts = const <CatchMetricValue>[],
  });

  final EventDraft draft;

  /// The title while the draft has no name.
  final String untitled;
  final String? formatLabel;
  final String? when;
  final String? place;
  final List<CatchMetricValue> counts;

  @override
  Widget build(BuildContext context) {
    final kind = ActivityKind.values
        .where((kind) => kind.name == draft.activityKind)
        .firstOrNull;
    final name = (draft.name ?? '').trim();
    return CatchEventCard(
      title: name.isEmpty ? untitled : name,
      format: catchFormatForActivity(kind ?? ActivityKind.openActivity),
      formatLabel: formatLabel,
      when: when,
      place: place,
      counts: counts,
    );
  }
}
