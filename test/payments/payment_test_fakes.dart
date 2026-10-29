import 'package:catch_dating_app/contexts/payments/data/razorpay_checkout.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

class TestFirebaseFunctions extends Fake implements FirebaseFunctions {
  final callables = <String, TestHttpsCallable>{};

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    return callables.putIfAbsent(name, () => TestHttpsCallable(name));
  }
}

class TestHttpsCallable extends Fake implements HttpsCallable {
  TestHttpsCallable(this.name);

  final String name;
  final calls = <Object?>[];
  Object? resultData;
  Object? error;
  Future<Object?> Function(Object? parameters)? onCall;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async {
    calls.add(parameters);
    if (error != null) {
      throw error!;
    }
    final handler = onCall;
    final result = handler == null ? resultData : await handler(parameters);
    return TestHttpsCallableResult<T>(result as T);
  }
}

class TestHttpsCallableResult<T> extends Fake
    implements HttpsCallableResult<T> {
  TestHttpsCallableResult(this.dataValue);

  final T dataValue;

  @override
  T get data => dataValue;
}

class FakeRazorpay implements RazorpayCheckout {
  RazorpaySuccessHandler? successHandler;
  RazorpayFailureHandler? errorHandler;
  final openCalls = <Map<String, dynamic>>[];
  bool cleared = false;
  int clearCalls = 0;
  Object? openError;

  @override
  void configure({
    required RazorpaySuccessHandler onSuccess,
    required RazorpayFailureHandler onFailure,
  }) {
    successHandler = onSuccess;
    errorHandler = onFailure;
  }

  @override
  void open(Map<String, dynamic> options) {
    openCalls.add(options);
    if (openError case final error?) throw error;
  }

  @override
  void clear() {
    cleared = true;
    clearCalls++;
  }

  void emitSuccess(RazorpaySuccessResponse response) {
    successHandler?.call(response);
  }

  void emitError(RazorpayFailureResponse response) {
    errorHandler?.call(response);
  }
}

class TestFirebaseFunctionsException extends FirebaseFunctionsException {
  TestFirebaseFunctionsException({required super.code, required super.message});
}
