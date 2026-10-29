// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'messaging_permission_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(messagingPermissionRepository)
final messagingPermissionRepositoryProvider =
    MessagingPermissionRepositoryProvider._();

final class MessagingPermissionRepositoryProvider
    extends
        $FunctionalProvider<
          MessagingPermissionRepository,
          MessagingPermissionRepository,
          MessagingPermissionRepository
        >
    with $Provider<MessagingPermissionRepository> {
  MessagingPermissionRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'messagingPermissionRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$messagingPermissionRepositoryHash();

  @$internal
  @override
  $ProviderElement<MessagingPermissionRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  MessagingPermissionRepository create(Ref ref) {
    return messagingPermissionRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MessagingPermissionRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MessagingPermissionRepository>(
        value,
      ),
    );
  }
}

String _$messagingPermissionRepositoryHash() =>
    r'13f7d4d73217fc92116fa48e65dde0d09d3083c8';
