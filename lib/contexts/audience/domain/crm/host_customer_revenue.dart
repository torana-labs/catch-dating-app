import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';

enum HostCustomerRevenueCoverage { exact, partial, unavailable }

enum HostCustomerRevenueSource {
  catchPayment,
  hostImport,
  hostEstimate,
  providerOrder,
  hostAttested,
}

enum HostCustomerEventOrigin { catchNative, externalCompanion, unknown }

enum HostCustomerRevenueAllocation { perAttendee, sharedOrder }

class HostAudienceEventFact {
  const HostAudienceEventFact({
    required this.eventId,
    required this.displayName,
    this.eventOrigin = HostCustomerEventOrigin.unknown,
    this.eventProvider,
    required this.source,
    required this.status,
    required this.checkedIn,
    required this.eventStartAt,
    this.revenues = const [],
  });

  factory HostAudienceEventFact.fromMap(Map<Object?, Object?> map) =>
      HostAudienceEventFact(
        eventId: crmRequiredString(map, 'eventId'),
        displayName: crmRequiredString(map, 'displayName'),
        eventOrigin: crmEnumByName(
          HostCustomerEventOrigin.values,
          crmRequiredString(map, 'eventOriginMode'),
          'event origin',
        ),
        eventProvider: crmNullableString(map['eventProvider']),
        source: crmRequiredString(map, 'source'),
        status: crmRequiredString(map, 'status'),
        checkedIn: crmRequiredBool(map, 'checkedIn'),
        eventStartAt: crmDateTimeFromMillis(map['eventStartAtMillis']),
        revenues: crmMapList(
          map['revenues'],
          'event revenue',
        ).map(HostCustomerEventRevenue.fromMap).toList(growable: false),
      );

  final String eventId;
  final String displayName;
  final HostCustomerEventOrigin eventOrigin;
  final String? eventProvider;
  final String source;
  final String status;
  final bool checkedIn;
  final DateTime? eventStartAt;
  final List<HostCustomerEventRevenue> revenues;
}

class HostCustomerEventRevenue {
  const HostCustomerEventRevenue({
    required this.currency,
    required this.amountMinor,
    required this.source,
    required this.factCount,
    required this.allocation,
  });

  factory HostCustomerEventRevenue.fromMap(Map<Object?, Object?> map) =>
      HostCustomerEventRevenue(
        currency: crmRequiredString(map, 'currency'),
        amountMinor: crmRequiredInt(map, 'amountMinor'),
        source: crmEnumByName(
          HostCustomerRevenueSource.values,
          crmRequiredString(map, 'source'),
          'event revenue source',
        ),
        factCount: crmRequiredInt(map, 'factCount'),
        allocation: crmEnumByName(
          HostCustomerRevenueAllocation.values,
          crmRequiredString(map, 'allocation'),
          'event revenue allocation',
        ),
      );

  final String currency;
  final int amountMinor;
  final HostCustomerRevenueSource source;
  final int factCount;
  final HostCustomerRevenueAllocation allocation;
}

class HostCustomerRevenueAmount {
  const HostCustomerRevenueAmount({
    required this.currency,
    required this.amountMinor,
    int? factCount,
    int? paidOrderCount,
    this.sources = const [],
  }) : factCount = factCount ?? paidOrderCount ?? 0;

  factory HostCustomerRevenueAmount.fromMap(Map<Object?, Object?> map) =>
      HostCustomerRevenueAmount(
        currency: crmRequiredString(map, 'currency'),
        amountMinor: crmRequiredInt(map, 'amountMinor'),
        factCount: crmRequiredInt(map, 'factCount'),
        sources: crmMapList(
          map['sources'],
          'customer revenue sources',
        ).map(HostCustomerRevenueSourceAmount.fromMap).toList(growable: false),
      );

  final String currency;
  final int amountMinor;
  final int factCount;
  final List<HostCustomerRevenueSourceAmount> sources;
}

class HostCustomerRevenueSourceAmount {
  const HostCustomerRevenueSourceAmount({
    required this.source,
    required this.amountMinor,
    required this.factCount,
  });

  factory HostCustomerRevenueSourceAmount.fromMap(Map<Object?, Object?> map) =>
      HostCustomerRevenueSourceAmount(
        source: crmEnumByName(
          HostCustomerRevenueSource.values,
          crmRequiredString(map, 'source'),
          'revenue source',
        ),
        amountMinor: crmRequiredInt(map, 'amountMinor'),
        factCount: crmRequiredInt(map, 'factCount'),
      );

  final HostCustomerRevenueSource source;
  final int amountMinor;
  final int factCount;
}

class HostCustomerRevenue {
  const HostCustomerRevenue({required this.coverage, required this.amounts});

  factory HostCustomerRevenue.fromMap(Map<Object?, Object?> map) =>
      HostCustomerRevenue(
        coverage: crmEnumByName(
          HostCustomerRevenueCoverage.values,
          crmRequiredString(map, 'coverage'),
          'revenue coverage',
        ),
        amounts: crmMapList(
          map['amounts'],
          'customer revenue amounts',
        ).map(HostCustomerRevenueAmount.fromMap).toList(growable: false),
      );

  final HostCustomerRevenueCoverage coverage;
  final List<HostCustomerRevenueAmount> amounts;
}
