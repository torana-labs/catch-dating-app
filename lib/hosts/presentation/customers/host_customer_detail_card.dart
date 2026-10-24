part of 'host_customers_screen.dart';

typedef HostCustomerDetailsSaveCallback =
    Future<void> Function({
      required String displayName,
      String? phoneE164,
      String? email,
    });

class HostCustomerIdentityCard extends StatefulWidget {
  const HostCustomerIdentityCard({
    super.key,
    required this.customer,
    required this.onSave,
    this.initiallyEditing = false,
    this.showName = true,
    this.showContacts = true,
    this.primaryAction,
    this.onCancel,
  });

  final HostAudienceContactDetail customer;
  final HostCustomerDetailsSaveCallback onSave;
  final bool initiallyEditing;
  final bool showName;
  final bool showContacts;
  final Widget? primaryAction;
  final VoidCallback? onCancel;

  @override
  State<HostCustomerIdentityCard> createState() =>
      _HostCustomerIdentityCardState();
}

class _HostCustomerIdentityCardState extends State<HostCustomerIdentityCard> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  late bool _editing;
  bool _saving = false;
  bool _hasOptimisticDetails = false;
  String _optimisticDisplayName = '';
  String? _optimisticPhoneE164;
  String? _optimisticEmail;
  String? _contactMethodError;

  @override
  void initState() {
    super.initState();
    _editing = widget.initiallyEditing;
    _resetDraft();
  }

  @override
  void didUpdateWidget(covariant HostCustomerIdentityCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    final customerChanged =
        oldWidget.customer.contactId != widget.customer.contactId ||
        oldWidget.customer.revision != widget.customer.revision;
    if (customerChanged) {
      _hasOptimisticDetails = false;
      _contactMethodError = null;
      if (!_editing) _resetDraft();
    }
    if (!oldWidget.initiallyEditing && widget.initiallyEditing && !_editing) {
      _resetDraft();
      _editing = true;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  String get _displayName => _hasOptimisticDetails
      ? _optimisticDisplayName
      : widget.customer.displayName;

  String get _editableDisplayName => _hasOptimisticDetails
      ? _optimisticDisplayName
      : widget.customer.displayNameOverride ??
            widget.customer.sourceDisplayName;

  String? get _phoneE164 =>
      _hasOptimisticDetails ? _optimisticPhoneE164 : widget.customer.phoneE164;

  String? get _email =>
      _hasOptimisticDetails ? _optimisticEmail : widget.customer.email;

  @override
  Widget build(BuildContext context) {
    final phoneTitle = widget.customer.isIdentityVerified
        ? context.l10n.hostsHostAudienceContactVerifiedPhone
        : context.l10n.hostCustomersPhone;
    final phonePlaceholder = widget.customer.contactDetailsEditable
        ? CatchField.defaultEmptyValueText(
            catchFieldCopy(context.l10n),
            context.l10n.hostCustomersPhone,
          )
        : context.l10n.hostCustomersNotSaved;
    final emailPlaceholder = widget.customer.contactDetailsEditable
        ? CatchField.defaultEmptyValueText(
            catchFieldCopy(context.l10n),
            context.l10n.hostCustomersEmail,
          )
        : context.l10n.hostCustomersNotSaved;
    return Form(
      key: _formKey,
      child: _editing
          ? HostCustomerIdentityInputSection(
              key: const ValueKey('host-customer-contact-details'),
              title: context.l10n.hostCustomersContactDetails,
              mode: HostCustomerIdentityInputMode.edit,
              nameController: _nameController,
              phoneController: _phoneController,
              emailController: _emailController,
              enabled: !_saving,
              autofocusName: true,
              includeEndpoints: widget.customer.contactDetailsEditable,
              focused: true,
              readPhoneTitle: phoneTitle,
              readPhone: _phoneE164,
              readPhonePlaceholder: phonePlaceholder,
              readEmail: _email,
              readEmailPlaceholder: emailPlaceholder,
              onContactMethodChanged: _clearContactMethodError,
              onSubmitted: () => unawaited(_saveDetails()),
              footer: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CatchText(
                    widget.customer.contactDetailsEditable
                        ? context.l10n.hostCustomersUnverifiedContactDetails
                        : context
                              .l10n
                              .hostCustomersVerifiedDetailsManagedByCatch,
                    variant: CatchTextVariant.supporting,
                  ),
                  gapH12,
                  if (_contactMethodError != null) ...[
                    CatchBanner.error(message: _contactMethodError!),
                    gapH12,
                  ],
                  CatchFieldActionRow(
                    cancelLabel: context.l10n.coreCatchFieldLabelCancel,
                    doneLabel: context.l10n.coreCatchFieldLabelDone,
                    savingLabel: context.l10n.coreCatchFieldLabelSaving,

                    loading: _saving,
                    onCancel: _cancelEditing,
                    onSubmit: () => unawaited(_saveDetails()),
                  ),
                ],
              ),
            )
          : CatchSection.plain(
              key: const ValueKey('host-customer-contact-details'),
              child: HostCustomerIdentitySection(
                customer: widget.customer,
                displayName: _displayName,
                phoneE164: _phoneE164,
                phonePlaceholder: phonePlaceholder,
                email: _email,
                emailPlaceholder: emailPlaceholder,
                onEdit: _beginEditing,
                primaryAction: widget.primaryAction,
                showName: widget.showName,
                showContacts: widget.showContacts,
              ),
            ),
    );
  }

  void _beginEditing() {
    _resetDraft();
    setState(() => _editing = true);
  }

  void _cancelEditing() {
    if (_saving) return;
    if (widget.onCancel case final onCancel?) {
      onCancel();
      return;
    }
    _resetDraft();
    setState(() => _editing = false);
  }

  void _resetDraft() {
    _contactMethodError = null;
    _nameController.text = _editableDisplayName;
    _phoneController.text = _phoneE164 ?? '';
    _emailController.text = _email ?? '';
  }

  bool _draftChanged({
    required String displayName,
    required String? phoneE164,
    required String? email,
  }) =>
      displayName != _editableDisplayName ||
      (widget.customer.contactDetailsEditable &&
          (phoneE164 != _phoneE164 || email != _email));

  Future<void> _saveDetails() async {
    if (_saving || !(_formKey.currentState?.validate() ?? false)) return;
    final displayName = _nameController.text.trim();
    final phoneE164 = _optionalManualPhone(_phoneController.text);
    final email = _optionalNormalizedEmail(_emailController.text);
    final hadContactMethod = _phoneE164 != null || _email != null;
    if (widget.customer.contactDetailsEditable &&
        hadContactMethod &&
        phoneE164 == null &&
        email == null) {
      setState(
        () => _contactMethodError =
            context.l10n.hostCustomersContactMethodRequired,
      );
      return;
    }
    if (!_draftChanged(
      displayName: displayName,
      phoneE164: phoneE164,
      email: email,
    )) {
      _cancelEditing();
      return;
    }

    setState(() => _saving = true);
    try {
      await widget.onSave(
        displayName: displayName,
        phoneE164: phoneE164,
        email: email,
      );
      if (!mounted) return;
      setState(() {
        _contactMethodError = null;
        _hasOptimisticDetails = true;
        _optimisticDisplayName = displayName;
        _optimisticPhoneE164 = widget.customer.contactDetailsEditable
            ? phoneE164
            : widget.customer.phoneE164;
        _optimisticEmail = widget.customer.contactDetailsEditable
            ? email
            : widget.customer.email;
        _editing = false;
      });
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.club,
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _clearContactMethodError() {
    if (_contactMethodError == null) return;
    setState(() => _contactMethodError = null);
  }
}

class HostCustomerIdentitySection extends StatelessWidget {
  const HostCustomerIdentitySection({
    super.key,
    required this.customer,
    required this.displayName,
    required this.phoneE164,
    required this.phonePlaceholder,
    required this.email,
    required this.emailPlaceholder,
    required this.onEdit,
    required this.showName,
    required this.showContacts,
    this.primaryAction,
  });

  final HostAudienceContactDetail customer;
  final String displayName;
  final String? phoneE164;
  final String phonePlaceholder;
  final String? email;
  final String emailPlaceholder;
  final VoidCallback onEdit;
  final bool showName;
  final bool showContacts;
  final Widget? primaryAction;

  @override
  Widget build(BuildContext context) {
    final segment = _hostCustomerPrimarySegment(customer.traits.segments);
    final segmentLabel = segment == null
        ? null
        : segment == HostAudienceSegment.regular
        ? context.l10n.hostsOperationalRosterInsightRegular
        : _customerFilterLabel(
            context,
            hostCustomerFilterForAudienceSegment(segment),
          );
    final segmentTone = switch (segment) {
      HostAudienceSegment.lapsedRegular => CatchBadgeTone.warning,
      HostAudienceSegment.regular => CatchBadgeTone.affinity,
      HostAudienceSegment.newToOrganizer => CatchBadgeTone.success,
      _ => CatchBadgeTone.neutral,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchSection.rows(
          children: [
            CatchField.read(
              content: CatchPersonLayout(
                name: showName
                    ? displayName
                    : segmentLabel ?? context.l10n.hostCustomersContactDetails,
                supportingText: context.l10n.hostCustomersCompactEventCount(
                  count: customer.traits.attendedEventCount,
                ),
                facts: showContacts
                    ? [phoneE164 ?? phonePlaceholder, email ?? emailPlaceholder]
                    : const [],
                context: showContacts
                    ? null
                    : [
                        if (phoneE164 != null) context.l10n.hostCustomersPhone,
                        if (email != null) context.l10n.hostCustomersEmail,
                        if (phoneE164 == null && email == null)
                          context.l10n.hostCustomersNotSaved,
                      ].join(' · '),
                badges: [
                  if (segmentLabel != null)
                    CatchRowBadge(label: segmentLabel, tone: segmentTone),
                ],
              ),
            ),
          ],
        ),
        Wrap(
          spacing: CatchSpacing.s4,
          runSpacing: CatchSpacing.s2,
          children: [
            CatchButton.command(
              key: const ValueKey('host-customer-edit-details'),
              label: context.l10n.hostCustomersEditDetails,
              onPressed: onEdit,
            ),
            ?primaryAction,
          ],
        ),
      ],
    );
  }
}

HostAudienceSegment? _hostCustomerPrimarySegment(
  Set<HostAudienceSegment> segments,
) {
  const priority = [
    HostAudienceSegment.highImpactAdvocate,
    HostAudienceSegment.lapsedRegular,
    HostAudienceSegment.needsConfirmation,
    HostAudienceSegment.regular,
    HostAudienceSegment.reliableAttendee,
    HostAudienceSegment.repeatAttendee,
    HostAudienceSegment.firstTimeAttendee,
    HostAudienceSegment.newToOrganizer,
    HostAudienceSegment.advocate,
    HostAudienceSegment.pastAttendee,
  ];
  for (final segment in priority) {
    if (segments.contains(segment)) {
      return segment;
    }
  }
  return null;
}

class HostCustomerAttendanceCard extends StatelessWidget {
  const HostCustomerAttendanceCard({super.key, required this.customer});

  final HostAudienceContactDetail customer;

  @override
  Widget build(BuildContext context) {
    final traits = customer.traits;
    final attendanceRate = traits.attendanceRate == null
        ? '—'
        : '${(traits.attendanceRate! * 100).round()}%';
    final metrics = [
      (
        value: '${traits.attendedEventCount}',
        label: context.l10n.hostsHostAudienceAttended,
      ),
      (
        value: '${traits.expectedEventCount}',
        label: context.l10n.hostCustomersExpected,
      ),
      (value: attendanceRate, label: context.l10n.hostCustomersAttendanceRate),
    ];
    final segment = _hostCustomerPrimarySegment(traits.segments);
    return Column(
      key: const ValueKey('host-customer-activity'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (segment != null) ...[
          CatchText(
            _customerFilterLabel(
              context,
              hostCustomerFilterForAudienceSegment(segment),
            ),
            variant: CatchTextVariant.supporting,
          ),
          gapH16,
        ],
        Wrap(
          spacing: CatchSpacing.s8,
          runSpacing: CatchSpacing.s4,
          children: [
            for (final item in metrics)
              CatchMetricTile(value: item.value, label: item.label),
          ],
        ),
        gapH12,
        CatchText(
          context.l10n.hostCustomersAttendanceSummary(
            cancelled: traits.cancelledEventCount,
            noShows: traits.noShowCount,
            imported: traits.importedEventCount,
          ),
          variant: CatchTextVariant.bodyS,
          color: CatchTokens.of(context).ink2,
        ),
        if (traits.sourceCoverage != HostAudienceSourceCoverage.exact) ...[
          gapH8,
          CatchText(
            context.l10n.hostCustomersAttendancePartial,
            variant: CatchTextVariant.bodyS,
            color: CatchTokens.of(context).ink2,
          ),
        ],
      ],
    );
  }
}

class HostCustomerDetailsSection extends StatelessWidget {
  const HostCustomerDetailsSection({
    super.key,
    required this.customer,
    required this.onCall,
    required this.onEmail,
    this.onEdit,
  });
  final HostAudienceContactDetail customer;
  final VoidCallback? onCall;
  final VoidCallback? onEmail;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) => CatchSectionList(
    emptyStateOmitted: true,
    gap: CatchSpacing.s2,
    children: [
      CatchSection.rows(
        key: const ValueKey('host-customer-contact-methods'),
        title: context.l10n.hostCustomersContactMethods,
        trailing: onEdit == null
            ? null
            : CatchButton.text(
                key: const ValueKey('host-customer-edit-details'),
                label: context.l10n.hostCustomersEditDetails,
                onPressed: onEdit,
              ),
        children: [
          if (customer.phoneE164 case final phone?)
            CatchField.action(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-customer-call'),
              title: context.l10n.hostCustomersPhone,
              body: phone,
              icon: CatchIcons.phoneOutlined,
              onTap: onCall,
            ),
          if (customer.email case final email?)
            CatchField.action(
              copy: catchFieldCopy(context.l10n),
              key: const ValueKey('host-customer-email'),
              title: context.l10n.hostCustomersEmail,
              body: email,
              bodyMaxLines: 4,
              icon: CatchIcons.emailOutlined,
              onTap: onEmail,
            ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostCustomersAccountLink,
            body: customer.identityState == HostAudienceIdentityState.ambiguous
                ? context.l10n.hostCustomersAccountNeedsReview
                : customer.linkedAccount && customer.isIdentityVerified
                ? context.l10n.hostCustomersAccountVerified
                : context.l10n.hostCustomersAccountNotVerified,
            bodyMaxLines: 4,
          ),
        ],
      ),
      CatchSection.content(
        child: CatchText(
          customer.phoneE164 == null && customer.email == null
              ? context.l10n.hostCustomersNoContactMethods
              : customer.contactDetailsEditable
              ? context.l10n.hostCustomersUnverifiedContactDetails
              : context.l10n.hostCustomersVerifiedDetailsManagedByCatch,
          variant: CatchTextVariant.bodyS,
          color: CatchTokens.of(context).ink2,
        ),
      ),
    ],
  );
}

class HostCustomerRecentEventsList extends StatelessWidget {
  const HostCustomerRecentEventsList({
    super.key,
    required this.customer,
    required this.onOpenEvent,
  });

  final HostAudienceContactDetail customer;
  final ValueChanged<String> onOpenEvent;

  @override
  Widget build(BuildContext context) {
    final events = customer.events.toList()
      ..sort(
        (a, b) => (b.eventStartAt ?? DateTime(0)).compareTo(
          a.eventStartAt ?? DateTime(0),
        ),
      );
    if (events.isEmpty) return const SizedBox.shrink();
    return CatchSection.rows(
      key: const ValueKey('host-customer-recent-events'),
      title: context.l10n.hostCustomersRecentEvents,
      children: [
        for (final event in events.take(3))
          CatchField.navigate(
            key: ValueKey('host-customer-recent-event-${event.eventId}'),
            onActivate: () => onOpenEvent(event.eventId),
            content: CatchRecordLayout(
              title: event.displayName,
              metadata: [
                if (event.eventStartAt case final date?)
                  AppTimeFormatters.dateTime(date),
                context.l10n.hostCustomersTimelineEventStatus(
                  status: event.checkedIn ? 'checkedIn' : event.status,
                ),
              ].join(' · '),
              icon: CatchIcons.tabEvents,
            ),
          ),
      ],
    );
  }
}

class HostCustomerRevenueCard extends StatelessWidget {
  const HostCustomerRevenueCard({
    super.key,
    required this.revenue,
    this.onOpen,
  });

  final HostCustomerRevenue revenue;
  final VoidCallback? onOpen;

  @override
  Widget build(BuildContext context) => CatchSection.plain(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (revenue.coverage == HostCustomerRevenueCoverage.unavailable)
          CatchText(
            context.l10n.hostCustomersDetailRevenueUnavailable,
            variant: CatchTextVariant.supporting,
          )
        else if (revenue.amounts.isEmpty)
          CatchText(
            context.l10n.hostCustomersDetailNoRevenue,
            variant: CatchTextVariant.supporting,
          )
        else
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final amount in revenue.amounts) ...[
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CatchText(
                      NumberFormat.simpleCurrency(
                        name: amount.currency,
                      ).format(amount.amountMinor / 100),
                      variant: CatchTextVariant.metric,
                    ),
                    gapH4,
                    CatchText(
                      '${amount.currency} · ${context.l10n.hostCustomersDetailRevenueFacts(count: amount.factCount)}',
                      variant: CatchTextVariant.supporting,
                    ),
                    for (final source in amount.sources) ...[
                      gapH4,
                      CatchText(
                        _customerRevenueSourceSummary(
                          context,
                          source,
                          amount.currency,
                        ),
                        variant: CatchTextVariant.bodyS,
                        color: CatchTokens.of(context).ink2,
                      ),
                    ],
                  ],
                ),
                gapH8,
              ],
            ],
          ),
        if (onOpen != null)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: CatchButton.text(
              key: const ValueKey('host-customer-revenue-breakdown'),
              label: context.l10n.hostCustomersViewBreakdown,
              onPressed: onOpen,
            ),
          ),
        if (revenue.coverage == HostCustomerRevenueCoverage.partial) ...[
          gapH12,
          CatchNotice(
            dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
            notice: CatchNoticeData(
              id: 'host.customers.revenue.partial',
              title: context.l10n.hostsHostAudienceCoveragePartial,
              message: context.l10n.hostCustomersDetailRevenuePartial,
              tone: CatchNoticeTone.warning,
            ),
          ),
        ],
      ],
    ),
  );
}

class HostCustomerRevenueList extends StatelessWidget {
  const HostCustomerRevenueList({
    super.key,
    required this.customer,
    required this.onOpenEvent,
  });

  final HostAudienceContactDetail customer;
  final ValueChanged<String> onOpenEvent;

  @override
  Widget build(BuildContext context) => CatchSheet.standard(
    title: context.l10n.hostCustomersDetailRevenue,
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        HostCustomerRevenueCard(revenue: customer.revenue),
        gapH24,
        CatchSection.fieldRows(
          first: true,
          title: context.l10n.hostCustomersSpendByEvent,
          children: [
            if (!customer.events.any((event) => event.revenues.isNotEmpty))
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                body: context.l10n.hostCustomersSpendBreakdownUnavailable,
              ),
            for (final event in customer.events.where(
              (event) => event.revenues.isNotEmpty,
            ))
              for (final amount in event.revenues)
                CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  title: event.displayName,
                  body: [
                    NumberFormat.simpleCurrency(
                      name: amount.currency,
                    ).format(amount.amountMinor / 100),
                    _customerRevenueSourceLabel(context, amount.source),
                    if (amount.allocation ==
                        HostCustomerRevenueAllocation.sharedOrder)
                      context.l10n.hostCustomersSharedOrder,
                  ].join(' · '),
                  bodyMaxLines: 6,
                  onTap: () => onOpenEvent(event.eventId),
                ),
          ],
        ),
      ],
    ),
  );
}

String _customerRevenueSourceLabel(
  BuildContext context,
  HostCustomerRevenueSource source,
) => switch (source) {
  HostCustomerRevenueSource.catchPayment =>
    context.l10n.hostCustomersRevenueSourceCatch,
  HostCustomerRevenueSource.providerOrder =>
    context.l10n.hostCustomersRevenueSourceProvider,
  HostCustomerRevenueSource.hostImport =>
    context.l10n.hostCustomersRevenueSourceImport,
  HostCustomerRevenueSource.hostEstimate =>
    context.l10n.hostCustomersRevenueSourceEstimate,
  HostCustomerRevenueSource.hostAttested =>
    context.l10n.hostCustomersRevenueSourceAttested,
};

String _customerRevenueSourceSummary(
  BuildContext context,
  HostCustomerRevenueSourceAmount source,
  String currency,
) =>
    '${_customerRevenueSourceLabel(context, source.source)} '
    '${NumberFormat.simpleCurrency(name: currency).format(source.amountMinor / 100)}';
