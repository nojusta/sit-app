const {
  AndroidConfig,
  withAndroidManifest,
  withAppBuildGradle,
  withAppDelegate,
  withInfoPlist,
  withDangerousMod,
} = require("expo/config-plugins");

const fs = require("node:fs/promises");
const path = require("node:path");

// Generated native projects must initialize Google before mounting either map view.
// Read the key from Info.plist so it is not duplicated in generated Swift source.
const withGoogleNavigation = (config) => {
  const iosApiKey = config.ios?.config?.googleMapsApiKey;
  const androidApiKey = config.android?.config?.googleMaps?.apiKey;

  config = withInfoPlist(config, (mod) => {
    if (iosApiKey) mod.modResults.GMSApiKey = iosApiKey;
    return mod;
  });

  config = withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== "swift") {
      throw new Error("SIT Google Navigation requires a Swift AppDelegate.");
    }

    let contents = mod.modResults.contents;
    if (!contents.includes("import GoogleMaps")) {
      contents = contents.replace("import Expo", "import Expo\nimport GoogleMaps");
    }

    if (!contents.includes("// SIT Google Navigation initialization")) {
      const launchMethod = /(didFinishLaunchingWithOptions[\s\S]*?\)\s*->\s*Bool\s*\{)/;
      if (!launchMethod.test(contents)) {
        throw new Error("Cannot locate AppDelegate startup for Google Navigation.");
      }
      contents = contents.replace(
        launchMethod,
        `$1
    // SIT Google Navigation initialization
    if let apiKey = Bundle.main.object(forInfoDictionaryKey: "GMSApiKey") as? String,
       !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      GMSServices.provideAPIKey(apiKey)
    }
`,
      );
    }
    mod.modResults.contents = contents;
    return mod;
  });

  config = withDangerousMod(config, [
    "android",
    async (mod) => {
      const directory = path.join(
        mod.modRequest.platformProjectRoot,
        "app/src/main/assets/markers",
      );
      await fs.mkdir(directory, { recursive: true });
      await fs.copyFile(
        path.join(mod.modRequest.projectRoot, "assets/images/custom-marker-android.png"),
        path.join(directory, "custom-marker.png"),
      );
      return mod;
    },
  ]);

  config = withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes("// SIT Navigation API desugaring")) {
      mod.modResults.contents += `
// SIT Navigation API desugaring
android.compileOptions.coreLibraryDesugaringEnabled = true
dependencies {
    coreLibraryDesugaring "com.android.tools:desugar_jdk_libs:2.1.5"
}
`;
    }
    return mod;
  });

  return withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    if (androidApiKey) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        application,
        "com.google.android.geo.API_KEY",
        androidApiKey,
      );
    }
    return mod;
  });
};

module.exports = withGoogleNavigation;
