import 'package:catch_dating_app/contexts/events/parts/event_catch_format.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_organizer_patch.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/foundation.dart';

/// The five kinds of night the page offers, in board order, each with the
/// activity a newly picked kind adds to the organizer's defaults.
const pageEditFormats = <(CatchFormat, ActivityKind)>[
  (CatchFormat.games, ActivityKind.pubQuiz),
  (CatchFormat.run, ActivityKind.socialRun),
  (CatchFormat.dinner, ActivityKind.dinner),
  (CatchFormat.courts, ActivityKind.pickleball),
  (CatchFormat.nightsOut, ActivityKind.barCrawl),
];

/// The page fields as typed, before Save changes sends them.
@immutable
class PageEditDraft {
  const PageEditDraft({
    required this.name,
    required this.about,
    required this.area,
    required this.instagram,
    required this.phone,
    required this.email,
    required this.formats,
    required this.listed,
  });

  /// The draft as the organizer stands.
  factory PageEditDraft.of(Organizer organizer) => PageEditDraft(
    name: organizer.name,
    about: organizer.description,
    area: organizer.area,
    instagram: organizer.instagramHandle ?? '',
    phone: organizer.phoneNumber ?? '',
    email: organizer.email ?? '',
    formats: pageEditFormatsOf(organizer),
    listed: pageEditListed(organizer),
  );

  final String name;
  final String about;
  final String area;
  final String instagram;
  final String phone;
  final String email;
  final Set<CatchFormat> formats;

  /// Shown in Catch and on the website.
  final bool listed;

  PageEditDraft copyWith({
    String? name,
    String? about,
    String? area,
    String? instagram,
    String? phone,
    String? email,
    Set<CatchFormat>? formats,
    bool? listed,
  }) => PageEditDraft(
    name: name ?? this.name,
    about: about ?? this.about,
    area: area ?? this.area,
    instagram: instagram ?? this.instagram,
    phone: phone ?? this.phone,
    email: email ?? this.email,
    formats: formats ?? this.formats,
    listed: listed ?? this.listed,
  );

  /// Picks or drops [format]; the last kind cannot be dropped.
  PageEditDraft toggle(CatchFormat format) {
    final next = {...formats};
    if (!next.remove(format)) next.add(format);
    return next.isEmpty ? this : copyWith(formats: next);
  }

  /// The name is required.
  bool get valid => name.trim().isNotEmpty;

  /// The update for what changed against [organizer]; empty when nothing did.
  /// The listing switch is sent only for an owner.
  UpdateOrganizerPatch patchFor(Organizer organizer, {required bool isOwner}) {
    final was = PageEditDraft.of(organizer);
    String? changed(String now, String before) =>
        now.trim() == before.trim() ? null : now.trim();
    Object? optional(String now, String before) {
      final value = changed(now, before);
      if (value == null) return _unset;
      return value.isEmpty ? null : value;
    }

    final instagram = optional(this.instagram, was.instagram);
    final phone = optional(this.phone, was.phone);
    final email = optional(this.email, was.email);
    return UpdateOrganizerPatch.raw({
      'name': ?changed(name, was.name),
      'description': ?changed(about, was.about),
      'area': ?changed(area, was.area),
      if (!identical(instagram, _unset)) 'instagramHandle': instagram,
      if (!identical(phone, _unset)) 'phoneNumber': phone,
      if (!identical(email, _unset)) 'email': email,
      if (!setEquals(formats, was.formats))
        'hostDefaults': pageEditDefaults(organizer, formats).toJson(),
      if (isOwner && listed != was.listed) 'publicListingEnabled': listed,
    });
  }

  @override
  bool operator ==(Object other) =>
      other is PageEditDraft &&
      other.name == name &&
      other.about == about &&
      other.area == area &&
      other.instagram == instagram &&
      other.phone == phone &&
      other.email == email &&
      setEquals(other.formats, formats) &&
      other.listed == listed;

  @override
  int get hashCode => Object.hash(
    name,
    about,
    area,
    instagram,
    phone,
    email,
    Object.hashAllUnordered(formats),
    listed,
  );
}

const Object _unset = Object();

/// The kinds of night the organizer runs, from its activity defaults.
Set<CatchFormat> pageEditFormatsOf(Organizer organizer) => {
  for (final kind in organizer.hostDefaults.effectiveSupportedActivityKinds)
    catchFormatForActivity(kind),
};

/// Whether the page shows in Catch and on the website, the pair the
/// listing switch turns on and off together.
bool pageEditListed(Organizer organizer) =>
    organizer.isPubliclyBrowseable &&
    (organizer.publicPage?.isPublicWebsiteEnabled ?? false);

/// The organizer's defaults with [formats] as its kinds of night: it keeps
/// every activity whose kind is still picked, adds one for each newly
/// picked kind, and moves the main activity when its kind was dropped.
@visibleForTesting
OrganizerHostDefaults pageEditDefaults(
  Organizer organizer,
  Set<CatchFormat> formats,
) {
  final defaults = organizer.hostDefaults;
  final kept = [
    for (final kind in defaults.effectiveSupportedActivityKinds)
      if (formats.contains(catchFormatForActivity(kind))) kind,
  ];
  final added = [
    for (final (format, kind) in pageEditFormats)
      if (formats.contains(format) &&
          !kept.any((existing) => catchFormatForActivity(existing) == format))
        kind,
  ];
  final supported = [...kept, ...added];
  final primary = supported.contains(defaults.primaryActivityKind)
      ? defaults.primaryActivityKind
      : supported.first;
  return defaults.copyWith(
    primaryActivityKind: primary,
    supportedActivityKinds: [
      for (final kind in supported)
        if (kind != primary) kind,
    ],
  );
}

/// The page fields and media as the Your page body shows them.
@immutable
class OrganizerPageEditState {
  const OrganizerPageEditState({
    required this.organizer,
    required this.draft,
    required this.revision,
    this.isOwner = false,
    this.saving = false,
    this.mediaPending = false,
    this.pageLink,
  });

  final Organizer organizer;
  final PageEditDraft draft;

  /// Bumped on Discard and on a new organizer, so the fields start again
  /// from the draft.
  final int revision;
  final bool isOwner;
  final bool saving;

  /// A logo or photo is uploading.
  final bool mediaPending;

  /// The page address for the top bar, without its scheme.
  final String? pageLink;

  bool get dirty => draft != PageEditDraft.of(organizer);

  List<String> get photoUrls => [
    for (final photo in [
      ...organizer.organizerPhotos,
    ]..sort((a, b) => a.position.compareTo(b.position)))
      photo.url,
  ];
}
