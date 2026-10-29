import 'package:catch_dating_app/kernel/labelled.dart';
import 'package:collection/collection.dart';

enum EventInteractionModel implements Labelled {
  pacePods('Pace pods'),
  pairedRotations('Paired rotations'),
  teamRotations('Team rotations'),
  seatedTable('Seated table'),
  freeFormMixer('Free-form mixer'),
  hostLedProgram('Host-led program'),
  openFormat('Open format');

  const EventInteractionModel(this.label);

  @override
  final String label;
}

enum ActivityKind implements Labelled {
  socialRun('Social run'),
  running('Running'),
  walking('Walking'),
  pickleball('Pickleball'),
  padel('Padel'),
  tennis('Tennis'),
  badminton('Badminton'),
  cycling('Cycling'),
  spinClass('Spin class'),
  yoga('Yoga'),
  strengthTraining('Strength training'),
  pubQuiz('Pub quiz'),
  barCrawl('Bar crawl'),
  dinner('Dinner'),
  singlesMixer('Singles mixer'),
  openActivity('Open activity');

  const ActivityKind(this.label);

  @override
  final String label;

  static const eventCreationDefaults = <ActivityKind>[
    socialRun,
    walking,
    pickleball,
    padel,
    tennis,
    badminton,
    cycling,
    spinClass,
    yoga,
    dinner,
    pubQuiz,
    barCrawl,
    singlesMixer,
    openActivity,
  ];

  bool get isPhysical => switch (this) {
    socialRun ||
    running ||
    walking ||
    pickleball ||
    padel ||
    tennis ||
    badminton ||
    cycling ||
    spinClass ||
    yoga ||
    strengthTraining => true,
    pubQuiz || barCrawl || dinner || singlesMixer || openActivity => false,
  };

  bool get isDistanceBased => switch (this) {
    socialRun || running || walking || cycling => true,
    pickleball ||
    padel ||
    tennis ||
    badminton ||
    spinClass ||
    yoga ||
    strengthTraining ||
    pubQuiz ||
    barCrawl ||
    dinner ||
    singlesMixer ||
    openActivity => false,
  };

  bool get isMovementHeavy => switch (this) {
    socialRun ||
    running ||
    walking ||
    pickleball ||
    padel ||
    tennis ||
    badminton ||
    cycling ||
    spinClass => true,
    yoga ||
    strengthTraining ||
    pubQuiz ||
    barCrawl ||
    dinner ||
    singlesMixer ||
    openActivity => false,
  };

  bool get isHealthImportSupported => switch (this) {
    running ||
    walking ||
    pickleball ||
    tennis ||
    badminton ||
    cycling ||
    yoga ||
    strengthTraining => true,
    socialRun ||
    padel ||
    spinClass ||
    pubQuiz ||
    barCrawl ||
    dinner ||
    singlesMixer ||
    openActivity => false,
  };

  ActivityKind get healthActivityKind => switch (this) {
    socialRun => running,
    spinClass => cycling,
    _ => this,
  };

  EventInteractionModel get defaultInteractionModel => switch (this) {
    socialRun => EventInteractionModel.pacePods,
    running ||
    walking ||
    cycling ||
    spinClass ||
    yoga ||
    strengthTraining => EventInteractionModel.hostLedProgram,
    pickleball ||
    padel ||
    tennis ||
    badminton => EventInteractionModel.pairedRotations,
    pubQuiz => EventInteractionModel.teamRotations,
    dinner => EventInteractionModel.seatedTable,
    barCrawl || singlesMixer => EventInteractionModel.freeFormMixer,
    openActivity => EventInteractionModel.openFormat,
  };

  String? get defaultPlaybookId => switch (this) {
    socialRun => 'social_run_light',
    running ||
    walking ||
    cycling ||
    spinClass ||
    yoga ||
    strengthTraining => 'host_led_social',
    pickleball || padel || tennis || badminton => 'pickleball_rotations',
    pubQuiz => 'pub_quiz_team_mixer',
    dinner => 'dinner_table_mixer',
    barCrawl => 'host_led_social',
    singlesMixer => 'algorithmic_mixer_reveal',
    openActivity => 'host_led_social',
  };
}

class EventFormatSnapshot {
  const EventFormatSnapshot({
    this.version = 1,
    required this.activityKind,
    required this.interactionModel,
    this.customActivityLabel,
    this.defaultPlaybookId,
    this.defaultModuleIds = const [],
    this.eventSuccessPrimitives = const {},
    this.activityDetails = const {},
  });

  const EventFormatSnapshot.socialRun()
    : this(
        activityKind: ActivityKind.socialRun,
        interactionModel: EventInteractionModel.pacePods,
        defaultPlaybookId: 'social_run_light',
      );

  factory EventFormatSnapshot.fromActivityKind(
    ActivityKind activityKind, {
    Map<String, Object?> activityDetails = const {},
  }) {
    return EventFormatSnapshot(
      activityKind: activityKind,
      interactionModel: activityKind.defaultInteractionModel,
      defaultPlaybookId: activityKind.defaultPlaybookId,
      activityDetails: activityDetails,
    );
  }

  factory EventFormatSnapshot.custom({
    required String label,
    required EventInteractionModel interactionModel,
    Map<String, Object?> activityDetails = const {},
    List<String> defaultModuleIds = const [],
    Map<String, Object?> eventSuccessPrimitives = const {},
  }) {
    final normalizedLabel = label.trim();
    return EventFormatSnapshot(
      activityKind: ActivityKind.openActivity,
      interactionModel: interactionModel,
      customActivityLabel: normalizedLabel.isEmpty ? null : normalizedLabel,
      defaultModuleIds: defaultModuleIds,
      eventSuccessPrimitives: eventSuccessPrimitives,
      activityDetails: {
        if (activityDetails.isNotEmpty) ...activityDetails,
        'formatSource': 'custom',
      },
    );
  }

  factory EventFormatSnapshot.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const EventFormatSnapshot.socialRun();
    final activityKind = _enumByName(
      ActivityKind.values,
      json['activityKind'] as String?,
      ActivityKind.socialRun,
    );
    return EventFormatSnapshot(
      version: (json['version'] as num?)?.toInt() ?? 1,
      activityKind: activityKind,
      interactionModel: _enumByName(
        EventInteractionModel.values,
        json['interactionModel'] as String?,
        activityKind.defaultInteractionModel,
      ),
      customActivityLabel: json['customActivityLabel'] as String?,
      defaultPlaybookId: json['defaultPlaybookId'] as String?,
      defaultModuleIds:
          (json['defaultModuleIds'] as List<dynamic>?)
              ?.whereType<String>()
              .toList(growable: false) ??
          const [],
      eventSuccessPrimitives:
          (json['eventSuccessPrimitives'] as Map<String, dynamic>?) ??
          const <String, Object?>{},
      activityDetails:
          (json['activityDetails'] as Map<String, dynamic>?) ??
          const <String, Object?>{},
    );
  }

  final int version;
  final ActivityKind activityKind;
  final EventInteractionModel interactionModel;
  final String? customActivityLabel;
  final String? defaultPlaybookId;
  final List<String> defaultModuleIds;
  final Map<String, Object?> eventSuccessPrimitives;
  final Map<String, Object?> activityDetails;

  String get label => customActivityLabel ?? activityKind.label;
  String get eventTitleLabel {
    final customLabel = customActivityLabel?.trim();
    if (customLabel != null && customLabel.isNotEmpty) {
      return _titleCaseWords(customLabel);
    }
    return activityKind.eventTitleLabel;
  }

  ActivityKind get healthActivityKind => activityKind.healthActivityKind;
  bool get isPhysical => activityKind.isPhysical;
  bool get isDistanceBased => activityKind.isDistanceBased;

  Map<String, Object?> toJson() => {
    'version': version,
    'activityKind': activityKind.name,
    'interactionModel': interactionModel.name,
    if (customActivityLabel != null) 'customActivityLabel': customActivityLabel,
    if (defaultPlaybookId != null) 'defaultPlaybookId': defaultPlaybookId,
    if (defaultModuleIds.isNotEmpty) 'defaultModuleIds': defaultModuleIds,
    if (eventSuccessPrimitives.isNotEmpty)
      'eventSuccessPrimitives': eventSuccessPrimitives,
    if (activityDetails.isNotEmpty) 'activityDetails': activityDetails,
  };

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is EventFormatSnapshot &&
            version == other.version &&
            activityKind == other.activityKind &&
            interactionModel == other.interactionModel &&
            customActivityLabel == other.customActivityLabel &&
            defaultPlaybookId == other.defaultPlaybookId &&
            const ListEquality<String>().equals(
              defaultModuleIds,
              other.defaultModuleIds,
            ) &&
            const MapEquality<String, Object?>().equals(
              eventSuccessPrimitives,
              other.eventSuccessPrimitives,
            ) &&
            const MapEquality<String, Object?>().equals(
              activityDetails,
              other.activityDetails,
            );
  }

  @override
  int get hashCode => Object.hash(
    version,
    activityKind,
    interactionModel,
    customActivityLabel,
    defaultPlaybookId,
    const ListEquality<String>().hash(defaultModuleIds),
    const MapEquality<String, Object?>().hash(eventSuccessPrimitives),
    const MapEquality<String, Object?>().hash(activityDetails),
  );
}

T _enumByName<T extends Enum>(List<T> values, String? name, T fallback) {
  if (name == null) return fallback;
  for (final value in values) {
    if (value.name == name) return value;
  }
  return fallback;
}

extension ActivityKindEventTitleX on ActivityKind {
  String get eventTitleLabel => switch (this) {
    ActivityKind.socialRun || ActivityKind.running => 'Run',
    ActivityKind.walking => 'Walk',
    ActivityKind.cycling => 'Ride',
    _ => _titleCaseWords(label),
  };
}

String _titleCaseWords(String value) {
  return value
      .trim()
      .split(RegExp(r'\s+'))
      .where((word) => word.isNotEmpty)
      .map((word) => word[0].toUpperCase() + word.substring(1))
      .join(' ');
}
