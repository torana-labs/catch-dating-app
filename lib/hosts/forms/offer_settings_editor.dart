import 'dart:async';
import 'dart:math' as math;

import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/hosts/forms/offer_settings_sections.dart';
import 'package:catch_dating_app/hosts/forms/offer_settings_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_offer_preferences_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

/// The offer settings page, built as a decision: the host picks how guests
/// pay, sees only the fields that mode needs and reads how payment is
/// confirmed before saving. Edits stage on the event's offer-settings
/// editor; Save runs the server review and Apply commits what was reviewed.
class HostOfferSettingsEditor extends ConsumerStatefulWidget {
  const HostOfferSettingsEditor({
    super.key,
    required this.scope,
    required this.onBack,
    this.checkoutAvailable = false,
    this.eventName,
  });

  final EventEditorScope scope;
  final String? eventName;
  final VoidCallback onBack;

  /// Catch checkout needs verified provider activation; until then the
  /// mode shows but cannot be chosen.
  final bool checkoutAvailable;

  @override
  ConsumerState<HostOfferSettingsEditor> createState() =>
      _HostOfferSettingsEditorState();
}

class _HostOfferSettingsEditorState
    extends ConsumerState<HostOfferSettingsEditor> {
  EventPreferencesEditorState get _snapshot =>
      ref.read(eventOfferPreferencesControllerProvider(widget.scope));
  EventOfferPreferencesController get _controller =>
      ref.read(eventOfferPreferencesControllerProvider(widget.scope).notifier);

  HostOfferSettingsMode? _mode;
  bool _choosing = false;
  bool _hydrated = false;
  bool _reuseAttested = false;
  bool _validityCustom = false;
  int? _validityMinutes;
  // The text drawers commit on Done; Cancel restores the committed text.
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

  bool get _isPaid => _mode != null && _mode != HostOfferSettingsMode.free;

  EventCollectionPreference? get _collection => switch (_mode) {
    HostOfferSettingsMode.reusablePage =>
      EventCollectionPreference.reusablePage,
    HostOfferSettingsMode.personalRequest =>
      EventCollectionPreference.personalRequest,
    HostOfferSettingsMode.manualInstructions =>
      EventCollectionPreference.manualInstructions,
    HostOfferSettingsMode.catchCheckout =>
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
      _mode = HostOfferSettingsMode.free;
    } else if (collection is String) {
      _mode = hostOfferSettingsModeFor(collection);
    }
    if (amount is int && amount > 0) {
      final currency = resolved['currency'];
      _amount.text = _majorText(amount, currency is String ? currency : 'INR');
    }
    _currency.text = resolved['currency'] as String? ?? 'INR';
    final validity = resolved['offerValidityMinutes'];
    if (validity is int) {
      _validityMinutes = validity;
      _validityCustom = !hostOfferValidityChoices.contains(validity);
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

  /// Stages the intents after every edit. Fields this page does not manage
  /// keep their intents; fields outside the chosen mode are cleared.
  void _stage() {
    if (!_hydrated || !_snapshot.canEdit) return;
    final current = _snapshot.editorIntents;
    final amount = _amountMinor;
    final currency = _currency.text.trim().toUpperCase();
    final pageUrl = _pageUrl.text.trim();
    _controller.stage(
      PrivateEventPreferenceIntents(
        usualDurationMinutes: current.usualDurationMinutes,
        preferredVenueId: current.preferredVenueId,
        admissionPreset: current.admissionPreset,
        offerValidityMinutes: _validityMinutes != null
            ? EventSetupValue.set(_validityMinutes!)
            : const EventSetupValue.clear(),
        offerMessageTemplate: _committedMessage.isEmpty
            ? const EventSetupValue.clear()
            : EventSetupValue.set(_committedMessage),
        expectedAmountMinor: switch (_mode) {
          HostOfferSettingsMode.free => const EventSetupValue.set(0),
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
          HostOfferSettingsMode.free => const EventSetupValue.clear(),
          _ => EventSetupValue.set(_collection!),
        },
        paymentInstructions:
            _mode == HostOfferSettingsMode.manualInstructions &&
                _committedInstructions.isNotEmpty
            ? EventSetupValue.set(_committedInstructions)
            : const EventSetupValue.clear(),
        reusablePaymentPage:
            _mode == HostOfferSettingsMode.reusablePage &&
                _reuseAttested &&
                isCanonicalPublicPaymentPageUrl(pageUrl)
            ? EventSetupValue.set(
                ReusableOrganizerPaymentPage(pageUrl, reusableForEvents: true),
              )
            : const EventSetupValue.clear(),
      ),
    );
  }

  /// When an offer made now expires: validity from now, held no later than
  /// the event start. Null while validity is unset or already past.
  int? get _expiryMillis {
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
    if (_mode == HostOfferSettingsMode.catchCheckout &&
        !widget.checkoutAvailable) {
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
      if (_mode == HostOfferSettingsMode.reusablePage) {
        final page = _pageUrl.text.trim();
        if (page.isEmpty) {
          blockers.add(l10n.hostOfferPaymentSetPage);
        } else if (!isCanonicalPublicPaymentPageUrl(page)) {
          blockers.add(l10n.hostsEventDefaultsInvalidReusablePage);
        } else if (!_reuseAttested) {
          blockers.add(l10n.hostOfferPaymentConfirmReuse);
        }
      }
      if (_mode == HostOfferSettingsMode.manualInstructions &&
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
    if (_mode == HostOfferSettingsMode.free) {
      return l10n.hostOfferPaymentReadyFree;
    }
    final amount = _amountMinor;
    final currency = _currency.text.trim().toUpperCase();
    return l10n.hostOfferPaymentReadyPaid(
      amount: amount == null
          ? ''
          : hostOfferAmountText(amount, currency.isEmpty ? 'INR' : currency),
      collection: _mode == null
          ? ''
          : hostOfferSettingsModeTitle(l10n, _mode!).toLowerCase(),
    );
  }

  Future<void> _save() async {
    if (!_snapshot.canEdit) return;
    // Without a review endpoint the command journal still guards the write.
    if (!_snapshot.previewAvailable) {
      await _controller.save(_snapshot.editorIntents);
      if (mounted && _snapshot.error == null && !_snapshot.hasPending) {
        widget.onBack();
      }
      return;
    }
    await _controller.previewChanges();
    if (!mounted || _snapshot.review == null) return;
    final summary = _summary(context.l10n);
    final confirmed = await showCatchBottomSheet<bool>(
      context: context,
      builder: (context) => HostOfferSettingsReviewSheet(
        review: _snapshot.review!,
        summary: summary,
      ),
    );
    if (confirmed != true || !mounted) return;
    await _controller.applyReview();
    if (mounted && _snapshot.error == null && !_snapshot.hasPending) {
      widget.onBack();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final snapshot = ref.watch(
      eventOfferPreferencesControllerProvider(widget.scope),
    );
    if (!_hydrated && snapshot.hasLoadedEvent && snapshot.defaults != null) {
      _hydrate();
    }
    final loading = snapshot.loading && !snapshot.hasLoadedEvent;
    final blockers = _blockers(l10n);
    final editable = snapshot.canEdit;
    final saving = snapshot.saving || snapshot.previewing;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-offer-settings-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostOfferPaymentTitle,
          kicker:
              widget.eventName ??
              snapshot.eventName ??
              l10n.hostsPrivateEventPayments,
          back: CatchTopBarBack(
            label: l10n.hostFormsBack,
            onPressed: widget.onBack,
          ),
        ),
        body: loading
            ? const CatchPageBody.screen(child: CatchLoadingIndicator())
            : CatchPageBody.screen(
                child: CatchStack(
                  gap: CatchStackGap.g24,
                  children: [
                    if (snapshot.hasPending)
                      CatchNotice.inline(
                        key: const ValueKey('offer-payment-pending'),
                        title: l10n.hostsEventPreferencePending,
                        body: l10n.hostsEventPreferencePendingBody,
                        icon: CatchIcons.time,
                        action: CatchNoticeAction(
                          label: l10n.hostsEventPreferenceRetry,
                          onPressed: snapshot.saving
                              ? null
                              : () => unawaited(_controller.retryPending()),
                        ),
                      ),
                    if (snapshot.error case final error?)
                      CatchNotice.inline(
                        body: appErrorMessage(
                          error,
                          l10n: l10n,
                          context: AppErrorContext.event,
                        ),
                        tone: CatchNoticeTone.danger,
                      ),
                    HostOfferSettingsModeSection(
                      mode: _mode,
                      expanded: _choosing,
                      editable: editable,
                      checkoutAvailable: widget.checkoutAvailable,
                      onSelected: (mode) {
                        setState(() {
                          _mode = mode;
                          _choosing = false;
                          _openEditor = null;
                          _instructionsError = null;
                        });
                        _stage();
                      },
                      onChange: () => setState(() => _choosing = true),
                    ),
                    if (_mode case final mode?) ...[
                      HostOfferSettingsDetailsSection(
                        mode: mode,
                        editable: editable,
                        amount: _amount,
                        currency: _currency,
                        customValidity: _customValidity,
                        pageUrl: _pageUrl,
                        instructions: _instructions,
                        message: _message,
                        validityCustom: _validityCustom,
                        validityMinutes: _validityMinutes,
                        reuseAttested: _reuseAttested,
                        expiryMillis: _expiryMillis,
                        openEditor: _openEditor,
                        instructionsError: _instructionsError,
                        onFieldChanged: _stage,
                        onValidity: ({required custom, minutes}) {
                          setState(() {
                            _validityCustom = custom;
                            _validityMinutes = custom
                                ? int.tryParse(_customValidity.text.trim())
                                : minutes;
                          });
                          _stage();
                        },
                        onValidityMinutes: (text) {
                          _validityMinutes = int.tryParse(text.trim());
                          _stage();
                        },
                        onReuseAttested: (value) {
                          setState(() => _reuseAttested = value);
                          _stage();
                        },
                        onInstructionsOpen: (open) {
                          if (editable) {
                            setState(
                              () => _openEditor = open ? 'instructions' : null,
                            );
                          }
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
                            _committedInstructions = _instructions.text.trim();
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
                        onMessageOpen: (open) {
                          if (editable) {
                            setState(
                              () => _openEditor = open ? 'message' : null,
                            );
                          }
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
                      if (mode == HostOfferSettingsMode.personalRequest)
                        CatchNotice.inline(
                          title: l10n.hostsEventDefaultsPersonalRequest,
                          body: l10n.hostOfferPaymentRequestLinksBody,
                          icon: CatchIcons.link,
                        ),
                      HostOfferSettingsConfirmation(mode: mode),
                      CatchText(
                        l10n.hostsEventPreferenceProviderHint,
                        variant: CatchTextVariant.bodySmall,
                        tone: CatchTextTone.secondary,
                      ),
                    ],
                    CatchText(
                      l10n.hostsEventPreferencePublishedHint,
                      variant: CatchTextVariant.bodySmall,
                      tone: CatchTextTone.secondary,
                    ),
                  ],
                ),
              ),
        dock: CatchDock(
          header: CatchText(
            blockers.isEmpty ? _summary(l10n) : blockers.first,
            key: const ValueKey('offer-payment-dock-line'),
            variant: CatchTextVariant.labelAction,
            tone: blockers.isEmpty
                ? CatchTextTone.inherit
                : CatchTextTone.secondary,
            maxLines: 2,
          ),
          primary: CatchDockAction(
            label: l10n.hostOfferPaymentSave,
            loading: saving,
            onPressed: editable && blockers.isEmpty && !loading
                ? () => unawaited(_save())
                : null,
          ),
        ),
      ),
    );
  }
}
