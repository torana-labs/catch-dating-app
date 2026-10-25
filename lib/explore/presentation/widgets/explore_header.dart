import 'package:catch_dating_app/core/domain/city_data.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/explore/presentation/explore_chrome_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_event_display_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_city_picker.dart';
import 'package:catch_dating_app/explore/presentation/widgets/featured_event_poster.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class ExploreDiscoveryCoverHeader extends StatefulWidget {
  const ExploreDiscoveryCoverHeader({
    super.key,
    this.query = '',
    this.featuredItem,
    required this.cityPickerState,
    required this.onCitySelected,
    this.actions = const <Widget>[],
    this.heroActions,
    this.searchRequested,
    this.onSearchRequestedChanged,
    this.onQueryChanged,
    this.onFeaturedEventSelected,
  });

  final String query;
  final ExploreEventItem? featuredItem;
  final ExploreCityPickerState cityPickerState;
  final ValueChanged<CityData>? onCitySelected;
  final List<Widget> actions;
  final List<Widget>? heroActions;
  final bool? searchRequested;
  final ValueChanged<bool>? onSearchRequestedChanged;
  final ValueChanged<String>? onQueryChanged;
  final ValueChanged<ExploreEventItem>? onFeaturedEventSelected;

  @override
  State<ExploreDiscoveryCoverHeader> createState() =>
      _ExploreDiscoveryCoverHeaderState();
}

class _ExploreDiscoveryCoverHeaderState
    extends State<ExploreDiscoveryCoverHeader> {
  bool _searchRequested = false;

  @override
  Widget build(BuildContext context) {
    final featuredItem = widget.featuredItem;
    final searchRequested = widget.searchRequested ?? _searchRequested;
    final chrome = ExploreChromeState.discovery(
      query: widget.query,
      searchRequested: searchRequested,
      hasFeaturedItem: featuredItem != null,
      l10n: context.l10n,
    );
    final coverItem = featuredItem;

    if (!chrome.showCoverStory || coverItem == null) {
      return CatchSurface(
        duration: Duration.zero,
        radius: CatchRadius.none,
        backgroundColor: CatchTokens.of(context).bg,
        child: _ExploreDiscoveryTopBar(
          chrome: chrome,
          cityPickerState: widget.cityPickerState,
          onCitySelected: widget.onCitySelected,
          onQueryChanged: widget.onQueryChanged,
          onSearchExpandedChanged: _setSearchRequested,
          actions: widget.actions,
        ),
      );
    }

    final coverState = ExploreCoverStoryState.from(
      coverItem,
      l10n: context.l10n,
    );
    return FeaturedEventPoster(
      activityKind: coverItem.event.activityKind,
      kicker: coverState.kicker,
      title: coverState.title,
      cta: coverState.ctaLabel,
      onCta: () => widget.onFeaturedEventSelected?.call(coverItem),
      data: coverState.timePriceLabel,
      data2: coverState.attendanceLabel,
      chrome: _ExploreDiscoveryTopBar(
        chrome: chrome,
        cityPickerState: widget.cityPickerState,
        onCitySelected: widget.onCitySelected,
        onQueryChanged: widget.onQueryChanged,
        onSearchExpandedChanged: _setSearchRequested,
        actions: widget.heroActions ?? widget.actions,
        onDarkBackdrop: true,
      ),
    );
  }

  void _setSearchRequested(bool expanded) {
    widget.onSearchRequestedChanged?.call(expanded);
    if (widget.searchRequested != null) return;
    if (_searchRequested == expanded) return;
    setState(() => _searchRequested = expanded);
  }
}

class _ExploreDiscoveryTopBar extends StatelessWidget {
  const _ExploreDiscoveryTopBar({
    required this.chrome,
    required this.cityPickerState,
    required this.onCitySelected,
    required this.onQueryChanged,
    required this.onSearchExpandedChanged,
    required this.actions,
    this.onDarkBackdrop = false,
  });

  final ExploreChromeState chrome;
  final ExploreCityPickerState cityPickerState;
  final ValueChanged<CityData>? onCitySelected;
  final ValueChanged<String>? onQueryChanged;
  final ValueChanged<bool> onSearchExpandedChanged;
  final List<Widget> actions;
  final bool onDarkBackdrop;

  @override
  Widget build(BuildContext context) {
    final topBar = CatchTopBar.screen(
      leading: ExploreCityPicker(
        state: cityPickerState,
        onSelected: onCitySelected,
      ),
      title: chrome.title,
      tone: onDarkBackdrop ? CatchTopBarTone.overlay : CatchTopBarTone.page,
      search: CatchTopBarSearch(
        copy: catchSearchFieldCopy(context.l10n),
        contract: CatchContractConstraints.exploreSearchCallablePayloadQuery,
        expanded: chrome.searchExpanded,
        value: chrome.searchValue,
        autofocus: chrome.searchAutofocus,
        onExpandedChanged: onSearchExpandedChanged,
        onChanged: onQueryChanged,
        placeholder: chrome.searchPlaceholder,
        tooltip: chrome.searchTooltip,
        semanticLabel: chrome.searchSemanticLabel,
      ),
      actions: actions,
    );
    return topBar;
  }
}
