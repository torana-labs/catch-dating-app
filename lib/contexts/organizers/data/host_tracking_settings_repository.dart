import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_authority.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_tracking_settings_repository.g.dart';

typedef HostTrackingSettingsScope = ({
  String accountId,
  String organizerId,
  AuthenticatedSession session,
});

/// Private manager settings. IDs are configuration, never account credentials.
class HostTrackingSettings {
  const HostTrackingSettings({
    required this.organizerId,
    required this.revision,
    required this.metaPixelId,
    required this.googleMeasurementId,
    required this.enabled,
    required this.publicationAllowed,
    required this.canEdit,
    required this.editBlockedReason,
  });
  final String organizerId;
  final int revision;
  final String? metaPixelId;
  final String? googleMeasurementId;
  final bool enabled;
  final bool publicationAllowed;
  final bool canEdit;
  final String editBlockedReason;

  factory HostTrackingSettings.fromResponse(
    Object? data,
    String expectedOrganizerId,
  ) {
    if (data is! Map ||
        data['organizerId'] != expectedOrganizerId ||
        data['revision'] is! int ||
        (data['revision'] as int) < 0 ||
        (data['revision'] as int) > 9007199254740991 ||
        data['enabled'] != false ||
        data['publicationAllowed'] != false ||
        data['policyReason'] != 'policyReviewRequired' ||
        data['canEdit'] is! bool ||
        !const ['none', 'unclaimed'].contains(data['editBlockedReason']) ||
        (data['canEdit'] == true) != (data['editBlockedReason'] == 'none') ||
        (data['metaPixelId'] != null &&
            (data['metaPixelId'] is! String ||
                !RegExp(
                  r'^[0-9]{5,20}$',
                ).hasMatch(data['metaPixelId'] as String))) ||
        (data['googleMeasurementId'] != null &&
            (data['googleMeasurementId'] is! String ||
                !RegExp(
                  r'^G-[A-Z0-9]{4,20}$',
                ).hasMatch(data['googleMeasurementId'] as String)))) {
      throw const FormatException('Invalid organizer tracking settings.');
    }
    return HostTrackingSettings(
      organizerId: expectedOrganizerId,
      revision: data['revision'] as int,
      metaPixelId: data['metaPixelId'] as String?,
      googleMeasurementId: data['googleMeasurementId'] as String?,
      enabled: false,
      publicationAllowed: false,
      canEdit: data['canEdit'] as bool,
      editBlockedReason: data['editBlockedReason'] as String,
    );
  }

  /// The stored `organizerTrackingSettings/{organizerId}` document, or the
  /// defaults while it was never saved. Advertising publication stays off
  /// whatever the document says: the policy is code-owned on the server.
  factory HostTrackingSettings.fromDocument(
    Map<String, Object?>? data,
    String expectedOrganizerId, {
    required bool canEdit,
  }) => HostTrackingSettings.fromResponse({
    'organizerId': data == null ? expectedOrganizerId : data['organizerId'],
    'revision': data == null ? 0 : data['revision'],
    'metaPixelId': data?['metaPixelId'],
    'googleMeasurementId': data?['googleMeasurementId'],
    'enabled': false,
    'publicationAllowed': false,
    'policyReason': 'policyReviewRequired',
    'canEdit': canEdit,
    'editBlockedReason': canEdit ? 'none' : 'unclaimed',
  }, expectedOrganizerId);
}

/// Whether tracking settings may be saved for [organizer], as
/// setOrganizerTrackingSettings decides it (trackingConfigurationEligible):
/// a live organizer with an owner that is first-party or a verified claim.
bool organizerTrackingEditable(Organizer organizer) =>
    !organizer.archived &&
    organizer.status != OrganizerLifecycleStatus.archived &&
    organizer.claim?.state != OrganizerClaimState.suppressed &&
    (organizer.ownerUserId?.isNotEmpty ?? false) &&
    (organizer.ownership?.state == OrganizerOwnershipState.userCreated ||
        organizer.claim?.state == OrganizerClaimState.verified);

class HostTrackingSettingsRepository {
  const HostTrackingSettingsRepository(this._functions, this._firestore);
  final FirebaseFunctions _functions;
  final FirebaseFirestore _firestore;

  static const collection = 'organizerTrackingSettings';

  /// The organizer's settings while they are listened to. Rules let its
  /// current managers get the document; [canEdit] comes from the organizer.
  Stream<HostTrackingSettings> watch(
    String organizerId, {
    required bool canEdit,
  }) => withBackendErrorStream(
    () => _firestore
        .collection(collection)
        .doc(organizerId)
        .snapshots()
        .map(
          (snapshot) => HostTrackingSettings.fromDocument(
            snapshot.data(),
            organizerId,
            canEdit: canEdit,
          ),
        ),
    context: BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch tracking settings',
      resource: organizerId,
    ),
  );

  Future<HostTrackingSettings> save(
    SetOrganizerTrackingSettingsCallableRequest request,
  ) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('setOrganizerTrackingSettings')
          .call<Object?>(request.toJson());
      return HostTrackingSettings.fromResponse(
        result.data,
        request.organizerId,
      );
    },
    context: BackendErrorContext(
      service: BackendService.functions,
      action: 'setOrganizerTrackingSettings',
      resource: request.organizerId,
    ),
  );
}

@riverpod
HostTrackingSettingsRepository hostTrackingSettingsRepository(Ref ref) =>
    HostTrackingSettingsRepository(
      ref.watch(firebaseFunctionsProvider),
      ref.watch(firebaseFirestoreProvider),
    );

/// The organizer's tracking settings listener. It is a Firestore listener:
/// saves never invalidate it, the new revision arrives on its own. Whether
/// they may be edited follows the organizer listener the Host shell holds.
@riverpod
Stream<HostTrackingSettings> hostTrackingSettings(
  Ref ref,
  String organizerId,
) async* {
  final authSession = ref.watch(authenticatedSessionProvider);
  final session = !authSession.isLoading && !authSession.hasError
      ? authSession.asData?.value
      : null;
  final auth = ref.watch(uidProvider);
  final uid = !auth.isLoading && !auth.hasError ? auth.asData?.value : null;
  if (uid == null || uid.isEmpty || session == null) {
    throw const SignInRequiredException('read tracking settings');
  }
  // Only a change to whether it may be edited restarts the listener, so an
  // unrelated organizer write never drops an unsaved draft.
  final canEdit = await ref.watch(
    watchOrganizerProvider(organizerId).selectAsync(
      (organizer) => organizer != null && organizerTrackingEditable(organizer),
    ),
  );
  if (!ref.mounted ||
      ref.read(uidProvider).asData?.value != uid ||
      !identical(
        ref.read(authenticatedSessionProvider).asData?.value,
        session,
      )) {
    throw const SignInRequiredException('read tracking settings');
  }
  yield* ref
      .watch(hostTrackingSettingsRepositoryProvider)
      .watch(organizerId, canEdit: canEdit);
}
