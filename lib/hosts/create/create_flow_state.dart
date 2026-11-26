import 'package:catch_dating_app/contexts/events/domain/event.dart';
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

/// What the create command has not been sent yet, why a step cannot move,
/// or what an edit cannot be saved without.
enum CreateProblem {
  name,
  format,
  date,
  start,
  end,
  place,
  price,

  /// Editing: the distance of a moving event is missing or not above zero.
  distance,

  /// Editing: the new start is not in the future.
  schedule,

  /// Editing: the place has no name guests will see.
  placeName,

  /// Editing: the places are not at least one.
  capacity,

  /// Editing: an invite-only event's code is missing or the wrong length.
  inviteCode,

  /// Editing: a cohort cap is not a whole number above zero.
  cohortCaps,

  /// Editing: demand pricing's step or maximum is missing.
  demandPricing,
}

/// What editing a saved event adds to the editor: the event as saved, what
/// its bookings lock, and the invite code read from its private access.
@immutable
class CreateEditFacts {
  const CreateEditFacts({
    required this.event,
    required this.scheduleLocked,
    required this.policyLocked,
    this.inviteCodeLoading = false,
    this.inviteCodeSeed = 0,
  });

  /// The event as it was when editing started.
  final Event event;

  /// The date and times can no longer change.
  final bool scheduleLocked;

  /// Capacity, price, admission and invite setup can no longer change.
  final bool policyLocked;

  /// The current invite code is still being read.
  final bool inviteCodeLoading;

  /// Bumped when the invite code read fills the field, so it redraws.
  final int inviteCodeSeed;

  /// A cancelled event is shown but nothing on it can change.
  bool get cancelled => event.isCancelled;

  String get currencyCode => event.currency;

  CreateEditFacts copyWith({bool? inviteCodeLoading, int? inviteCodeSeed}) =>
      CreateEditFacts(
        event: event,
        scheduleLocked: scheduleLocked,
        policyLocked: policyLocked,
        inviteCodeLoading: inviteCodeLoading ?? this.inviteCodeLoading,
        inviteCodeSeed: inviteCodeSeed ?? this.inviteCodeSeed,
      );
}

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
    this.waitlist = true,
    this.approveEach = false,
    this.planVisible = true,
    this.repeatWeekly = false,
    this.seriesEventIds = const <String>[],
    this.edit,
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

  /// Waitlist when it's full: the event's waitlist preference.
  final bool waitlist;

  /// You approve each request: the ask-first booking preference.
  final bool approveEach;

  /// Guests see the plan on their phones.
  final bool planVisible;

  /// Every week on the event's weekday: Publish sets up the next eight.
  final bool repeatWeekly;

  /// The series' events after Publish, the first one included.
  final List<String> seriesEventIds;

  /// Set when the editor changes a saved event instead of creating one.
  final CreateEditFacts? edit;
  final Object? error;

  /// Fields can change: false while saving and on a cancelled event.
  bool get canChange => !working && !(edit?.cancelled ?? false);

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
    bool? waitlist,
    bool? approveEach,
    bool? planVisible,
    bool? repeatWeekly,
    List<String>? seriesEventIds,
    CreateEditFacts? edit,
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
    waitlist: waitlist ?? this.waitlist,
    approveEach: approveEach ?? this.approveEach,
    planVisible: planVisible ?? this.planVisible,
    repeatWeekly: repeatWeekly ?? this.repeatWeekly,
    seriesEventIds: seriesEventIds ?? this.seriesEventIds,
    edit: edit ?? this.edit,
    error: clearError ? null : error ?? this.error,
  );
}
