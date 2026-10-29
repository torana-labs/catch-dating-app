// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'razorpay_checkout.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Host and non-native shells intentionally have no Razorpay implementation.
// keepalive: the native checkout factory is fixed by the installable app root.

@ProviderFor(razorpayCheckoutFactory)
final razorpayCheckoutFactoryProvider = RazorpayCheckoutFactoryProvider._();

/// Host and non-native shells intentionally have no Razorpay implementation.
// keepalive: the native checkout factory is fixed by the installable app root.

final class RazorpayCheckoutFactoryProvider
    extends
        $FunctionalProvider<
          RazorpayCheckoutFactory?,
          RazorpayCheckoutFactory?,
          RazorpayCheckoutFactory?
        >
    with $Provider<RazorpayCheckoutFactory?> {
  /// Host and non-native shells intentionally have no Razorpay implementation.
  // keepalive: the native checkout factory is fixed by the installable app root.
  RazorpayCheckoutFactoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'razorpayCheckoutFactoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$razorpayCheckoutFactoryHash();

  @$internal
  @override
  $ProviderElement<RazorpayCheckoutFactory?> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  RazorpayCheckoutFactory? create(Ref ref) {
    return razorpayCheckoutFactory(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RazorpayCheckoutFactory? value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RazorpayCheckoutFactory?>(value),
    );
  }
}

String _$razorpayCheckoutFactoryHash() =>
    r'3e6b64ba5bd3c7ae0160dcd439fd18becb6d248f';
