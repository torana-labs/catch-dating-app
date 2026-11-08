import 'package:flutter/foundation.dart';

/// Which setup page: a hotel, a pickup point or a car vendor.
enum HostProgrammeSetupKind { hotel, pickup, vendor }

/// The pickup point kinds `upsertProgramPickupPoint` takes.
enum HostProgrammePickupKind { airport, railway, venue, other }

/// What a setup page has typed so far. One shape holds all three: a hotel
/// uses name, address and contact; a pickup point uses kind, name, code,
/// terminal, meeting zone and instructions; a vendor uses name, contact and
/// phone.
@immutable
class HostProgrammeSetupDraft {
  const HostProgrammeSetupDraft({
    this.name = '',
    this.address = '',
    this.contact = '',
    this.phone = '',
    this.pickupKind = HostProgrammePickupKind.airport,
    this.code = '',
    this.terminal = '',
    this.meetingZone = '',
    this.instructions = '',
  });

  final String name;
  final String address;
  final String contact;
  final String phone;
  final HostProgrammePickupKind pickupKind;
  final String code;
  final String terminal;
  final String meetingZone;
  final String instructions;

  bool get ready => name.trim().isNotEmpty;

  HostProgrammeSetupDraft copyWith({
    String? name,
    String? address,
    String? contact,
    String? phone,
    HostProgrammePickupKind? pickupKind,
    String? code,
    String? terminal,
    String? meetingZone,
    String? instructions,
  }) => HostProgrammeSetupDraft(
    name: name ?? this.name,
    address: address ?? this.address,
    contact: contact ?? this.contact,
    phone: phone ?? this.phone,
    pickupKind: pickupKind ?? this.pickupKind,
    code: code ?? this.code,
    terminal: terminal ?? this.terminal,
    meetingZone: meetingZone ?? this.meetingZone,
    instructions: instructions ?? this.instructions,
  );
}
