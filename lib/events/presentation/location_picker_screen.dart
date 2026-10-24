import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/city_catalog.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/events/presentation/location_picker_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/locations/data/places_repository.dart'
    show PlaceAutocompleteSuggestion;
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:catch_dating_app/locations/shared/location_map.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class LocationPickerScreen extends ConsumerStatefulWidget {
  const LocationPickerScreen({
    super.key,
    this.countryIsoCode,
    this.initialLocation,
    this.initialCenter,
    this.initialLabel,
    this.initialSearchQuery,
    this.initialSearchError,
    this.usePlatformMapView = true,
    this.loadMapTiles = true,
  });

  /// ISO country code used to scope meeting-point search suggestions.
  final String? countryIsoCode;

  /// If provided, the map opens centred on this pin.
  final LocationCoordinate? initialLocation;

  /// If provided without [initialLocation], the map opens centred here without
  /// treating it as an already selected meeting location.
  final LocationCoordinate? initialCenter;

  /// Existing attendee-facing name for [initialLocation], if known.
  final String? initialLabel;

  /// Optional deterministic search query for tests and visual captures.
  final String? initialSearchQuery;

  /// Optional deterministic search failure for tests and visual captures.
  final Object? initialSearchError;

  /// Use the Google Maps platform view. Tests/captures can disable this to
  /// render the picker chrome without platform-view channels.
  final bool usePlatformMapView;

  /// Retained as a test hook while the screen uses the Google Maps SDK.
  final bool loadMapTiles;

  @override
  ConsumerState<LocationPickerScreen> createState() =>
      _LocationPickerScreenState();
}

@immutable
class LocationPickerResult {
  const LocationPickerResult({
    required this.coordinate,
    this.name,
    this.address,
    this.placeId,
  });

  final LocationCoordinate coordinate;
  final String? name;
  final String? address;
  final String? placeId;

  String? get displayName => _trimToNull(name) ?? _trimToNull(address);
}

class _LocationPickerScreenState extends ConsumerState<LocationPickerScreen> {
  final _searchController = TextEditingController();
  LocationCoordinate? _selected;
  String? _selectedLabel;
  String? _selectedAddress;
  String? _selectedPlaceId;
  LocationMapController? _mapController;
  Timer? _searchDebounce;
  String _sessionToken = _newSessionToken();
  var _suggestions = <PlaceAutocompleteSuggestion>[];
  var _searching = false;
  PlaceAutocompleteSuggestion? _pendingSuggestion;
  String? _searchError;

  LocationCoordinate get _defaultCenter {
    final city = defaultCityDataForMarket();
    return LocationCoordinate(city.latitude, city.longitude);
  }

  String get _countryIsoCode =>
      widget.countryIsoCode ?? defaultCityDataForMarket().countryIsoCode;

  @override
  void initState() {
    super.initState();
    _selected = widget.initialLocation;
    _selectedLabel = _trimToNull(widget.initialLabel);
    final initialSearchQuery = _trimToNull(widget.initialSearchQuery);
    _searchController.text = _selectedLabel ?? initialSearchQuery ?? '';
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final initialSearchError = widget.initialSearchError;
    if (_searchError == null && initialSearchError != null) {
      _searchError = _placeSearchFailureText(context.l10n, initialSearchError);
    }
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    // GoogleMap owns disposal of its controller; clear only our reference.
    _mapController = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final initialCameraTarget =
        widget.initialLocation ?? widget.initialCenter ?? _defaultCenter;
    final hasInitialCameraHint =
        widget.initialLocation != null || widget.initialCenter != null;
    final mapLayer = widget.usePlatformMapView
        ? LocationMap(
            initialCenter: initialCameraTarget,
            initialZoom: hasInitialCameraHint ? 15 : 12,
            markers: {
              if (_selected != null)
                MapMarker(
                  id: 'selected-starting-point',
                  position: _selected!,
                  hue: MapMarkerHue.orange,
                ),
            },
            mapType: widget.loadMapTiles
                ? LocationMapType.normal
                : LocationMapType.none,
            onMapCreated: (controller) => _mapController = controller,
            onTap: _setSelectedPoint,
          )
        : ColoredBox(color: t.bg);

    return CatchScaffold.workspace(
      body: Stack(
        children: [
          Positioned.fill(child: mapLayer),
          Positioned(
            top: CatchSpacing.s4,
            left: CatchSpacing.s4,
            right: CatchSpacing.s4,
            child: SafeArea(
              bottom: false,
              child: MapPickerSearchRow(
                onBack: () => Navigator.of(context).maybePop(),
                searchPanel: PlaceSearchSection(
                  controller: _searchController,
                  suggestions: _suggestions,
                  stateText: _searchStateText,
                  errorText: _searchError,
                  onChanged: _onSearchChanged,
                  onSuggestionSelected: _selectSuggestion,
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: SafeArea(
              top: false,
              child: SelectedPointSection(
                selectedLabel: _selectedLabel,
                hasSelection: _selected != null,
                onConfirm: _selected == null || _pendingSuggestion != null
                    ? null
                    : () => Navigator.of(context).pop(
                        LocationPickerResult(
                          coordinate: _selected!,
                          name: _selectedLabel,
                          address: _selectedAddress,
                          placeId: _selectedPlaceId,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String? get _searchStateText {
    if (_pendingSuggestion != null) {
      return context.l10n.eventsLocationPickerScreenVisiblecopySelecting;
    }
    if (_searching && _suggestions.isEmpty) {
      return context.l10n.eventsLocationPickerScreenVisiblecopySearching;
    }
    return null;
  }

  void _setSelectedPoint(
    LocationCoordinate point, {
    String? label,
    String? address,
    String? placeId,
  }) {
    setState(() {
      _selected = point;
      _selectedLabel = _trimToNull(label);
      _selectedAddress = _trimToNull(address);
      _selectedPlaceId = _trimToNull(placeId);
      _suggestions = const [];
      _pendingSuggestion = null;
      _searchError = null;
    });
    if (_selectedLabel == null) {
      _searchController.clear();
    }
  }

  void _onSearchChanged(String value) {
    _searchDebounce?.cancel();
    final query = value.trim();
    if (query.length < 2) {
      setState(() {
        _suggestions = const [];
        _searchError = null;
        _searching = false;
        _pendingSuggestion = null;
      });
      return;
    }
    setState(() {
      _suggestions = const [];
      _searchError = null;
      _searching = true;
    });
    _searchDebounce = Timer(
      CatchMotion.searchDebounce,
      () => _searchPlaces(query),
    );
  }

  Future<void> _searchPlaces(String query) async {
    setState(() {
      _searching = true;
      _searchError = null;
    });

    try {
      final results = await ref
          .read(locationPickerControllerProvider)
          .autocomplete(
            input: query,
            sessionToken: _sessionToken,
            bias:
                _selected ??
                widget.initialLocation ??
                widget.initialCenter ??
                _defaultCenter,
            countryIsoCode: _countryIsoCode,
          );
      if (!mounted || _searchController.text.trim() != query) return;
      setState(() {
        _suggestions = results;
        _searching = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _suggestions = const [];
        _searching = false;
        _searchError = _placeSearchFailureText(context.l10n, error);
      });
    }
  }

  Future<void> _selectSuggestion(PlaceAutocompleteSuggestion suggestion) async {
    final label = _suggestionLabel(suggestion, context.l10n);
    setState(() {
      _pendingSuggestion = suggestion;
      _suggestions = const [];
      _searching = false;
      _searchError = null;
    });
    FocusScope.of(context).unfocus();

    try {
      final place = await ref
          .read(locationPickerControllerProvider)
          .details(placeId: suggestion.placeId, sessionToken: _sessionToken);
      if (!mounted) return;
      _sessionToken = _newSessionToken();
      final displayName = place.displayName.isNotEmpty
          ? place.displayName
          : label;
      _searchController.text = displayName;
      _setSelectedPoint(
        place.location,
        label: displayName,
        address: place.formattedAddress,
        placeId: place.placeId,
      );
      await _mapController?.animateTo(place.location, zoom: 16);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _pendingSuggestion = null;
        _suggestions = [suggestion];
        _searching = false;
        _searchError = _placeDetailsFailureText(context.l10n, error);
      });
    }
  }
}

String _newSessionToken() => 'places-${DateTime.now().microsecondsSinceEpoch}';

String? _trimToNull(String? value) {
  final trimmed = value?.trim();
  if (trimmed == null || trimmed.isEmpty) return null;
  return trimmed;
}

String _suggestionLabel(
  PlaceAutocompleteSuggestion suggestion,
  AppLocalizations l10n,
) {
  if (suggestion.mainText.isNotEmpty) return suggestion.mainText;
  if (suggestion.description.isNotEmpty) return suggestion.description;
  return l10n.eventsLocationPickerSelectedPlace;
}

String _placeSearchFailureText(AppLocalizations l10n, Object error) {
  return _locationPickerFailureText(
    l10n,
    error,
    fallback: l10n.eventsLocationPickerSearchFailure,
  );
}

String _placeDetailsFailureText(AppLocalizations l10n, Object error) {
  return _locationPickerFailureText(
    l10n,
    error,
    fallback: l10n.eventsLocationPickerDetailsFailure,
  );
}

String _locationPickerFailureText(
  AppLocalizations l10n,
  Object error, {
  required String fallback,
}) {
  final descriptor = appErrorDescriptor(
    error,
    l10n: l10n,
    context: AppErrorContext.event,
  );
  if (descriptor.title == l10n.coreAppErrorMessageVisiblecopyConnectionIssue) {
    return descriptor.message;
  }
  return fallback;
}

class MapPickerSearchRow extends StatelessWidget {
  const MapPickerSearchRow({
    super.key,
    required this.searchPanel,
    required this.onBack,
  });

  final Widget searchPanel;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchIconAction(
          tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          backgroundColor: t.surface.withValues(
            alpha: CatchOpacity.locationPickerTopChromeFill,
          ),
          onPressed: onBack,
          child: Icon(CatchIcons.arrowBackIosNewRounded, size: CatchIcon.md),
        ),
        gapW12,
        Expanded(child: searchPanel),
      ],
    );
  }
}

class PlaceSearchSection extends StatelessWidget {
  const PlaceSearchSection({
    super.key,
    required this.controller,
    required this.suggestions,
    required this.stateText,
    required this.errorText,
    required this.onChanged,
    required this.onSuggestionSelected,
  });

  final TextEditingController controller;
  final List<PlaceAutocompleteSuggestion> suggestions;
  final String? stateText;
  final String? errorText;
  final ValueChanged<String> onChanged;
  final ValueChanged<PlaceAutocompleteSuggestion> onSuggestionSelected;

  @override
  Widget build(BuildContext context) {
    final isPending = stateText != null;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CatchFieldLanes.single(
          child: CatchField.input(
            copy: catchFieldCopy(context.l10n),
            title:
                context.l10n.eventsLocationPickerScreenTitleSearchForAMeeting,
            contract:
                CatchContractConstraints.placesAutocompleteCallablePayloadInput,
            labelMode: CatchFieldLabelTextMode.hidden,
            controller: controller,
            onChanged: onChanged,
            textInputAction: TextInputAction.search,
            textCapitalization: TextCapitalization.words,
            placeholder: context
                .l10n
                .eventsLocationPickerScreenPlaceholderSearchForAMeeting,
            errorText: errorText,
            size: CatchFieldSize.floating,
            leading: Icon(CatchIcons.searchRounded, size: CatchIcon.md),
            suffixText: stateText,
            trailing: isPending
                ? const Center(
                    child: SizedBox.square(
                      dimension: CatchIcon.md,
                      child: CircularProgressIndicator(
                        strokeWidth: CatchStroke.focusRing,
                      ),
                    ),
                  )
                : null,
            showClearButton: !isPending,
          ),
        ),
        if (suggestions.isNotEmpty) ...[
          gapH8,
          CatchSurface(
            padding: EdgeInsets.zero,
            emphasis: CatchSurfaceEmphasis.floating,
            borderRole: CatchBorderRole.separator,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 260),
              child: ListView.separated(
                shrinkWrap: true,
                padding: EdgeInsets.zero,
                itemCount: suggestions.length,
                separatorBuilder: (_, _) =>
                    const CatchDivider.fieldRow(indent: 0),
                itemBuilder: (context, index) {
                  final suggestion = suggestions[index];
                  return PlaceSuggestionRow(
                    suggestion: suggestion,
                    onTap: () => onSuggestionSelected(suggestion),
                  );
                },
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class PlaceSuggestionRow extends StatelessWidget {
  const PlaceSuggestionRow({
    super.key,
    required this.suggestion,
    required this.onTap,
  });

  final PlaceAutocompleteSuggestion suggestion;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final title = suggestion.mainText.isNotEmpty
        ? suggestion.mainText
        : suggestion.description;
    final subtitle = suggestion.secondaryText;

    return CatchSurface(
      tone: CatchSurfaceTone.transparent,
      radius: 0,
      onTap: onTap,
      padding: CatchInsets.listBody,
      child: Row(
        crossAxisAlignment: subtitle.isEmpty
            ? CrossAxisAlignment.center
            : CrossAxisAlignment.start,
        children: [
          Padding(
            padding: CatchInsets.inlineIconTopTight,
            child: Icon(
              CatchIcons.placeOutlined,
              color: t.ink2,
              size: CatchIcon.md,
            ),
          ),
          gapW12,
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchText(
                  title,
                  variant: CatchTextVariant.statusLabel,
                  color: CatchTokens.of(context).ink2,
                  maxLines: 1,
                ),
                if (subtitle.isNotEmpty) ...[
                  gapH4,
                  CatchText(
                    subtitle,
                    variant: CatchTextVariant.supporting,
                    color: t.ink2,
                    maxLines: 1,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class SelectedPointSection extends StatelessWidget {
  const SelectedPointSection({
    super.key,
    required this.hasSelection,
    required this.selectedLabel,
    required this.onConfirm,
  });

  final bool hasSelection;
  final String? selectedLabel;
  final VoidCallback? onConfirm;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final title = hasSelection
        ? selectedLabel ??
              context.l10n.eventsLocationPickerScreenTitlePinnedLocation
        : context.l10n.eventsLocationPickerScreenTitleNoLocationSelected;
    final subtitle = hasSelection
        ? selectedLabel == null
              ? context.l10n.eventsLocationPickerScreenSubtitleConfirmThisMapPin
              : context
                    .l10n
                    .eventsLocationPickerScreenSubtitleConfirmThisPlaceOr
        : context.l10n.eventsLocationPickerScreenSubtitleSearchForAPlace;

    return CatchSurface(
      padding: CatchInsets.content,
      emphasis: CatchSurfaceEmphasis.floating,
      borderRole: CatchBorderRole.separator,
      radius: CatchRadius.md,
      backgroundColor: t.surface.withValues(
        alpha: CatchOpacity.locationPickerPanelFill,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                hasSelection
                    ? CatchIcons.checkCircleOutlineRounded
                    : CatchIcons.touchAppRounded,
                size: CatchIcon.control,
                color: hasSelection ? t.success : t.ink2,
              ),
              gapW12,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: CatchTextStyles.labelL(context, color: t.ink),
                    ),
                    gapH4,
                    CatchText(
                      subtitle,
                      variant: CatchTextVariant.supporting,
                      color: t.ink2,
                    ),
                  ],
                ),
              ),
            ],
          ),
          gapH12,
          CatchButton(
            label: context.l10n.eventsLocationPickerScreenLabelConfirmLocation,
            onPressed: onConfirm,
            fullWidth: true,
            size: CatchButtonSize.lg,
          ),
        ],
      ),
    );
  }
}
