import 'dart:async';
import 'dart:math' as math;
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/hosts/data/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/hosts/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/hosts/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_offer_preferences_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_confirmation_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_details_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_mode_section.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_mode_tile.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/host_offer_payment_review_sheet.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

/// Modeled as a decision, not a preference grid: the host picks how guests pay,
/// sees only the fields that mode needs, and reads how payment confirmation
/// works before saving. Draft edits stage on the controller; Save runs the
/// server preview and an explicit confirm keeps the reviewed commit.
class HostOfferPaymentSetupPageBody extends ConsumerStatefulWidget {
  const HostOfferPaymentSetupPageBody({
    super.key,
    required this.scope,
    required this.onBack,
    this.catchCheckoutAvailable = false,
    this.eventName,
  });

  final EventEditorScope scope;
  final String? eventName;
  final VoidCallback onBack;

  /// First-party checkout needs verified provider activation. Until that
  /// lands the option stays visible but cannot be selected.
  final bool catchCheckoutAvailable;

  @override
  ConsumerState<HostOfferPaymentSetupPageBody> createState() =>
      _HostOfferPaymentSetupPageBodyState();
}

class _HostOfferPaymentSetupPageBodyState
    extends ConsumerState<HostOfferPaymentSetupPageBody> {
  EventPreferencesEditorState get _snapshot =>
      ref.read(eventOfferPreferencesControllerProvider(widget.scope));
  EventOfferPreferencesController get _controller =>
      ref.read(eventOfferPreferencesControllerProvider(widget.scope).notifier);

  static const _validityChips = offerPaymentValidityChips;

  HostOfferPaymentMode? _mode;
  bool _pickerExpanded = false;
  bool _hydrated = false;
  bool _reuseAttested = false;
  bool _validityCustom = false;
  int? _validityMinutes;
  // Explicit-save drawers commit on Done; the committed strings are what
  // _stage() sees, so Cancel restores them rather than the drawer text.
  String? _openEditor;
  String _committedMessage = '';
  String _committedInstructions = '';
  String? _instructionsError;
  final _amount = TextEditingController();
  final _currency = TextEditingController();
  final _pageUrl = TextEditingController();
  final _instructions = TextEditingController();
  final _message = TextEditingController();
  final _customValidity = TextEditingController();

  @override
  void dispose() {
    for (final controller in [
      _amount,
      _currency,
      _pageUrl,
      _instructions,
      _message,
      _customValidity,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  bool get _isPaid =>
      _mode == HostOfferPaymentMode.catchCheckout ||
      _mode == HostOfferPaymentMode.reusablePage ||
      _mode == HostOfferPaymentMode.personalRequest ||
      _mode == HostOfferPaymentMode.manualInstructions;

  EventCollectionPreference? get _collection => switch (_mode) {
    HostOfferPaymentMode.reusablePage => EventCollectionPreference.reusablePage,
    HostOfferPaymentMode.personalRequest =>
      EventCollectionPreference.personalRequest,
    HostOfferPaymentMode.manualInstructions =>
      EventCollectionPreference.manualInstructions,
    HostOfferPaymentMode.catchCheckout =>
      EventCollectionPreference.catchCheckout,
    _ => null,
  };

  int get _currencyDigits =>
      NumberFormat.currency(
        name: _currency.text.trim().isEmpty ? 'INR' : _currency.text.trim(),
      ).decimalDigits ??
      2;

  int? get _amountMinor {
    final parsed = double.tryParse(_amount.text.trim());
    if (parsed == null || parsed.isNaN || parsed.isInfinite) return null;
    return (parsed * math.pow(10, _currencyDigits)).round();
  }

  void _hydrate() {
    final resolved = _snapshot.resolvedValues;
    final amount = resolved['expectedAmountMinor'];
    final collection = resolved['collectionPreference'];
    if (amount is int && amount == 0) {
      _mode = HostOfferPaymentMode.free;
    } else if (collection is String) {
      _mode = switch (collection) {
        'reusablePage' => HostOfferPaymentMode.reusablePage,
        'personalRequest' => HostOfferPaymentMode.personalRequest,
        'manualInstructions' => HostOfferPaymentMode.manualInstructions,
        'catchCheckout' => HostOfferPaymentMode.catchCheckout,
        _ => null,
      };
    }
    if (amount is int && amount > 0) {
      final currency = resolved['currency'];
      _amount.text = _majorText(amount, currency is String ? currency : 'INR');
    }
    _currency.text = resolved['currency'] as String? ?? 'INR';
    final validity = resolved['offerValidityMinutes'];
    if (validity is int) {
      _validityMinutes = validity;
      _validityCustom = !_validityChips.contains(validity);
      if (_validityCustom) _customValidity.text = '$validity';
    }
    final page = resolved['reusablePaymentPage'];
    if (page is Map && page['url'] is String) {
      _pageUrl.text = page['url'] as String;
      _reuseAttested = true;
    }
    _instructions.text = resolved['paymentInstructions'] as String? ?? '';
    _committedInstructions = _instructions.text;
    _message.text = resolved['offerMessageTemplate'] as String? ?? '';
    _committedMessage = _message.text;
    _hydrated = true;
  }

  String _majorText(int minor, String currency) {
    final digits = NumberFormat.currency(name: currency).decimalDigits ?? 2;
    final factor = math.pow(10, digits).toInt();
    if (minor % factor == 0) return '${minor ~/ factor}';
    return (minor / factor).toStringAsFixed(digits);
  }

  /// Rebuild the staged intents after every edit. Fields this screen does not
  /// manage keep their current intents; dependents outside the chosen mode
  /// are cleared so the saved snapshot only carries what applies.
  void _stage() {
    if (!_hydrated || !_snapshot.canEdit) return;
    final current = _snapshot.editorIntents;
    final amount = _amountMinor;
    final currency = _currency.text.trim().toUpperCase();
    final message = _committedMessage;
    final instructions = _committedInstructions;
    final pageUrl = _pageUrl.text.trim();
    _controller.stage(
      PrivateEventPreferenceIntents(
        usualDurationMinutes: current.usualDurationMinutes,
        preferredVenueId: current.preferredVenueId,
        admissionPreset: current.admissionPreset,
        offerValidityMinutes: _validityMinutes != null
            ? EventSetupValue.set(_validityMinutes!)
            : const EventSetupValue.clear(),
        offerMessageTemplate: message.isEmpty
            ? const EventSetupValue.clear()
            : EventSetupValue.set(message),
        expectedAmountMinor: switch (_mode) {
          HostOfferPaymentMode.free => const EventSetupValue.set(0),
          null => current.expectedAmountMinor,
          _ =>
            amount != null
                ? EventSetupValue.set(amount)
                : const EventSetupValue.clear(),
        },
        currency: !_isPaid
            ? current.currency
            : RegExp(r'^[A-Z]{3}$').hasMatch(currency)
            ? EventSetupValue.set(currency)
            : const EventSetupValue.clear(),
        collectionPreference: switch (_mode) {
          null => current.collectionPreference,
          HostOfferPaymentMode.free => const EventSetupValue.clear(),
          _ => EventSetupValue.set(_collection!),
        },
        paymentInstructions:
            _mode == HostOfferPaymentMode.manualInstructions &&
                instructions.isNotEmpty
            ? EventSetupValue.set(instructions)
            : const EventSetupValue.clear(),
        reusablePaymentPage:
            _mode == HostOfferPaymentMode.reusablePage &&
                _reuseAttested &&
                isCanonicalPublicPaymentPageUrl(pageUrl)
            ? EventSetupValue.set(
                ReusableOrganizerPaymentPage(pageUrl, reusableForEvents: true),
              )
            : const EventSetupValue.clear(),
      ),
    );
  }

  /// Offer expiry mirrors the server rule: validity counted from now, clamped
  /// at the event start. Hidden while validity is unset or already past.
  int? get _resolvedExpiryMillis {
    final validity = _validityMinutes;
    final configuration = _snapshot.configuration;
    if (validity == null ||
        validity < 5 ||
        validity > 10080 ||
        configuration == null) {
      return null;
    }
    final expiry = math.min(
      configuration.nowMillis + validity * 60_000,
      configuration.startsAtMillis,
    );
    return expiry > configuration.nowMillis ? expiry : null;
  }

  List<String> _blockers(AppLocalizations l10n) {
    final blockers = <String>[];
    if (_mode == null) blockers.add(l10n.hostOfferPaymentChooseMode);
    if (_mode == HostOfferPaymentMode.catchCheckout &&
        !widget.catchCheckoutAvailable) {
      blockers.add(l10n.hostOfferPaymentCheckoutUnavailable);
    }
    if (_isPaid) {
      final amount = _amountMinor;
      if (amount == null || amount <= 0 || amount > 100000000) {
        blockers.add(l10n.hostOfferPaymentSetAmount);
      }
      if (!RegExp(
        r'^[A-Z]{3}$',
      ).hasMatch(_currency.text.trim().toUpperCase())) {
        blockers.add(l10n.hostOfferPaymentSetCurrency);
      }
      if (_mode == HostOfferPaymentMode.reusablePage) {
        final page = _pageUrl.text.trim();
        if (page.isEmpty) {
          blockers.add(l10n.hostOfferPaymentSetPage);
        } else if (!isCanonicalPublicPaymentPageUrl(page)) {
          blockers.add(l10n.hostsEventDefaultsInvalidReusablePage);
        } else if (!_reuseAttested) {
          blockers.add(l10n.hostOfferPaymentConfirmReuse);
        }
      }
      if (_mode == HostOfferPaymentMode.manualInstructions &&
          _committedInstructions.trim().isEmpty) {
        blockers.add(l10n.hostOfferPaymentSetInstructions);
      }
    }
    final validity = _validityMinutes;
    if (validity == null || validity < 5 || validity > 10080) {
      blockers.add(l10n.hostOfferPaymentSetValidity);
    }
    return blockers;
  }

  String _summary(AppLocalizations l10n) {
    if (_mode == HostOfferPaymentMode.free) {
      return l10n.hostOfferPaymentReadyFree;
    }
    final amount = _amountMinor;
    final currency = _currency.text.trim().toUpperCase();
    final amountText = amount == null
        ? ''
        : offerAmountDisplay(amount, currency.isEmpty ? 'INR' : currency);
    return l10n.hostOfferPaymentReadyPaid(
      amount: amountText,
      collection: _mode == null
          ? ''
          : hostOfferPaymentModeTitle(l10n, _mode!).toLowerCase(),
    );
  }

  Future<void> _save() async {
    if (!_snapshot.canEdit) return;
    // Preview binds the reviewed revision fences; without a preview endpoint
    // the command journal still guards the write itself.
    if (!_snapshot.previewAvailable) {
      await _controller.save(_snapshot.editorIntents);
      if (!mounted) return;
      if (_snapshot.error == null && !_snapshot.hasPending) {
        widget.onBack();
      }
      return;
    }
    await _controller.previewChanges();
    if (!mounted || _snapshot.review == null) return;
    final summary = _summary(context.l10n);
    final confirmed = await showCatchBottomSheet<bool>(
      context: context,
      builder: (context) => HostOfferPaymentReviewSheet(
        review: _snapshot.review!,
        summary: summary,
      ),
    );
    if (confirmed != true || !mounted) return;
    await _controller.applyReview();
    if (!mounted) return;
    if (_snapshot.error == null && !_snapshot.hasPending) {
      widget.onBack();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final tokens = CatchTokens.of(context);
    final snapshot = ref.watch(
      eventOfferPreferencesControllerProvider(widget.scope),
    );
    final controller = _controller;
    if (!_hydrated && snapshot.hasLoadedEvent && snapshot.defaults != null) {
      _hydrate();
    }
    if (snapshot.loading && !snapshot.hasLoadedEvent) {
      return const CatchScaffold.stepFlow(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    final blockers = _blockers(l10n);
    final editable = snapshot.canEdit;
    final saving = snapshot.saving || snapshot.previewing;
    return CatchScaffold.stepFlow(
      backgroundColor: tokens.bg,
      resizeToAvoidBottomInset: true,
      body: Column(
        children: [
          CatchStepHeader(
            title: l10n.hostOfferPaymentTitle,
            subtitle:
                widget.eventName ??
                snapshot.eventName ??
                l10n.hostsPrivateEventPayments,
            stepLabelBuilder: catchStepHeaderLabelBuilder(l10n),
            compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(l10n),
            onBack: widget.onBack,
            leadingType: CatchTopBarNavigationMode.back,
          ),
          Expanded(
            child: Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  maxWidth: CatchLayout.hostCreateEventFormLaneMaxWidth,
                ),
                child: ListView(
                  padding: CatchInsets.formStepBodyWithBottomActions,
                  children: [
                    CatchSectionList(
                      emptyStateOmitted: true,
                      children: [
                        if (snapshot.hasPending || snapshot.error != null)
                          Column(
                            children: [
                              if (snapshot.hasPending)
                                CatchBanner(
                                  title: l10n.hostsEventPreferencePending,
                                  message: l10n.hostsEventPreferencePendingBody,
                                  icon: CatchIcons.time,
                                  tone: CatchBannerTone.neutral,
                                  actions: [
                                    CatchButton(
                                      label: l10n.hostsEventPreferenceRetry,
                                      variant: CatchButtonVariant.secondary,
                                      size: CatchButtonSize.md,
                                      onPressed: snapshot.saving
                                          ? null
                                          : () => unawaited(
                                              controller.retryPending(),
                                            ),
                                    ),
                                  ],
                                ),
                              if (snapshot.hasPending && snapshot.error != null)
                                gapH8,
                              if (snapshot.error != null)
                                CatchBanner.error(
                                  message: appErrorMessage(
                                    snapshot.error!,
                                    l10n: l10n,
                                    context: AppErrorContext.event,
                                  ),
                                ),
                            ],
                          ),
                        HostOfferPaymentModeSection(
                          mode: _mode,
                          pickerExpanded: _pickerExpanded,
                          editable: editable,
                          checkoutAvailable: widget.catchCheckoutAvailable,
                          first: !snapshot.hasPending && snapshot.error == null,
                          onSelected: (mode) {
                            setState(() {
                              _mode = mode;
                              _pickerExpanded = false;
                              _openEditor = null;
                              _instructionsError = null;
                            });
                            _stage();
                          },
                          onExpandPicker: () =>
                              setState(() => _pickerExpanded = true),
                        ),
                        if (_mode != null)
                          HostOfferPaymentDetailsSection(
                            mode: _mode!,
                            editable: editable,
                            amountController: _amount,
                            currencyController: _currency,
                            customValidityController: _customValidity,
                            pageUrlController: _pageUrl,
                            instructionsController: _instructions,
                            messageController: _message,
                            validityCustom: _validityCustom,
                            validityMinutes: _validityMinutes,
                            reuseAttested: _reuseAttested,
                            resolvedExpiryMillis: _resolvedExpiryMillis,
                            openEditor: _openEditor,
                            instructionsError: _instructionsError,
                            onFieldChanged: _stage,
                            onValiditySelected: ({required custom, minutes}) {
                              setState(() {
                                _validityCustom = custom;
                                _validityMinutes = custom
                                    ? int.tryParse(_customValidity.text.trim())
                                    : minutes;
                              });
                              _stage();
                            },
                            onValidityMinutesChanged: (text) {
                              _validityMinutes = int.tryParse(text.trim());
                              _stage();
                            },
                            onReuseAttestedChanged: (value) {
                              setState(() => _reuseAttested = value);
                              _stage();
                            },
                            onInstructionsOpenChanged: (open) {
                              if (!editable) return;
                              setState(
                                () =>
                                    _openEditor = open ? 'instructions' : null,
                              );
                            },
                            onInstructionsCancel: () => setState(() {
                              _instructions.text = _committedInstructions;
                              _instructionsError = null;
                              _openEditor = null;
                            }),
                            onInstructionsSubmit: () {
                              if (_instructions.text.trim().isEmpty) {
                                setState(
                                  () => _instructionsError =
                                      l10n.hostsEventPreferenceInvalidValue,
                                );
                                return;
                              }
                              setState(() {
                                _committedInstructions = _instructions.text
                                    .trim();
                                _instructionsError = null;
                                _openEditor = null;
                              });
                              _stage();
                            },
                            onInstructionsChanged: (_) {
                              if (_instructionsError != null) {
                                setState(() => _instructionsError = null);
                              }
                            },
                            onMessageOpenChanged: (open) {
                              if (!editable) return;
                              setState(
                                () => _openEditor = open ? 'message' : null,
                              );
                            },
                            onMessageCancel: () => setState(() {
                              _message.text = _committedMessage;
                              _openEditor = null;
                            }),
                            onMessageSubmit: () {
                              setState(() {
                                _committedMessage = _message.text.trim();
                                _openEditor = null;
                              });
                              _stage();
                            },
                          ),
                        if (_mode == HostOfferPaymentMode.personalRequest)
                          CatchNotice(
                            dismissLabel: l10n.coreCatchNoticeTooltipDismiss,
                            notice: CatchNoticeData(
                              id: 'offer-payment-request-links',
                              title: l10n.hostsEventDefaultsPersonalRequest,
                              message: l10n.hostOfferPaymentRequestLinksBody,
                              icon: CatchIcons.link,
                              duration: null,
                              dismissible: false,
                            ),
                          ),
                        if (_mode != null)
                          HostOfferPaymentConfirmationSection(mode: _mode!),
                      ],
                    ),
                    if (_mode != null) ...[
                      gapH4,
                      CatchText(
                        l10n.hostsEventPreferenceProviderHint,
                        variant: CatchTextVariant.bodyM,
                        color: tokens.ink2,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
          CatchDock.primaryContent(
            label: l10n.hostOfferPaymentSave,
            buttonKey: const ValueKey('offer-payment-setup-save'),
            catchLine: blockers.isEmpty
                ? _summary(l10n)
                : blockers.first.toUpperCase(),
            footnote: l10n.hostsEventPreferencePublishedHint,
            isLoading: saving,
            onPressed: editable && blockers.isEmpty ? _save : null,
          ),
        ],
      ),
    );
  }
}
