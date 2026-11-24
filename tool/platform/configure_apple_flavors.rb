#!/usr/bin/env ruby
# frozen_string_literal: true

require 'fileutils'
require 'json'
require 'xcodeproj'

REPO_ROOT = File.expand_path('../..', __dir__)
APP_TARGETS_PATH = File.join(REPO_ROOT, 'tool', 'app_targets.json')
APP_TARGETS = JSON.parse(File.read(APP_TARGETS_PATH)).freeze

def flavors_for(role: nil, package_entrypoints: false)
  APP_TARGETS.fetch('targets')
    .select { |target| role.nil? || target.fetch('role') == role }
    .to_h do |target|
      target_role = target.fetch('role')
      environment = target.fetch('environment')
      ios = target.fetch('ios')
      role_config = APP_TARGETS.fetch('roles').fetch(target_role)
      [
        ios.fetch('scheme'),
        {
          target_id: target.fetch('id'),
          flutter_target: target.fetch(
            package_entrypoints ? 'packageEntrypoint' : 'entrypoint'
          ),
          bundle_id: ios.fetch('bundleId'),
          app_name: target.fetch('displayName'),
          firebase_env: environment,
          firebase_role: target_role,
          firebase_role_path: target_role == 'host' ? 'host/' : '',
          app_icon: ios.fetch('iconSet'),
          ios_url_scheme: ios.fetch('urlScheme'),
          entitlements: role_config.fetch('iosEntitlements').sub(%r{\Aios/}, ''),
          maps_key_suffix: environment.upcase
        }.freeze
      ]
    end
end

BUILD_MODES = {
  'Debug' => :debug,
  'Profile' => :release,
  'Release' => :release
}.freeze

FLAVORED_CONFIGURATION = /\A(?:#{BUILD_MODES.keys.join('|')})-(?<flavor>.+)\z/

# Each app project carries only its own role's flavors. Configurations, base
# xcconfigs and schemes left behind by another role are removed rather than
# kept as unbuildable aliases.
def prune_foreign_flavors(project, flavors, scheme_dir:, xcconfig_path:)
  foreign = project.build_configurations.map(&:name).select do |name|
    match = FLAVORED_CONFIGURATION.match(name)
    match && !flavors.key?(match[:flavor])
  end
  foreign.each do |config_name|
    project.targets.each do |target|
      target.build_configurations
        .select { |config| config.name == config_name }
        .each(&:remove_from_project)
    end
    project.build_configurations
      .select { |config| config.name == config_name }
      .each(&:remove_from_project)
    xcconfig = xcconfig_path.call(config_name)
    project.files.select { |file| file.real_path.to_s == xcconfig }.each(&:remove_from_project)
    FileUtils.rm_f(xcconfig)
  end
  foreign.map { |name| FLAVORED_CONFIGURATION.match(name)[:flavor] }.uniq.each do |flavor|
    FileUtils.rm_f(File.join(scheme_dir, "#{flavor}.xcscheme"))
  end
end

def ensure_file_ref(project, group_path, file_path)
  group = project.main_group.find_subpath(group_path, true)
  ref = project.files.find { |file| file.path == file_path }
  ref || group.new_file(file_path)
end

def ensure_project_config(project, name, type, base_ref)
  config = project.build_configurations.find { |item| item.name == name }
  config ||= project.add_build_configuration(name, type)
  config.base_configuration_reference = base_ref if base_ref
  config
end

def ensure_target_config(
  target,
  name,
  type,
  base_ref,
  build_settings,
  template_name: nil,
  remove_build_settings: []
)
  config = target.build_configurations.find { |item| item.name == name }
  if config.nil?
    config = target.add_build_configuration(name, type)
    if template_name
      template = target.build_configurations.find { |item| item.name == template_name }
      config.build_settings.merge!(template.build_settings) if template
    end
  end
  config.base_configuration_reference = base_ref if base_ref
  remove_build_settings.each { |setting| config.build_settings.delete(setting) }
  config.build_settings.merge!(build_settings)
  config
end

def write_scheme(source_scheme_path, destination_path, flavor, settings)
  xml = File.exist?(destination_path) ? File.read(destination_path) : File.read(source_scheme_path)
  BUILD_MODES.each_key do |mode|
    xml = xml.gsub(
      /buildConfiguration = "#{mode}(?:-[^"]+)?"/,
      %(buildConfiguration = "#{mode}-#{flavor}")
    )
  end
  xml = xml.gsub(/BuildableName = "[^"]+\.app"/, %(BuildableName = "#{settings[:app_name]}.app"))
  File.write(destination_path, xml)
end

def ensure_firebase_copy_phase(target, platform)
  name = 'Copy Firebase Environment Config'
  phase = target.shell_script_build_phases.find { |item| item.name == name }
  phase ||= target.new_shell_script_build_phase(name)
  phase.input_paths = [
    "$(SRCROOT)/../firebase/$(FIREBASE_ENV)/$(FIREBASE_ROLE_PATH)#{platform}/GoogleService-Info.plist"
  ]
  phase.output_paths = ['$(TARGET_BUILD_DIR)/$(UNLOCALIZED_RESOURCES_FOLDER_PATH)/GoogleService-Info.plist']
  phase.shell_script = <<~SH
    set -euo pipefail

    FIREBASE_ENV="${FIREBASE_ENV:-prod}"
    FIREBASE_ROLE="${FIREBASE_ROLE:-consumer}"
    FIREBASE_ROLE_PATH="${FIREBASE_ROLE_PATH:-}"
    SOURCE="${SRCROOT}/../firebase/${FIREBASE_ENV}/${FIREBASE_ROLE_PATH}#{platform}/GoogleService-Info.plist"
    DEST="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/GoogleService-Info.plist"

    if [[ ! -f "$SOURCE" ]]; then
      echo "Missing Firebase config: $SOURCE"
      exit 1
    fi

    cp "$SOURCE" "$DEST"
    echo "Copied Firebase config for $FIREBASE_ENV/$FIREBASE_ROLE to $DEST"

    INFO_PLIST="${TARGET_BUILD_DIR}/${INFOPLIST_PATH}"
    if [[ -f "$INFO_PLIST" && -x /usr/libexec/PlistBuddy ]]; then
      REVERSED_CLIENT_ID="$(/usr/libexec/PlistBuddy -c 'Print :REVERSED_CLIENT_ID' "$SOURCE" 2>/dev/null || true)"
      if [[ -n "$REVERSED_CLIENT_ID" ]]; then
        /usr/libexec/PlistBuddy -c "Set :CFBundleURLTypes:0:CFBundleURLSchemes:0 $REVERSED_CLIENT_ID" "$INFO_PLIST" 2>/dev/null || true
      fi
    fi
  SH
end

def aps_environment(mode, settings)
  mode == 'Release' && settings[:firebase_env] == 'prod' ? 'production' : 'development'
end

def app_attest_environment(mode)
  mode == 'Debug' ? 'development' : 'production'
end

def remove_static_firebase_resource(target)
  target.resources_build_phase.files.each do |build_file|
    next unless build_file.file_ref&.display_name == 'GoogleService-Info.plist'

    target.resources_build_phase.remove_build_file(build_file)
  end
end

def configure_ios(project_root:, flavors:)
  project_path = File.join(project_root, 'ios', 'Runner.xcodeproj')
  project = Xcodeproj::Project.open(project_path)
  runner = project.targets.find { |target| target.name == 'Runner' }
  tests = project.targets.find { |target| target.name == 'RunnerTests' }

  flavors.each do |flavor, settings|
    BUILD_MODES.each do |mode, type|
      config_name = "#{mode}-#{flavor}"
      xcconfig = "Flutter/#{config_name}.xcconfig"
      pod_config = mode == 'Debug' ? 'debug' : 'release'
      File.write(
        File.join(project_root, 'ios', xcconfig),
        <<~CONFIG
          #include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.#{config_name.downcase}.xcconfig"
          #include? "Pods/Target Support Files/Pods-Runner/Pods-Runner.#{pod_config}.xcconfig"
          #include "Generated.xcconfig"
          #include "CatchBuildSettings.xcconfig"
          #include? "GoogleMapsKeys.xcconfig"
          APS_ENVIRONMENT=#{aps_environment(mode, settings)}
          APP_ATTEST_ENVIRONMENT=#{app_attest_environment(mode)}
          FIREBASE_IOS_URL_SCHEME=#{settings[:ios_url_scheme]}

          GOOGLE_MAPS_IOS_API_KEY=$(GOOGLE_MAPS_IOS_API_KEY_#{settings[:maps_key_suffix]})
        CONFIG
      )
      base_ref = ensure_file_ref(project, 'Flutter', xcconfig)
      ensure_project_config(project, config_name, type, base_ref)
      ensure_target_config(
        runner,
        config_name,
        type,
        base_ref,
        {
          'PRODUCT_BUNDLE_IDENTIFIER' => settings[:bundle_id],
          'PRODUCT_NAME' => settings[:app_name],
          'APP_DISPLAY_NAME' => settings[:app_name],
          'ASSETCATALOG_COMPILER_APPICON_NAME' => settings[:app_icon],
          'CODE_SIGN_ENTITLEMENTS' => settings[:entitlements],
          'CATCH_APP_TARGET_ID' => settings[:target_id],
          'FLUTTER_TARGET' => "$(SRCROOT)/../#{settings[:flutter_target]}",
          'FLAVOR' => flavor,
          'FIREBASE_ENV' => settings[:firebase_env],
          'FIREBASE_ROLE' => settings[:firebase_role],
          'FIREBASE_ROLE_PATH' => settings[:firebase_role_path],
          'FIREBASE_IOS_URL_SCHEME' => settings[:ios_url_scheme]
        },
        template_name: mode,
        remove_build_settings: ['CODE_SIGN_IDENTITY[sdk=iphoneos*]']
      )
      ensure_target_config(
        tests,
        config_name,
        type,
        nil,
        {
          'PRODUCT_BUNDLE_IDENTIFIER' => "#{settings[:bundle_id]}.RunnerTests"
        },
        template_name: mode
      )
    end
  end

  remove_static_firebase_resource(runner)
  ensure_firebase_copy_phase(runner, 'ios')

  scheme_dir = File.join(
    project_root,
    'ios',
    'Runner.xcodeproj',
    'xcshareddata',
    'xcschemes'
  )
  prune_foreign_flavors(
    project,
    flavors,
    scheme_dir: scheme_dir,
    xcconfig_path: ->(config_name) { File.join(project_root, 'ios', 'Flutter', "#{config_name}.xcconfig") }
  )
  project.save

  FileUtils.mkdir_p(scheme_dir)
  source_scheme = File.join(scheme_dir, 'Runner.xcscheme')
  flavors.each do |flavor, settings|
    write_scheme(source_scheme, File.join(scheme_dir, "#{flavor}.xcscheme"), flavor, settings)
  end
end

def configure_macos(project_root:, flavors:)
  project_path = File.join(project_root, 'macos', 'Runner.xcodeproj')
  project = Xcodeproj::Project.open(project_path)
  runner = project.targets.find { |target| target.name == 'Runner' }
  tests = project.targets.find { |target| target.name == 'RunnerTests' }
  assemble = project.targets.find { |target| target.name == 'Flutter Assemble' }
  configs_dir = File.join(project_root, 'macos', 'Runner', 'Configs')

  flavors.each do |flavor, settings|
    BUILD_MODES.each do |mode, type|
      config_name = "#{mode}-#{flavor}"
      xcconfig = "AppInfo-#{config_name}.xcconfig"
      pod_config = mode == 'Debug' ? 'debug' : 'release'
      File.write(
        File.join(configs_dir, xcconfig),
        <<~CONFIG
          #include? "../../Pods/Target Support Files/Pods-Runner/Pods-Runner.#{config_name.downcase}.xcconfig"
          #include? "../../Pods/Target Support Files/Pods-Runner/Pods-Runner.#{pod_config}.xcconfig"
          #include "AppInfo.xcconfig"
        CONFIG
      )
      base_ref = ensure_file_ref(project, 'Runner/Configs', xcconfig)
      project_config_ref = ensure_file_ref(
        project,
        'Runner/Configs',
        mode == 'Debug' ? 'Debug.xcconfig' : 'Release.xcconfig'
      )
      ensure_project_config(project, config_name, type, project_config_ref)
      ensure_target_config(
        runner,
        config_name,
        type,
        base_ref,
        {
          'PRODUCT_BUNDLE_IDENTIFIER' => settings[:bundle_id],
          'PRODUCT_NAME' => settings[:app_name],
          'ASSETCATALOG_COMPILER_APPICON_NAME' => settings[:app_icon],
          'CATCH_APP_TARGET_ID' => settings[:target_id],
          'FLUTTER_TARGET' => "$(SRCROOT)/../#{settings[:flutter_target]}",
          'FLAVOR' => flavor,
          'FIREBASE_ENV' => settings[:firebase_env],
          'FIREBASE_ROLE' => settings[:firebase_role],
          'FIREBASE_ROLE_PATH' => settings[:firebase_role_path]
        },
        template_name: mode
      )
      ensure_target_config(
        tests,
        config_name,
        type,
        nil,
        {
          'PRODUCT_BUNDLE_IDENTIFIER' => "#{settings[:bundle_id]}.RunnerTests"
        },
        template_name: mode
      )
      ensure_target_config(assemble, config_name, type, nil, {}, template_name: mode)
    end
  end

  remove_static_firebase_resource(runner)
  ensure_firebase_copy_phase(runner, 'macos')

  scheme_dir = File.join(project_root, 'macos', 'Runner.xcodeproj', 'xcshareddata', 'xcschemes')
  prune_foreign_flavors(
    project,
    flavors,
    scheme_dir: scheme_dir,
    xcconfig_path: ->(config_name) { File.join(configs_dir, "AppInfo-#{config_name}.xcconfig") }
  )
  project.save

  FileUtils.mkdir_p(scheme_dir)
  source_scheme = File.join(scheme_dir, 'Runner.xcscheme')
  flavors.each do |flavor, settings|
    write_scheme(source_scheme, File.join(scheme_dir, "#{flavor}.xcscheme"), flavor, settings)
  end
end

APP_TARGETS.fetch('roles').each do |role, role_config|
  project_root = File.join(REPO_ROOT, role_config.fetch('projectRoot'))
  flavors = flavors_for(role: role, package_entrypoints: true)
  configure_ios(project_root: project_root, flavors: flavors)
  # Each app project ships a macOS runner that hosts its own native
  # integration journeys.
  configure_macos(project_root: project_root, flavors: flavors)
end
