import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class ExploreMapLauncherState {
  const ExploreMapLauncherState({
    required this.isVisible,
    required this.actionLabel,
    required this.semanticLabel,
    this.countLabel,
  });

  factory ExploreMapLauncherState.from({
    required int? mappableEventCount,
    required AppLocalizations l10n,
  }) {
    final hasCount = mappableEventCount != null && mappableEventCount > 0;
    final actionLabel = l10n.exploreExploreScreenStateLabelMap;
    return ExploreMapLauncherState(
      isVisible: hasCount,
      actionLabel: actionLabel,
      countLabel: hasCount ? '$mappableEventCount' : null,
      semanticLabel: hasCount
          ? l10n.exploreExploreScreenStateSemanticsMapEventCount(
              mappableEventCount: mappableEventCount,
            )
          : actionLabel,
    );
  }

  final bool isVisible;
  final String actionLabel;
  final String? countLabel;
  final String semanticLabel;
}

class ExploreCityButtonState {
  const ExploreCityButtonState({
    required this.tooltipLabel,
    required this.semanticLabel,
    required this.scopeLabel,
    required this.icon,
  });

  factory ExploreCityButtonState.from({
    required CityData city,
    required bool focused,
    required AppLocalizations l10n,
  }) {
    final chooseLabel = l10n
        .exploreExploreScreenStateVisiblecopyChooseCityLabel(label: city.label);
    return ExploreCityButtonState(
      tooltipLabel: chooseLabel,
      semanticLabel: chooseLabel,
      scopeLabel: l10n
          .exploreExploreScreenStateVisiblecopyExploreLabel(label: city.label)
          .toUpperCase(),
      icon: focused ? CatchIcons.location : CatchIcons.location,
    );
  }

  final String tooltipLabel;
  final String semanticLabel;
  final String scopeLabel;
  final IconData icon;
}

class ExploreCityPickerState {
  const ExploreCityPickerState._({
    required this.selectedCity,
    required this.cities,
    required this.enabled,
  });

  factory ExploreCityPickerState.from({
    required CityData selectedCity,
    required Iterable<CityData> cities,
    required bool cityListLoading,
    required Object? cityListError,
  }) {
    final cityOptions = List<CityData>.unmodifiable(cities);
    return ExploreCityPickerState._(
      selectedCity: selectedCity,
      cities: cityOptions,
      enabled:
          !cityListLoading && cityListError == null && cityOptions.isNotEmpty,
    );
  }

  factory ExploreCityPickerState.disabled({required CityData selectedCity}) {
    return ExploreCityPickerState._(
      selectedCity: selectedCity,
      cities: const [],
      enabled: false,
    );
  }

  final CityData selectedCity;
  final List<CityData> cities;
  final bool enabled;
}

class ExploreChromeState {
  const ExploreChromeState({
    required this.title,
    required this.searchValue,
    required this.searchPlaceholder,
    required this.searchTooltip,
    required this.searchSemanticLabel,
    required this.showSearchAction,
    required this.showCoverStory,
    required this.searchExpanded,
    required this.searchAutofocus,
  });

  factory ExploreChromeState.browse({
    required String query,
    required bool showSearchAction,
    required AppLocalizations l10n,
  }) {
    return ExploreChromeState._(
      query: query,
      showSearchAction: showSearchAction,
      showCoverStory: false,
      searchExpanded: false,
      searchAutofocus: false,
      l10n: l10n,
    );
  }

  factory ExploreChromeState.discovery({
    required String query,
    required bool searchRequested,
    required bool hasFeaturedItem,
    required AppLocalizations l10n,
  }) {
    final searchActive = query.trim().isNotEmpty;
    final showCoverStory = hasFeaturedItem && !searchRequested && !searchActive;
    return ExploreChromeState._(
      query: query,
      showSearchAction: true,
      showCoverStory: showCoverStory,
      searchExpanded: searchRequested || searchActive,
      searchAutofocus: searchRequested,
      l10n: l10n,
    );
  }

  ExploreChromeState._({
    required String query,
    required this.showSearchAction,
    required this.showCoverStory,
    required this.searchExpanded,
    required this.searchAutofocus,
    required AppLocalizations l10n,
  }) : title = l10n.exploreExploreScreenStateVisiblecopyExplore,
       searchValue = query,
       searchPlaceholder =
           l10n.exploreExploreScreenStateVisiblecopySearchEventsOrOrganizers,
       searchTooltip =
           l10n.exploreExploreScreenStateVisiblecopySearchEventsOrOrganizers,
       searchSemanticLabel =
           l10n.exploreExploreScreenStateVisiblecopySearchEventsOrOrganizers;

  final String title;
  final String searchValue;
  final String searchPlaceholder;
  final String searchTooltip;
  final String searchSemanticLabel;
  final bool showSearchAction;
  final bool showCoverStory;
  final bool searchExpanded;
  final bool searchAutofocus;
}
