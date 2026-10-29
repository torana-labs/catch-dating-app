/// Stable semantic moment for a conversation cue.
///
/// User-visible labels belong to the presentation copy adapter rather than the
/// domain enum so locale selection stays at the render boundary.
enum EventSuccessConversationCueMoment { live, postEvent }

enum EventSuccessDisclosureLevel { light, personal, reflective }

final class EventSuccessConversationCue {
  const EventSuccessConversationCue({
    required this.title,
    required this.body,
    required this.contextLabel,
    required this.moment,
    this.disclosureLevel,
  });

  final String title;
  final String body;
  final String contextLabel;
  final EventSuccessConversationCueMoment moment;
  final EventSuccessDisclosureLevel? disclosureLevel;
}
