// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_shell.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(appShellFcmInitialization)
final appShellFcmInitializationProvider = AppShellFcmInitializationFamily._();

final class AppShellFcmInitializationProvider
    extends $FunctionalProvider<AsyncValue<void>, void, FutureOr<void>>
    with $FutureModifier<void>, $FutureProvider<void> {
  AppShellFcmInitializationProvider._({
    required AppShellFcmInitializationFamily super.from,
    required (String, GoRouter) super.argument,
  }) : super(
         retry: null,
         name: r'appShellFcmInitializationProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$appShellFcmInitializationHash();

  @override
  String toString() {
    return r'appShellFcmInitializationProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<void> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<void> create(Ref ref) {
    final argument = this.argument as (String, GoRouter);
    return appShellFcmInitialization(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is AppShellFcmInitializationProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$appShellFcmInitializationHash() =>
    r'9150995d5809e4b8c039b7d771a3fbc291aa9c11';

final class AppShellFcmInitializationFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<void>, (String, GoRouter)> {
  AppShellFcmInitializationFamily._()
    : super(
        retry: null,
        name: r'appShellFcmInitializationProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  AppShellFcmInitializationProvider call(String uid, GoRouter router) =>
      AppShellFcmInitializationProvider._(argument: (uid, router), from: this);

  @override
  String toString() => r'appShellFcmInitializationProvider';
}
