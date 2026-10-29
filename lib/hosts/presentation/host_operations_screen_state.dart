import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/foundation.dart';

enum HostClubTab { edit, insights, preview }

enum HostClubInsightsRangePreset { thirtyDays, ninetyDays, twelveMonths }

@immutable
class HostClubsScreenState {
  const HostClubsScreenState._({
    required this.clubs,
    required this.currentUid,
    required this.selectedClubIndex,
    required this.selectedTab,
  });

  factory HostClubsScreenState.resolve({
    required List<Club> clubs,
    required String currentUid,
    int selectedClubIndex = 0,
    String? selectedClubId,
    HostClubTab selectedTab = HostClubTab.edit,
  }) {
    return HostClubsScreenState._(
      clubs: List<Club>.unmodifiable(clubs),
      currentUid: currentUid,
      selectedClubIndex: _resolveSelectedClubIndex(
        clubs: clubs,
        selectedClubIndex: selectedClubIndex,
        selectedClubId: selectedClubId,
      ),
      selectedTab: selectedTab,
    );
  }

  final List<Club> clubs;
  final String currentUid;
  final int selectedClubIndex;
  final HostClubTab selectedTab;

  bool get hasClubs => clubs.isNotEmpty;
  bool get showClubPicker => clubs.length > 1;
  Club? get selectedClub => hasClubs ? clubs[selectedClubIndex] : null;
  String title(AppLocalizations l10n) =>
      selectedClub?.name ?? l10n.hostsHostOperationsScreenStateTitleClubs;
  bool get selectedClubIsOwner => selectedClub?.isOwnedBy(currentUid) ?? false;

  HostClubsScreenState selectClubIndex(int index) {
    return HostClubsScreenState.resolve(
      clubs: clubs,
      currentUid: currentUid,
      selectedClubIndex: index,
      selectedTab: selectedTab,
    );
  }

  HostClubsScreenState selectTab(HostClubTab tab) {
    return HostClubsScreenState.resolve(
      clubs: clubs,
      currentUid: currentUid,
      selectedClubIndex: selectedClubIndex,
      selectedTab: tab,
    );
  }

  static int _resolveSelectedClubIndex({
    required List<Club> clubs,
    required int selectedClubIndex,
    String? selectedClubId,
  }) {
    if (clubs.isEmpty) return 0;
    final selectedId = selectedClubId;
    if (selectedId != null) {
      final index = clubs.indexWhere((club) => club.id == selectedId);
      if (index != -1) return index;
    }
    if (selectedClubIndex < 0) return 0;
    if (selectedClubIndex >= clubs.length) return clubs.length - 1;
    return selectedClubIndex;
  }
}

@immutable
class HostClubInsightsQueryState {
  const HostClubInsightsQueryState({
    required this.clubId,
    required this.rangePreset,
  });

  final String clubId;
  final HostClubInsightsRangePreset rangePreset;
}

@immutable
class HostClubInsightsState {
  const HostClubInsightsState._({
    required this.clubId,
    required this.rangePreset,
  });

  factory HostClubInsightsState.initial({required String clubId}) =>
      HostClubInsightsState._(
        clubId: clubId,
        rangePreset: HostClubInsightsRangePreset.thirtyDays,
      );

  final String clubId;
  final HostClubInsightsRangePreset rangePreset;

  HostClubInsightsQueryState get query =>
      HostClubInsightsQueryState(clubId: clubId, rangePreset: rangePreset);

  HostClubInsightsState selectClub(String clubId) {
    if (clubId == this.clubId) return this;
    return _copyWith(clubId: clubId);
  }

  HostClubInsightsState selectRange(HostClubInsightsRangePreset rangePreset) {
    return _copyWith(rangePreset: rangePreset);
  }

  HostClubInsightsState _copyWith({
    String? clubId,
    HostClubInsightsRangePreset? rangePreset,
  }) {
    return HostClubInsightsState._(
      clubId: clubId ?? this.clubId,
      rangePreset: rangePreset ?? this.rangePreset,
    );
  }
}
