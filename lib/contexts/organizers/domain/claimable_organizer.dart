import 'package:flutter/foundation.dart';

/// Where Catch learned that a phone number belongs with an organizer page,
/// as `findClaimableOrganizers` labels it. The number itself never reaches
/// the app.
enum ClaimableOrganizerSource {
  /// The person verified this number themselves when they sent in the page.
  selfVerifiedSubmitter,

  /// Catch's team confirmed the number with the organizer.
  salesCrmVerified,

  /// The number is on the organizer's own public page.
  publicPage,

  /// Catch's team entered the number while adding the page.
  staffEntered;

  static ClaimableOrganizerSource? fromWire(Object? value) => switch (value) {
    'self_verified_submitter' => selfVerifiedSubmitter,
    'sales_crm_verified' => salesCrmVerified,
    'public_page' => publicPage,
    'staff_entered' => staffEntered,
    _ => null,
  };
}

/// The onboarding fields a found page already has or still needs, in the
/// order Catch Host asks for them.
enum ClaimableOrganizerField {
  name,
  description,
  city,
  organizerType,
  photo,
  instagramHandle;

  static ClaimableOrganizerField? fromWire(Object? value) => switch (value) {
    'name' => name,
    'description' => description,
    'city' => city,
    'organizerType' => organizerType,
    'photo' => photo,
    'instagramHandle' => instagramHandle,
    _ => null,
  };
}

/// The public fields of a found page, used to pre-fill setup.
@immutable
class ClaimableOrganizerPrefill {
  const ClaimableOrganizerPrefill({
    this.name,
    this.description,
    this.cityName,
    this.marketId,
    this.categoryLabel,
    this.instagramHandle,
    this.photoUrl,
    this.canonicalPath,
  });

  factory ClaimableOrganizerPrefill.fromMap(Map<Object?, Object?> map) =>
      ClaimableOrganizerPrefill(
        name: _text(map['name']),
        description: _text(map['description']),
        cityName: _text(map['cityName']),
        marketId: _text(map['marketId']),
        categoryLabel: _text(map['categoryLabel']),
        instagramHandle: _text(map['instagramHandle']),
        photoUrl: _text(map['photoUrl']),
        canonicalPath: _text(map['canonicalPath']),
      );

  final String? name;
  final String? description;
  final String? cityName;
  final String? marketId;
  final String? categoryLabel;
  final String? instagramHandle;
  final String? photoUrl;

  /// The page's public path on the website, once it has one.
  final String? canonicalPath;
}

/// One organizer page Catch found for the signed-in person's number.
@immutable
class ClaimableOrganizer {
  const ClaimableOrganizer({
    required this.organizerId,
    required this.prefill,
    this.claimPending = false,
    this.sources = const [],
    this.filled = const [],
    this.missing = const [],
  });

  final String organizerId;
  final ClaimableOrganizerPrefill prefill;

  /// This person already has a claim for the page waiting for review.
  final bool claimPending;
  final List<ClaimableOrganizerSource> sources;

  /// What the page already has; setup does not ask for these again.
  final List<ClaimableOrganizerField> filled;

  /// What the page still needs once the claim is approved.
  final List<ClaimableOrganizerField> missing;

  static ClaimableOrganizer? fromMap(Object? value) {
    if (value is! Map<Object?, Object?>) return null;
    final organizerId = _text(value['organizerId']);
    final prefill = value['prefill'];
    if (organizerId == null || prefill is! Map<Object?, Object?>) return null;
    return ClaimableOrganizer(
      organizerId: organizerId,
      prefill: ClaimableOrganizerPrefill.fromMap(prefill),
      claimPending: value['claimPending'] == true,
      sources: _list(value['sources'], ClaimableOrganizerSource.fromWire),
      filled: _list(value['filled'], ClaimableOrganizerField.fromWire),
      missing: _list(value['missing'], ClaimableOrganizerField.fromWire),
    );
  }
}

/// The answer to "is there a page for my number?". While the feature is off
/// the server answers `enabled: false` with no candidates, and setup starts
/// a new page exactly as before.
@immutable
class ClaimableOrganizers {
  const ClaimableOrganizers({
    required this.enabled,
    this.candidates = const [],
  });

  /// Nothing found, or the read is off or failed: setup starts a new page.
  static const none = ClaimableOrganizers(enabled: false);

  factory ClaimableOrganizers.fromCallableData(Object? data) {
    if (data is! Map<Object?, Object?> || data['enabled'] != true) return none;
    final candidates = data['candidates'];
    return ClaimableOrganizers(
      enabled: true,
      candidates: [
        if (candidates is List)
          for (final candidate in candidates)
            ?ClaimableOrganizer.fromMap(candidate),
      ],
    );
  }

  final bool enabled;
  final List<ClaimableOrganizer> candidates;

  /// The pages setup offers under "Is this you?": none while the read is
  /// off, so setup starts a new page exactly as before.
  List<ClaimableOrganizer> get candidatesToOffer =>
      enabled ? candidates : const [];
}

String? _text(Object? value) {
  if (value is! String) return null;
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

List<T> _list<T>(Object? value, T? Function(Object?) parse) => [
  if (value is List)
    for (final item in value) ?parse(item),
];
