// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_hype_avatar_row.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventHypeAvatars)
final eventHypeAvatarsProvider = EventHypeAvatarsFamily._();

final class EventHypeAvatarsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<CatchPersonAvatarItem>>,
          List<CatchPersonAvatarItem>,
          FutureOr<List<CatchPersonAvatarItem>>
        >
    with
        $FutureModifier<List<CatchPersonAvatarItem>>,
        $FutureProvider<List<CatchPersonAvatarItem>> {
  EventHypeAvatarsProvider._({
    required EventHypeAvatarsFamily super.from,
    required EventHypeAvatarQuery super.argument,
  }) : super(
         retry: null,
         name: r'eventHypeAvatarsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventHypeAvatarsHash();

  @override
  String toString() {
    return r'eventHypeAvatarsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<CatchPersonAvatarItem>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<CatchPersonAvatarItem>> create(Ref ref) {
    final argument = this.argument as EventHypeAvatarQuery;
    return eventHypeAvatars(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is EventHypeAvatarsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventHypeAvatarsHash() => r'f83ff60f4785ac442a6834c503c65f15bc2e0af2';

final class EventHypeAvatarsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<CatchPersonAvatarItem>>,
          EventHypeAvatarQuery
        > {
  EventHypeAvatarsFamily._()
    : super(
        retry: null,
        name: r'eventHypeAvatarsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventHypeAvatarsProvider call(EventHypeAvatarQuery query) =>
      EventHypeAvatarsProvider._(argument: query, from: this);

  @override
  String toString() => r'eventHypeAvatarsProvider';
}
