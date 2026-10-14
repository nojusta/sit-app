jest.mock("expo/config-plugins", () => ({
  withAppDelegate: (config, action) => ({ ...config, appDelegate: action }),
  withDangerousMod: (config, [, action]) => ({ ...config, androidAssets: action }),
  withInfoPlist: (config, action) => ({ ...config, infoPlist: action }),
  withAppBuildGradle: (config, action) => ({ ...config, gradle: action }),
  withAndroidManifest: (config, action) => ({ ...config, manifest: action }),
  AndroidConfig: {
    Manifest: {
      getMainApplicationOrThrow: (manifest) => manifest.application,
      addMetaDataItemToMainApplication: (app, name, value) => {
        app[name] = value;
      },
    },
  },
}));

const withGoogleNavigation = require("../../plugins/with-google-navigation");

test("prebuild preserves scene startup and initializes Google once", () => {
  const config = withGoogleNavigation({
    ios: { config: { googleMapsApiKey: "test-ios-key" } },
  });
  let mod = {
    modResults: {
      language: "swift",
      contents: `internal import Expo
class AppDelegate: ExpoAppDelegate {
  func application(_ app: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    return super.application(app, didFinishLaunchingWithOptions: options)
  }
}`,
    },
  };
  mod = config.appDelegate(config.appDelegate(mod));
  expect(mod.modResults.contents.match(/GMSServices.provideAPIKey/g)).toHaveLength(1);
  expect(mod.modResults.contents).toContain("return super.application");
  expect(mod.modResults.contents).not.toContain("startReactNative");
  expect(mod.modResults.contents).not.toContain("test-ios-key");
  expect(config.infoPlist({ modResults: {} }).modResults.GMSApiKey).toBe("test-ios-key");
});

test("regenerating Android retains API metadata and desugaring once", () => {
  const config = withGoogleNavigation({
    android: { config: { googleMaps: { apiKey: "test-android-key" } } },
  });
  const mod = config.gradle(config.gradle({ modResults: { contents: "android {}" } }));
  expect(mod.modResults.contents.match(/coreLibraryDesugaringEnabled/g)).toHaveLength(1);
  expect(mod.modResults.contents).toContain("desugar_jdk_libs:2.1.5");
  const manifest = config.manifest({ modResults: { application: {} } });
  expect(manifest.modResults.application["com.google.android.geo.API_KEY"]).toBe(
    "test-android-key",
  );
});

test("public Expo config excludes private admin credentials", () => {
  const config = require("../../app.config").default.expo;
  expect(config.extra).not.toHaveProperty("ADMIN_EMAIL");
  expect(config.extra).not.toHaveProperty("ADMIN_PASSWORD");
  expect(config.extra).not.toHaveProperty("APPWRITE_API_KEY");
});

test("prebuild restores the existing Android custom marker bitmap", async () => {
  const fs = require("node:fs/promises");
  const os = require("node:os");
  const path = require("node:path");
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sit-native-assets-"));
  try {
    const config = withGoogleNavigation({});
    await config.androidAssets({
      modRequest: {
        projectRoot: path.resolve(__dirname, "../.."),
        platformProjectRoot: directory,
      },
    });
    const source = await fs.readFile(
      path.resolve(__dirname, "../../assets/images/custom-marker-android.png"),
    );
    const output = await fs.readFile(
      path.join(directory, "app/src/main/assets/markers/custom-marker.png"),
    );
    expect(output.equals(source)).toBe(true);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
