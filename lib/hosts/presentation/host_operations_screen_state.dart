import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/foundation.dart';

enum HostOrganizerTab { edit, insights, preview }

enum HostOrganizerInsightsRangePreset { thirtyDays, ninetyDays, twelveMonths }

@immutable
class HostOrganizersScreenState {
  const HostOrganizersScreenState._({
    required this.organizers,
    required this.currentUid,
    required this.selectedOrganizerIndex,
    required this.selectedTab,
  });

  factory HostOrganizersScreenState.resolve({
    required List<Organizer> organizers,
    required String currentUid,
    int selectedOrganizerIndex = 0,
    String? selectedOrganizerId,
    HostOrganizerTab selectedTab = HostOrganizerTab.edit,
  }) {
    return HostOrganizersScreenState._(
      organizers: List<Organizer>.unmodifiable(organizers),
      currentUid: currentUid,
      selectedOrganizerIndex: _resolveSelectedOrganizerIndex(
        organizers: organizers,
        selectedOrganizerIndex: selectedOrganizerIndex,
        selectedOrganizerId: selectedOrganizerId,
      ),
      selectedTab: selectedTab,
    );
  }

  final List<Organizer> organizers;
  final String currentUid;
  final int selectedOrganizerIndex;
  final HostOrganizerTab selectedTab;

  bool get hasOrganizers => organizers.isNotEmpty;
  bool get showOrganizerPicker => organizers.length > 1;
  Organizer? get selectedOrganizer =>
      hasOrganizers ? organizers[selectedOrganizerIndex] : null;
  String title(AppLocalizations l10n) =>
      selectedOrganizer?.name ??
      l10n.hostsHostOperationsScreenStateTitleOrganizers;
  bool get selectedOrganizerIsOwner =>
      selectedOrganizer?.isOwnedBy(currentUid) ?? false;

  HostOrganizersScreenState selectOrganizerIndex(int index) {
    return HostOrganizersScreenState.resolve(
      organizers: organizers,
      currentUid: currentUid,
      selectedOrganizerIndex: index,
      selectedTab: selectedTab,
    );
  }

  HostOrganizersScreenState selectTab(HostOrganizerTab tab) {
    return HostOrganizersScreenState.resolve(
      organizers: organizers,
      currentUid: currentUid,
      selectedOrganizerIndex: selectedOrganizerIndex,
      selectedTab: tab,
    );
  }

  static int _resolveSelectedOrganizerIndex({
    required List<Organizer> organizers,
    required int selectedOrganizerIndex,
    String? selectedOrganizerId,
  }) {
    if (organizers.isEmpty) return 0;
    final selectedId = selectedOrganizerId;
    if (selectedId != null) {
      final index = organizers.indexWhere(
        (organizer) => organizer.id == selectedId,
      );
      if (index != -1) return index;
    }
    if (selectedOrganizerIndex < 0) return 0;
    if (selectedOrganizerIndex >= organizers.length) {
      return organizers.length - 1;
    }
    return selectedOrganizerIndex;
  }
}

@immutable
class HostOrganizerInsightsQueryState {
  const HostOrganizerInsightsQueryState({
    required this.organizerId,
    required this.rangePreset,
  });

  final String organizerId;
  final HostOrganizerInsightsRangePreset rangePreset;
}

@immutable
class HostOrganizerInsightsState {
  const HostOrganizerInsightsState._({
    required this.organizerId,
    required this.rangePreset,
  });

  factory HostOrganizerInsightsState.initial({required String organizerId}) =>
      HostOrganizerInsightsState._(
        organizerId: organizerId,
        rangePreset: HostOrganizerInsightsRangePreset.thirtyDays,
      );

  final String organizerId;
  final HostOrganizerInsightsRangePreset rangePreset;

  HostOrganizerInsightsQueryState get query => HostOrganizerInsightsQueryState(
    organizerId: organizerId,
    rangePreset: rangePreset,
  );

  HostOrganizerInsightsState selectOrganizer(String organizerId) {
    if (organizerId == this.organizerId) return this;
    return _copyWith(organizerId: organizerId);
  }

  HostOrganizerInsightsState selectRange(
    HostOrganizerInsightsRangePreset rangePreset,
  ) {
    return _copyWith(rangePreset: rangePreset);
  }

  HostOrganizerInsightsState _copyWith({
    String? organizerId,
    HostOrganizerInsightsRangePreset? rangePreset,
  }) {
    return HostOrganizerInsightsState._(
      organizerId: organizerId ?? this.organizerId,
      rangePreset: rangePreset ?? this.rangePreset,
    );
  }
}
