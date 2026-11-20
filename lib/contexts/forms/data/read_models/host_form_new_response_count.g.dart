// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_form_new_response_count.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// How many of one form's answers wait for the host's first look: the
/// applications still `submitted`. Answers with no application (feedback,
/// surveys) carry no review status, so they never count as new. One
/// Firestore count query; null while the response inbox is not ready.

@ProviderFor(hostFormNewResponseCount)
final hostFormNewResponseCountProvider = HostFormNewResponseCountFamily._();

/// How many of one form's answers wait for the host's first look: the
/// applications still `submitted`. Answers with no application (feedback,
/// surveys) carry no review status, so they never count as new. One
/// Firestore count query; null while the response inbox is not ready.

final class HostFormNewResponseCountProvider
    extends $FunctionalProvider<AsyncValue<int?>, int?, FutureOr<int?>>
    with $FutureModifier<int?>, $FutureProvider<int?> {
  /// How many of one form's answers wait for the host's first look: the
  /// applications still `submitted`. Answers with no application (feedback,
  /// surveys) carry no review status, so they never count as new. One
  /// Firestore count query; null while the response inbox is not ready.
  HostFormNewResponseCountProvider._({
    required HostFormNewResponseCountFamily super.from,
    required ({String organizerId, String formId}) super.argument,
  }) : super(
         retry: null,
         name: r'hostFormNewResponseCountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormNewResponseCountHash();

  @override
  String toString() {
    return r'hostFormNewResponseCountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<int?> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<int?> create(Ref ref) {
    final argument = this.argument as ({String organizerId, String formId});
    return hostFormNewResponseCount(
      ref,
      organizerId: argument.organizerId,
      formId: argument.formId,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormNewResponseCountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormNewResponseCountHash() =>
    r'7114c2dc4154741f38358c98bf4e5a67cf119f1d';

/// How many of one form's answers wait for the host's first look: the
/// applications still `submitted`. Answers with no application (feedback,
/// surveys) carry no review status, so they never count as new. One
/// Firestore count query; null while the response inbox is not ready.

final class HostFormNewResponseCountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<int?>,
          ({String organizerId, String formId})
        > {
  HostFormNewResponseCountFamily._()
    : super(
        retry: null,
        name: r'hostFormNewResponseCountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// How many of one form's answers wait for the host's first look: the
  /// applications still `submitted`. Answers with no application (feedback,
  /// surveys) carry no review status, so they never count as new. One
  /// Firestore count query; null while the response inbox is not ready.

  HostFormNewResponseCountProvider call({
    required String organizerId,
    required String formId,
  }) => HostFormNewResponseCountProvider._(
    argument: (organizerId: organizerId, formId: formId),
    from: this,
  );

  @override
  String toString() => r'hostFormNewResponseCountProvider';
}
