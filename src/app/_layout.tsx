import { Stack } from "expo-router";
import { NavigationBar } from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import { useKeepAwake } from "expo-keep-awake";

export default function RootLayout() {
  useKeepAwake();

  return (
    <>
      <StatusBar hidden />
      <NavigationBar hidden />

      <Stack
        screenOptions={{
          headerShown: false,
          orientation: "landscape",
        }}
      />
    </>
  );
}