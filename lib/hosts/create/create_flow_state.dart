import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/foundation.dart';

/// The four steps and the share screen after publishing.
enum CreateStep {
  basics,
  when,
  tickets,
  plan,
  share;

  /// One-based position among the four steps; the share screen has none.
  int get number => index + 1;
}

/// The six formats a host picks from on the first step.
enum CreateFormat {
  quiz(ActivityKind.pubQuiz, CatchFormat.games),
  run(ActivityKind.socialRun, CatchFormat.run),
  supper(ActivityKind.dinner, CatchFormat.dinner),
  courts(ActivityKind.pickleball, CatchFormat.courts),
  party(ActivityKind.barCrawl, CatchFormat.nightsOut),
  other(ActivityKind.openActivity, null);

  const CreateFormat(this.activityKind, this.tint);

  /// What the event is saved as.
  final ActivityKind activityKind;

  /// The poster's colour; null keeps it ink and white.
  final CatchFormat? tint;

  /// The format a draft or a saved event was set up with, if one of the six.
  static CreateFormat? fromActivityKind(String? name) {
    if (name == null) return null;
    for (final format in values) {
      if (format.activityKind.name == name) return format;
    }
    final kind = ActivityKind.values.where((kind) => kind.name == name);
    if (kind.isEmpty) return null;
    return switch (kind.first) {
      ActivityKind.socialRun ||
      ActivityKind.running ||
      ActivityKind.walking ||
      ActivityKind.cycling => CreateFormat.run,
      ActivityKind.pickleball ||
      ActivityKind.padel ||
      ActivityKind.tennis ||
      ActivityKind.badminton => CreateFormat.courts,
      ActivityKind.dinner => CreateFormat.supper,
      ActivityKind.barCrawl || ActivityKind.singlesMixer => CreateFormat.party,
      ActivityKind.pubQuiz => CreateFormat.quiz,
      _ => CreateFormat.other,
    };
  }
}

/// Who can book: the two admission presets the setup command takes here.
enum CreateAdmission {
  open('openCapacity'),
  invite('inviteOnly');

  const CreateAdmission(this.preset);

  /// The preference value the preferences command stores.
  final String preset;

  static CreateAdmission fromPreset(String? preset) =>
      preset == invite.preset ? invite : open;
}

/// What the create command has not been sent yet, or why a step cannot move.
enum CreateProblem { name, format, date, start, end, place, price }

/// Everything the four steps and the share screen show, as plain values.
///
/// [draft] is the form: it is what Save draft stores and what a restored
/// draft fills in. [eventId] is set once the create command has a receipt;
/// from then on every step's changes are sent with the setup commands.
@immutable
class CreateFlowState {
  const CreateFlowState({
    required this.organizer,
    required this.draft,
    this.step = CreateStep.basics,
    this.eventId,
    this.loadingSaved = false,
    this.working = false,
    this.savingDraft = false,
    this.uploadingPhotos = false,
    this.canAddPhotos = false,
    this.photoUrls = const <String>[],
    this.problems = const <CreateProblem>{},
    this.stillToSet = const <String>[],
    this.published = false,
    this.error,
  });

  final Organizer organizer;
  final EventDraft draft;
  final CreateStep step;
  final String? eventId;

  /// A saved event is being read before its steps can be edited.
  final bool loadingSaved;

  /// A setup command is in flight.
  final bool working;
  final bool savingDraft;
  final bool uploadingPhotos;

  /// Photos can be added once the event exists and the details read is in.
  final bool canAddPhotos;
  final List<String> photoUrls;

  /// What the current step still needs, shown on its fields.
  final Set<CreateProblem> problems;

  /// The server's list of what publishing still needs.
  final List<String> stillToSet;
  final bool published;
  final Object? error;

  CreateFormat? get format => CreateFormat.fromActivityKind(draft.activityKind);
  CreateAdmission get admission =>
      CreateAdmission.fromPreset(draft.admissionPreset);
  List<EventItineraryItem> get plan => draft.itinerary;

  /// The steps the rail and Still to set name as not yet done.
  List<CreateStep> get unsetSteps => [
    if ((draft.name ?? '').trim().isEmpty || format == null) CreateStep.basics,
    if (draft.eventLocalDate == null ||
        draft.eventLocalStartTime == null ||
        draft.meetingPoint == null)
      CreateStep.when,
    if (!draft.externalBookingMode && (draft.capacity ?? '').isEmpty)
      CreateStep.tickets,
    if (draft.itinerary.isEmpty) CreateStep.plan,
  ];

  CreateFlowState copyWith({
    EventDraft? draft,
    CreateStep? step,
    String? eventId,
    bool? loadingSaved,
    bool? working,
    bool? savingDraft,
    bool? uploadingPhotos,
    bool? canAddPhotos,
    List<String>? photoUrls,
    Set<CreateProblem>? problems,
    List<String>? stillToSet,
    bool? published,
    Object? error,
    bool clearError = false,
  }) => CreateFlowState(
    organizer: organizer,
    draft: draft ?? this.draft,
    step: step ?? this.step,
    eventId: eventId ?? this.eventId,
    loadingSaved: loadingSaved ?? this.loadingSaved,
    working: working ?? this.working,
    savingDraft: savingDraft ?? this.savingDraft,
    uploadingPhotos: uploadingPhotos ?? this.uploadingPhotos,
    canAddPhotos: canAddPhotos ?? this.canAddPhotos,
    photoUrls: photoUrls ?? this.photoUrls,
    problems: problems ?? this.problems,
    stillToSet: stillToSet ?? this.stillToSet,
    published: published ?? this.published,
    error: clearError ? null : error ?? this.error,
  );
}
