import 'package:catch_dating_app/contexts/forms/domain/forms/form_definition_fields.dart';
import 'package:meta/meta.dart';

@immutable
class HostFormPayment {
  const HostFormPayment({
    required this.connectionId,
    required this.amountPaise,
    required this.description,
    required this.refundPolicy,
  });

  factory HostFormPayment.fromMap(Map<Object?, Object?> map) {
    final amount = map['amountPaise'];
    if (amount is! int || amount < 100 || amount > 10000000) {
      throw const FormatException('Invalid form payment amount.');
    }
    if (map['currency'] != 'INR') {
      throw const FormatException('Unsupported form payment currency.');
    }
    return HostFormPayment(
      connectionId: formDefinitionNullableString(map['connectionId']),
      amountPaise: amount,
      description: formDefinitionStringValue(map['description']),
      refundPolicy: formDefinitionStringValue(map['refundPolicy']),
    );
  }
  final String? connectionId;
  final int amountPaise;
  final String description;
  final String refundPolicy;

  String get rupees =>
      '${amountPaise ~/ 100}.${(amountPaise % 100).toString().padLeft(2, '0')}';

  /// Decimal input is converted exactly; no floating point money arithmetic.
  static int? parseRupees(String value) {
    final text = value.trim();
    if (!RegExp(r'^\d{1,6}(?:\.\d{1,2})?$').hasMatch(text)) return null;
    final parts = text.split('.');
    final paise =
        int.parse(parts.first) * 100 +
        (parts.length == 2 ? int.parse(parts.last.padRight(2, '0')) : 0);
    return paise >= 100 && paise <= 10000000 ? paise : null;
  }

  Map<String, Object?> toJson() => {
    'connectionId': connectionId,
    'amountPaise': amountPaise,
    'currency': 'INR',
    'description': description,
    'refundPolicy': refundPolicy,
  };
}

enum HostFormPaymentConnectionStatus {
  connecting,
  ready,
  needsAttention,
  disconnected,
}

enum HostFormPaymentMode { test, live }

enum HostFormPaymentConnectionAction { list, begin, disconnect, refresh }

@immutable
class HostFormPaymentConnection {
  const HostFormPaymentConnection({
    required this.connectionId,
    required this.status,
    required this.mode,
    required this.accountId,
    required this.webhookVerified,
    this.lastErrorCode,
  });
  factory HostFormPaymentConnection.fromMap(Map<Object?, Object?> map) =>
      HostFormPaymentConnection(
        connectionId: formDefinitionStringValue(map['connectionId']),
        status: formDefinitionEnumByName(
          HostFormPaymentConnectionStatus.values,
          formDefinitionStringValue(map['status']),
          'payment connection status',
        ),
        mode: formDefinitionEnumByName(
          HostFormPaymentMode.values,
          formDefinitionStringValue(map['mode']),
          'payment mode',
        ),
        accountId: formDefinitionNullableString(map['accountId']),
        webhookVerified: map['webhookVerified'] == true,
        lastErrorCode: formDefinitionNullableString(map['lastErrorCode']),
      );
  final String connectionId;
  final HostFormPaymentConnectionStatus status;
  final HostFormPaymentMode mode;
  final String? accountId;
  final bool webhookVerified;

  /// Set when Razorpay refused a token refresh or setup failed. The status can
  /// still read `ready`, but the server will not take payments on it.
  final String? lastErrorCode;

  /// Matches the server's checkout readiness check.
  bool get ready =>
      status == HostFormPaymentConnectionStatus.ready &&
      webhookVerified &&
      accountId != null &&
      lastErrorCode == null;

  bool get live => status != HostFormPaymentConnectionStatus.disconnected;
}

/// The organizer's single Razorpay connection as payout setup presents it.
/// Events, forms and memberships all collect through this one account.
enum HostRazorpayConnectionState {
  /// No live connection: offer Connect.
  notConnected,

  /// A connection is waiting for the Razorpay sign-in to finish.
  connecting,

  /// Exactly the account the server takes payments on.
  ready,

  /// A live connection can no longer take payments: offer Reconnect.
  needsReconnect,
}

@immutable
class HostFormPaymentSetup {
  const HostFormPaymentSetup({
    required this.available,
    required this.connections,
    this.authorizationUri,
    this.collection,
  });
  factory HostFormPaymentSetup.fromCallableData(Object? data) {
    if (data is! Map<Object?, Object?> ||
        data['available'] is! bool ||
        data['connections'] is! List) {
      throw const FormatException('Invalid form payment setup.');
    }
    final rawUrl = formDefinitionNullableString(data['authorizationUrl']);
    final uri = rawUrl == null ? null : Uri.tryParse(rawUrl);
    if (rawUrl != null &&
        (uri == null ||
            uri.scheme != 'https' ||
            uri.host != 'auth.razorpay.com' ||
            uri.path != '/authorize' ||
            uri.userInfo.isNotEmpty ||
            uri.hasFragment ||
            uri.port != 443)) {
      throw const FormatException('Invalid payment authorization destination.');
    }
    return HostFormPaymentSetup(
      available: data['available']! as bool,
      collection: data['collection'] == null
          ? null
          : HostFormPaymentCollection.fromMap(
              data['collection'] as Map<Object?, Object?>,
            ),
      authorizationUri: uri,
      connections: List.unmodifiable(
        (data['connections']! as List).map(
          (value) =>
              HostFormPaymentConnection.fromMap(value as Map<Object?, Object?>),
        ),
      ),
    );
  }
  final bool available;
  final List<HostFormPaymentConnection> connections;
  final Uri? authorizationUri;
  final HostFormPaymentCollection? collection;

  /// Connections that are not disconnected, newest first.
  List<HostFormPaymentConnection> get liveConnections =>
      connections.where((connection) => connection.live).toList();

  HostRazorpayConnectionState get razorpayConnectionState {
    final live = liveConnections;
    if (live.any((connection) => connection.ready)) {
      return HostRazorpayConnectionState.ready;
    }
    if (live.isEmpty) return HostRazorpayConnectionState.notConnected;
    return live.every(
          (connection) =>
              connection.status == HostFormPaymentConnectionStatus.connecting,
        )
        ? HostRazorpayConnectionState.connecting
        : HostRazorpayConnectionState.needsReconnect;
  }

  /// Live connections that cannot take payments. Reconnecting disconnects
  /// these first, so the organizer keeps a single account.
  List<String> get staleConnectionIds => [
    for (final connection in liveConnections)
      if (!connection.ready) connection.connectionId,
  ];
}

enum HostFormCollectionRoute {
  disabled,
  razorpayRoute,
  razorpayOAuth,
  stripeConnectDirect,
  stripeConnectDestination,
}

@immutable
class HostFormPaymentCollection {
  const HostFormPaymentCollection({
    required this.route,
    required this.mode,
    required this.ready,
  });
  factory HostFormPaymentCollection.fromMap(Map<Object?, Object?> map) {
    if (map['ready'] is! bool) {
      throw const FormatException('Invalid collection readiness.');
    }
    return HostFormPaymentCollection(
      route: formDefinitionEnumByName(
        HostFormCollectionRoute.values,
        formDefinitionStringValue(map['route']),
        'collection route',
      ),
      mode: map['mode'] == null
          ? null
          : formDefinitionEnumByName(
              HostFormPaymentMode.values,
              formDefinitionStringValue(map['mode']),
              'collection mode',
            ),
      ready: map['ready']! as bool,
    );
  }
  final HostFormCollectionRoute route;
  final HostFormPaymentMode? mode;
  final bool ready;
  bool get throughCatch => route == HostFormCollectionRoute.razorpayRoute;
  bool get throughOrganizer => route == HostFormCollectionRoute.razorpayOAuth;
}
