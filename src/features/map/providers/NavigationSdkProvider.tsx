import React from "react";
import {
  loadGoogleNavigationSdk,
  type GoogleNavigationSdkModule,
} from "../utils/googleNavigationSdk";

interface NavigationSdkProviderProps {
  children: React.ReactNode;
}

const NavigationSdkProvider: React.FC<NavigationSdkProviderProps> = ({ children }) => {
  const navigationSdk = loadGoogleNavigationSdk();

  if (navigationSdk) {
    const { NavigationProvider, TaskRemovedBehavior } =
      navigationSdk as GoogleNavigationSdkModule;

    return (
      <NavigationProvider
        termsAndConditionsDialogOptions={{
          title: "Navigation Terms",
          companyName: "SIT",
          showOnlyDisclaimer: false,
        }}
        taskRemovedBehavior={TaskRemovedBehavior.CONTINUE_SERVICE}
      >
        {children}
      </NavigationProvider>
    );
  }

  return <>{children}</>;
};

export default NavigationSdkProvider;
