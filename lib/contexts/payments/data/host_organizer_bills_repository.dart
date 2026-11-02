import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_organizer_bills_repository.g.dart';

/// Catch's bills to one organizer, newest first. Only the organizer's owner may
/// read them, through an owner-authorized callable.
class HostOrganizerBillsRepository {
  const HostOrganizerBillsRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<List<HostOrganizerBill>> list(String organizerId) =>
      withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable('listOrganizerBills')
              .call<Object?>(
                ListOrganizerBillsCallableRequest(
                  organizerId: organizerId,
                ).toJson(),
              );
          final data = Map<String, Object?>.from(result.data! as Map);
          return [
            for (final bill in data['bills']! as List<Object?>)
              HostOrganizerBill.fromJson(
                Map<String, Object?>.from(bill! as Map),
              ),
          ];
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'list organizer bills',
          resource: 'listOrganizerBills',
        ),
      );
}

@riverpod
HostOrganizerBillsRepository hostOrganizerBillsRepository(Ref ref) =>
    HostOrganizerBillsRepository(ref.watch(firebaseFunctionsProvider));

@riverpod
Future<List<HostOrganizerBill>> hostOrganizerBills(
  Ref ref,
  String organizerId,
) => ref.watch(hostOrganizerBillsRepositoryProvider).list(organizerId);
