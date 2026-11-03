import Constants from "expo-constants";
import { Redirect } from "expo-router";
import QualityLabScreen from "@/features/quality-lab/QualityLabScreen";

export default function QualityLabRoute() {
  if (!Constants.expoConfig?.extra?.SIT_3LD_ENABLED) return <Redirect href="/" />;
  return <QualityLabScreen />;
}
