import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

class ParticipationTestFunctions extends Fake implements FirebaseFunctions {
  Object? response;
  Object? error;
  final calls = <({String name, Object? input})>[];

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _ParticipationCallable(this, name);
}

class _ParticipationCallable extends Fake implements HttpsCallable {
  _ParticipationCallable(this.owner, this.name);
  final ParticipationTestFunctions owner;
  final String name;

  @override
  Future<HttpsCallableResult<T>> call<T>([Object? parameters]) async {
    owner.calls.add((name: name, input: parameters));
    if (owner.error case final error?) throw error;
    return _ParticipationResult<T>(owner.response as T);
  }
}

class _ParticipationResult<T> extends Fake implements HttpsCallableResult<T> {
  _ParticipationResult(this.data);
  @override
  final T data;
}
