import java.util.Properties
import groovy.json.JsonSlurper

plugins {
    id("com.android.application")
    // START: FlutterFire Configuration
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
    // END: FlutterFire Configuration
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localPropertiesFile.inputStream().use(localProperties::load)
}
fun localPropertyOrEnv(name: String): String =
    localProperties.getProperty(name)
        ?: providers.environmentVariable(name).orNull
        ?: ""

fun googleMapsApiKeyValue(name: String): String =
    localPropertyOrEnv(name)
        .removePrefix("keyString:")
        .trim()

fun googleMapsApiKeyFor(environmentName: String): String =
    googleMapsApiKeyValue("GOOGLE_MAPS_ANDROID_API_KEY_$environmentName")
        .ifBlank { googleMapsApiKeyValue("GOOGLE_MAPS_ANDROID_API_KEY") }

val releaseBuildRequested = gradle.startParameter.taskNames.any {
    it.contains("release", ignoreCase = true)
}
val requiredKeystoreProperties = listOf(
    "storeFile",
    "storePassword",
    "keyAlias",
    "keyPassword",
)

if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.inputStream().use(keystoreProperties::load)

    val invalidKeystoreProperties = requiredKeystoreProperties.filter { key ->
        val value = keystoreProperties.getProperty(key)?.trim()
        value.isNullOrEmpty() || value == "change-me"
    }

    if (invalidKeystoreProperties.isNotEmpty()) {
        throw GradleException(
            "Invalid Android release signing config in ${keystorePropertiesFile.path}. " +
                "Replace placeholder values for: ${invalidKeystoreProperties.joinToString()}."
        )
    }
} else if (releaseBuildRequested) {
    throw GradleException(
        "Missing Android release signing config: ${keystorePropertiesFile.path}. " +
            "Copy android/key.properties.example to android/key.properties, point it at a real " +
            "upload keystore, and keep both files out of git."
    )
}

val releaseStoreFile = if (keystorePropertiesFile.exists()) {
    file(keystoreProperties.getProperty("storeFile"))
} else {
    null
}

if (releaseBuildRequested && releaseStoreFile != null && !releaseStoreFile.exists()) {
    throw GradleException(
        "Android release keystore does not exist: ${releaseStoreFile.path}. " +
            "Create the upload keystore or update storeFile in ${keystorePropertiesFile.path}."
    )
}

// Guard: each flavor reads its own src/<flavor>/google-services.json, a link to
// the canonical file under firebase/<env>/. A missing or wrong link otherwise
// fails deep inside the google-services plugin with a cryptic "No matching
// client" error. Fail early with an actionable message.
fun jsonObject(value: Any?, label: String): Map<*, *> =
    value as? Map<*, *> ?: throw GradleException("$label must be a JSON object")

fun jsonString(source: Map<*, *>, key: String, label: String): String =
    source[key] as? String ?: throw GradleException("$label.$key must be a string")

val appTargetsManifestFile = rootProject.file("../../../tool/app_targets.json")
val appTargetsManifest = jsonObject(
    JsonSlurper().parse(appTargetsManifestFile),
    "tool/app_targets.json",
)
val appProjectRole = "consumer"
val installableAppTargets =
    (appTargetsManifest["targets"] as? List<*>)
        ?.mapIndexed { index, target -> jsonObject(target, "targets[$index]") }
        ?.filter { target -> jsonString(target, "role", "${target["id"]}") == appProjectRole }
        ?: throw GradleException("tool/app_targets.json.targets must be a list")
val installableAppRoles = jsonObject(appTargetsManifest["roles"], "roles")
val flavorApplicationIds = installableAppTargets.associate { target ->
    val androidTarget = jsonObject(target["android"], "${target["id"]}.android")
    jsonString(androidTarget, "flavor", "${target["id"]}.android") to
        jsonString(androidTarget, "applicationId", "${target["id"]}.android")
}
val requestedAppTargets = installableAppTargets.filter { target ->
    val androidTarget = jsonObject(target["android"], "${target["id"]}.android")
    val flavor = jsonString(androidTarget, "flavor", "${target["id"]}.android")
    gradle.startParameter.taskNames.any { task -> task.contains(flavor, ignoreCase = true) }
}
val nativeAndroidBuildRequested = gradle.startParameter.taskNames.any { task ->
    val leafTaskName = task.substringAfterLast(':')
    listOf(
        "assemble",
        "bundle",
        "compileFlutter",
        "build",
        "check",
        "test",
        "lint",
        "connected",
        "device",
    ).any { prefix -> leafTaskName.startsWith(prefix, ignoreCase = true) }
}
if (nativeAndroidBuildRequested && requestedAppTargets.size != 1) {
    throw GradleException(
        "Android builds must select exactly one app-target flavor from tool/app_targets.json; " +
            "resolved ${requestedAppTargets.size}. Use ./tool/flutter_with_env.sh or a fully " +
            "qualified task such as :app:assembleHostDevDebug."
    )
}
val requestedAppTarget = requestedAppTargets.singleOrNull()
val requestedFlavor = requestedAppTarget?.let { target ->
    val androidTarget = jsonObject(target["android"], "${target["id"]}.android")
    jsonString(androidTarget, "flavor", "${target["id"]}.android")
}
if (requestedFlavor != null) {
    val googleServicesFile = project.file("src/$requestedFlavor/google-services.json")
    val expectedApplicationId = flavorApplicationIds.getValue(requestedFlavor)
    val packagePattern =
        Regex("\"package_name\"\\s*:\\s*\"" + Regex.escape(expectedApplicationId) + "\"")
    if (!googleServicesFile.exists() ||
        !packagePattern.containsMatchIn(googleServicesFile.readText())
    ) {
        throw GradleException(
            "${googleServicesFile.path} is missing or does not contain the " +
                "'$requestedFlavor' flavor package ($expectedApplicationId). It must link to " +
                "the flavor's file under firebase/; check with " +
                "./tool/validate_firebase_environment.sh."
        )
    }
}

android {
    namespace = "com.catchdates.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.catchdates.app"
        minSdk = maxOf(26, flutter.minSdkVersion)
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["googleMapsApiKey"] = googleMapsApiKeyValue(
            "GOOGLE_MAPS_ANDROID_API_KEY"
        )
    }

    flavorDimensions += "appTarget"
    productFlavors {
        for (target in installableAppTargets) {
            val targetId = jsonString(target, "id", "target")
            val androidTarget = jsonObject(target["android"], "$targetId.android")
            val environment = jsonString(target, "environment", targetId)
            create(jsonString(androidTarget, "flavor", "$targetId.android")) {
                dimension = "appTarget"
                val role = jsonString(target, "role", targetId)
                val firebaseTarget = jsonObject(target["firebase"], "$targetId.firebase")
                val firebaseAndroid = jsonObject(firebaseTarget["android"], "$targetId.firebase.android")
                applicationId = jsonString(androidTarget, "applicationId", "$targetId.android")
                resValue("string", "app_name", jsonString(target, "displayName", targetId))
                manifestPlaceholders["googleMapsApiKey"] =
                    googleMapsApiKeyFor(environment.uppercase())
                manifestPlaceholders["compiledAppTargetId"] = targetId
                manifestPlaceholders["compiledAppRole"] = role
                manifestPlaceholders["compiledFirebaseAppId"] =
                    jsonString(firebaseAndroid, "appId", "$targetId.firebase.android")
                manifestPlaceholders["compiledFirebaseProjectId"] =
                    jsonString(firebaseTarget, "projectId", "$targetId.firebase")
            }
        }
    }

    sourceSets {
        for (target in installableAppTargets) {
            val targetId = jsonString(target, "id", "target")
            val role = jsonString(target, "role", targetId)
            val roleConfig = jsonObject(installableAppRoles[role], "roles.$role")
            val androidTarget = jsonObject(target["android"], "$targetId.android")
            val flavor = jsonString(androidTarget, "flavor", "$targetId.android")
            val iconSourceSet = jsonString(androidTarget, "iconSourceSet", "$targetId.android")
            getByName(flavor) {
                manifest.srcFile(
                    project.file(
                        "../../${jsonString(roleConfig, "androidManifestOverlay", "roles.$role")}",
                    ),
                )
                if (iconSourceSet != "main") {
                    res.setSrcDirs(listOf("src/$iconSourceSet/res"))
                }
            }
        }
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                storeFile = releaseStoreFile
                storePassword = keystoreProperties.getProperty("storePassword")
            }
        }
    }

    buildTypes {
        release {
            if (keystorePropertiesFile.exists()) {
                signingConfigs.getByName("release")
                    .also { signingConfig = it }
            }
        }
    }
}

flutter {
    source = "../.."
    target = requestedAppTarget?.let { target ->
        jsonString(target, "packageEntrypoint", jsonString(target, "id", "target"))
    } ?: "lib/main.dart"
}
