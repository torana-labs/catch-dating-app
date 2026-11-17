// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'command_journal_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(commandJournalStorage)
final commandJournalStorageProvider = CommandJournalStorageProvider._();

final class CommandJournalStorageProvider
    extends
        $FunctionalProvider<
          CommandJournalStorageOpener,
          CommandJournalStorageOpener,
          CommandJournalStorageOpener
        >
    with $Provider<CommandJournalStorageOpener> {
  CommandJournalStorageProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'commandJournalStorageProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$commandJournalStorageHash();

  @$internal
  @override
  $ProviderElement<CommandJournalStorageOpener> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  CommandJournalStorageOpener create(Ref ref) {
    return commandJournalStorage(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CommandJournalStorageOpener value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CommandJournalStorageOpener>(value),
    );
  }
}

String _$commandJournalStorageHash() =>
    r'1e7238cf8bc3e84fedf2f74547e854764a7d91e9';
