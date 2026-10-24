part of 'host_customer_timeline_section.dart';

/// Contact provenance is independent of current communication availability.
class HostCustomerSourcesSection extends StatelessWidget {
  const HostCustomerSourcesSection({
    super.key,
    required this.customer,
    this.onReviewDuplicates,
  });

  final HostAudienceContactDetail customer;
  final VoidCallback? onReviewDuplicates;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (customer.origins.isEmpty)
          CatchSection.content(
            key: const ValueKey('host-customer-provenance'),
            title: l10n.hostCustomersCustomerProvenance,
            trailing: onReviewDuplicates == null
                ? null
                : CatchButton.text(
                    key: const ValueKey('host-customer-review-duplicates'),
                    label: l10n.hostCustomersReviewDuplicates,
                    onPressed: onReviewDuplicates,
                  ),
            child: CatchText(
              l10n.hostCustomersCustomerProvenanceUnavailable,
              variant: CatchTextVariant.supporting,
            ),
          )
        else
          CatchSection.rows(
            key: const ValueKey('host-customer-provenance'),
            title: l10n.hostCustomersCustomerProvenance,
            trailing: onReviewDuplicates == null
                ? null
                : CatchButton.text(
                    key: const ValueKey('host-customer-review-duplicates'),
                    label: l10n.hostCustomersReviewDuplicates,
                    onPressed: onReviewDuplicates,
                  ),
            children: [
              if (customer.origins.isEmpty)
                CatchField.read(
                  copy: catchFieldCopy(l10n),
                  body: l10n.hostCustomersCustomerProvenanceUnavailable,
                )
              else
                for (final origin in customer.origins)
                  CatchField.read(
                    key: ValueKey('host-customer-origin-${origin.originId}'),
                    content: CatchRecordLayout(
                      title: _originLabel(context, origin),
                      metadata: l10n.hostCustomersCustomerProvenanceItem(
                        source: _originKindLabel(context, origin.sourceKind),
                        date: AppTimeFormatters.shortDate(origin.observedAt),
                      ),
                      icon:
                          origin.sourceKind ==
                              HostCustomerOriginSourceKind.hostForm
                          ? CatchIcons.descriptionOutlined
                          : CatchIcons.accountTreeOutlined,
                    ),
                  ),
            ],
          ),
        if (customer.originsTruncated)
          CatchSection.content(
            child: CatchText(
              l10n.hostCustomersSourcesTruncated,
              variant: CatchTextVariant.bodyS,
              color: CatchTokens.of(context).ink2,
            ),
          ),
      ],
    );
  }
}
