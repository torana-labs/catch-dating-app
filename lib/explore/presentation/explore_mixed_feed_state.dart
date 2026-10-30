import 'dart:math' as math;

import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/cross_paths/cross_paths.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tiles.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';

const int minimumExploreThisWeekRecommendationCount = 2;

class ExploreFeedSectionState {
  const ExploreFeedSectionState({
    required this.bodyViewModel,
    required this.totalCount,
    required this.resultCountLabel,
    required this.thisWeekItems,
    required this.cardGroups,
  });

  factory ExploreFeedSectionState.from({
    required ExploreFeedViewModel viewModel,
    required List<Organizer> candidateOrganizers,
    required Set<String> joinedOrganizerIds,
    required bool showThisWeekList,
    required AppLocalizations l10n,
    List<CrossPathsSuggestion> crossPathsSuggestions = const [],
    bool promoteFeaturedItem = true,
    DateTime? now,
  }) {
    final bodyItems = viewModel.items;
    final bodyViewModel = ExploreFeedViewModel(
      items: bodyItems,
      featuredEventId: viewModel.featuredEventId,
      externalItems: viewModel.externalItems,
      dateSupplyCounts: viewModel.dateSupplyCounts,
      isExhaustive: viewModel.isExhaustive,
      isLoadingMore: viewModel.isLoadingMore,
      windowRequest: viewModel.windowRequest,
    );
    final crossPathsEventIds = {
      for (final suggestion in crossPathsSuggestions) suggestion.event.eventId,
    };
    final candidateThisWeekItems = showThisWeekList
        ? topExploreThisWeekRecommendations(bodyItems, now: now)
              .where((item) => !crossPathsEventIds.contains(item.event.id))
              .toList(growable: false)
        : const <ExploreEventItem>[];
    final thisWeekItems =
        candidateThisWeekItems.length >=
            minimumExploreThisWeekRecommendationCount
        ? candidateThisWeekItems
        : const <ExploreEventItem>[];
    final thisWeekEventIds = {for (final item in thisWeekItems) item.event.id};
    final cards = buildExploreMixedFeedCards(
      viewModel: bodyViewModel,
      candidateOrganizers: candidateOrganizers,
      joinedOrganizerIds: joinedOrganizerIds,
      excludeEventIds: thisWeekEventIds,
      crossPathsSuggestions: crossPathsSuggestions,
    );

    return ExploreFeedSectionState(
      bodyViewModel: bodyViewModel,
      totalCount: viewModel.count,
      resultCountLabel: _exploreResultCountLine(viewModel, l10n),
      thisWeekItems: List.unmodifiable(thisWeekItems),
      cardGroups: groupExploreMixedFeedCards(cards, l10n: l10n, now: now),
    );
  }

  final ExploreFeedViewModel bodyViewModel;
  final int totalCount;
  final String resultCountLabel;
  final List<ExploreEventItem> thisWeekItems;
  final List<ExploreFeedCardGroup> cardGroups;

  List<ExploreMixedCard> get cards =>
      List.unmodifiable([for (final group in cardGroups) ...group.cards]);

  bool get isEmpty => totalCount == 0 && cards.isEmpty && thisWeekItems.isEmpty;
}

class ExploreFeedCardGroup {
  const ExploreFeedCardGroup({
    required this.day,
    required this.label,
    required this.cards,
  });

  final DateTime? day;
  final String? label;
  final List<ExploreMixedCard> cards;

  int get timedCardCount => cards
      .where(
        (card) =>
            card is ExploreMixedEventRowCard ||
            card is ExploreMixedExternalEventRowCard,
      )
      .length;
}

sealed class ExploreMixedCard {
  const ExploreMixedCard();

  DateTime? get startTime;
}

class ExploreMixedEventRowCard extends ExploreMixedCard {
  const ExploreMixedEventRowCard(this.item);

  final ExploreEventItem item;

  @override
  DateTime get startTime => item.event.startTime;
}

class ExploreMixedExternalEventRowCard extends ExploreMixedCard {
  const ExploreMixedExternalEventRowCard(this.item);

  final ExploreExternalEventItem item;

  @override
  DateTime get startTime => item.event.startTime;
}

class ExploreMixedOrganizerSpotlightCard extends ExploreMixedCard {
  const ExploreMixedOrganizerSpotlightCard(this.organizer);

  final Organizer organizer;

  @override
  DateTime? get startTime => null;
}

class ExploreMixedOrganizerRowCard extends ExploreMixedCard {
  const ExploreMixedOrganizerRowCard(this.organizer);

  final Organizer organizer;

  @override
  DateTime? get startTime => null;
}

class ExploreMixedPersonCard extends ExploreMixedCard {
  const ExploreMixedPersonCard({
    required this.suggestion,
    required this.eventItem,
  });

  final CrossPathsSuggestion suggestion;
  final ExploreEventItem eventItem;

  @override
  DateTime get startTime => eventItem.event.startTime;
}

List<ExploreMixedCard> buildExploreMixedFeedCards({
  required ExploreFeedViewModel viewModel,
  required List<Organizer> candidateOrganizers,
  required Set<String> joinedOrganizerIds,
  Set<String> excludeEventIds = const <String>{},
  List<CrossPathsSuggestion> crossPathsSuggestions = const [],
}) {
  final rankedOrganizers = rankExploreOrganizerIntermixCandidates(
    candidateOrganizers,
    joinedOrganizerIds: joinedOrganizerIds,
  );
  final firstOrganizer = rankedOrganizers.firstOrNull;
  final secondOrganizer = rankedOrganizers.skip(1).firstOrNull;
  final cards = <ExploreMixedCard>[
    for (final item in viewModel.items)
      if (!excludeEventIds.contains(item.event.id))
        ExploreMixedEventRowCard(item),
    for (final item in viewModel.externalItems)
      ExploreMixedExternalEventRowCard(item),
  ]..sort((a, b) => a.startTime!.compareTo(b.startTime!));
  final timedCardCount = cards.length;

  if (cards.isEmpty) {
    if (firstOrganizer != null) {
      cards.add(ExploreMixedOrganizerSpotlightCard(firstOrganizer));
    }
    if (secondOrganizer != null) {
      cards.add(ExploreMixedOrganizerRowCard(secondOrganizer));
    }
    return cards;
  }

  if (firstOrganizer != null) {
    cards.insert(
      math.min(2, cards.length),
      ExploreMixedOrganizerSpotlightCard(firstOrganizer),
    );
  }
  // The first eight cards may contain at most one organizer. A second
  // organizer therefore appears only after eight timed cards exist.
  if (secondOrganizer != null && timedCardCount >= 8) {
    cards.insert(
      math.min(9, cards.length),
      ExploreMixedOrganizerRowCard(secondOrganizer),
    );
  }

  _insertCrossPathsPeople(
    cards,
    suggestions: crossPathsSuggestions,
    eventItems: viewModel.items,
    excludedEventIds: excludeEventIds,
  );
  return cards;
}

void _insertCrossPathsPeople(
  List<ExploreMixedCard> cards, {
  required List<CrossPathsSuggestion> suggestions,
  required List<ExploreEventItem> eventItems,
  required Set<String> excludedEventIds,
}) {
  if (cards.isEmpty || suggestions.isEmpty) return;
  final itemByEventId = <String, ExploreEventItem>{
    for (final item in eventItems)
      if (!excludedEventIds.contains(item.event.id)) item.event.id: item,
  };
  final seenPeople = <String>{};
  var minimumCardIndex = 0;
  var inserted = 0;

  for (final suggestion in suggestions) {
    if (inserted >= 2) break;
    if (!seenPeople.add(suggestion.profile.uid)) continue;
    final eventItem = itemByEventId[suggestion.event.eventId];
    if (eventItem == null) continue;
    final eventDay = DateUtils.dateOnly(eventItem.event.startTime);

    final associatedIndex = cards.indexWhere(
      (card) =>
          card is ExploreMixedEventRowCard &&
          card.item.event.id == eventItem.event.id,
    );
    if (associatedIndex < 0) continue;

    var placementIndex = associatedIndex;
    while (placementIndex < cards.length) {
      final card = cards[placementIndex];
      final isTimed = _isExploreTimedCard(card);
      final sameDay =
          card.startTime != null &&
          DateUtils.dateOnly(card.startTime!) == eventDay;
      final timedSeen = cards
          .take(placementIndex + 1)
          .where(_isExploreTimedCard)
          .length;
      final hasMinimumTickets = inserted > 0 || timedSeen >= 2;
      final insertAt = placementIndex + 1;
      final nextIsNonEvent =
          insertAt < cards.length && !_isExploreTimedCard(cards[insertAt]);
      if (isTimed &&
          sameDay &&
          hasMinimumTickets &&
          insertAt >= minimumCardIndex &&
          !nextIsNonEvent) {
        cards.insert(
          insertAt,
          ExploreMixedPersonCard(suggestion: suggestion, eventItem: eventItem),
        );
        inserted += 1;
        // Require at least one subsequent event before another person card.
        minimumCardIndex = insertAt + 2;
        break;
      }
      placementIndex += 1;
      if (placementIndex >= cards.length ||
          (cards[placementIndex].startTime != null &&
              DateUtils.dateOnly(cards[placementIndex].startTime!) !=
                  eventDay)) {
        break;
      }
    }
  }
}

bool _isExploreTimedCard(ExploreMixedCard card) =>
    card is ExploreMixedEventRowCard ||
    card is ExploreMixedExternalEventRowCard;

List<ExploreFeedCardGroup> groupExploreMixedFeedCards(
  List<ExploreMixedCard> cards, {
  required AppLocalizations l10n,
  DateTime? now,
}) {
  if (cards.isEmpty) return const <ExploreFeedCardGroup>[];

  final reference = now ?? DateTime.now();
  final today = DateUtils.dateOnly(reference);
  final tomorrow = today.add(const Duration(days: 1));
  final builders = <_ExploreFeedCardGroupBuilder>[];
  _ExploreFeedCardGroupBuilder? current;

  for (final card in cards) {
    final startTime = card.startTime;
    final day = startTime == null
        ? current?.day
        : DateUtils.dateOnly(startTime);
    if (current == null || current.day != day) {
      current = _ExploreFeedCardGroupBuilder(
        day: day,
        label: day == null
            ? null
            : exploreFeedDayLabel(day, today: today, tomorrow: tomorrow),
      );
      builders.add(current);
    }
    current.cards.add(card);
  }

  return List.unmodifiable([
    for (final builder in builders)
      ExploreFeedCardGroup(
        day: builder.day,
        label: builder.label,
        cards: List.unmodifiable(builder.cards),
      ),
  ]);
}

EventDateRailCardStripPosition exploreMixedEventStripPosition(
  List<ExploreMixedCard> cards,
  int index,
) {
  if (cards[index] is! ExploreMixedEventRowCard) {
    return EventDateRailCardStripPosition.single;
  }
  final joinsPrevious =
      index > 0 && cards[index - 1] is ExploreMixedEventRowCard;
  final joinsNext =
      index < cards.length - 1 && cards[index + 1] is ExploreMixedEventRowCard;
  if (joinsPrevious && joinsNext) {
    return EventDateRailCardStripPosition.middle;
  }
  if (joinsPrevious) return EventDateRailCardStripPosition.last;
  if (joinsNext) return EventDateRailCardStripPosition.first;
  return EventDateRailCardStripPosition.single;
}

class _ExploreFeedCardGroupBuilder {
  _ExploreFeedCardGroupBuilder({required this.day, required this.label});

  final DateTime? day;
  final String? label;
  final List<ExploreMixedCard> cards = <ExploreMixedCard>[];
}

List<Organizer> rankExploreOrganizerIntermixCandidates(
  List<Organizer> organizers, {
  required Set<String> joinedOrganizerIds,
}) {
  final ranked = organizers
      .where((organizer) => organizer.status == OrganizerLifecycleStatus.active)
      .where((organizer) => !organizer.archived)
      .where((organizer) => !joinedOrganizerIds.contains(organizer.id))
      .toList();
  ranked.sort((a, b) {
    final aHasNextEvent = a.nextEventAt != null || a.nextEventLabel != null;
    final bHasNextEvent = b.nextEventAt != null || b.nextEventLabel != null;
    if (aHasNextEvent != bHasNextEvent) return aHasNextEvent ? -1 : 1;

    final aHasImage = (a.imageUrl ?? '').isNotEmpty;
    final bHasImage = (b.imageUrl ?? '').isNotEmpty;
    if (aHasImage != bHasImage) return aHasImage ? -1 : 1;

    final ratingOrder = b.rating.compareTo(a.rating);
    if (ratingOrder != 0) return ratingOrder;

    final memberOrder = b.memberCount.compareTo(a.memberCount);
    if (memberOrder != 0) return memberOrder;

    return a.name.compareTo(b.name);
  });
  return ranked;
}

List<ExploreEventItem> topExploreThisWeekRecommendations(
  List<ExploreEventItem> items, {
  DateTime? now,
}) {
  final reference = now ?? DateTime.now();
  final startOfToday = DateUtils.dateOnly(reference);
  final endOfWindow = startOfToday.add(const Duration(days: 7));
  final topByDay = <DateTime, ExploreEventItem>{};

  for (final item in items) {
    final eventStart = item.event.startTime;
    if (eventStart.isBefore(startOfToday) ||
        !eventStart.isBefore(endOfWindow)) {
      continue;
    }

    final eventDay = DateUtils.dateOnly(eventStart);
    topByDay.putIfAbsent(eventDay, () => item);
    if (topByDay.length == DateTime.daysPerWeek) break;
  }

  return topByDay.values.toList(growable: false)
    ..sort((a, b) => a.event.startTime.compareTo(b.event.startTime));
}

String _exploreResultCountLine(
  ExploreFeedViewModel viewModel,
  AppLocalizations l10n,
) {
  final count = viewModel.count;
  final noun = count == 1
      ? l10n.exploreExploreScreenStateVisiblecopyPlan
      : l10n.exploreExploreScreenStateVisiblecopyPlans;
  final dateSpan = _exploreDateSpanLabel(viewModel);
  if (dateSpan == null) {
    if (!viewModel.isExhaustive) {
      return l10n.exploreExploreScreenStateVisiblecopyCountPlusNoun(
        count: count,
        noun: noun,
      );
    }
    return l10n.exploreExploreScreenStateVisiblecopyCountNoun(
      count: count,
      noun: noun,
    );
  }
  if (!viewModel.isExhaustive) {
    return l10n.exploreExploreScreenStateVisiblecopyCountPlusNounDatespan(
      count: count,
      noun: noun,
      dateSpan: dateSpan,
    );
  }
  return l10n.exploreExploreScreenStateVisiblecopyCountNounDatespan(
    count: count,
    noun: noun,
    dateSpan: dateSpan,
  );
}

String? _exploreDateSpanLabel(ExploreFeedViewModel viewModel) {
  if (viewModel.isEmpty) return null;
  final starts = [
    for (final item in viewModel.items) item.event.startTime,
    for (final item in viewModel.externalItems) item.event.startTime,
  ]..sort();
  final first = starts.first;
  final last = starts.last;
  final sameDay =
      first.year == last.year &&
      first.month == last.month &&
      first.day == last.day;
  if (sameDay) return _monthDayLabel(first);
  if (first.year == last.year && first.month == last.month) {
    return '${EventFormatters.shortMonth(first).toUpperCase()} '
        '${first.day}-${last.day}';
  }
  return '${_monthDayLabel(first)}-${_monthDayLabel(last)}';
}

String _monthDayLabel(DateTime value) {
  return '${EventFormatters.shortMonth(value).toUpperCase()} ${value.day}';
}
