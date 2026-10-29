import 'package:catch_dating_app/contexts/payments/data/payment_callable_requests.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_callable_responses.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_payment_account_repository.g.dart';

@riverpod
HostPaymentAccountRepository hostPaymentAccountRepository(Ref ref) {
  return HostPaymentAccountRepository(
    db: ref.watch(firebaseFirestoreProvider),
    functions: ref.watch(firebaseFunctionsProvider),
  );
}

@riverpod
Stream<List<HostPaymentAccount>> watchHostPaymentAccounts(Ref ref, String uid) {
  return ref
      .watch(hostPaymentAccountRepositoryProvider)
      .watchHostPaymentAccounts(uid);
}

class HostPaymentAccountRepository {
  const HostPaymentAccountRepository({
    required this._db,
    required this._functions,
  });

  static const _collectionPath = 'hostPaymentAccounts';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  Stream<List<HostPaymentAccount>> watchHostPaymentAccounts(String uid) =>
      withBackendErrorStream(
        () => _db
            .collection(_collectionPath)
            .where('userId', isEqualTo: uid)
            .limit(ReadLimitPolicy.hostPaymentProviders)
            .snapshots()
            .map(
              (snap) => snap.docs
                  .map((doc) => HostPaymentAccount.fromJson(doc.data()))
                  .toList(growable: false),
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch host payment account',
          resource: _collectionPath,
        ),
      );

  Future<StripeHostOnboardingLinkCallableResponse> createOnboardingLink({
    required HostPaymentProvider provider,
    required String country,
    required String defaultCurrency,
  }) {
    if (provider != HostPaymentProvider.stripe) {
      throw ArgumentError.value(provider, 'provider');
    }
    return withBackendErrorContext(
      () async {
        final result = await _functions
            .httpsCallable('createStripeHostOnboardingLink')
            .call<Object?>(
              CreateStripeHostOnboardingLinkCallableRequest(
                country: country,
                defaultCurrency: defaultCurrency,
              ).toJson(),
            );
        return StripeHostOnboardingLinkCallableResponse.fromCallableData(
          result.data,
        );
      },
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'create Stripe onboarding link',
        resource: _collectionPath,
      ),
    );
  }

  Future<void> createRazorpayAccount(RazorpayHostOnboardingDetails details) =>
      withBackendErrorContext(
        () => _functions
            .httpsCallable('createRazorpayHostPaymentAccount')
            .call(details.toJson()),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'create Razorpay host payment account',
          resource: _collectionPath,
        ),
      );

  Future<void> refreshStatus(HostPaymentProvider provider) =>
      withBackendErrorContext(
        () => _functions
            .httpsCallable(switch (provider) {
              HostPaymentProvider.razorpay =>
                'refreshRazorpayHostPaymentAccount',
              HostPaymentProvider.stripe => 'refreshStripeHostPaymentAccount',
            })
            .call(const <String, Object?>{}),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'refresh host payment account status',
          resource: _collectionPath,
        ),
      );
}
