part of '../host_operations_screen.dart';

class HostAnalyticsPeriodInput extends StatelessWidget {
  const HostAnalyticsPeriodInput({
    super.key,
    required this.selected,
    required this.onChanged,
  });
  final HostOrganizerInsightsRangePreset selected;
  final ValueChanged<HostOrganizerInsightsRangePreset> onChanged;
  @override
  Widget build(BuildContext context) => CatchSection.content(
    title: context.l10n.hostsHostAnalyticsLabelPerformancePeriod,
    child: CatchChoiceInput<HostOrganizerInsightsRangePreset>.segmented(
      contract:
          CatchContractConstraints.hostAnalyticsQueryCallablePayloadRangePreset,
      contractValueBuilder: (preset) => switch (preset) {
        HostOrganizerInsightsRangePreset.thirtyDays => '30d',
        HostOrganizerInsightsRangePreset.ninetyDays => '90d',
        HostOrganizerInsightsRangePreset.twelveMonths => '12m',
      },
      selected: selected,
      onChanged: onChanged,
      options: [
        CatchOption(
          value: HostOrganizerInsightsRangePreset.thirtyDays,
          label: context.l10n.hostsHostAnalyticsLabel30Days,
        ),
        CatchOption(
          value: HostOrganizerInsightsRangePreset.ninetyDays,
          label: context.l10n.hostsHostAnalyticsLabel90Days,
        ),
        CatchOption(
          value: HostOrganizerInsightsRangePreset.twelveMonths,
          label: context.l10n.hostsHostAnalyticsLabel12Months,
        ),
      ],
    ),
  );
}
