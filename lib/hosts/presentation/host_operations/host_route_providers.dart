part of '../host_operations_screen.dart';

final _hostOrganizersForUserProvider = Provider.autoDispose
    .family<AsyncValue<List<Organizer>>, String>(
      (ref, uid) => ref.watch(hostOperableOrganizersProvider(uid)),
    );
