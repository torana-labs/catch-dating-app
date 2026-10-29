import 'package:collection/collection.dart';

const _jsonEquality = DeepCollectionEquality();

enum OrganizerOwnershipState { programmatic, userCreated, claimed, transferred }

enum OrganizerClaimState {
  unclaimed,
  claimPending,
  claimed,
  verified,
  suppressed,
}

enum OrganizerProvenanceOrigin { userCreated, scraper, adminSeed, import }

enum OrganizerSourceConfidence { seedOnly, low, medium, high, ownerVerified }

enum OrganizerVerificationStatus { unverified, sourceBacked, ownerVerified }

enum OrganizerPublicPagePublishStatus {
  draft,
  qa,
  published,
  suppressed,
  removed,
}

enum OrganizerPublicPageIndexStatus { noindex, indexReady, indexed }

/// Product-facing trust state derived from the canonical ownership, claim,
/// publication, and provenance records. This is deliberately not inferred
/// from host-role icons, review counts, or whether an organizer has events.
enum OrganizerTrustState {
  crawledUnclaimed,
  sourceBacked,
  claimPending,
  claimedUnverified,
  firstParty,
  ownerVerified,
  suppressed,
}

class OrganizerOwnership {
  const OrganizerOwnership._(this.state, this._json);

  factory OrganizerOwnership.fromJson(Map<String, dynamic> json) =>
      OrganizerOwnership._(
        _enumValue(
          OrganizerOwnershipState.values,
          json['state'],
          OrganizerOwnershipState.programmatic,
        ),
        Map<String, dynamic>.unmodifiable(json),
      );

  final OrganizerOwnershipState state;
  final Map<String, dynamic> _json;

  Map<String, dynamic> toJson() => Map<String, dynamic>.of(_json);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is OrganizerOwnership &&
          state == other.state &&
          _jsonEquality.equals(_json, other._json);

  @override
  int get hashCode => Object.hash(state, _jsonEquality.hash(_json));
}

class OrganizerClaim {
  const OrganizerClaim._(this.state, this._json);

  factory OrganizerClaim.fromJson(Map<String, dynamic> json) =>
      OrganizerClaim._(
        _enumValue(
          OrganizerClaimState.values,
          json['state'],
          OrganizerClaimState.unclaimed,
        ),
        Map<String, dynamic>.unmodifiable(json),
      );

  final OrganizerClaimState state;
  final Map<String, dynamic> _json;

  Map<String, dynamic> toJson() => Map<String, dynamic>.of(_json);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is OrganizerClaim &&
          state == other.state &&
          _jsonEquality.equals(_json, other._json);

  @override
  int get hashCode => Object.hash(state, _jsonEquality.hash(_json));
}

class OrganizerPublicPage {
  const OrganizerPublicPage._({
    required this.publishStatus,
    required this.indexStatus,
    required this._json,
  });

  factory OrganizerPublicPage.fromJson(Map<String, dynamic> json) =>
      OrganizerPublicPage._(
        publishStatus: _enumValue(
          OrganizerPublicPagePublishStatus.values,
          json['publishStatus'],
          OrganizerPublicPagePublishStatus.draft,
        ),
        indexStatus: _enumValue(
          OrganizerPublicPageIndexStatus.values,
          json['indexStatus'],
          OrganizerPublicPageIndexStatus.noindex,
        ),
        json: Map<String, dynamic>.unmodifiable(json),
      );

  final OrganizerPublicPagePublishStatus publishStatus;
  final OrganizerPublicPageIndexStatus indexStatus;
  final Map<String, dynamic> _json;

  Map<String, dynamic> toJson() => Map<String, dynamic>.of(_json);

  String? get canonicalPath {
    final value = _json['canonicalPath'];
    if (value is! String) return null;
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  bool get hasCanonicalRoute => canonicalPath != null;

  bool get blocksPublicRead =>
      publishStatus == OrganizerPublicPagePublishStatus.suppressed ||
      publishStatus == OrganizerPublicPagePublishStatus.removed;

  bool get allowsPublicWebRead =>
      publishStatus == OrganizerPublicPagePublishStatus.published;

  bool get isPublicWebsiteEnabled => allowsPublicWebRead && hasCanonicalRoute;

  bool get allowsPublicWebReviewWrite =>
      allowsPublicWebRead &&
      indexStatus != OrganizerPublicPageIndexStatus.noindex;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is OrganizerPublicPage &&
          publishStatus == other.publishStatus &&
          indexStatus == other.indexStatus &&
          _jsonEquality.equals(_json, other._json);

  @override
  int get hashCode =>
      Object.hash(publishStatus, indexStatus, _jsonEquality.hash(_json));
}

class OrganizerProvenance {
  const OrganizerProvenance._({
    required this.origin,
    required this.sourceConfidence,
    required this.verificationStatus,
    required this._json,
  });

  factory OrganizerProvenance.fromJson(Map<String, dynamic> json) =>
      OrganizerProvenance._(
        origin: _enumValue(
          OrganizerProvenanceOrigin.values,
          json['origin'],
          OrganizerProvenanceOrigin.import,
        ),
        sourceConfidence: _enumValue(
          OrganizerSourceConfidence.values,
          json['sourceConfidence'],
          OrganizerSourceConfidence.seedOnly,
        ),
        verificationStatus: _enumValue(
          OrganizerVerificationStatus.values,
          json['verificationStatus'],
          OrganizerVerificationStatus.unverified,
        ),
        json: Map<String, dynamic>.unmodifiable(json),
      );

  final OrganizerProvenanceOrigin origin;
  final OrganizerSourceConfidence sourceConfidence;
  final OrganizerVerificationStatus verificationStatus;
  final Map<String, dynamic> _json;

  Map<String, dynamic> toJson() => Map<String, dynamic>.of(_json);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is OrganizerProvenance &&
          origin == other.origin &&
          sourceConfidence == other.sourceConfidence &&
          verificationStatus == other.verificationStatus &&
          _jsonEquality.equals(_json, other._json);

  @override
  int get hashCode => Object.hash(
    origin,
    sourceConfidence,
    verificationStatus,
    _jsonEquality.hash(_json),
  );
}

class OrganizerAuthority {
  const OrganizerAuthority({
    required this.ownershipState,
    required this.claimState,
    required this.provenanceOrigin,
    required this.sourceConfidence,
    required this.verificationStatus,
    required this.publishStatus,
    required this.indexStatus,
    required this.trustState,
  });

  factory OrganizerAuthority.resolve({
    required bool hasLegacyOwner,
    OrganizerOwnership? ownership,
    OrganizerClaim? claim,
    OrganizerPublicPage? publicPage,
    OrganizerProvenance? provenance,
  }) {
    final ownershipState =
        ownership?.state ??
        (hasLegacyOwner
            ? OrganizerOwnershipState.claimed
            : OrganizerOwnershipState.programmatic);
    final claimState =
        claim?.state ??
        (hasLegacyOwner
            ? OrganizerClaimState.claimed
            : OrganizerClaimState.unclaimed);
    final provenanceOrigin =
        provenance?.origin ?? OrganizerProvenanceOrigin.import;
    final sourceConfidence =
        provenance?.sourceConfidence ??
        (hasLegacyOwner
            ? OrganizerSourceConfidence.high
            : OrganizerSourceConfidence.seedOnly);
    final verificationStatus =
        provenance?.verificationStatus ??
        (hasLegacyOwner
            ? OrganizerVerificationStatus.sourceBacked
            : OrganizerVerificationStatus.unverified);
    final publishStatus =
        publicPage?.publishStatus ?? OrganizerPublicPagePublishStatus.published;
    final indexStatus =
        publicPage?.indexStatus ?? OrganizerPublicPageIndexStatus.noindex;

    return OrganizerAuthority(
      ownershipState: ownershipState,
      claimState: claimState,
      provenanceOrigin: provenanceOrigin,
      sourceConfidence: sourceConfidence,
      verificationStatus: verificationStatus,
      publishStatus: publishStatus,
      indexStatus: indexStatus,
      trustState: _resolveTrustState(
        ownershipState: ownershipState,
        claimState: claimState,
        provenanceOrigin: provenanceOrigin,
        sourceConfidence: sourceConfidence,
        verificationStatus: verificationStatus,
      ),
    );
  }

  final OrganizerOwnershipState ownershipState;
  final OrganizerClaimState claimState;
  final OrganizerProvenanceOrigin provenanceOrigin;
  final OrganizerSourceConfidence sourceConfidence;
  final OrganizerVerificationStatus verificationStatus;
  final OrganizerPublicPagePublishStatus publishStatus;
  final OrganizerPublicPageIndexStatus indexStatus;
  final OrganizerTrustState trustState;

  bool get isOwnerVerified => trustState == OrganizerTrustState.ownerVerified;

  bool get isClaimable => claimState == OrganizerClaimState.unclaimed;

  bool get blocksPublicRead => trustState == OrganizerTrustState.suppressed;
}

OrganizerTrustState _resolveTrustState({
  required OrganizerOwnershipState ownershipState,
  required OrganizerClaimState claimState,
  required OrganizerProvenanceOrigin provenanceOrigin,
  required OrganizerSourceConfidence sourceConfidence,
  required OrganizerVerificationStatus verificationStatus,
}) {
  // Marketing publication is a web projection concern. Native access is
  // governed by appVisibility plus an explicitly suppressed claim record.
  if (claimState == OrganizerClaimState.suppressed) {
    return OrganizerTrustState.suppressed;
  }
  // First-party creation is its own provenance statement. It must not be
  // collapsed into owner verification merely because Catch is also the
  // authoritative source for the record.
  if (ownershipState == OrganizerOwnershipState.userCreated ||
      provenanceOrigin == OrganizerProvenanceOrigin.userCreated) {
    return OrganizerTrustState.firstParty;
  }
  if (claimState == OrganizerClaimState.verified ||
      verificationStatus == OrganizerVerificationStatus.ownerVerified ||
      sourceConfidence == OrganizerSourceConfidence.ownerVerified) {
    return OrganizerTrustState.ownerVerified;
  }
  if (claimState == OrganizerClaimState.claimPending) {
    return OrganizerTrustState.claimPending;
  }
  if (claimState == OrganizerClaimState.claimed ||
      ownershipState == OrganizerOwnershipState.claimed ||
      ownershipState == OrganizerOwnershipState.transferred) {
    return OrganizerTrustState.claimedUnverified;
  }
  if (verificationStatus == OrganizerVerificationStatus.sourceBacked ||
      sourceConfidence == OrganizerSourceConfidence.medium ||
      sourceConfidence == OrganizerSourceConfidence.high) {
    return OrganizerTrustState.sourceBacked;
  }
  return OrganizerTrustState.crawledUnclaimed;
}

T _enumValue<T extends Enum>(List<T> values, Object? raw, T fallback) {
  if (raw is! String) return fallback;
  for (final value in values) {
    if (value.name == raw) return value;
  }
  return fallback;
}
