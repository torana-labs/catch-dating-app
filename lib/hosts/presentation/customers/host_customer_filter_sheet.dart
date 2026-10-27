part of 'host_customers_screen.dart';

class HostCustomerFilterSheet extends StatefulWidget {
  const HostCustomerFilterSheet({
    super.key,
    this.selectedFilter = HostCustomerFilter.all,
    this.selectedManualTag,
    this.selectedFilters = const {},
    this.selectedManualTags = const [],
    required this.manualTagVocabulary,
    this.selectedCount,
    required this.smsReadiness,
    this.onChanged,
  });
  final HostCustomerFilter selectedFilter;
  final HostCustomerManualTag? selectedManualTag;
  final Set<HostCustomerFilter> selectedFilters;
  final List<HostCustomerManualTag> selectedManualTags;
  final List<HostCustomerManualTag> manualTagVocabulary;
  final HostCustomerSegmentCount? selectedCount;
  final HostCrmChannelReadiness? smsReadiness;
  final ValueChanged<HostCustomerFilterSelection>? onChanged;

  @override
  State<HostCustomerFilterSheet> createState() =>
      _HostCustomerFilterSheetState();
}

class _HostCustomerFilterSheetState extends State<HostCustomerFilterSheet> {
  late Set<HostCustomerFilter> _filters = {
    ...widget.selectedFilters,
    if (widget.selectedFilter != HostCustomerFilter.all) widget.selectedFilter,
  };
  late Set<HostCustomerManualTag> _tags = {
    ...widget.selectedManualTags,
    ?widget.selectedManualTag,
  };
  HostCustomerFilterSelection get _selection =>
      HostCustomerFilterSelection.multiple(
        filters: Set.unmodifiable(_filters),
        manualTags: List.unmodifiable(_tags),
      );

  @override
  Widget build(BuildContext context) {
    final groups = hostCustomerFilterGroupsForSmsReadiness(widget.smsReadiness);
    // Keep an existing saved condition visible even if channel readiness changes.
    if (_filters.contains(HostCustomerFilter.smsReachable) &&
        !groups[HostCustomerFilterGroup.reachable]!.contains(
          HostCustomerFilter.smsReachable,
        )) {
      groups[HostCustomerFilterGroup.reachable] = [
        ...groups[HostCustomerFilterGroup.reachable]!,
        HostCustomerFilter.smsReachable,
      ];
    }
    return CatchSheet.filter(
      title: context.l10n.hostCustomersFilterSheetTitle,
      trailing: CatchButton(
        label: context.l10n.hostFiltersResetAll,
        variant: CatchButtonVariant.quiet,
        size: CatchButtonSize.md,
        onPressed: _filters.isEmpty && _tags.isEmpty
            ? null
            : () {
                setState(() {
                  _filters = {};
                  _tags = {};
                });
                widget.onChanged?.call(_selection);
              },
      ),
      closeLabel: context.l10n.hostSheetClose,
      onClose: () => Navigator.of(context).pop(_selection),
      child: CatchSectionList(
        emptyStateOmitted: true,
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final entry in groups.entries)
            CatchSection.choiceGroup(
              first: true,
              title: _customerFilterGroupLabel(context, entry.key),
              child: CatchChoiceInput<HostCustomerFilter>(
                values: entry.value,
                itemLabelBuilder: (filter) =>
                    _customerFilterLabel(context, filter),
                itemKeyBuilder: (filter) =>
                    ValueKey('host-customer-filter-${filter.name}'),
                selected: _filters.intersection(entry.value.toSet()),
                mode: CatchChipMode.multiple,
                allowEmptySelection: true,
                onChanged: (values) {
                  setState(
                    () => _filters = _filters
                        .difference(entry.value.toSet())
                        .union(values),
                  );
                  widget.onChanged?.call(_selection);
                },
              ),
            ),
          if (widget.manualTagVocabulary.isNotEmpty)
            CatchSection.choiceGroup(
              first: true,
              title: context.l10n.hostCustomersFilterGroupYourTags,
              child: CatchChoiceInput<HostCustomerManualTag>(
                values: widget.manualTagVocabulary,
                itemLabelBuilder: (tag) => tag.label,
                itemKeyBuilder: (tag) =>
                    ValueKey('host-customer-manual-tag-${tag.tagId}'),
                selected: _tags,
                mode: CatchChipMode.multiple,
                allowEmptySelection: true,
                onChanged: (values) {
                  setState(() => _tags = Set.of(values));
                  widget.onChanged?.call(_selection);
                },
              ),
            ),
        ],
      ),
    );
  }
}

String _customerSelectionLabel(
  BuildContext context,
  Set<HostCustomerFilter> filters,
  List<HostCustomerManualTag> tags,
) {
  final groups = hostCustomerFilterGroupsForSmsReadiness(
    HostCrmChannelReadiness.currentEventOnly,
  );
  final labels = [
    for (final group in groups.values)
      if (group.any(filters.contains))
        group
            .where(filters.contains)
            .map((filter) => _customerFilterLabel(context, filter))
            .join(' / '),
    if (tags.isNotEmpty) tags.map((tag) => tag.label).join(' / '),
  ];
  return labels.isEmpty
      ? _customerFilterLabel(context, HostCustomerFilter.all)
      : labels.join(' · ');
}
