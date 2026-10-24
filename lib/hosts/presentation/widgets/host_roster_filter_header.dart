part of 'host_event_participants_section.dart';

class HostRosterSearchField extends StatelessWidget {
  const HostRosterSearchField({
    super.key,
    required this.value,
    required this.label,
    required this.onChanged,
  });

  final String value;
  final String label;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return CatchSearchField(
      copy: catchSearchFieldCopy(context.l10n),
      key: ValueKey('hostRosterSearch-$label'),
      contract: CatchContractConstraints.mobileFormStateHostRosterSearchQuery,
      value: value,
      placeholder: label,
      semanticLabel: label,
      textInputAction: TextInputAction.search,
      onChanged: onChanged,
    );
  }
}

class HostRosterFilterHeader extends StatelessWidget {
  const HostRosterFilterHeader({
    super.key,
    required this.title,
    required this.subtitle,
    required this.filters,
    required this.selectedFilter,
    required this.onFilterChanged,
    this.trailing,
  });

  final String? title;
  final String? subtitle;
  final List<HostRosterFilterSpec> filters;
  final HostRosterFilter selectedFilter;
  final ValueChanged<HostRosterFilter> onFilterChanged;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final canFilter = filters.any((spec) => spec.value > 0);
    return CatchSection.plain(
      title: title,
      subtitle: subtitle,
      trailing: trailing,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchMetricSection(
            items: [
              for (final spec in filters)
                CatchMetricValue(
                  value: context.l10n
                      .hostsHostEventAttendancePanelVisiblecopyValue(
                        value: spec.value,
                      ),
                  label: spec.label,
                ),
            ],
          ),
          if (canFilter) ...[
            gapH12,
            CatchChoiceInput<HostRosterFilter>.segmented(
              contract:
                  CatchContractConstraints.mobileFormStateHostRosterFilter,
              contractValueBuilder: (filter) => filter.name,
              options: [
                for (final spec in filters)
                  CatchOption(value: spec.filter, label: spec.label),
              ],
              selected: selectedFilter,
              onChanged: onFilterChanged,
              variant: CatchChoiceInputVariant.mono,
              scrollable: true,
            ),
          ],
        ],
      ),
    );
  }
}

class HostWaitlistBulkOfferNotice extends StatelessWidget {
  const HostWaitlistBulkOfferNotice({
    super.key,
    required this.count,
    required this.candidateCount,
    required this.isPending,
    required this.onOffer,
  });

  final int count;
  final int candidateCount;
  final bool isPending;
  final VoidCallback onOffer;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final remainingAfterSend = candidateCount - count;
    final detail = remainingAfterSend > 0
        ? context.l10n
              .hostsHostEventAttendancePanelVisiblecopyRemainingaftersendStillWaitingAfter(
                remainingAfterSend: remainingAfterSend,
              )
        : context.l10n
              .hostsHostEventAttendancePanelVisiblecopyNextCountPersonnounOn(
                count: count,
                personNoun: _personNoun(count),
              );
    final summary = Row(
      children: [
        Icon(CatchIcons.groupAddOutlined, color: t.warning, size: CatchIcon.md),
        gapW10,
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                context.l10n.hostsHostEventAttendancePanelTextWaitlistMovement,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: CatchTextStyles.labelL(context, color: t.ink),
              ),
              CatchText(
                detail,
                maxLines: 1,

                variant: CatchTextVariant.supporting,
                color: t.ink2,
              ),
            ],
          ),
        ),
      ],
    );
    final button = CatchButton(
      label: context.l10n.hostsHostEventAttendancePanelLabelOfferNextCount(
        count: count,
      ),
      size: CatchButtonSize.sm,
      variant: CatchButtonVariant.secondary,
      leading: Icon(CatchIcons.sendRounded),
      status: (isPending) ? CatchButtonStatus.loading : CatchButtonStatus.idle,
      onPressed: isPending ? null : onOffer,
    );
    return CatchSurface(
      padding: CatchInsets.compactControlContent,
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.boundary,
        color: t.warning.withValues(alpha: CatchOpacity.warningFill),
      ),
      radius: CatchRadius.md,
      backgroundColor: t.warning.withValues(alpha: CatchOpacity.warningFill),
      child: CatchViewport.atWidth(
        breakpoint: ComponentBreakpoints.hostWaitlistBulkOfferStackBreakpoint,
        compactBuilder: (context) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            summary,
            gapH10,
            Align(alignment: Alignment.centerLeft, child: button),
          ],
        ),
        expandedBuilder: (context) => Row(
          children: [
            Expanded(child: summary),
            gapW10,
            button,
          ],
        ),
      ),
    );
  }
}

String _personNoun(int count) => count == 1 ? 'person' : 'people';
