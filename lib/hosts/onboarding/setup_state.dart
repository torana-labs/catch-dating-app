import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:flutter/foundation.dart';

/// Where organiser setup is. With no page found for the number there is no
/// claim step: setup starts the page, checks its details, offers payouts and
/// ends on Done.
enum HostSetupStep { start, details, payments, done }

/// The five things a page says it runs, in board order, each with the
/// activity it saves as.
enum HostSetupFormat {
  games(ActivityKind.pubQuiz),
  run(ActivityKind.socialRun),
  dinner(ActivityKind.dinner),
  courts(ActivityKind.pickleball),
  nightsOut(ActivityKind.barCrawl);

  const HostSetupFormat(this.activityKind);

  /// What the organizer's host defaults record for this format.
  final ActivityKind activityKind;
}

/// Organiser setup as plain values: the step, the create-organizer draft
/// being filled in, whether a logo was picked and, once the page exists,
/// its id.
@immutable
class HostSetupState {
  const HostSetupState({
    required this.draft,
    this.step = HostSetupStep.start,
    this.hasLogo = false,
    this.organizerId,
  });

  final HostSetupStep step;
  final OrganizerDraft draft;

  /// A logo is waiting to upload with the page.
  final bool hasLogo;

  /// Set once the page is created; payouts and Done need it.
  final String? organizerId;

  String get name => draft.name ?? '';
  String get area => draft.area ?? '';
  String get description => draft.description ?? '';

  /// The city's market id, as `createOrganizer` takes it.
  String? get cityId => draft.location;

  /// The formats the host defaults name, in board order.
  Set<HostSetupFormat> get formats {
    final defaults = draft.hostDefaults;
    if (defaults == const OrganizerHostDefaults()) return const {};
    final kinds = defaults.effectiveSupportedActivityKinds;
    return {
      for (final format in HostSetupFormat.values)
        if (kinds.contains(format.activityKind)) format,
    };
  }

  /// Name and where: what Start your page asks for.
  bool get startComplete =>
      name.trim().isNotEmpty && cityId != null && area.trim().isNotEmpty;

  /// What `createOrganizer` needs on top of Start: a line about the nights.
  bool get detailsComplete => startComplete && description.trim().isNotEmpty;

  /// The step number the top bar shows, one to three; Done has none.
  int get stepNumber => switch (step) {
    HostSetupStep.start => 1,
    HostSetupStep.details => 2,
    HostSetupStep.payments || HostSetupStep.done => 3,
  };

  static const stepCount = 3;

  HostSetupState copyWith({
    HostSetupStep? step,
    OrganizerDraft? draft,
    bool? hasLogo,
    String? organizerId,
  }) => HostSetupState(
    step: step ?? this.step,
    draft: draft ?? this.draft,
    hasLogo: hasLogo ?? this.hasLogo,
    organizerId: organizerId ?? this.organizerId,
  );
}

/// Host defaults that run [formats], the first as the primary activity.
/// No format keeps the defaults untouched.
OrganizerHostDefaults hostSetupDefaultsFor(
  OrganizerHostDefaults current,
  Set<HostSetupFormat> formats,
) {
  final ordered = [
    for (final format in HostSetupFormat.values)
      if (formats.contains(format)) format.activityKind,
  ];
  if (ordered.isEmpty) return const OrganizerHostDefaults();
  return current.copyWith(
    primaryActivityKind: ordered.first,
    supportedActivityKinds: ordered,
  );
}
