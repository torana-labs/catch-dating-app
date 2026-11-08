// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'formats_rules_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The grouping rules as the server previews them: the published booking
/// questions, the saved rules and how many guests agreed to each answer
/// being used. There is no listener for this; the read is the existing
/// `previewEventAssignmentFeatures`, asked once for the saved rules and
/// again with them so their coverage comes back.

@ProviderFor(hostFormatsRulesPreview)
final hostFormatsRulesPreviewProvider = HostFormatsRulesPreviewFamily._();

/// The grouping rules as the server previews them: the published booking
/// questions, the saved rules and how many guests agreed to each answer
/// being used. There is no listener for this; the read is the existing
/// `previewEventAssignmentFeatures`, asked once for the saved rules and
/// again with them so their coverage comes back.

final class HostFormatsRulesPreviewProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessAssignmentFeaturePreview>,
          EventSuccessAssignmentFeaturePreview,
          FutureOr<EventSuccessAssignmentFeaturePreview>
        >
    with
        $FutureModifier<EventSuccessAssignmentFeaturePreview>,
        $FutureProvider<EventSuccessAssignmentFeaturePreview> {
  /// The grouping rules as the server previews them: the published booking
  /// questions, the saved rules and how many guests agreed to each answer
  /// being used. There is no listener for this; the read is the existing
  /// `previewEventAssignmentFeatures`, asked once for the saved rules and
  /// again with them so their coverage comes back.
  HostFormatsRulesPreviewProvider._({
    required HostFormatsRulesPreviewFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostFormatsRulesPreviewProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormatsRulesPreviewHash();

  @override
  String toString() {
    return r'hostFormatsRulesPreviewProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<EventSuccessAssignmentFeaturePreview> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<EventSuccessAssignmentFeaturePreview> create(Ref ref) {
    final argument = this.argument as String;
    return hostFormatsRulesPreview(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormatsRulesPreviewProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormatsRulesPreviewHash() =>
    r'9fdb04218d2fdc997b2fc384fc34bd0d19557026';

/// The grouping rules as the server previews them: the published booking
/// questions, the saved rules and how many guests agreed to each answer
/// being used. There is no listener for this; the read is the existing
/// `previewEventAssignmentFeatures`, asked once for the saved rules and
/// again with them so their coverage comes back.

final class HostFormatsRulesPreviewFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<EventSuccessAssignmentFeaturePreview>,
          String
        > {
  HostFormatsRulesPreviewFamily._()
    : super(
        retry: null,
        name: r'hostFormatsRulesPreviewProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The grouping rules as the server previews them: the published booking
  /// questions, the saved rules and how many guests agreed to each answer
  /// being used. There is no listener for this; the read is the existing
  /// `previewEventAssignmentFeatures`, asked once for the saved rules and
  /// again with them so their coverage comes back.

  HostFormatsRulesPreviewProvider call(String eventId) =>
      HostFormatsRulesPreviewProvider._(argument: eventId, from: this);

  @override
  String toString() => r'hostFormatsRulesPreviewProvider';
}

/// Grouping, from the preview.

@ProviderFor(hostFormatsRulesController)
final hostFormatsRulesControllerProvider = HostFormatsRulesControllerFamily._();

/// Grouping, from the preview.

final class HostFormatsRulesControllerProvider
    extends
        $FunctionalProvider<
          HostFormatsRulesState,
          HostFormatsRulesState,
          HostFormatsRulesState
        >
    with $Provider<HostFormatsRulesState> {
  /// Grouping, from the preview.
  HostFormatsRulesControllerProvider._({
    required HostFormatsRulesControllerFamily super.from,
    required Event super.argument,
  }) : super(
         retry: null,
         name: r'hostFormatsRulesControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormatsRulesControllerHash();

  @override
  String toString() {
    return r'hostFormatsRulesControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostFormatsRulesState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostFormatsRulesState create(Ref ref) {
    final argument = this.argument as Event;
    return hostFormatsRulesController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormatsRulesState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormatsRulesState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormatsRulesControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormatsRulesControllerHash() =>
    r'53b7b9df804d7d383435e504022ab0e67384ca8a';

/// Grouping, from the preview.

final class HostFormatsRulesControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostFormatsRulesState, Event> {
  HostFormatsRulesControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormatsRulesControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Grouping, from the preview.

  HostFormatsRulesControllerProvider call(Event event) =>
      HostFormatsRulesControllerProvider._(argument: event, from: this);

  @override
  String toString() => r'hostFormatsRulesControllerProvider';
}
