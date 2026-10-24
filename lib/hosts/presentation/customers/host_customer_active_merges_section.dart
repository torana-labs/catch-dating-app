part of 'host_customer_detail_screen.dart';

class HostCustomerActiveMergesSection extends StatelessWidget {
  const HostCustomerActiveMergesSection({
    super.key,
    required this.merges,
    required this.onUndo,
  });

  final List<HostActiveContactMerge> merges;
  final ValueChanged<HostActiveContactMerge> onUndo;

  @override
  Widget build(BuildContext context) => CatchSection.content(
    key: const ValueKey('host-customer-active-merges'),
    title: context.l10n.hostCustomersMergedHistory,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (index, merge) in merges.indexed) ...[
          CatchText(
            context.l10n.hostCustomersMergedHistoryRow(
              name: merge.sourceDisplayName,
              count: merge.movedFactCount,
            ),
            variant: CatchTextVariant.bodyM,
            color: CatchTokens.of(context).ink,
          ),
          gapH8,
          CatchButton(
            label: context.l10n.hostCustomersUndoMerge,
            variant: CatchButtonVariant.secondary,
            size: CatchButtonSize.sm,
            onPressed: () => onUndo(merge),
          ),
          if (index < merges.length - 1) gapH16,
        ],
      ],
    ),
  );
}
