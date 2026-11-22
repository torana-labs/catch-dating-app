import 'package:catch_dating_app/contexts/safety/domain/organizer_guest_block.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show
        ListOrganizerGuestBlocksCallableRequest,
        ManageOrganizerGuestBlockCallableRequest,
        ReportGuestCallableRequest;
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/contexts/safety/domain/organizer_guest_block.dart';

part 'organizer_guest_safety_repository.g.dart';

/// Why a host reports a guest. Each value is the report reason code the
/// server stores.
enum OrganizerGuestReportReason {
  unsafeBehaviour('unsafe_behaviour'),
  harassment('harassment'),
  other('other');

  const OrganizerGuestReportReason(this.code);

  final String code;
}

/// Safety commands an organiser runs about a guest: report them to Catch,
/// stop them booking the organiser events, and list who is stopped.
///
/// Every call is a server-checked callable. The block list is not readable
/// by clients, so [listGuestBlocks] is a bounded server read (at most 500,
/// newest first) that adds each guest display name.
class OrganizerGuestSafetyRepository {
  const OrganizerGuestSafetyRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<void> reportGuest({
    required String organizerId,
    required String? eventId,
    required String targetUserId,
    required OrganizerGuestReportReason reason,
    String? notes,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('reportGuest')
        .call<Object?>(
          ReportGuestCallableRequest(
            organizerId: organizerId,
            eventId: eventId,
            targetUserId: targetUserId,
            reasonCode: reason.code,
            notes: notes,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'report guest',
      resource: 'reports',
    ),
  );

  Future<List<OrganizerGuestBlock>> listGuestBlocks(String organizerId) =>
      withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable('listOrganizerGuestBlocks')
              .call<Object?>(
                ListOrganizerGuestBlocksCallableRequest(
                  organizerId: organizerId,
                ).toJson(),
              );
          final data = result.data;
          final items = data is Map ? data['items'] : null;
          if (items is! List) return const <OrganizerGuestBlock>[];
          return List.unmodifiable(
            items.map(OrganizerGuestBlock.fromCallable).nonNulls,
          );
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'list blocked guests',
          resource: 'organizerGuestBlocks',
        ),
      );

  Future<void> setGuestBlocked({
    required String organizerId,
    required String uid,
    required bool blocked,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('manageOrganizerGuestBlock')
        .call<Object?>(
          ManageOrganizerGuestBlockCallableRequest(
            organizerId: organizerId,
            uid: uid,
            blocked: blocked,
          ).toJson(),
        ),
    context: BackendErrorContext(
      service: BackendService.functions,
      action: blocked ? 'block guest' : 'unblock guest',
      resource: 'organizerGuestBlocks',
    ),
  );
}

@riverpod
OrganizerGuestSafetyRepository organizerGuestSafetyRepository(Ref ref) =>
    OrganizerGuestSafetyRepository(ref.watch(firebaseFunctionsProvider));

/// Who the organiser has stopped booking their events, newest first.
@riverpod
Future<List<OrganizerGuestBlock>> organizerGuestBlocks(
  Ref ref,
  String organizerId,
) => ref
    .watch(organizerGuestSafetyRepositoryProvider)
    .listGuestBlocks(organizerId);
